# @sknx/request

Simple HTTP client for Node.JS with async/await without dependencies.

# Usage

```javascript
import { request } from '@sknx/request';

const response = await request({
  url: 'https://google.com',
  method: 'GET',
  timeout: 1000,
  follow: 5,

  // Specify request body
  headers: {
    'Content-Type': 'application/json',
  },
  body: { foo: 'bar' },

  // Specify response format
  format: 'json',
});

console.log(response.data);
```

Object **body** is automatically converted into **JSON** string with `'Content-Type'`: `'application/json'` header. If you provide `'Content-Type'` as `'x-www-form-urlencoded'`, body will be converted to **urlencoded** string.

The following options are available:

- **url**: A string with that represents an absolute URL
- **method**: `'GET'`, `'PUT'`, or any other ALLCAPS string will be
  used to set the HTTP method. Defaults to `'GET'`.
- **format**: Available formats are `'string'`, `'buffer'`, and
  `'json'`. By default, the response will be returned as `'string'`
- **headers**: An object can be passed to set request headers.
- **follow**: A number, that specifies max redirects. If undefined - no redirects will be followed
- **timeout**: A number, that specifies request timeout in milliseconds
- **body**: Object, Buffer, or string that will be sent to the server
- **agent**: A custom agent to be used when performing requests

Response Object contains:

- **status**: HTTP status message
- **statusCode**: HTTP status code
- **headers**: Response headers Object
- **data**: Response data in specified format
- **res**: Raw HTTP response (`IncomingMessage`)

Response example (without `res`):

```json
{
  "status": "OK",
  "statusCode": 200,
  "headers": {
    "access-control-allow-origin": "*",
    "content-type": "text/plain; charset=utf-8",
    "content-length": "13"
  },
  "data": "Hello, world!"
}
```

# TODO

- Handle response bad status codes (404, 500, etc)