import { Request, request } from '.';

// Default request example
request({
  url: 'https://ifconfig.me',
  headers: {
    'content-type': 'application/json',
  },
}).then((response) => {
  const { res, ...data } = response;
  console.log(JSON.stringify(data));
});

// Instance request example
const instance = new Request({
  headers: { 'content-type': 'application/json' },
});
instance.defaults.timeout = 5000;
instance.request({ url: 'https://ifconfig.me' }).then((response) => {
  const { res, ...data } = response;
  console.log(JSON.stringify(data));
});

// StatusCode validation example
request({
  url: 'https://ifconfig.me',
  validate: (status) => status === 400,
}).catch((error) => {
  // Check if validate statusCode error
  if (Request.isValidateError(error)) {
    console.log(error.response?.statusCode);
  }
});
