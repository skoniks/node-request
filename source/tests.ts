import { request } from '.';

request({
  url: 'https://ifconfig.me',
}).then((response) => {
  const { res, ...data } = response;
  console.log(JSON.stringify(data));
});
