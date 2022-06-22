import { request } from '.';

request({
  url: 'https://google.com',
  follow: 1,
}).then(({ data }) => {
  console.log(data);
});
