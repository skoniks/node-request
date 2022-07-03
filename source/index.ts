import http from 'http';
import https from 'https';
import url from 'url';

type RequestMethod =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'CONNECT'
  | 'OPTIONS'
  | 'TRACE'
  | 'PATCH';

type Agent = http.Agent | https.Agent;

type ResFormat = 'string' | 'json' | 'buffer';

type RequestValidate = (statusCode: number) => boolean;

interface RequestOptions {
  url: string;
  method?: RequestMethod;
  headers?: http.OutgoingHttpHeaders;
  validate?: RequestValidate;
  timeout?: number;
  follow?: number;
  format?: ResFormat;
  agent?: Agent;
  body?: any;
}

interface RequestContext {
  resolve: (value: RequestResponse) => void;
  reject: (value: Error) => void;
  redirect?: number;
}

interface RequestResponse {
  status?: string;
  statusCode?: number;
  headers: http.IncomingHttpHeaders;
  res: http.IncomingMessage;
  data: any;
}

class RequestError extends Error {
  public response?: RequestResponse;
  constructor(message?: string, response?: RequestResponse) {
    super(message);
    this.response = response;
    Object.setPrototypeOf(this, RequestError.prototype);
  }
}

function isValidateError(error: unknown): error is RequestError {
  return error instanceof RequestError;
}

const redirectCodes = [301, 302, 303, 307, 308];

function getRequestProvider(protocol: string) {
  switch (protocol) {
    case 'http:':
      return http.request;
    case 'https:':
      return https.request;
    default:
      throw new Error(`Protocol "${protocol}" not supported.`);
  }
}

function parseRequestBody({ body, headers }: RequestOptions) {
  if (typeof body === 'object') {
    if (headers === undefined) {
      headers = { 'Content-Type': 'application/json' };
    } else if (headers['Content-Type'] === undefined) {
      headers['Content-Type'] = 'application/json';
    }
    switch (headers['Content-Type']) {
      case 'application/x-www-form-urlencoded':
        body = new URLSearchParams(body).toString();
      case 'application/json':
      default:
        body = JSON.stringify(body);
        headers['Content-Length'] = body.length;
        break;
    }
  }
  return { body, headers };
}

function handleCallback(
  res: http.IncomingMessage,
  options: RequestOptions,
  context: RequestContext,
) {
  try {
    const { statusMessage: status, statusCode, headers } = res;
    if (
      statusCode &&
      redirectCodes.includes(statusCode) &&
      options.follow !== undefined
    ) {
      if (!context.redirect) context.redirect = 0;
      if (++context.redirect > options.follow) {
        throw new Error('Too many redirects');
      } else {
        if (statusCode === 303) options.method = 'GET';
        options.url = headers.location || '';
        handleRequest(options, context);
      }
    } else {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        try {
          let data: any;
          const buffer = Buffer.concat(chunks);
          switch (options.format) {
            case 'buffer':
              data = buffer;
              break;
            case 'json':
              data = JSON.parse(buffer.toString());
              break;
            case 'string':
            default:
              data = buffer.toString();
              break;
          }
          if (!options.validate) {
            options.validate = (statusCode) =>
              statusCode >= 200 && statusCode < 300;
          }
          const response = { status, statusCode, headers, data, res };
          if (options.validate(statusCode || 0)) {
            context.resolve(response);
          } else {
            const error = new RequestError(status, response);
            context.reject(error);
          }
        } catch (error) {
          context.reject(<Error>error);
        }
      });
    }
  } catch (error) {
    context.reject(<Error>error);
  }
}

async function handleRequest(options: RequestOptions, context: RequestContext) {
  try {
    const reqUrl = url.parse(options.url);
    const { body, headers } = parseRequestBody(options);
    const { method = 'GET', timeout, agent } = options;
    const provider = getRequestProvider(reqUrl.protocol || '');
    const req = provider(
      { ...reqUrl, method, headers, timeout, agent },
      (res) => handleCallback(res, options, context),
    );
    req.on('error', (error) => context.reject(error));
    if (body) req.write(body);
    req.end();
  } catch (error) {
    context.reject(<Error>error);
  }
}

async function request(options: RequestOptions) {
  return new Promise(
    (
      resolve: (value: RequestResponse) => void,
      reject: (value: Error) => void,
    ) => {
      handleRequest(options, { resolve, reject });
    },
  );
}

class Request {
  public defaults: Omit<RequestOptions, 'url' | 'method' | 'body'>;
  constructor(options: Omit<RequestOptions, 'url' | 'method' | 'body'>) {
    this.defaults = options;
  }
  request(options: RequestOptions) {
    return request({ ...this.defaults, ...options });
  }
  static isValidateError = isValidateError;
}

export { request, isValidateError, Request, RequestOptions, RequestResponse };
