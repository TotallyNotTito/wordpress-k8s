import http from 'k6/http';

import { check, sleep } from 'k6';


export const options = {

  stages: [
    //{ duration: '1m', target: 15 },
    //{ duration: '5m', target: 1690 },
    { duration: '300s', target: 50 },
  ],

  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(99)<300'], // 99% of requests should be below 300ms
  },
  
  summaryTrendStats: ["min", "med", "max", "avg", "p(95)", "p(99)"],

};


export default function () {

  //const res = http.get('http://20.252.53.76/')
  const res = http.get('http://40.88.243.130/')
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);

}
