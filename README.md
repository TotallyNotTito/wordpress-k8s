# Launching A Cloud-Native Wordpress Blog on Kubernetes Cluster running Ampere Altra aarch64 

### Installing Tools on Ubuntu 22.04

***Install Kubectl***

```
sudo apt update && sudo apt upgrade -y
sudo apt-get install -y ca-certificates curl
sudo apt-get install -y apt-transport-https
sudo curl -fsSLo /etc/apt/keyrings/kubernetes-archive-keyring.gpg https://packages.cloud.google.com/apt/doc/apt-key.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-archive-keyring.gpg] https://apt.kubernetes.io/ kubernetes-xenial main" | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
sudo apt-get install -y kubectl
```

***Install Helm***

```
sudo snap install helm --classic
```

### Deploying Application

***Note: Make sure you're connected to cluster***

```
Helm install <app-name> Chart/
```

Application should now be deployed.

### Deploy Redis Service

Each Redis Replica runs on it’s own node, connected to the `wp-redis-<main>-0` instance. 

The different kubernetes services will assign an internal cluster-ip to the `wp-redis-<main>` service. It is this service we want to connect our WordPress service to. Once the WordPress is connected to the Redis service, the object cache will immediately optimize application performance.
Bootstrap Redis Cluster
Using the bitnami/redis chart:

```
helm install <my-redis-release> \
  --set auth.password=secretpassword \
    oci://registry-1.docker.io/bitnamicharts/redis
```

***NOTE:***

`helm install <my-redis-release>` uses the helm (kubernetes) package manager to set the name of the installation. 

The command `--set auth.password=<secret-password>` is an override that sets a password to access the database. 

The command `oci://registry-1.docker.io/bitnamicharts/redis` is pulling from a specific redis repository. This can be any registry, and doesn’t necessarily have to be the one I used. YMMV.

There will be some output instructions after running this install. It is important to execute the commands.

The first command exports the secretpassword as an environmental variable. 

`export REDIS_PASSWORD=$(kubectl get secret --namespace default wp-redis -o jsonpath="{.data.redis-password}" | base64 -d)`

The next steps are what enable your cluster to be reachable.

#### Setup a client pod and attach a pod
```
        kubectl run --namespace default redis-client --restart='Never'  --env REDIS_PASSWORD=$REDIS_PASSWORD  --image 

          --command -- sleep infinity

        kubectl exec --tty -i redis-client \    --namespace default -- bash
```
#### Connect using the redis-cli

`sudo apt install redis-tools`

`REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli -h <my-redis-release>-master`

`REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli -h <my-redis-release>-replicas`

### Connect to Redis Database from external cluster (e.g. WordPress)

`kubectl port-forward --namespace default svc/<my-redis-release>-master 6379:6379 &`

`REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli -h 127.0.0.1 -p 6379`

Your Redis Cluster is now ready to receive connections. Next, we will manually update the WordPress pod to connect it to the Redis Cluster.

### Get in to WordPress Pod

`kubectl get pods`

`kubectl exec -it <wordpress-pod> -- bash`
```
        apt-get update && apt-get upgrade -y \ 
	apt-get install vim 
```
`vim wp-config.php`

### Update wp-config.php with Redis Service
```
define('WP_REDIS_PASSWORD','<your-password>');
define('WP_REDIS_HOST','<my-redis-release>-master');
define('WP_REDIS_PORT','6379');
```

Save and exit pod.

From the WordPress-Site/wp-admin page, install Redis Object Cache. Once installed, you should be able to enable object cache and get a successmessage.

## Benchmarking

I have included some simple scripts to benchmark the application to test with cache enabled compared with site performance with cahce not enabled. This should run with approximately ~250 rps comfortably on a single node. You'll need to install the k6 binary.

run `k6 run <benchmark-name>.js`

## Running Datadog Observability Agent on Cluster
```
 helm repo add datadog https://helm.datadoghq.com
 helm install wp-datadog -f datadog-values.yaml --set datadog.apiKey='<api-key>' datadog/datadog
 helm upgrade -f datadog-values.yaml wp-datadog datadog/datadog
 helm upgrade -f datadog-values.yaml wp-datadog datadog/datadog
 datadog-agent status
```

This will allow you to have observability of Kubernetes cluster.
