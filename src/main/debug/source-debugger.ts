/**
 * 书源调试器
 * 核心调试引擎，执行书源规则并返回结果
 * 参考 Legado 实现，确保 100% 兼容
 */
import { httpRequest, parseHeaders, RequestResult } from './http-client';
import {
  parseRule,
  parseList,
  parseFromElement,
  ParseContext,
  formatContent,
  extractImageUrls,
  formatImageContent,
  resolveUrl,
} from './rule-parser';
import { AnalyzeUrl, buildSearchUrl } from './analyze-url';
import type * as cheerio from 'cheerio';

// 书源类型常量
export const BookSourceType = {
  TEXT: 0,    // 文本
  AUDIO: 1,   // 音频
  IMAGE: 2,   // 图片
  FILE: 3,    // 文件
} as const;

// 书源类型定义（与前端一致）
export interface BookSource {
  bookSourceUrl: string;
  bookSourceName: string;
  bookSourceType: number;
  header?: string;
  loginUrl?: string;
  loginUi?: string;
  jsLib?: string;
  searchUrl?: string;
  exploreUrl?: string;
  ruleSearch?: SearchRule;
  ruleExplore?: ExploreRule;
  ruleBookInfo?: BookInfoRule;
  ruleToc?: TocRule;
  ruleContent?: ContentRule;
}

interface BookListRule {
  bookList?: string;
  name?: string;
  author?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  updateTime?: string;
  bookUrl?: string;
  coverUrl?: string;
  wordCount?: string;
}

interface SearchRule extends BookListRule {
  checkKeyWord?: string;
}

interface ExploreRule extends BookListRule {}

interface BookInfoRule {
  init?: string;
  name?: string;
  author?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  updateTime?: string;
  coverUrl?: string;
  tocUrl?: string;
  wordCount?: string;
}

interface TocRule {
  chapterList?: string;
  chapterName?: string;
  chapterUrl?: string;
  isVolume?: string;
  updateTime?: string;
  nextTocUrl?: string;
}

interface ContentRule {
  content?: string;
  nextContentUrl?: string;
  replaceRegex?: string;
  imageStyle?: string;    // 图片样式: FULL=最大宽度
  imageDecode?: string;   // 图片解密JS
  webJs?: string;         // 脚本注入
  sourceRegex?: string;   // 资源正则（用于嗅探）
}

// 调试日志
export interface DebugLog {
  time: string;
  level: 'info' | 'success' | 'warning' | 'error';
  category: 'request' | 'parse' | 'field' | 'error';
  message: string;
  details?: string;
}

// 调试结果
export interface DebugResult {
  success: boolean;
  logs: DebugLog[];
  requestResult?: RequestResult;
  parsedItems?: ParsedBook[] | ParsedChapter[] | string | string[];
  imageUrls?: string[];   // 图片书源的图片URL列表
  nextContentUrl?: string; // 正文下一页链接
  error?: string;
}

// 解析后的书籍
export interface ParsedBook {
  name?: string;
  author?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  updateTime?: string;
  bookUrl?: string;
  coverUrl?: string;
  wordCount?: string;
}

// 解析后的章节
export interface ParsedChapter {
  name?: string;
  url?: string;
  isVolume?: boolean;
  updateTime?: string;
}

/**
 * 检测是否为 data URL
 * data URL 格式: data:;base64,xxx 或 data:application/json;base64,xxx
 */
function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

/**
 * 解析 data URL
 * 支持格式:
 * - data:;base64,xxx,{...}  (大灰狼等书源使用)
 * - data:application/json;base64,xxx
 */
function parseDataUrl(url: string): { data: any; extra?: any } | null {
  if (!isDataUrl(url)) return null;
  
  try {
    // 格式: data:;base64,xxx,{...}
    const match = url.match(/^data:[^,]*,([^,]+)(?:,(.+))?$/);
    if (!match) return null;
    
    const base64Part = match[1];
    const extraPart = match[2];
    
    // 解码 base64
    const decoded = Buffer.from(base64Part, 'base64').toString('utf8');
    let data: any;
    try {
      data = JSON.parse(decoded);
    } catch {
      data = decoded;
    }
    
    // 解析额外参数
    let extra: any;
    if (extraPart) {
      try {
        extra = JSON.parse(extraPart);
      } catch {
        extra = extraPart;
      }
    }
    
    return { data, extra };
  } catch (e) {
    console.error('[parseDataUrl] Error:', e);
    return null;
  }
}

/**
 * 书源调试器类
 */
export class SourceDebugger {
  private source: BookSource;
  private logs: DebugLog[] = [];
  private variables: Record<string, any> = {};
  private initialized: boolean = false;

  constructor(source: BookSource) {
    this.source = source;
    // 设置书源相关变量
    this.variables['_sourceUrl'] = source.bookSourceUrl;
    this.variables['_sourceName'] = source.bookSourceName;
  }

  /**
   * 初始化书源 - 执行 loginUrl 中的初始化代码
   * 参考 Legado BaseSource.kt 的 login() 方法
   * 
   * 很多书源的 searchUrl 中会调用 eval(String(source.loginUrl))
   * 这会执行 loginUrl 中的代码来初始化变量
   */
  private async initSource(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const loginUrl = this.source.loginUrl;
    if (!loginUrl) return;

    // 提取 JS 代码
    let jsCode: string | null = null;
    if (loginUrl.startsWith('@js:')) {
      jsCode = loginUrl.substring(4);
    } else if (loginUrl.startsWith('<js>')) {
      const endIndex = loginUrl.lastIndexOf('</js>');
      jsCode = loginUrl.substring(4, endIndex > 0 ? endIndex : loginUrl.length);
    } else if (!loginUrl.startsWith('http')) {
      // 不是 URL，可能是纯 JS 代码
      jsCode = loginUrl;
    }

    if (jsCode) {
      try {
        // 使用 AnalyzeUrl 执行初始化，它会在构建 URL 时执行 JS
        // 将 loginUrl 作为 URL 传入，让 AnalyzeUrl 处理 JS 执行
        const analyzeUrl = new AnalyzeUrl(`@js:${jsCode}`, {
          source: this.source,
          variables: this.variables,
          baseUrl: this.getBaseUrl(),
        });
        // AnalyzeUrl 构造时会执行 JS，变量会被更新到 this.variables
        this.log('info', 'parse', '书源初始化完成');
      } catch (e: any) {
        this.log('warning', 'parse', `书源初始化失败: ${e.message}`);
      }
    }
  }

  /**
   * 添加日志
   */
  private log(
    level: DebugLog['level'],
    category: DebugLog['category'],
    message: string,
    details?: string
  ) {
    const log: DebugLog = {
      time: new Date().toISOString(),
      level,
      category,
      message,
      details,
    };
    this.logs.push(log);
  }

  /**
   * 获取基础URL
   */
  private getBaseUrl(): string {
    try {
      const url = new URL(this.source.bookSourceUrl);
      return `${url.protocol}//${url.host}`;
    } catch {
      return this.source.bookSourceUrl;
    }
  }

  /**
   * 判断是否为移动端书源
   * 根据 URL 中是否包含 m. / wap. / mobile. 来判断
   */
  private isMobileSource(): boolean {
    return /^https?:\/\/(m\.|wap\.|mobile\.)/i.test(this.source.bookSourceUrl || '');
  }

  /**
   * 从 URL 中提取参数并存储到 variables
   * 支持单独测试目录/正文时，@get:{xxx} 能获取到 URL 中的参数
   */
  private extractUrlParams(url: string): void {
    try {
      // 先移除 Legado 格式的请求配置 (URL,{config})
      let cleanUrl = url;
      const configMatch = url.match(/^(.+?),(\{[\s\S]*\})$/);
      if (configMatch) {
        cleanUrl = configMatch[1];
      }
      
      const urlObj = new URL(cleanUrl);
      // 提取查询参数
      urlObj.searchParams.forEach((value, key) => {
        if (value && !this.variables[key]) {
          this.variables[key] = value;
          this.log('info', 'parse', `从 URL 提取参数: ${key}=${value}`);
        }
      });
      
      // 尝试从路径中提取 ID（常见模式：/book/123/, /comic/456/）
      const pathMatch = cleanUrl.match(/\/(\d+)\/?(?:\?|$)/);
      if (pathMatch && !this.variables['id']) {
        this.variables['id'] = pathMatch[1];
        this.log('info', 'parse', `从 URL 路径提取 ID: ${pathMatch[1]}`);
      }
    } catch {
      // URL 解析失败，忽略
    }
  }

  /**
   * 构建搜索URL - 使用 AnalyzeUrl 完全兼容 Legado
   */
  private buildSearchUrlAnalyze(keyword: string, page: number = 1): AnalyzeUrl | null {
    return buildSearchUrl(this.source, keyword, page, this.variables);
  }

  /**
   * 解析请求头 - 支持 @js: 规则
   */
  private getHeaders(): Record<string, string> {
    if (!this.source.header) {
      return {};
    }

    let headerStr = this.source.header.trim();

    // 处理 @js: 规则
    if (headerStr.startsWith('@js:')) {
      const jsCode = headerStr.substring(4);
      try {
        const vm = require('vm');
        const crypto = require('crypto');
        const sandbox = {
          baseUrl: this.getBaseUrl(),
          source: this.source,
          java: {
            get: (key: string) => this.variables[key],
            put: (key: string, value: any) => {
              this.variables[key] = value;
              return value;
            },
            // MD5 编码
            md5Encode: (str: string) => crypto.createHash('md5').update(str).digest('hex'),
            md5Encode16: (str: string) => crypto.createHash('md5').update(str).digest('hex').substring(8, 24),
            // Base64 编码
            base64Encode: (str: string) => Buffer.from(str).toString('base64'),
            base64Decode: (str: string) => Buffer.from(str, 'base64').toString('utf8'),
            // 时间戳
            timeFormat: (time: number, format?: string) => {
              const d = new Date(time);
              return d.toISOString();
            },
            // WebView UA
            getWebViewUA: () => 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
          },
          JSON,
          Date,
          Math,
          parseInt,
          parseFloat,
          encodeURIComponent,
          decodeURIComponent,
        };
        const result = vm.runInNewContext(jsCode, sandbox, { timeout: 5000 });
        if (typeof result === 'string') {
          headerStr = result;
        } else if (typeof result === 'object') {
          return result as Record<string, string>;
        }
      } catch (e) {
        console.error('[getHeaders] JS execution error:', e);
        return {};
      }
    }

    return parseHeaders(headerStr);
  }

  /**
   * 执行 bookInfoInit 预处理规则
   * 支持正则 AllInOne 和 JS 规则
   */
  private executeBookInfoInit(initRule: string, body: string): any {
    if (!initRule) return null;
    
    const vm = require('vm');
    const crypto = require('crypto');
    
    // 正则 AllInOne 模式 (以 : 开头)
    if (initRule.startsWith(':')) {
      const pattern = initRule.substring(1);
      const regex = new RegExp(pattern);
      const match = regex.exec(body);
      if (match) {
        // 返回捕获组作为对象
        const result: Record<string, string> = {};
        for (let i = 1; i < match.length; i++) {
          result[String.fromCharCode(96 + i)] = match[i] || ''; // a, b, c, ...
        }
        return result;
      }
      return null;
    }
    
    // JSONPath 规则 (以 $. 或 $[ 开头，或以 @json: 开头)
    if (initRule.startsWith('$.') || initRule.startsWith('$[') || initRule.startsWith('@json:')) {
      try {
        const { JSONPath } = require('jsonpath-plus');
        const jsonRule = initRule.startsWith('@json:') ? initRule.substring(6) : initRule;
        const json = JSON.parse(body);
        const results = JSONPath({ path: jsonRule, json, wrap: false });
        return results;
      } catch (e: any) {
        console.error('[executeBookInfoInit] JSONPath error:', e.message);
        return null;
      }
    }
    
    // JS 规则 (以 @js: 或 <js> 开头)
    if (!initRule.startsWith('@js:') && !initRule.startsWith('<js>')) {
      // 不是 JS 规则，尝试作为 CSS 选择器处理
      try {
        const cheerio = require('cheerio');
        const $ = cheerio.load(body);
        const result = $(initRule).first();
        if (result.length) {
          return result.html() || result.text();
        }
      } catch {}
      return null;
    }
    
    const jsCode = initRule.startsWith('@js:') ? initRule.substring(4) : 
                   initRule.replace(/<\/?js>/gi, '');
    
    const { createSymmetricCrypto } = require('./rule-parser');
    const { JSONPath } = require('jsonpath-plus');
    const cheerio = require('cheerio');
    const self = this;
    
    const sandbox = {
      result: body,
      baseUrl: this.getBaseUrl(),
      source: this.source,
      java: {
        get: (key: string) => self.variables[key],
        put: (key: string, value: any) => {
          self.variables[key] = value;
          return value;
        },
        ajax: (url: string) => {
          const { syncHttpRequest } = require('./http-client');
          try {
            return syncHttpRequest(url).body;
          } catch {
            return '';
          }
        },
        base64Decode: (str: string) => Buffer.from(str, 'base64').toString('utf8'),
        base64Encode: (str: string) => Buffer.from(str).toString('base64'),
        md5Encode: (str: string) => crypto.createHash('md5').update(str).digest('hex'),
        // AES 加解密
        aesBase64DecodeToString: (str: string, key: string, transformation: string, iv: string) => {
          try {
            return createSymmetricCrypto(transformation, key, iv).decryptStr(str);
          } catch { return ''; }
        },
        aesDecodeToString: (data: string, key: string, transformation: string, iv: string) => {
          try {
            return createSymmetricCrypto(transformation, key, iv).decryptStr(data);
          } catch { return ''; }
        },
        // 时间格式化
        timeFormat: (time: number | string) => {
          try {
            const timestamp = typeof time === 'string' ? parseInt(time) : time;
            if (isNaN(timestamp) || !isFinite(timestamp)) return '';
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().replace('T', ' ').replace('Z', '');
          } catch { return ''; }
        },
        // getString - 从内容中提取字符串
        getString: (rule: string, mContent?: any, isUrl?: boolean) => {
          if (!rule) return '';
          const content = mContent || body;
          try {
            // JSONPath 规则
            if (rule.startsWith('$.') || rule.startsWith('$[') || rule.startsWith('@json:')) {
              const jsonRule = rule.startsWith('@json:') ? rule.substring(6) : rule;
              const json = typeof content === 'string' ? JSON.parse(content) : content;
              const results = JSONPath({ path: jsonRule, json, wrap: false });
              return Array.isArray(results) ? results[0]?.toString() || '' : results?.toString() || '';
            }
            // CSS 选择器
            const $ = cheerio.load(content);
            const parts = rule.split('@');
            const selector = parts.slice(0, -1).join('@') || parts[0];
            const attr = parts.length > 1 ? parts[parts.length - 1] : 'text';
            const el = $(selector).first();
            if (attr === 'text') return el.text().trim();
            if (attr === 'html') return el.html() || '';
            return el.attr(attr) || '';
          } catch { return ''; }
        },
        // getStringList - 从内容中提取字符串列表
        getStringList: (rule: string, mContent?: any, isUrl?: boolean) => {
          if (!rule) return [];
          const content = mContent || body;
          try {
            if (rule.startsWith('$.') || rule.startsWith('$[') || rule.startsWith('@json:')) {
              const jsonRule = rule.startsWith('@json:') ? rule.substring(6) : rule;
              const json = typeof content === 'string' ? JSON.parse(content) : content;
              const results = JSONPath({ path: jsonRule, json, wrap: true });
              const arr = Array.isArray(results) ? results : [results];
              (arr as any).toArray = () => arr;
              return arr;
            }
            return [];
          } catch { return []; }
        },
      },
      JSON,
      console,
      String,
      Math,
    };
    
    try {
      const vmContext = vm.createContext(sandbox);
      const script = new vm.Script(jsCode);
      return script.runInContext(vmContext, { timeout: 5000 });
    } catch (e: any) {
      console.error('[executeBookInfoInit] JS error:', e.message);
      return null;
    }
  }

  /**
   * 执行搜索测试 - 完全兼容 Legado
   */
  async debugSearch(keyword: string): Promise<DebugResult> {
    this.logs = [];

    try {
      // 0. 初始化书源（执行 loginUrl 中的初始化代码）
      await this.initSource();

      // 1. 使用 AnalyzeUrl 构建搜索URL (兼容 Legado 的 <js>, @js:, {{}} 等语法)
      const analyzeUrl = this.buildSearchUrlAnalyze(keyword);
      if (!analyzeUrl) {
        this.log('error', 'error', '搜索URL为空');
        return { success: false, logs: this.logs, error: '搜索URL为空' };
      }

      const searchUrl = analyzeUrl.getUrl();
      const method = analyzeUrl.getMethod();
      const headers = { ...this.getHeaders(), ...analyzeUrl.getHeaders() };
      const body = analyzeUrl.getBody();

      this.log('info', 'request', `构建搜索URL: ${searchUrl}`);

      let responseBody = '';
      let requestResult: RequestResult | undefined;

      // 2. 检查是否是 data URL（某些书源用 data URL 传递参数给 ruleSearch）
      if (searchUrl.startsWith('data:')) {
        this.log('info', 'request', 'data URL 模式，参数将传递给解析规则');
        // 从 data URL 中提取数据作为 result
        // 格式: data:;base64,xxx 或 data:text/plain,xxx
        const dataMatch = searchUrl.match(/^data:([^,]*),(.*)$/);
        if (dataMatch) {
          const [, mimeType, data] = dataMatch;
          if (mimeType.includes('base64')) {
            // Base64 编码的数据需要转换为 hex 格式供 JS 解码
            // Legado 的 bookList JS 使用 java.hexDecodeToString 解码
            const decoded = Buffer.from(data, 'base64');
            responseBody = decoded.toString('hex');
            this.log('info', 'request', `data URL 解码: ${decoded.toString('utf8')}`);
          } else {
            responseBody = decodeURIComponent(data);
          }
        } else {
          responseBody = searchUrl;
        }
      } else {
        // 正常 HTTP 请求
        if (method === 'POST') {
          this.log('info', 'request', `请求方法: POST, Body: ${body?.substring(0, 200) || '(空)'}`);
        }

        requestResult = await httpRequest({
          url: searchUrl,
          method,
          headers,
          body: body || undefined,
        });

        if (!requestResult.success) {
          this.log('error', 'request', `请求失败: ${requestResult.error}`);
          return {
            success: false,
            logs: this.logs,
            requestResult,
            error: requestResult.error,
          };
        }

        this.log(
          'success',
          'request',
          `请求成功 ${requestResult.statusCode} (${requestResult.responseTime}ms)`
        );
        
        responseBody = requestResult.body || '';
      }

      // 3. 解析书籍列表
      const ruleSearch = this.source.ruleSearch;
      if (!ruleSearch) {
        this.log('warning', 'parse', '未配置搜索规则');
        return {
          success: true,
          logs: this.logs,
          requestResult,
          parsedItems: [],
        };
      }

      // 设置书源相关变量供 JS 规则使用
      this.variables['_sourceUrl'] = this.getBaseUrl();
      this.variables['_source'] = this.source;
      
      // 加载 jsLib（书源的 JS 库）
      if (this.source.jsLib) {
        this.variables['_jsLib'] = this.source.jsLib;
      }

      const ctx: ParseContext = {
        body: responseBody,
        baseUrl: this.getBaseUrl(),
        variables: this.variables,
      };

      // 解析书籍列表
      const bookList = parseList(ctx, ruleSearch.bookList || '');
      this.log(
        'info',
        'parse',
        `书籍列表规则 "${ruleSearch.bookList}" 匹配到 ${bookList.length} 个元素`
      );

      if (bookList.length === 0) {
        this.log('warning', 'parse', '未匹配到任何书籍');
        return {
          success: true,
          logs: this.logs,
          requestResult,
          parsedItems: [],
        };
      }

      // 4. 解析每本书的字段
      const parsedBooks: ParsedBook[] = [];

      for (let i = 0; i < Math.min(bookList.length, 20); i++) {
        // 最多解析20本
        const element = bookList[i];
        const book: ParsedBook = {};
        
        // 检查元素是否为 JSON 对象（用于 JSON 规则解析）
        const isJsonElement = typeof element === 'object' && 
          !('html' in element && typeof (element as any).html === 'function');

        // 解析各字段（按顺序，先解析基本字段，再解析可能依赖它们的字段）
        const basicFields: (keyof BookListRule)[] = [
          'name',
          'author',
          'intro',
          'kind',
          'lastChapter',
          'updateTime',
          'coverUrl',
          'wordCount',
        ];
        
        // 先解析基本字段
        for (const field of basicFields) {
          const rule = ruleSearch[field];
          if (rule) {
            // 传递已解析的书籍数据作为变量（用于 JS 规则）
            const variables = isJsonElement ? { _jsResult: element } : {};
            const result = parseFromElement(
              element as cheerio.Cheerio<any>,
              rule,
              this.getBaseUrl(),
              variables
            );
            if (result.success && result.data) {
              (book as any)[field] = Array.isArray(result.data)
                ? result.data[0]
                : result.data;
              this.log(
                'success',
                'field',
                `[${i + 1}] ${field}: ${String((book as any)[field]).slice(0, 50)}`
              );
            } else if (result.error) {
              this.log(
                'warning',
                'field',
                `[${i + 1}] ${field} 解析失败: ${result.error}`
              );
            }
          }
        }
        
        // 再解析 bookUrl（可能依赖其他字段）
        const bookUrlRule = ruleSearch.bookUrl;
        if (bookUrlRule) {
          // 将已解析的书籍数据和原始元素数据合并，传递给 JS 规则
          const jsResultData = isJsonElement ? { ...element as object, ...book } : book;
          const variables = { _jsResult: jsResultData, _book: book };
          const result = parseFromElement(
            element as cheerio.Cheerio<any>,
            bookUrlRule,
            this.getBaseUrl(),
            variables
          );
          if (result.success && result.data) {
            book.bookUrl = Array.isArray(result.data)
              ? result.data[0]
              : result.data;
            this.log(
              'success',
              'field',
              `[${i + 1}] bookUrl: ${String(book.bookUrl).slice(0, 80)}`
            );
          } else if (result.error) {
            this.log(
              'warning',
              'field',
              `[${i + 1}] bookUrl 解析失败: ${result.error}`
            );
          }
        }

        if (book.name || book.bookUrl) {
          parsedBooks.push(book);
        }
      }

      this.log('success', 'parse', `成功解析 ${parsedBooks.length} 本书籍`);

      return {
        success: true,
        logs: this.logs,
        requestResult,
        parsedItems: parsedBooks,
      };
    } catch (error: any) {
      this.log('error', 'error', `调试异常: ${error.message}`);
      return { success: false, logs: this.logs, error: error.message };
    }
  }

  /**
   * 执行发现测试
   * exploreUrl 格式: 分类名称::URL 或直接 URL
   */
  async debugExplore(exploreUrl: string): Promise<DebugResult> {
    this.logs = [];

    try {
      // 解析 exploreUrl - 可能是 "分类名::URL" 格式
      let url = exploreUrl;
      let categoryName = '';
      
      if (exploreUrl.includes('::')) {
        const parts = exploreUrl.split('::');
        categoryName = parts[0];
        url = parts[1];
        this.log('info', 'request', `发现分类: ${categoryName}`);
      }

      // 如果没有提供 URL，尝试从 source.exploreUrl 解析
      if (!url && this.source.exploreUrl) {
        // exploreUrl 格式: 分类1::url1\n分类2::url2
        const lines = this.source.exploreUrl.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
          const firstLine = lines[0];
          if (firstLine.includes('::')) {
            url = firstLine.split('::')[1];
          } else {
            url = firstLine;
          }
        }
      }

      if (!url) {
        this.log('error', 'error', '发现URL为空');
        return { success: false, logs: this.logs, error: '发现URL为空' };
      }

      // 构建完整 URL
      if (!url.startsWith('http')) {
        url = this.getBaseUrl() + (url.startsWith('/') ? '' : '/') + url;
      }

      this.log('info', 'request', `请求发现页: ${url}`);

      // 发送请求
      const requestResult = await httpRequest({
        url,
        headers: this.getHeaders(),
      });

      if (!requestResult.success) {
        this.log('error', 'request', `请求失败: ${requestResult.error}`);
        return {
          success: false,
          logs: this.logs,
          requestResult,
          error: requestResult.error,
        };
      }

      this.log(
        'success',
        'request',
        `请求成功 ${requestResult.statusCode} (${requestResult.responseTime}ms)`
      );

      const responseBody = requestResult.body || '';

      // 使用 ruleExplore 或 ruleSearch 解析
      // 参考 Legado BookList.kt: 当 exploreRule.bookList 为空时，使用 searchRule
      let bookListRule: BookListRule | undefined;
      
      if (this.source.ruleExplore?.bookList) {
        // exploreRule.bookList 不为空，使用 exploreRule
        bookListRule = this.source.ruleExplore;
        this.log('info', 'parse', '使用发现规则解析');
      } else if (this.source.ruleSearch?.bookList) {
        // exploreRule.bookList 为空，回退到 searchRule
        bookListRule = this.source.ruleSearch;
        this.log('info', 'parse', '发现规则的 bookList 为空，使用搜索规则解析');
      }
      
      if (!bookListRule) {
        this.log('warning', 'parse', '未配置发现规则和搜索规则');
        return {
          success: true,
          logs: this.logs,
          requestResult,
          parsedItems: [],
        };
      }

      // 存储 jsLib
      if (this.source.jsLib) {
        this.variables['_jsLib'] = this.source.jsLib;
      }

      const ctx: ParseContext = {
        body: responseBody,
        baseUrl: this.getBaseUrl(),
        variables: this.variables,
      };

      // 解析书籍列表
      const bookList = parseList(ctx, bookListRule.bookList || '');
      this.log(
        'info',
        'parse',
        `书籍列表规则 "${bookListRule.bookList}" 匹配到 ${bookList.length} 个元素`
      );

      if (bookList.length === 0) {
        this.log('warning', 'parse', '未匹配到任何书籍');
        return {
          success: true,
          logs: this.logs,
          requestResult,
          parsedItems: [],
        };
      }

      // 解析每本书的字段
      const parsedBooks: ParsedBook[] = [];

      for (let i = 0; i < Math.min(bookList.length, 20); i++) {
        const element = bookList[i];
        const book: ParsedBook = {};
        
        const isJsonElement = typeof element === 'object' && 
          !('html' in element && typeof (element as any).html === 'function');

        const fields: (keyof BookListRule)[] = [
          'name', 'author', 'intro', 'kind', 'lastChapter',
          'updateTime', 'coverUrl', 'wordCount', 'bookUrl',
        ];

        for (const field of fields) {
          const rule = bookListRule[field];
          if (rule) {
            const variables = isJsonElement ? { _jsResult: element } : {};
            const result = parseFromElement(
              element as cheerio.Cheerio<any>,
              rule,
              this.getBaseUrl(),
              variables
            );
            if (result.success && result.data) {
              (book as any)[field] = Array.isArray(result.data)
                ? result.data[0]
                : result.data;
            }
          }
        }

        if (book.name || book.bookUrl) {
          parsedBooks.push(book);
        }
      }

      this.log('success', 'parse', `成功解析 ${parsedBooks.length} 本书籍`);

      return {
        success: true,
        logs: this.logs,
        requestResult,
        parsedItems: parsedBooks,
      };
    } catch (error: any) {
      this.log('error', 'error', `调试异常: ${error.message}`);
      return { success: false, logs: this.logs, error: error.message };
    }
  }

  /**
   * 执行书籍详情测试
   * 支持普通 URL 和 data URL
   * data URL 格式: data:;base64,xxx - 解码后的数据直接作为响应体供规则解析
   */
  async debugBookInfo(bookUrl: string): Promise<DebugResult> {
    this.logs = [];

    try {
      let requestResult: RequestResult | undefined;
      let body = '';
      
      // 检查是否为 data URL
      if (isDataUrl(bookUrl)) {
        const parsed = parseDataUrl(bookUrl);
        if (parsed) {
          this.log('info', 'request', `解析 data URL`);
          
          // 将 data URL 中的数据存入变量，供规则使用
          this.variables['_dataUrlData'] = parsed.data;
          this.variables['_dataUrlExtra'] = parsed.extra;
          
          // data URL 解码后的数据直接作为响应体
          body = typeof parsed.data === 'string' ? parsed.data : JSON.stringify(parsed.data);
          requestResult = {
            success: true,
            statusCode: 200,
            body,
            headers: {},
            responseTime: 0,
          };
          
          this.log('success', 'request', `data URL 解码成功，数据长度: ${body.length}`);
        } else {
          this.log('error', 'request', 'data URL 解析失败');
          return { success: false, logs: this.logs, error: 'data URL 解析失败' };
        }
      } else {
        // 普通 URL 处理
        let url = bookUrl;
        let customHeaders: Record<string, string> = {};
        let method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET';
        let requestBody: string | undefined;
        let useWebView = false;
        
        // 检查是否包含 Legado 格式的请求配置 (URL,{config})
        const configMatch = url.match(/^(.+?),(\{[\s\S]*\})$/);
        if (configMatch) {
          url = configMatch[1];
          try {
            const config = JSON.parse(configMatch[2]);
            if (config.headers) {
              customHeaders = config.headers;
            }
            if (config.method) {
              const m = config.method.toUpperCase();
              if (m === 'GET' || m === 'POST' || m === 'PUT' || m === 'DELETE') {
                method = m;
              }
            }
            if (config.body) {
              requestBody = typeof config.body === 'string' ? config.body : JSON.stringify(config.body);
            }
            if (config.webView === true) {
              useWebView = true;
            }
          } catch (e) {
            // 解析失败，忽略配置
          }
        }
        
        if (!url.startsWith('http')) {
          url = this.getBaseUrl() + (url.startsWith('/') ? '' : '/') + url;
        }

        this.log('info', 'request', `请求书籍详情: ${url}${useWebView ? ' (WebView)' : ''}`);

        if (useWebView) {
          // 使用 WebView 获取渲染后的页面
          try {
            const { webView } = require('./webview');
            const webViewResult = await webView({
              url,
              headers: { ...this.getHeaders(), ...customHeaders },
              delayTime: 2000,
              isMobile: this.isMobileSource(),
            });
            
            if (webViewResult.success) {
              requestResult = {
                success: true,
                statusCode: 200,
                body: webViewResult.body,
                headers: {},
                responseTime: 0,
              };
              this.log('success', 'request', 'WebView 渲染成功');
            } else {
              this.log('warning', 'request', `WebView 失败: ${webViewResult.error}，降级到普通请求`);
              requestResult = await httpRequest({
                url,
                method,
                headers: { ...this.getHeaders(), ...customHeaders },
                body: requestBody,
              });
            }
          } catch (e: any) {
            this.log('warning', 'request', `WebView 异常: ${e.message}，降级到普通请求`);
            requestResult = await httpRequest({
              url,
              method,
              headers: { ...this.getHeaders(), ...customHeaders },
              body: requestBody,
            });
          }
        } else {
          requestResult = await httpRequest({
            url,
            method,
            headers: { ...this.getHeaders(), ...customHeaders },
            body: requestBody,
          });
        }
        
        body = requestResult.body || '';
        
        if (!requestResult.success) {
          this.log('error', 'request', `请求失败: ${requestResult.error}`);
          return {
            success: false,
            logs: this.logs,
            requestResult,
            error: requestResult.error,
          };
        }

        this.log(
          'success',
          'request',
          `请求成功 ${requestResult.statusCode} (${requestResult.responseTime}ms)`
        );
      }

      // 解析书籍信息
      const ruleBookInfo = this.source.ruleBookInfo;
      if (!ruleBookInfo) {
        this.log('warning', 'parse', '未配置详情规则');
        return {
          success: true,
          logs: this.logs,
          requestResult,
          parsedItems: [],
        };
      }

      // 处理 bookInfoInit 预处理规则
      let processedBody = body;
      if (ruleBookInfo.init) {
        this.log('info', 'parse', '执行 bookInfoInit 预处理规则');
        try {
          const initResult = this.executeBookInfoInit(ruleBookInfo.init, body);
          if (initResult) {
            // 如果返回 JSON 对象，存储供后续规则使用
            this.variables['_bookInfoInit'] = initResult;
            // 同时存储为 _jsResult，供 {{$.xxx}} 变量替换使用
            this.variables['_jsResult'] = initResult;
            processedBody = typeof initResult === 'string' ? initResult : JSON.stringify(initResult);
            this.log('success', 'parse', 'bookInfoInit 预处理成功');
          }
        } catch (e: any) {
          this.log('warning', 'parse', `bookInfoInit 执行失败: ${e.message}`);
        }
      }

      const ctx: ParseContext = {
        body: processedBody,
        baseUrl: this.getBaseUrl(),
        variables: this.variables,
      };

      const book: ParsedBook = {};
      const fields: (keyof BookInfoRule)[] = [
        'name',
        'author',
        'intro',
        'kind',
        'lastChapter',
        'updateTime',
        'coverUrl',
        'tocUrl',
        'wordCount',
      ];

      for (const field of fields) {
        const rule = ruleBookInfo[field];
        if (rule) {
          const result = parseRule(ctx, rule);
          if (result.success && result.data) {
            (book as any)[field] = Array.isArray(result.data)
              ? result.data[0]
              : result.data;
            this.log('success', 'field', `${field}: ${(book as any)[field]}`);
          } else if (result.error) {
            this.log('warning', 'field', `${field} 解析失败: ${result.error}`);
          }
        }
      }

      return {
        success: true,
        logs: this.logs,
        requestResult,
        parsedItems: [book],
      };
    } catch (error: any) {
      this.log('error', 'error', `调试异常: ${error.message}`);
      return { success: false, logs: this.logs, error: error.message };
    }
  }

  /**
   * 执行目录测试
   * 支持普通 URL 和 data URL
   * data URL 格式: data:;base64,xxx - 解码后的数据直接作为响应体供规则解析
   */
  async debugToc(tocUrl: string): Promise<DebugResult> {
    this.logs = [];

    try {
      // 尝试从 URL 中提取常见的 ID 参数并存储到 variables
      // 这样即使没有经过详情页，@get:{xxx} 也能获取到值
      this.extractUrlParams(tocUrl);
      
      let requestResult: RequestResult | undefined;
      let body = '';
      
      // 检查是否为 data URL
      if (isDataUrl(tocUrl)) {
        const parsed = parseDataUrl(tocUrl);
        if (parsed) {
          this.log('info', 'request', `解析 data URL`);
          
          this.variables['_dataUrlData'] = parsed.data;
          this.variables['_dataUrlExtra'] = parsed.extra;
          
          // data URL 解码后的数据直接作为响应体
          body = typeof parsed.data === 'string' ? parsed.data : JSON.stringify(parsed.data);
          requestResult = {
            success: true,
            statusCode: 200,
            body,
            headers: {},
            responseTime: 0,
          };
          
          this.log('success', 'request', `data URL 解码成功，数据长度: ${body.length}`);
        } else {
          this.log('error', 'request', 'data URL 解析失败');
          return { success: false, logs: this.logs, error: 'data URL 解析失败' };
        }
      } else {
        // 普通 URL 处理
        let url = tocUrl;
        let customHeaders: Record<string, string> = {};
        let method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET';
        let requestBody: string | undefined;
        let useWebView = false;
        
        // 检查是否包含 Legado 格式的请求配置 (URL,{config})
        const configMatch = url.match(/^(.+?),(\{[\s\S]*\})$/);
        if (configMatch) {
          url = configMatch[1];
          try {
            const config = JSON.parse(configMatch[2]);
            if (config.headers) {
              customHeaders = config.headers;
            }
            if (config.method) {
              const m = config.method.toUpperCase();
              if (m === 'GET' || m === 'POST' || m === 'PUT' || m === 'DELETE') {
                method = m;
              }
            }
            if (config.body) {
              requestBody = typeof config.body === 'string' ? config.body : JSON.stringify(config.body);
            }
            if (config.webView === true) {
              useWebView = true;
            }
          } catch (e) {
            // 解析失败，忽略配置
          }
        }
        
        if (!url.startsWith('http')) {
          url = this.getBaseUrl() + (url.startsWith('/') ? '' : '/') + url;
        }

        this.log('info', 'request', `请求目录: ${url}${useWebView ? ' (WebView)' : ''}`);

        if (useWebView) {
          // 使用 WebView 获取渲染后的页面
          try {
            const { webView } = require('./webview');
            const webViewResult = await webView({
              url,
              headers: { ...this.getHeaders(), ...customHeaders },
              delayTime: 2000,
              isMobile: this.isMobileSource(),
            });
            
            if (webViewResult.success) {
              requestResult = {
                success: true,
                statusCode: 200,
                body: webViewResult.body,
                headers: {},
                responseTime: 0,
              };
              this.log('success', 'request', 'WebView 渲染成功');
            } else {
              this.log('warning', 'request', `WebView 失败: ${webViewResult.error}，降级到普通请求`);
              requestResult = await httpRequest({
                url,
                method,
                headers: { ...this.getHeaders(), ...customHeaders },
                body: requestBody,
              });
            }
          } catch (e: any) {
            this.log('warning', 'request', `WebView 异常: ${e.message}，降级到普通请求`);
            requestResult = await httpRequest({
              url,
              method,
              headers: { ...this.getHeaders(), ...customHeaders },
              body: requestBody,
            });
          }
        } else {
          requestResult = await httpRequest({
            url,
            method,
            headers: { ...this.getHeaders(), ...customHeaders },
            body: requestBody,
          });
        }
        
        body = requestResult.body || '';
        
        if (!requestResult.success) {
          this.log('error', 'request', `请求失败: ${requestResult.error}`);
          return {
            success: false,
            logs: this.logs,
            requestResult,
            error: requestResult.error,
          };
        }

        this.log(
          'success',
          'request',
          `请求成功 ${requestResult.statusCode} (${requestResult.responseTime}ms)`
        );
      }

      const ruleToc = this.source.ruleToc;
      if (!ruleToc) {
        this.log('warning', 'parse', '未配置目录规则');
        return {
          success: true,
          logs: this.logs,
          requestResult,
          parsedItems: [],
        };
      }

      const ctx: ParseContext = {
        body,
        baseUrl: this.getBaseUrl(),
        variables: this.variables,
      };

      // 解析章节列表
      const chapterList = parseList(ctx, ruleToc.chapterList || '');
      this.log(
        'info',
        'parse',
        `章节列表规则匹配到 ${chapterList.length} 个元素`
      );

      const chapters: ParsedChapter[] = [];

      for (let i = 0; i < chapterList.length; i++) {
        const element = chapterList[i];
        const chapter: ParsedChapter = {};

        // 章节名
        if (ruleToc.chapterName) {
          const result = parseFromElement(
            element as cheerio.Cheerio<any>,
            ruleToc.chapterName,
            this.getBaseUrl(),
            this.variables  // 传递变量
          );
          if (result.success && result.data) {
            chapter.name = Array.isArray(result.data)
              ? result.data[0]
              : result.data;
          }
        }

        // 章节URL
        if (ruleToc.chapterUrl) {
          const result = parseFromElement(
            element as cheerio.Cheerio<any>,
            ruleToc.chapterUrl,
            this.getBaseUrl(),
            this.variables  // 传递变量，支持 @get
          );
          if (result.success && result.data) {
            chapter.url = Array.isArray(result.data)
              ? result.data[0]
              : result.data;
          }
        }

        // 是否卷
        if (ruleToc.isVolume) {
          const result = parseFromElement(
            element as cheerio.Cheerio<any>,
            ruleToc.isVolume,
            this.getBaseUrl()
          );
          chapter.isVolume = result.success && !!result.data;
        }

        if (chapter.name || chapter.url) {
          chapters.push(chapter);
          
          // 输出前5个和最后1个章节的详细信息
          if (i < 5) {
            this.log('info', 'parse', `[${i + 1}] 章节: ${chapter.name || '(无名称)'} | 链接: ${chapter.url || '(无链接)'}`);
          } else if (i === 5 && chapterList.length > 6) {
            this.log('info', 'parse', `... 省略中间 ${chapterList.length - 6} 个章节 ...`);
          } else if (i === chapterList.length - 1 && chapterList.length > 5) {
            this.log('info', 'parse', `[${i + 1}] 章节: ${chapter.name || '(无名称)'} | 链接: ${chapter.url || '(无链接)'}`);
          }
        }
      }

      // 统计信息
      const withUrl = chapters.filter(ch => ch.url).length;
      const withName = chapters.filter(ch => ch.name).length;
      this.log('success', 'parse', `成功解析 ${chapters.length} 个章节 (有名称: ${withName}, 有链接: ${withUrl})`);

      return {
        success: true,
        logs: this.logs,
        requestResult,
        parsedItems: chapters,
      };
    } catch (error: any) {
      this.log('error', 'error', `调试异常: ${error.message}`);
      return { success: false, logs: this.logs, error: error.message };
    }
  }

  /**
   * 执行正文测试
   * 支持普通 HTTP 请求和 WebView 渲染
   */
  async debugContent(contentUrl: string, useWebView: boolean = false): Promise<DebugResult> {
    this.logs = [];

    try {
      // 从 URL 中提取参数（支持单独测试正文时 @get 能获取值）
      this.extractUrlParams(contentUrl);
      
      let url = contentUrl;
      let customHeaders: Record<string, string> = {};
      
      // 检查是否包含 Legado 格式的请求配置 (URL,{config})
      const configMatch = url.match(/^(.+?),(\{[\s\S]*\})$/);
      if (configMatch) {
        url = configMatch[1];
        try {
          // 将单引号替换为双引号以便 JSON 解析
          const configStr = configMatch[2].replace(/'/g, '"');
          const config = JSON.parse(configStr);
          if (config.headers) {
            customHeaders = config.headers;
          }
          if (config.webView === true) {
            useWebView = true;
          }
        } catch (e) {
          // 解析失败，忽略配置
        }
      }
      
      if (!url.startsWith('http')) {
        url = this.getBaseUrl() + (url.startsWith('/') ? '' : '/') + url;
      }

      this.log('info', 'request', `请求正文: ${url}${useWebView ? ' (WebView)' : ''}`);

      let requestResult: RequestResult;
      
      const headers = { ...this.getHeaders(), ...customHeaders };
      
      if (useWebView) {
        // 使用 WebView 获取渲染后的页面
        try {
          const { webView } = require('./webview');
          const webViewResult = await webView({
            url,
            headers,
            delayTime: 2000, // 等待 JS 渲染
            isMobile: this.isMobileSource(), // 根据书源自动判断
          });
          
          if (webViewResult.success) {
            requestResult = {
              success: true,
              statusCode: 200,
              body: webViewResult.body,
              headers: {},
              responseTime: 0,
            };
            this.log('success', 'request', 'WebView 渲染成功');
          } else {
            this.log('warning', 'request', `WebView 失败: ${webViewResult.error}`);
            // 降级到普通请求
            requestResult = await httpRequest({
              url,
              headers,
            });
          }
        } catch (e: any) {
          this.log('warning', 'request', `WebView 异常: ${e.message}`);
          requestResult = await httpRequest({
            url,
            headers,
          });
        }
      } else {
        requestResult = await httpRequest({
          url,
          headers,
        });
      }

      if (!requestResult.success) {
        this.log('error', 'request', `请求失败: ${requestResult.error}`);
        return {
          success: false,
          logs: this.logs,
          requestResult,
          error: requestResult.error,
        };
      }

      this.log(
        'success',
        'request',
        `请求成功 ${requestResult.statusCode} (${requestResult.responseTime}ms)`
      );

      const ruleContent = this.source.ruleContent;
      if (!ruleContent) {
        this.log('warning', 'parse', '未配置正文规则');
        return {
          success: true,
          logs: this.logs,
          requestResult,
          parsedItems: requestResult.body,
        };
      }

      const ctx: ParseContext = {
        body: requestResult.body || '',
        baseUrl: this.getBaseUrl(),
        variables: this.variables,
      };

      // 解析正文
      let content = '';
      if (ruleContent.content) {
        const result = parseRule(ctx, ruleContent.content);
        if (result.success && result.data) {
          if (Array.isArray(result.data)) {
            // 过滤空值并合并
            content = result.data.filter(Boolean).join('\n');
          } else {
            content = String(result.data);
          }
          this.log('success', 'field', `正文内容长度: ${content.length}`);
        } else if (result.error) {
          this.log('warning', 'field', `正文解析失败: ${result.error}`);
        }

        // 如果正文为空或太短，尝试用 text 属性重新解析
        if ((!content || content.length < 100) && ruleContent.content) {
          const textRule = ruleContent.content
            .replace(/@textNodes$/, '@text')
            .replace(/@html$/, '@text');
          const textResult = parseRule(ctx, textRule);
          if (textResult.success && textResult.data) {
            const textContent = Array.isArray(textResult.data) 
              ? textResult.data.filter(Boolean).join('\n')
              : String(textResult.data);
            if (textContent.length > content.length) {
              content = textContent;
              this.log(
                'info',
                'field',
                `使用 text 属性重新解析，长度: ${content.length}`
              );
            }
          }
        }
        
        // 如果正文仍然太短且未使用 WebView，尝试用 WebView 重新获取
        // 但如果响应是 JSON 格式，不使用 WebView（API 不需要渲染）
        const isJsonResponse = (requestResult.body || '').trim().startsWith('{') || 
                               (requestResult.body || '').trim().startsWith('[');
        if (content.length < 100 && !useWebView && !isJsonResponse) {
          this.log('info', 'parse', '正文太短，尝试使用 WebView 重新获取');
          return this.debugContent(contentUrl, true);
        }
      }

      // 根据书源类型处理内容
      // 注意：即使 bookSourceType 不是 IMAGE，如果内容包含 <img> 标签也按图片处理
      const isImageSource = this.source.bookSourceType === BookSourceType.IMAGE;
      const hasImgTags = content.includes('<img');
      let imageUrls: string[] = [];

      if (isImageSource || hasImgTags) {
        // 图片书源或内容包含图片：提取图片URL列表
        if (hasImgTags && !isImageSource) {
          this.log('info', 'parse', '检测到图片内容，按图片模式处理');
        } else {
          this.log('info', 'parse', '图片书源模式');
        }
        this.log('info', 'parse', `正文内容预览: ${content.substring(0, 200)}`);
        imageUrls = extractImageUrls(content, url);
        
        if (imageUrls.length > 0) {
          this.log('success', 'field', `提取到 ${imageUrls.length} 张图片`);
          // 同时保留格式化的HTML内容（带img标签）
          content = formatImageContent(content, url);
        } else {
          this.log('warning', 'field', '未找到图片');
          // 尝试直接从原始响应中提取图片
          imageUrls = extractImageUrls(requestResult.body || '', url);
          if (imageUrls.length > 0) {
            this.log('info', 'field', `从原始响应提取到 ${imageUrls.length} 张图片`);
          }
        }
      } else {
        // 文本书源：格式化为纯文本
        if (content) {
          content = formatContent(content);
          this.log('info', 'parse', `格式化后长度: ${content.length}`);
        }
      }

      // 应用替换规则（仅文本书源）
      if (!isImageSource && ruleContent.replaceRegex && content) {
        try {
          const replaceRules = ruleContent.replaceRegex.split('\n');
          for (const rule of replaceRules) {
            if (!rule.trim()) continue;
            
            // 格式: ##regex##replacement 或 ##regex (删除匹配内容)
            if (rule.startsWith('##')) {
              // 以 ## 开头，表示删除匹配的内容
              const parts = rule.substring(2).split('##');
              const pattern = parts[0];
              const replacement = parts[1] || '';
              if (pattern) {
                content = content.replace(new RegExp(pattern, 'g'), replacement);
              }
            } else if (rule.includes('##')) {
              // 中间有 ##，格式: pattern##replacement
              const [pattern, replacement] = rule.split('##');
              if (pattern) {
                content = content.replace(new RegExp(pattern, 'g'), replacement || '');
              }
            }
          }
          this.log('info', 'parse', '已应用替换规则');
        } catch (e: any) {
          this.log('warning', 'parse', `替换规则执行失败: ${e.message}`);
        }
      }

      // 解析下一页链接（如果有）
      let nextContentUrl = '';
      if (ruleContent.nextContentUrl) {
        const nextResult = parseRule(ctx, ruleContent.nextContentUrl);
        if (nextResult.success && nextResult.data) {
          nextContentUrl = Array.isArray(nextResult.data)
            ? nextResult.data[0]
            : nextResult.data;
          if (nextContentUrl && !nextContentUrl.startsWith('http')) {
            nextContentUrl = resolveUrl(nextContentUrl, this.getBaseUrl());
          }
          this.log('info', 'field', `下一页链接: ${nextContentUrl}`);
        }
      }

      // 返回结果
      const result: DebugResult = {
        success: true,
        logs: this.logs,
        requestResult,
        parsedItems: isImageSource ? imageUrls : content,
        nextContentUrl,
      };

      // 图片书源额外返回图片URL列表
      if (isImageSource) {
        result.imageUrls = imageUrls;
      }

      return result;
    } catch (error: any) {
      this.log('error', 'error', `调试异常: ${error.message}`);
      return { success: false, logs: this.logs, error: error.message };
    }
  }
}

/**
 * 解析发现分类列表
 * 支持 Legado 的多种格式：
 * 1. 文本格式：分类名::URL（用 && 或换行分隔）
 * 2. JSON 格式：[{"title":"分类","url":"..."}]
 * 3. JS 动态格式：<js>...</js> 或 @js:...
 * 4. 分组：没有 URL 的项作为分组标题
 */
export interface ExploreCategory {
  title: string;
  url: string;
  group: string;
  style?: any;
}

export async function parseExploreUrl(
  source: BookSource,
  variables?: Record<string, any>
): Promise<ExploreCategory[]> {
  const exploreUrl = source.exploreUrl || (source as any).ruleFindUrl || '';
  if (!exploreUrl) return [];

  let ruleStr = exploreUrl;

  // 处理 JS 动态规则
  if (exploreUrl.trim().startsWith('<js>') || exploreUrl.trim().toLowerCase().startsWith('@js:')) {
    console.log('[parseExploreUrl] Detected JS dynamic rule');
    console.log('[parseExploreUrl] jsLib available:', !!source.jsLib);
    try {
      const analyzeUrl = new AnalyzeUrl(source.bookSourceUrl, {
        source,
        variables: {
          ...variables,
          _jsLib: source.jsLib,
        },
      });

      // 提取 JS 代码 - 参考 Legado BookSourceExtensions.kt
      let jsCode: string;
      if (exploreUrl.trim().startsWith('<js>')) {
        // <js>...</js> 格式：取 <js> 到最后一个 < 之间的内容
        const startIndex = exploreUrl.indexOf('>') + 1;
        const endIndex = exploreUrl.lastIndexOf('<');
        jsCode = exploreUrl.substring(startIndex, endIndex > startIndex ? endIndex : exploreUrl.length);
      } else {
        // @js: 格式：取 @js: 之后的所有内容
        jsCode = exploreUrl.substring(4);
      }
      
      console.log('[parseExploreUrl] JS code length:', jsCode.length);

      // 执行 JS
      ruleStr = analyzeUrl.evalJsForExplore(jsCode);
      console.log('[parseExploreUrl] JS result length:', ruleStr?.length || 0);
      if (!ruleStr) {
        console.log('[parseExploreUrl] JS returned empty result');
        return [];
      }
    } catch (error) {
      console.error('[parseExploreUrl] JS execution error:', error);
      return [];
    }
  }

  const categories: ExploreCategory[] = [];
  let currentGroup = '默认';

  // 尝试 JSON 格式
  if (ruleStr.trim().startsWith('[')) {
    try {
      const jsonData = JSON.parse(ruleStr);
      if (Array.isArray(jsonData)) {
        for (const item of jsonData) {
          if (item.title) {
            if (item.url) {
              categories.push({
                title: item.title,
                url: item.url,
                group: currentGroup,
                style: item.style,
              });
            } else {
              // 没有 URL，是分组标题
              currentGroup = item.title;
            }
          }
        }
      }
      return categories;
    } catch {
      // 不是有效 JSON，继续尝试文本格式
    }
  }

  // 文本格式解析（支持 && 和换行分隔）
  const lines = ruleStr.split(/&&|\n/).filter((l: string) => l.trim());
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('::')) {
      const separatorIndex = trimmed.indexOf('::');
      const name = trimmed.substring(0, separatorIndex).trim();
      const url = trimmed.substring(separatorIndex + 2).trim();
      if (name && url) {
        categories.push({
          title: name,
          url: url,
          group: currentGroup,
        });
      } else if (name && !url) {
        // 只有名称没有 URL，是分组标题
        currentGroup = name;
      }
    } else if (trimmed.startsWith('http')) {
      // 纯 URL
      categories.push({
        title: trimmed,
        url: trimmed,
        group: currentGroup,
      });
    } else if (trimmed) {
      // 纯文本，作为分组标题
      currentGroup = trimmed;
    }
  }

  return categories;
}

// ============================================
// 登录功能实现
// 参考 Legado BaseSource.kt
// ============================================

/**
 * 登录 UI 配置项
 */
export interface LoginUiItem {
  name: string;
  type: 'text' | 'password' | 'button';
  action?: string; // 按钮动作（URL 或 JS）
}

/**
 * 登录结果
 */
export interface LoginResult {
  success: boolean;
  message?: string;
  loginHeader?: Record<string, string>;
}

// 登录信息存储（内存 + 持久化）
const loginInfoStore = new Map<string, Record<string, string>>();
const loginHeaderStore = new Map<string, Record<string, string>>();

/**
 * 解析 loginUi JSON
 * 支持非标准 JSON（单引号）
 */
export function parseLoginUi(loginUi?: string): LoginUiItem[] {
  if (!loginUi) return [];
  try {
    // 尝试标准 JSON 解析
    let items: any[];
    try {
      items = JSON.parse(loginUi);
    } catch {
      // 如果失败，尝试修复非标准 JSON
      // 使用更智能的方式处理单引号
      let fixedJson = loginUi;
      
      // 1. 先将已转义的单引号临时替换
      fixedJson = fixedJson.replace(/\\'/g, '___ESCAPED_QUOTE___');
      
      // 2. 将属性名的单引号替换为双引号: 'name': -> "name":
      fixedJson = fixedJson.replace(/'(\w+)'(\s*:)/g, '"$1"$2');
      
      // 3. 将字符串值的单引号替换为双引号: : 'value' -> : "value"
      // 但要小心处理值中包含单引号的情况
      fixedJson = fixedJson.replace(/:\s*'([^']*)'/g, ': "$1"');
      
      // 4. 恢复转义的单引号（在双引号字符串中变成普通单引号）
      fixedJson = fixedJson.replace(/___ESCAPED_QUOTE___/g, "'");
      
      // 5. 移除尾随逗号
      fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
      
      items = JSON.parse(fixedJson);
    }
    
    if (Array.isArray(items)) {
      return items.map((item: any) => ({
        name: item.name || '',
        type: item.type || 'text',
        action: item.action,
      }));
    }
  } catch (e) {
    console.error('[parseLoginUi] Failed to parse loginUi:', e);
    // 尝试使用 eval 作为最后手段（不推荐，但某些书源可能需要）
    try {
      // eslint-disable-next-line no-eval
      const items = eval(`(${loginUi})`);
      if (Array.isArray(items)) {
        return items.map((item: any) => ({
          name: item.name || '',
          type: item.type || 'text',
          action: item.action,
        }));
      }
    } catch (evalError) {
      console.error('[parseLoginUi] Eval fallback also failed:', evalError);
    }
  }
  return [];
}

/**
 * 提取登录 JS 代码
 * 参考 Legado BaseSource.getLoginJs()
 */
export function getLoginJs(loginUrl?: string): string | null {
  if (!loginUrl) return null;
  if (loginUrl.startsWith('@js:')) {
    return loginUrl.substring(4);
  }
  if (loginUrl.startsWith('<js>')) {
    const endIndex = loginUrl.lastIndexOf('<');
    return loginUrl.substring(4, endIndex > 4 ? endIndex : loginUrl.length);
  }
  return loginUrl;
}

/**
 * 获取登录信息
 */
export function getLoginInfo(sourceKey: string): Record<string, string> | null {
  // 先从内存获取
  if (loginInfoStore.has(sourceKey)) {
    return loginInfoStore.get(sourceKey)!;
  }
  // 从持久化存储获取
  const cached = CacheManager.get(`loginInfo_${sourceKey}`);
  if (cached) {
    try {
      const info = JSON.parse(cached);
      loginInfoStore.set(sourceKey, info);
      return info;
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * 保存登录信息
 */
export function putLoginInfo(sourceKey: string, info: Record<string, string>): void {
  loginInfoStore.set(sourceKey, info);
  CacheManager.put(`loginInfo_${sourceKey}`, JSON.stringify(info));
}

/**
 * 删除登录信息
 */
export function removeLoginInfo(sourceKey: string): void {
  loginInfoStore.delete(sourceKey);
  CacheManager.delete(`loginInfo_${sourceKey}`);
}

/**
 * 获取登录头部
 */
export function getLoginHeader(sourceKey: string): Record<string, string> | null {
  if (loginHeaderStore.has(sourceKey)) {
    return loginHeaderStore.get(sourceKey)!;
  }
  const cached = CacheManager.get(`loginHeader_${sourceKey}`);
  if (cached) {
    try {
      const header = JSON.parse(cached);
      loginHeaderStore.set(sourceKey, header);
      return header;
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * 保存登录头部
 */
export function putLoginHeader(sourceKey: string, header: Record<string, string>): void {
  loginHeaderStore.set(sourceKey, header);
  CacheManager.put(`loginHeader_${sourceKey}`, JSON.stringify(header));
  // 如果有 Cookie，同步到 CookieStore
  const cookie = header['Cookie'] || header['cookie'];
  if (cookie) {
    CookieStore.replaceCookie(sourceKey, cookie);
  }
}

/**
 * 删除登录头部
 */
export function removeLoginHeader(sourceKey: string): void {
  loginHeaderStore.delete(sourceKey);
  CacheManager.delete(`loginHeader_${sourceKey}`);
  CookieStore.removeCookie(sourceKey);
}

/**
 * 执行登录
 * 参考 Legado BaseSource.login()
 */
export async function executeLogin(
  source: BookSource,
  loginData: Record<string, string>
): Promise<LoginResult> {
  const sourceKey = source.bookSourceUrl;
  
  // 保存登录信息
  putLoginInfo(sourceKey, loginData);
  
  const loginJs = getLoginJs(source.loginUrl);
  if (!loginJs) {
    return { success: false, message: '未配置登录规则' };
  }

  try {
    // 创建 AnalyzeUrl 执行 JS
    const analyzeUrl = new AnalyzeUrl(sourceKey, {
      source,
      variables: {
        _jsLib: source.jsLib,
      },
    });

    // 构建登录 JS - 参考 Legado
    // loginJs 中应该定义一个 login 函数
    const fullJs = `
      ${loginJs}
      if (typeof login === 'function') {
        login.apply(this);
      } else {
        throw new Error('Function login not implemented!');
      }
    `;

    // 执行登录 JS，传入登录数据
    const result = analyzeUrl.evalJsWithLoginData(fullJs, loginData);
    
    // 检查结果
    if (result && typeof result === 'object') {
      // 如果返回了 header，保存它
      if (result.header || result.headers) {
        putLoginHeader(sourceKey, result.header || result.headers);
      }
      return { 
        success: true, 
        message: result.message || '登录成功',
        loginHeader: result.header || result.headers,
      };
    }
    
    return { success: true, message: '登录成功' };
  } catch (error: any) {
    console.error('[executeLogin] Error:', error);
    return { 
      success: false, 
      message: error.message || '登录失败',
    };
  }
}

/**
 * 执行按钮动作
 */
export async function executeButtonAction(
  source: BookSource,
  action: string,
  loginData: Record<string, string>
): Promise<{ success: boolean; message?: string; result?: any }> {
  if (!action) {
    return { success: false, message: '未配置按钮动作' };
  }

  // 如果是 URL，返回让前端打开
  if (action.startsWith('http://') || action.startsWith('https://')) {
    return { success: true, result: { type: 'url', url: action } };
  }

  // 执行 JS
  try {
    const loginJs = getLoginJs(source.loginUrl) || '';
    const analyzeUrl = new AnalyzeUrl(source.bookSourceUrl, {
      source,
      variables: {
        _jsLib: source.jsLib,
      },
    });

    const fullJs = `${loginJs}\n${action}`;
    const result = analyzeUrl.evalJsWithLoginData(fullJs, loginData);
    
    return { success: true, result };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * 检查登录状态
 */
export function checkLoginStatus(source: BookSource): {
  hasLoginUrl: boolean;
  hasLoginUi: boolean;
  isLoggedIn: boolean;
  loginInfo: Record<string, string> | null;
} {
  const sourceKey = source.bookSourceUrl;
  const loginInfo = getLoginInfo(sourceKey);
  const loginHeader = getLoginHeader(sourceKey);
  
  return {
    hasLoginUrl: !!source.loginUrl,
    hasLoginUi: !!source.loginUi,
    isLoggedIn: !!(loginInfo || loginHeader),
    loginInfo,
  };
}

// 导入 CacheManager 和 CookieStore
import CacheManager from './cache-manager';
import CookieStore from './cookie-manager';

export default SourceDebugger;
