/**
 * HTTP 请求客户端
 * 用于书源调试的网络请求
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as iconv from 'iconv-lite';

export interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
  charset?: string;
  timeout?: number;
  followRedirects?: boolean;
}

export interface RequestResult {
  success: boolean;
  statusCode?: number;
  headers?: Record<string, string>;
  body?: string;
  error?: string;
  responseTime: number;
  finalUrl?: string;
}

// 默认请求头
const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate',
  Connection: 'keep-alive',
};

// 创建 axios 实例
const createClient = (timeout: number = 30000): AxiosInstance => {
  return axios.create({
    timeout,
    maxRedirects: 5,
    validateStatus: () => true, // 不抛出 HTTP 错误
    responseType: 'arraybuffer', // 获取原始数据以便处理编码
    headers: DEFAULT_HEADERS,
  });
};

/**
 * 检测响应编码
 */
function detectCharset(headers: Record<string, any>, body: Buffer): string {
  // 从 Content-Type 头获取
  const contentType = headers['content-type'] || '';
  const charsetMatch = contentType.match(/charset=([^;]+)/i);
  if (charsetMatch) {
    return charsetMatch[1].trim().toLowerCase();
  }

  // 从 HTML meta 标签获取
  const bodyStr = body.toString('utf8').substring(0, 2000);
  const metaMatch = bodyStr.match(/<meta[^>]+charset=["']?([^"'\s>]+)/i);
  if (metaMatch) {
    return metaMatch[1].toLowerCase();
  }

  // 默认 UTF-8
  return 'utf-8';
}

/**
 * 解码响应体
 */
function decodeBody(body: Buffer, charset: string): string {
  try {
    // 标准化编码名称
    const normalizedCharset = charset.replace(/^gb2312$/i, 'gbk');

    if (iconv.encodingExists(normalizedCharset)) {
      return iconv.decode(body, normalizedCharset);
    }
    return body.toString('utf8');
  } catch {
    return body.toString('utf8');
  }
}

/**
 * 解析请求头字符串
 */
export function parseHeaders(headerStr: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!headerStr) return headers;

  try {
    // 尝试解析 JSON 格式
    const parsed = JSON.parse(headerStr);
    if (typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    // 尝试解析 key: value 格式
    const lines = headerStr.split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join(':').trim();
      }
    }
  }

  return headers;
}

/**
 * 执行 HTTP 请求
 */
export async function httpRequest(
  options: RequestOptions
): Promise<RequestResult> {
  const startTime = Date.now();

  try {
    const client = createClient(options.timeout || 30000);

    // 构建请求配置
    const config: AxiosRequestConfig = {
      url: options.url,
      method: options.method || 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        ...options.headers,
      },
    };

    // 处理请求体
    if (options.body) {
      if (typeof options.body === 'string') {
        config.data = options.body;
      } else {
        config.data = new URLSearchParams(
          options.body as Record<string, string>
        ).toString();
        config.headers!['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }

    // 发送请求
    const response: AxiosResponse<Buffer> = await client.request(config);

    const responseTime = Date.now() - startTime;

    // 检测编码并解码
    const charset =
      options.charset || detectCharset(response.headers, response.data);
    const body = decodeBody(response.data, charset);

    // 转换响应头
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(response.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      } else if (Array.isArray(value)) {
        headers[key] = value.join(', ');
      }
    }

    return {
      success: response.status >= 200 && response.status < 400,
      statusCode: response.status,
      headers,
      body,
      responseTime,
      finalUrl: response.request?.res?.responseUrl || options.url,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
      responseTime: Date.now() - startTime,
    };
  }
}

export default {
  httpRequest,
  parseHeaders,
};
