import { request } from '.';

request({
  url: 'https://ifconfig.me',
  headers: {
    'content-type': 'application/json',
  },
}).then((response) => {
  const { res, ...data } = response;
  console.log(JSON.stringify(data));
});
