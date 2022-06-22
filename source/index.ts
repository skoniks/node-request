import {
  Agent as HttpAgent,
  IncomingHttpHeaders,
  IncomingMessage,
  request as http,
} from 'http';
import { Agent as HttpsAgent, request as https } from 'https';
import { urlToHttpOptions } from 'url';

type ReqMethod =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'CONNECT'
  | 'OPTIONS'
  | 'TRACE'
  | 'PATCH';

type ReqHeader = number | string | string[];
interface ReqHeaders extends NodeJS.Dict<ReqHeader> {}

type Agent = HttpAgent | HttpsAgent;

type ResFormat = 'string' | 'json' | 'buffer';

interface ReqOptions {
  url: string;
  method?: ReqMethod;
  headers?: ReqHeaders;
  timeout?: number;
  follow?: number;
  format?: ResFormat;
  agent?: Agent;
  body?: any;
}

interface ReqContext {
  resolve: (value: ReqResponse) => void;
  reject: (value: Error) => void;
  redirect?: number;
}

interface ReqResponse {
  status?: string;
  statusCode?: number;
  headers: IncomingHttpHeaders;
  res: IncomingMessage;
  data: any;
}

const redirectCodes = [301, 302, 303, 307, 308];

function getReqProvider(protocol: string) {
  switch (protocol) {
    case 'http:':
      return http;
    case 'https:':
      return https;
    default:
      throw new Error(`Protocol "${protocol}" not supported.`);
  }
}

function parseReqUrl(url: string) {
  return urlToHttpOptions(new URL(url));
}

function parseReqBody({ body, headers }: ReqOptions) {
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
  res: IncomingMessage,
  options: ReqOptions,
  context: ReqContext,
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
          switch (options.format) {
            case 'buffer':
              data = Buffer.concat(chunks);
              break;
            case 'json':
              data = JSON.parse(Buffer.concat(chunks).toString());
              break;
            case 'string':
            default:
              data = Buffer.concat(chunks).toString();
              break;
          }
          context.resolve({ status, statusCode, headers, data, res });
        } catch (error) {
          context.reject(<Error>error);
        }
      });
    }
  } catch (error) {
    context.reject(<Error>error);
  }
}

async function handleRequest(options: ReqOptions, context: ReqContext) {
  try {
    const url = parseReqUrl(options.url);
    const method = options.method || 'GET';
    const { body, headers } = parseReqBody(options);
    const provider = getReqProvider(url.protocol || '');
    const req = provider({ ...url, method, headers }, (res) =>
      handleCallback(res, options, context),
    );
    req.on('error', (error) => context.reject(error));
    if (body) req.write(body);
    req.end();
  } catch (error) {
    context.reject(<Error>error);
  }
}

async function request(options: ReqOptions) {
  return new Promise(
    (resolve: (value: ReqResponse) => void, reject: (value: Error) => void) => {
      handleRequest(options, { resolve, reject });
    },
  );
}

export { request };
