/**
 * URL 解析器
 * 完全参考 Legado AnalyzeUrl.kt 实现
 * 支持 <js></js>、@js:、{{}}、页数替换、URL参数解析等
 */

import * as vm from 'vm';
import * as crypto from 'crypto';
import { syncHttpRequest } from './rule-parser';
import { webView as puppeteerWebView } from './webview';
import { CacheManager } from './cache-manager';
import { CookieStore } from './cookie-manager';

// JS 正则模式 - 参考 Legado AppPattern.kt
// Pattern.compile("<js>([\\w\\W]*?)</js>|@js:([\\w\\W]*)", Pattern.CASE_INSENSITIVE)
const JS_PATTERN = /<js>([\s\S]*?)<\/js>|@js:([\s\S]*)/gi;

// 表达式模式 {{}}
const EXP_PATTERN = /\{\{([\s\S]*?)\}\}/g;

// 页数模式 <page,page2,page3> - 注意不能匹配 <js> 标签
// 只匹配不包含 > 的内容，且内容中有逗号或纯数字
const PAGE_PATTERN = /<([^>]*?,.*?)>|<(\d+)>/g;

// URL 参数分隔模式
const PARAM_PATTERN = /\s*,\s*(?=\{)/;

/**
 * URL 选项接口
 */
interface UrlOption {
  method?: string;
  charset?: string;
  headers?: Record<string, string> | string;
  body?: string | Record<string, any>;
  type?: string;
  retry?: number;
  webView?: boolean | string;
  webJs?: string;
  js?: string;
  proxy?: string;  // 代理设置: http://host:port, socks5://host:port
}

/**
 * 书源接口
 */
interface BookSource {
  bookSourceUrl: string;
  bookSourceName: string;
  bookSourceType?: number;
  header?: string;
  loginUrl?: string;
  searchUrl?: string;
  exploreUrl?: string;
  [key: string]: any;
}

/**
 * AnalyzeUrl 类
 * 参考 Legado AnalyzeUrl.kt 实现
 */
export class AnalyzeUrl {
  private mUrl: string;
  private key: string;
  private page: number;
  private baseUrl: string;
  private source: BookSource | null;
  private variables: Record<string, any>;

  // 解析结果
  public ruleUrl: string = '';
  public url: string = '';
  public urlNoQuery: string = '';
  public headerMap: Record<string, string> = {};
  public body: string | null = null;
  public method: 'GET' | 'POST' = 'GET';
  public charset: string | null = null;
  public type: string | null = null;
  public useWebView: boolean = false;
  public webJs: string | null = null;
  public proxy: string | null = null;  // 代理设置
  public retry: number = 0;  // 重试次数

  constructor(
    mUrl: string,
    options: {
      key?: string;
      page?: number;
      baseUrl?: string;
      source?: BookSource | null;
      variables?: Record<string, any>;
      headerMap?: Record<string, string>;
    } = {}
  ) {
    this.mUrl = mUrl;
    this.key = options.key || '';
    this.page = options.page || 1;
    this.source = options.source || null;
    this.variables = options.variables || {};

    // 处理 baseUrl
    this.baseUrl = options.baseUrl || '';
    const paramMatch = PARAM_PATTERN.exec(this.baseUrl);
    if (paramMatch) {
      this.baseUrl = this.baseUrl.substring(0, paramMatch.index);
    }

    // 合并请求头
    if (options.headerMap) {
      Object.assign(this.headerMap, options.headerMap);
    }

    // 从书源获取请求头
    if (this.source?.header) {
      try {
        const sourceHeaders = JSON.parse(this.source.header);
        Object.assign(this.headerMap, sourceHeaders);
      } catch {
        // 忽略解析错误
      }
    }

    // 初始化 URL
    this.initUrl();
  }

  /**
   * 处理 URL - 参考 Legado AnalyzeUrl.initUrl()
   */
  private initUrl(): void {
    this.ruleUrl = this.mUrl;

    // 1. 执行 @js, <js></js>
    this.analyzeJs();

    // 2. 替换参数 (key, page, {{}})
    this.replaceKeyPageJs();

    // 3. 处理 URL
    this.analyzeUrl();
  }

  /**
   * 执行 @js, <js></js> - 参考 Legado AnalyzeUrl.analyzeJs()
   */
  private analyzeJs(): void {
    let start = 0;
    let result = this.ruleUrl;

    // 重置正则
    JS_PATTERN.lastIndex = 0;

    let match;
    while ((match = JS_PATTERN.exec(this.ruleUrl)) !== null) {
      if (match.index > start) {
        const beforeJs = this.ruleUrl.substring(start, match.index).trim();
        if (beforeJs) {
          result = beforeJs.replace(/@result/g, result);
        }
      }

      // 执行 JS: match[1] 是 <js></js> 内容, match[2] 是 @js: 内容
      const jsCode = match[1] || match[2];
      const jsResult = this.evalJS(jsCode, result);
      result = jsResult !== null && jsResult !== undefined ? String(jsResult) : '';

      start = match.index + match[0].length;
    }

    // 处理剩余部分
    if (this.ruleUrl.length > start) {
      const afterJs = this.ruleUrl.substring(start).trim();
      if (afterJs) {
        result = afterJs.replace(/@result/g, result);
      }
    }

    this.ruleUrl = result;
  }

  /**
   * 替换关键字、页数、JS - 参考 Legado AnalyzeUrl.replaceKeyPageJs()
   */
  private replaceKeyPageJs(): void {
    // 1. 替换 {{}} 内嵌表达式
    // {{}} 中可以使用任意规则，默认为 JS
    // 使用其他规则需要有明显的标志头:
    // - Default 规则需要以 @@ 开头
    // - XPath 需要以 @xpath: 或 // 开头
    // - JSONPath 需要以 @json: 或 $. 开头
    // - CSS 需要以 @css: 开头
    if (this.ruleUrl.includes('{{') && this.ruleUrl.includes('}}')) {
      this.ruleUrl = this.ruleUrl.replace(EXP_PATTERN, (_, content) => {
        // 检查是否是非 JS 规则
        if (content.startsWith('@@') || 
            content.startsWith('@xpath:') || 
            content.startsWith('@json:') || 
            content.startsWith('@css:') ||
            content.startsWith('$.') ||
            content.startsWith('//')) {
          // 非 JS 规则，需要使用 rule-parser 处理
          // 这里简化处理，仅支持 JSONPath
          if (content.startsWith('$.') || content.startsWith('@json:')) {
            const jsonPath = content.startsWith('@json:') ? content.substring(6) : content;
            try {
              const { JSONPath } = require('jsonpath-plus');
              const data = JSON.parse(this.variables['result'] || '{}');
              const results = JSONPath({ path: jsonPath, json: data, wrap: false });
              return results !== undefined ? String(results) : '';
            } catch {
              return '';
            }
          }
          // 其他规则类型暂时返回空
          return '';
        }
        
        // 默认为 JS
        const jsResult = this.evalJS(content);
        if (jsResult === null || jsResult === undefined) return '';
        if (typeof jsResult === 'string') return jsResult;
        if (typeof jsResult === 'number' && jsResult % 1 === 0) {
          return String(Math.floor(jsResult));
        }
        return String(jsResult);
      });
    }

    // 2. 替换页数 <page1,page2,page3>
    this.ruleUrl = this.ruleUrl.replace(PAGE_PATTERN, (match, pagesWithComma, singlePage) => {
      const pages = pagesWithComma || singlePage;
      if (!pages) return match;
      
      const pageList = pages.split(',').map((p: string) => p.trim());
      if (this.page <= pageList.length) {
        return pageList[this.page - 1];
      }
      return pageList[pageList.length - 1];
    });
  }

  /**
   * 解析 URL - 参考 Legado AnalyzeUrl.analyzeUrl()
   */
  private analyzeUrl(): void {
    // 分离 URL 和参数
    const paramMatch = PARAM_PATTERN.exec(this.ruleUrl);
    const urlNoOption = paramMatch
      ? this.ruleUrl.substring(0, paramMatch.index)
      : this.ruleUrl;

    // 处理相对 URL
    this.url = this.getAbsoluteURL(this.baseUrl, urlNoOption);

    // 更新 baseUrl
    try {
      const urlObj = new URL(this.url);
      this.baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      // 忽略
    }

    // 解析 URL 选项
    if (paramMatch && this.ruleUrl.length > paramMatch.index) {
      const optionStr = this.ruleUrl.substring(paramMatch.index + paramMatch[0].length);
      try {
        const option = JSON.parse(optionStr) as UrlOption;
        this.parseUrlOption(option);
      } catch {
        // 忽略解析错误
      }
    }

    this.urlNoQuery = this.url;

    // 处理 GET 请求的查询参数
    if (this.method === 'GET') {
      const pos = this.url.indexOf('?');
      if (pos !== -1) {
        this.urlNoQuery = this.url.substring(0, pos);
      }
    }
  }

  /**
   * 解析 URL 选项
   */
  private parseUrlOption(option: UrlOption): void {
    // method
    if (option.method?.toUpperCase() === 'POST') {
      this.method = 'POST';
    }

    // headers
    if (option.headers) {
      const headers =
        typeof option.headers === 'string'
          ? JSON.parse(option.headers)
          : option.headers;
      Object.assign(this.headerMap, headers);
    }

    // body - 需要替换 {{}} 表达式
    if (option.body) {
      let bodyStr = typeof option.body === 'string'
        ? option.body
        : JSON.stringify(option.body);
      
      // 替换 {{}} 表达式
      if (bodyStr.includes('{{') && bodyStr.includes('}}')) {
        bodyStr = bodyStr.replace(EXP_PATTERN, (_, jsCode) => {
          const jsResult = this.evalJS(jsCode);
          if (jsResult === null || jsResult === undefined) return '';
          if (typeof jsResult === 'string') return jsResult;
          return String(jsResult);
        });
      }
      
      this.body = bodyStr;
    }

    // type
    if (option.type) {
      this.type = option.type;
    }

    // charset
    if (option.charset) {
      this.charset = option.charset;
    }

    // webView
    if (option.webView && option.webView !== 'false') {
      this.useWebView = true;
    }

    // webJs
    if (option.webJs) {
      this.webJs = option.webJs;
    }

    // js - 执行后赋值给 url
    if (option.js) {
      const jsResult = this.evalJS(option.js, this.url);
      if (jsResult !== null && jsResult !== undefined) {
        this.url = String(jsResult);
      }
    }

    // proxy - 代理设置
    if (option.proxy) {
      this.proxy = option.proxy;
    }

    // retry - 重试次数
    if (option.retry !== undefined) {
      this.retry = option.retry;
    }
  }

  /**
   * 将 Rhino JS 特有语法转换为标准 ES6 语法
   * Rhino 是 Mozilla 的 Java 实现的 JS 引擎，有一些非标准语法
   */
  private convertRhinoToES6(code: string): string {
    let result = code;
    
    // 1. 转换 let 表达式: let (x = value) expr -> ((x) => expr)(value)
    // 例如: let (list = $.data) list.length -> ((list) => list.length)($.data)
    // 复杂情况: if (let (list = $.data) list != 0) { -> if (((list) => list != 0)($.data)) {
    result = result.replace(
      /let\s*\(\s*(\w+)\s*=\s*([^)]+)\)\s*([^;{\n)]+)/g,
      (match, varName, value, expr) => {
        // 清理表达式末尾的空格
        const cleanExpr = expr.trim();
        return `((${varName}) => ${cleanExpr})(${value})`;
      }
    );
    
    // 2. 转换 for each 语法: for each (x in arr) -> for (let x of arr)
    result = result.replace(
      /for\s+each\s*\(\s*((?:var|let|const)?\s*\w+)\s+in\s+/g,
      'for ($1 of '
    );
    
    // 3. 转换 E4X XML 字面量 (简单处理，转为字符串)
    // 注意：只转换独立的 XML 字面量，不转换字符串中的 XML
    // 这个转换很容易出错，所以只在非常明确的情况下才转换
    // 例如: var x = <xml>...</xml> 但不转换 var x = '<xml>...</xml>'
    // 暂时禁用此转换，因为大多数书源不使用 E4X
    // result = result.replace(...);
    
    // 4. 转换 Java 风格的数组声明
    // new java.lang.String[] -> []
    result = result.replace(/new\s+[\w.]+\[\]/g, '[]');
    
    // 5. 转换 with 语句中的 JavaImporter (移除 with 块，保留内容)
    // with (javaImport) { ... } -> { ... }
    result = result.replace(
      /with\s*\(\s*\w+\s*\)\s*\{/g,
      '{'
    );
    
    // 6. 处理 Java 类型转换
    // (java.lang.String) x -> String(x)
    result = result.replace(
      /\(java\.lang\.String\)\s*(\w+)/g,
      'String($1)'
    );
    result = result.replace(
      /\(java\.lang\.Integer\)\s*(\w+)/g,
      'parseInt($1)'
    );
    
    return result;
  }

  /**
   * 执行 JS - 参考 Legado AnalyzeUrl.evalJS()
   */
  private evalJS(jsCode: string, result: any = null): any {
    try {
      // 转换 Rhino JS 语法为标准 ES6
      const convertedCode = this.convertRhinoToES6(jsCode);
      
      // 创建沙箱环境
      const sandbox = this.createJsSandbox(result);
      const vmContext = vm.createContext(sandbox);
      
      // 先加载 jsLib（如果有）
      // jsLib 可能是 JSON 对象（指向远程 JS 文件的 URL）或直接的 JS 代码
      const jsLib = this.variables['_jsLib'];
      if (jsLib) {
        console.log('[AnalyzeUrl] Loading jsLib, length:', jsLib.length);
        try {
          // 检查是否是 JSON 对象
          if (jsLib.trim().startsWith('{') && jsLib.trim().endsWith('}')) {
            try {
              const jsMap = JSON.parse(jsLib);
              // 遍历 JSON 对象，下载并执行每个 JS 文件
              for (const [key, url] of Object.entries(jsMap)) {
                if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
                  // 从缓存或网络获取 JS 代码
                  const cacheKey = `_jsLib_${url}`;
                  let jsCode = CacheManager.get(cacheKey);
                  if (!jsCode) {
                    const response = syncHttpRequest(url);
                    if (response.body) {
                      jsCode = response.body;
                      CacheManager.put(cacheKey, jsCode, 86400); // 缓存24小时
                    }
                  }
                  if (jsCode) {
                    const convertedJsLib = this.convertRhinoToES6(jsCode);
                    const jsLibScript = new vm.Script(convertedJsLib);
                    jsLibScript.runInContext(vmContext, { timeout: 10000 });
                  }
                }
              }
            } catch (jsonError) {
              // 不是有效的 JSON，作为普通 JS 代码执行
              console.log('[AnalyzeUrl] jsLib is not JSON, executing as JS code');
              const convertedJsLib = this.convertRhinoToES6(jsLib);
              const jsLibScript = new vm.Script(convertedJsLib);
              jsLibScript.runInContext(vmContext, { timeout: 5000 });
              console.log('[AnalyzeUrl] jsLib executed successfully');
            }
          } else {
            // 直接作为 JS 代码执行
            console.log('[AnalyzeUrl] Executing jsLib as JS code directly');
            const convertedJsLib = this.convertRhinoToES6(jsLib);
            const jsLibScript = new vm.Script(convertedJsLib);
            jsLibScript.runInContext(vmContext, { timeout: 5000 });
            console.log('[AnalyzeUrl] jsLib executed successfully');
          }
        } catch (e) {
          console.error('[AnalyzeUrl] jsLib execution error:', e);
          // jsLib 执行失败时，不继续执行主代码
          throw e;
        }
      }
      
      const script = new vm.Script(convertedCode);
      return script.runInContext(vmContext, { timeout: 10000 });
    } catch (error) {
      console.error('[AnalyzeUrl] JS execution error:', error);
      return null;
    }
  }

  /**
   * 执行 JS 获取发现分类 - 公开方法供外部调用
   * 用于解析 exploreUrl 中的 <js>...</js> 或 @js:... 规则
   */
  evalJsForExplore(jsCode: string): string {
    try {
      const result = this.evalJS(jsCode, null);
      if (result === null || result === undefined) return '';
      if (typeof result === 'string') return result;
      if (typeof result === 'object') return JSON.stringify(result);
      return String(result);
    } catch (error) {
      console.error('[AnalyzeUrl] evalJsForExplore error:', error);
      return '';
    }
  }

  /**
   * 执行 JS 并传入登录数据
   * 用于登录功能，参考 Legado BaseSource.evalJS()
   */
  evalJsWithLoginData(jsCode: string, loginData: Record<string, string>): any {
    try {
      // 转换 Rhino JS 语法为标准 ES6
      const convertedCode = this.convertRhinoToES6(jsCode);
      
      // 创建沙箱环境，传入登录数据
      const sandbox = this.createJsSandbox(loginData);
      // 额外注入登录数据作为 result
      sandbox.result = loginData;
      
      const vmContext = vm.createContext(sandbox);
      
      // 加载 jsLib
      const jsLib = this.variables['_jsLib'];
      if (jsLib) {
        try {
          if (jsLib.trim().startsWith('{') && jsLib.trim().endsWith('}')) {
            // JSON 格式的 jsLib（远程 JS 文件）
            try {
              const jsMap = JSON.parse(jsLib);
              for (const [, url] of Object.entries(jsMap)) {
                if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
                  const cacheKey = `_jsLib_${url}`;
                  let jsCode = CacheManager.get(cacheKey);
                  if (!jsCode) {
                    const response = syncHttpRequest(url);
                    if (response.body) {
                      jsCode = response.body;
                      CacheManager.put(cacheKey, jsCode, 86400);
                    }
                  }
                  if (jsCode) {
                    const convertedJsLib = this.convertRhinoToES6(jsCode);
                    const jsLibScript = new vm.Script(convertedJsLib);
                    jsLibScript.runInContext(vmContext, { timeout: 10000 });
                  }
                }
              }
            } catch {
              const convertedJsLib = this.convertRhinoToES6(jsLib);
              const jsLibScript = new vm.Script(convertedJsLib);
              jsLibScript.runInContext(vmContext, { timeout: 5000 });
            }
          } else {
            const convertedJsLib = this.convertRhinoToES6(jsLib);
            const jsLibScript = new vm.Script(convertedJsLib);
            jsLibScript.runInContext(vmContext, { timeout: 5000 });
          }
        } catch (e) {
          console.error('[AnalyzeUrl] jsLib execution error in login:', e);
        }
      }
      
      const script = new vm.Script(convertedCode);
      return script.runInContext(vmContext, { timeout: 30000 }); // 登录可能需要更长时间
    } catch (error) {
      console.error('[AnalyzeUrl] evalJsWithLoginData error:', error);
      throw error;
    }
  }

  /**
   * 创建 JS 沙箱环境 - 提供 Legado 兼容的 java 对象
   * 参考 Legado JsExtensions.kt
   */
  private createJsSandbox(result: any): Record<string, any> {
    const self = this;

    // cookie 对象 - 使用持久化的 CookieStore
    // 参考 Legado JsExtensions.kt 中的 cookie 对象
    const cookie = {
      getCookie: (tag: string, key?: string) => {
        if (key) {
          return CookieStore.getKey(tag, key);
        }
        return CookieStore.getCookie(tag);
      },
      getKey: (tag: string, key: string) => {
        return CookieStore.getKey(tag, key);
      },
      setCookie: (tag: string, cookie: string) => {
        CookieStore.setCookie(tag, cookie);
      },
      replaceCookie: (tag: string, cookie: string) => {
        CookieStore.replaceCookie(tag, cookie);
      },
      removeCookie: (tag: string) => {
        CookieStore.removeCookie(tag);
      },
      contains: (tag: string, key: string) => {
        return CookieStore.contains(tag, key);
      },
    };

    // cache 对象 - 使用持久化的 CacheManager
    const cache = {
      get: (key: string) => CacheManager.get(key),
      put: (key: string, value: any, saveTime?: number) => {
        CacheManager.put(key, value, saveTime || 0);
      },
      delete: (key: string) => {
        CacheManager.delete(key);
      },
      getInt: (key: string) => CacheManager.getInt(key),
      getLong: (key: string) => CacheManager.getLong(key),
      getDouble: (key: string) => CacheManager.getDouble(key),
    };

    return {
      // 基础变量 - 参考 Legado AnalyzeUrl.evalJS()
      result,
      baseUrl: this.baseUrl,
      page: this.page,
      key: this.key,
      // source 对象增强，添加 Legado 特有方法
      source: this.source ? {
        ...this.source,
        // key 属性 - 书源 URL（Legado 中 source.key 等同于 source.bookSourceUrl）
        key: self.source?.bookSourceUrl || '',
        // 设置变量（持久化）
        setVariable: (data: string) => {
          // 存储原始字符串
          self.variables['_sourceVariable'] = data;
          try {
            const parsed = JSON.parse(data);
            Object.assign(self.variables, parsed);
          } catch {
            // 忽略
          }
          return data;
        },
        // 获取变量 - 不带参数返回整个变量字符串，带参数返回指定变量
        getVariable: (key?: string) => {
          if (key) {
            return self.variables[key];
          }
          // 返回 _sourceVariable 存储的字符串
          return self.variables['_sourceVariable'] || '';
        },
        // 获取书源 key
        getKey: () => self.source?.bookSourceUrl || '',
        // get 方法 - 获取书源存储的变量
        get: (key: string) => self.variables[`_source_${key}`] || '',
        // put 方法 - 存储变量到书源
        put: (key: string, value: any) => {
          self.variables[`_source_${key}`] = value;
          return value;
        },
        // 刷新发现
        refreshExplore: () => {},
        // 刷新 JSLib
        refreshJSLib: () => {},
      } : null,
      book: null,
      chapter: null,
      title: '',
      src: result,
      cookie,
      cache,

      // java 对象 - JsExtensions 接口
      java: {
        // ==================== 变量存取 ====================
        put: (key: string, value: any) => {
          self.variables[key] = value;
          return value;
        },
        get: (key: string) => self.variables[key],
        getString: (key: string) => self.variables[key] || '',

        // ==================== 网络请求 ====================
        ajax: (url: string | string[]) => {
          const urlStr = Array.isArray(url) ? url[0] : url;
          try {
            return syncHttpRequest(urlStr).body;
          } catch {
            return '';
          }
        },
        ajaxAll: (urlList: string[]) => {
          if (!Array.isArray(urlList)) return [];
          return urlList.map((url) => {
            try {
              return syncHttpRequest(url);
            } catch {
              return { body: '', headers: {}, url, code: 0 };
            }
          });
        },
        connect: (urlStr: string, header?: string) => {
          try {
            const headers = header ? JSON.parse(header) : {};
            const response = syncHttpRequest(urlStr, { headers });
            // 返回带有 raw() 方法的响应对象，兼容 Legado
            return {
              ...response,
              body: () => response.body,
              raw: () => ({
                request: () => ({
                  url: () => response.url || urlStr,
                }),
              }),
            };
          } catch {
            return { 
              body: () => '', 
              headers: {}, 
              url: urlStr, 
              code: 0,
              raw: () => ({
                request: () => ({
                  url: () => urlStr,
                }),
              }),
            };
          }
        },
        post: (urlStr: string, body: string, headers: Record<string, string> = {}) => {
          try {
            return syncHttpRequest(urlStr, { method: 'POST', headers, body });
          } catch {
            return { body: '', headers: {}, url: urlStr, code: 0 };
          }
        },
        httpGet: (urlStr: string, headers: Record<string, string> = {}) => {
          try {
            return syncHttpRequest(urlStr, { method: 'GET', headers });
          } catch {
            return { body: '', headers: {}, url: urlStr, code: 0 };
          }
        },
        head: (urlStr: string, headers: Record<string, string> = {}) => {
          try {
            return syncHttpRequest(urlStr, { method: 'HEAD', headers });
          } catch {
            return { body: '', headers: {}, url: urlStr, code: 0 };
          }
        },
        getByteStr: (url: string) => {
          try {
            return syncHttpRequest(url).body;
          } catch {
            return '';
          }
        },

        // ==================== 编码解码 ====================
        base64Decode: (str: string, charset?: string) => {
          if (!str) return '';
          return Buffer.from(str, 'base64').toString((charset || 'utf8') as BufferEncoding);
        },
        base64DecodeToByteArray: (str: string) => {
          if (!str) return null;
          return Array.from(Buffer.from(str, 'base64'));
        },
        base64Encode: (str: string, flags?: number) => {
          if (!str) return '';
          return Buffer.from(str, 'utf8').toString('base64');
        },
        hexDecodeToByteArray: (hex: string) => {
          if (!hex) return null;
          return Array.from(Buffer.from(hex, 'hex'));
        },
        hexDecodeToString: (hex: string) => {
          if (!hex) return '';
          return Buffer.from(hex, 'hex').toString('utf8');
        },
        hexEncodeToString: (str: string) => {
          if (!str) return '';
          return Buffer.from(str, 'utf8').toString('hex');
        },
        strToBytes: (str: string, charset?: string) =>
          Array.from(Buffer.from(str, (charset || 'utf8') as BufferEncoding)),
        bytesToStr: (bytes: number[], charset?: string) =>
          Buffer.from(bytes).toString((charset || 'utf8') as BufferEncoding),

        // ==================== MD5 ====================
        md5Encode: (str: string) => {
          return crypto.createHash('md5').update(str).digest('hex');
        },
        md5Encode16: (str: string) => {
          return crypto.createHash('md5').update(str).digest('hex').substring(8, 24);
        },

        // ==================== 摘要算法 ====================
        digestHex: (data: string, algorithm: string) => {
          try {
            return crypto.createHash(algorithm.toLowerCase()).update(data).digest('hex');
          } catch {
            return '';
          }
        },
        digestBase64Str: (data: string, algorithm: string) => {
          try {
            return crypto.createHash(algorithm.toLowerCase()).update(data).digest('base64');
          } catch {
            return '';
          }
        },

        // ==================== URL 编码 ====================
        encodeURI: (str: string, enc?: string) => {
          try {
            return encodeURIComponent(str);
          } catch {
            return '';
          }
        },
        urlEncode: (str: string, enc?: string) => {
          try {
            return encodeURIComponent(str);
          } catch {
            return '';
          }
        },

        // ==================== 时间格式化 ====================
        timeFormat: (time: number) => {
          return new Date(time).toISOString().replace('T', ' ').replace('Z', '');
        },
        timeFormatUTC: (time: number, format: string, sh: number) => {
          const date = new Date(time + sh * 3600 * 1000);
          return date.toISOString();
        },

        // ==================== 繁简转换 ====================
        t2s: (text: string) => {
          // 繁体转简体 - 简单映射表
          const t2sMap: Record<string, string> = {
            '書': '书', '說': '说', '話': '话', '開': '开', '門': '门',
            '電': '电', '腦': '脑', '網': '网', '頁': '页', '機': '机',
            '時': '时', '間': '间', '東': '东', '車': '车', '長': '长',
            '學': '学', '習': '习', '國': '国', '語': '语', '見': '见',
            '觀': '观', '視': '视', '聽': '听', '讀': '读', '寫': '写',
            '買': '买', '賣': '卖', '錢': '钱', '銀': '银', '飛': '飞',
            '場': '场', '運': '运', '動': '动', '體': '体', '會': '会',
            '議': '议', '論': '论', '無': '无', '為': '为', '從': '从',
          };
          let result = text;
          for (const [t, s] of Object.entries(t2sMap)) {
            result = result.replace(new RegExp(t, 'g'), s);
          }
          return result;
        },
        s2t: (text: string) => {
          // 简体转繁体 - 简单映射表
          const s2tMap: Record<string, string> = {
            '书': '書', '说': '說', '话': '話', '开': '開', '门': '門',
            '电': '電', '脑': '腦', '网': '網', '页': '頁', '机': '機',
            '时': '時', '间': '間', '东': '東', '车': '車', '长': '長',
            '学': '學', '习': '習', '国': '國', '语': '語', '见': '見',
            '观': '觀', '视': '視', '听': '聽', '读': '讀', '写': '寫',
            '买': '買', '卖': '賣', '钱': '錢', '银': '銀', '飞': '飛',
            '场': '場', '运': '運', '动': '動', '体': '體', '会': '會',
            '议': '議', '论': '論', '无': '無', '为': '為', '从': '從',
          };
          let result = text;
          for (const [s, t] of Object.entries(s2tMap)) {
            result = result.replace(new RegExp(s, 'g'), t);
          }
          return result;
        },
        
        // ==================== 编码转换 ====================
        utf8ToGbk: (str: string) => {
          // UTF-8 转 GBK - 需要 iconv-lite 库
          console.warn('[JS] java.utf8ToGbk() 需要 iconv-lite 库支持');
          return str;
        },
        
        // ==================== 工具方法 ====================
        androidId: () => 'node-' + crypto.randomUUID().substring(0, 8),
        getWebViewUA: () => 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
        
        // 导入脚本
        importScript: (path: string) => {
          if (path.startsWith('http')) {
            try {
              return syncHttpRequest(path).body;
            } catch {
              return '';
            }
          }
          console.warn('[JS] java.importScript() 本地文件在沙箱中受限');
          return '';
        },
        
        // 缓存文件
        cacheFile: (urlStr: string, saveTime?: number) => {
          try {
            const response = syncHttpRequest(urlStr);
            return response.body;
          } catch {
            return '';
          }
        },
        
        // 下载文件
        downloadFile: (url: string) => {
          console.warn('[JS] java.downloadFile() 在沙箱中受限');
          return '';
        },
        
        // 文件操作
        readFile: (path: string) => {
          console.warn('[JS] java.readFile() 在沙箱中不可用');
          return null;
        },
        readTxtFile: (path: string, charsetName?: string) => {
          console.warn('[JS] java.readTxtFile() 在沙箱中不可用');
          return '';
        },
        deleteFile: (path: string) => {
          console.warn('[JS] java.deleteFile() 在沙箱中不可用');
          return false;
        },
        
        // 压缩文件
        getZipStringContent: (url: string, path: string, charsetName?: string) => {
          console.warn('[JS] java.getZipStringContent() 需要额外实现');
          return '';
        },
        unzipFile: (zipPath: string) => {
          console.warn('[JS] java.unzipFile() 需要额外实现');
          return '';
        },
        
        // 字体解析
        queryTTF: (data: any, useCache?: boolean) => {
          console.warn('[JS] java.queryTTF() 需要 TTF 解析库支持');
          return null;
        },
        replaceFont: (text: string, errorQueryTTF: any, correctQueryTTF: any, filter?: boolean) => {
          console.warn('[JS] java.replaceFont() 需要 TTF 解析库支持');
          return text;
        },
        
        // 章节数转换
        toNumChapter: (s: string) => {
          if (!s) return null;
          const chineseNums: Record<string, string> = {
            零: '0', 一: '1', 二: '2', 三: '3', 四: '4',
            五: '5', 六: '6', 七: '7', 八: '8', 九: '9',
            十: '10', 百: '100', 千: '1000', 万: '10000',
          };
          let result = s;
          for (const [cn, num] of Object.entries(chineseNums)) {
            result = result.replace(new RegExp(cn, 'g'), num);
          }
          return result;
        },

        // ==================== HTML 格式化 ====================
        htmlFormat: (str: string) => {
          return str
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<p[^>]*>/gi, '\n')
            .replace(/<\/p>/gi, '')
            .replace(/<[^>]+>/g, '')
            .trim();
        },

        // ==================== 日志 ====================
        log: (msg: any) => {
          console.log('[JS]', msg);
          return msg;
        },
        logType: (any: any) => {
          if (any === null) {
            console.log('[JS] type: null');
          } else if (any === undefined) {
            console.log('[JS] type: undefined');
          } else {
            console.log('[JS] type:', typeof any, Array.isArray(any) ? 'Array' : '');
          }
        },
        toast: (msg: any) => {
          console.log('[toast]', msg);
        },
        longToast: (msg: any) => {
          console.log('[longToast]', msg);
        },

        // ==================== Cookie ====================
        getCookie: (tag: string, key?: string) => cookie.getCookie(tag, key),

        // ==================== WebView ====================
        // 使用 Puppeteer 实现 WebView 功能
        webView: (html: string | null, url: string | null, js: string | null) => {
          console.log('[JS] java.webView() 使用 Puppeteer 执行');
          try {
            // 使用同步方式调用 Puppeteer
            const { webViewSyncCached } = require('./webview');
            const result = webViewSyncCached(html, url, js, self.source?.getHeaderMap?.());
            return result;
          } catch (e: any) {
            console.error('[JS] java.webView() error:', e.message);
            // 降级到普通 HTTP 请求
            if (url) {
              try {
                return syncHttpRequest(url).body;
              } catch {
                return '';
              }
            }
            return '';
          }
        },
        webViewGetSource: (html: string | null, url: string | null, js: string | null, sourceRegex: string) => {
          console.log('[JS] java.webViewGetSource() 使用 Puppeteer 执行');
          try {
            const { webViewSyncCached } = require('./webview');
            // 对于资源嗅探，暂时使用普通 webView
            return webViewSyncCached(html, url, js);
          } catch (e: any) {
            console.error('[JS] java.webViewGetSource() error:', e.message);
            return '';
          }
        },
        webViewGetOverrideUrl: (html: string | null, url: string | null, js: string | null, overrideUrlRegex: string) => {
          console.log('[JS] java.webViewGetOverrideUrl() 使用 Puppeteer 执行');
          try {
            const { webViewSyncCached } = require('./webview');
            return webViewSyncCached(html, url, js);
          } catch (e: any) {
            console.error('[JS] java.webViewGetOverrideUrl() error:', e.message);
            return '';
          }
        },
        startBrowser: (url: string, title: string) => {
          console.log('[JS] java.startBrowser() - 打开浏览器:', url);
          // 在 Node.js 环境中无法打开浏览器，只记录日志
        },
        startBrowserAwait: (url: string, title: string, refetch?: boolean) => {
          console.log('[JS] java.startBrowserAwait() 使用 Puppeteer 执行');
          try {
            const { webViewSyncCached } = require('./webview');
            const body = webViewSyncCached(null, url, null);
            return { body: () => body };
          } catch (e: any) {
            console.error('[JS] java.startBrowserAwait() error:', e.message);
            return { body: () => '' };
          }
        },
        getVerificationCode: (imageUrl: string) => {
          console.warn('[JS] java.getVerificationCode() 需要验证码支持');
          return '';
        },

        // ==================== 随机 UUID ====================
        randomUUID: () => crypto.randomUUID(),

        // ==================== URL 解析 ====================
        toURL: (urlStr: string, baseUrl?: string) => {
          try {
            const url = baseUrl ? new URL(urlStr, baseUrl) : new URL(urlStr);
            return {
              host: url.host,
              path: url.pathname,
              query: url.search,
              ref: url.hash,
              file: url.pathname.split('/').pop() || '',
            };
          } catch {
            return null;
          }
        },
      },

      // 全局函数 - 兼容 Legado 的 Get/Put (大写开头)
      Get: (key: string) => self.variables[key],
      Put: (key: string, value: any) => {
        self.variables[key] = value;
        return value;
      },

      // Reload 函数 - 加载远程 JS 脚本（Legado 特有）
      Reload: (url: string) => {
        try {
          // 检查缓存
          const cacheKey = `_reload_${url}`;
          const cached = CacheManager.get(cacheKey);
          if (cached) {
            return cached;
          }
          // 从网络加载
          const response = syncHttpRequest(url);
          if (response.body) {
            CacheManager.put(cacheKey, response.body, 3600); // 缓存1小时
            return response.body;
          }
          return '';
        } catch (e) {
          console.error('[JS] Reload error:', e);
          return '';
        }
      },

      // LegadoMap 函数 - 获取 loginUi 配置值（Legado 特有）
      // 注意：这里不能用 Map 作为名称，因为会和 JS 内置 Map 冲突
      LegadoMap: (name: string) => {
        // 从 source.loginUi 中查找对应的值
        if (self.source?.loginUi) {
          try {
            const loginUi = typeof self.source.loginUi === 'string' 
              ? JSON.parse(self.source.loginUi) 
              : self.source.loginUi;
            if (Array.isArray(loginUi)) {
              const item = loginUi.find((i: any) => i.name === name);
              if (item) {
                // 返回存储的值或默认值
                return self.variables[`_loginUi_${name}`] || item.value || '';
              }
            }
          } catch {
            // 忽略解析错误
          }
        }
        return '';
      },

      // login 函数 - 显示登录提示（Legado 特有）
      login: (msg: any) => {
        console.log('[login]', msg);
        return msg;
      },

      // put/get 全局函数 - 存取变量对象
      put: (obj: any) => {
        if (typeof obj === 'object') {
          Object.assign(self.variables, obj);
        }
        return obj;
      },
      get: (key: string, defaultValue?: any) => {
        return self.variables[key] !== undefined ? self.variables[key] : (defaultValue || '');
      },

      // n 函数 - 换行符
      n: (count: number = 1) => '\n'.repeat(count),

      // Getdata 函数 - POST 请求
      Getdata: (url: string, body?: string) => {
        try {
          if (body) {
            return syncHttpRequest(url, { 
              method: 'POST', 
              body,
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }).body;
          }
          return syncHttpRequest(url).body;
        } catch {
          return '';
        }
      },

      // eval 函数 - 用于执行 source.loginUrl 等
      eval: (code: string) => {
        try {
          const sandbox = self.createJsSandbox(result);
          const vmContext = vm.createContext(sandbox);
          return new vm.Script(code).runInContext(vmContext, { timeout: 10000 });
        } catch (e) {
          console.error('[JS] eval error:', e);
          return null;
        }
      },

      // JavaImporter 兼容 - Rhino JS 引擎特有
      JavaImporter: function(...packages: any[]) {
        // 返回一个模拟的 JavaImporter 对象
        return {
          importClass: () => {}, // 空实现
          importPackage: () => {}, // 空实现
        };
      },
      
      // Packages 兼容 - Java 包模拟
      Packages: {
        java: {
          lang: {
            String: String,
            Integer: Number,
            Thread: {
              sleep: (ms: number) => {
                const end = Date.now() + ms;
                while (Date.now() < end) {}
              },
            },
          },
          util: {
            ArrayList: Array,
            HashMap: Map,
          },
          net: {
            URL: function(urlStr: string) {
              const url = new URL(urlStr);
              return {
                getProtocol: () => url.protocol.replace(':', ''),
                getHost: () => url.host,
                getPort: () => url.port ? parseInt(url.port) : -1,
                getPath: () => url.pathname,
                getQuery: () => url.search.replace('?', ''),
                getRef: () => url.hash.replace('#', ''),
                toString: () => url.href,
                toExternalForm: () => url.href,
              };
            },
            URLEncoder: {
              encode: (s: string, charset?: string) => encodeURIComponent(s),
            },
            URLDecoder: {
              decode: (s: string, charset?: string) => decodeURIComponent(s),
            },
          },
        },
        javax: {
          crypto: {
            Cipher: {
              getInstance: (transformation: string) => {
                // 简化的 Cipher 实现
                return {
                  init: () => {},
                  doFinal: (data: number[]) => data,
                };
              },
            },
            spec: {
              SecretKeySpec: function(key: number[], algorithm: string) {
                return { key, algorithm };
              },
              IvParameterSpec: function(iv: number[]) {
                return { iv };
              },
            },
            Mac: {
              getInstance: (algorithm: string) => ({
                init: () => {},
                doFinal: (data: number[]) => data,
              }),
            },
          },
        },
        okhttp3: {
          HttpUrl: {
            parse: (urlStr: string) => {
              try {
                const url = new URL(urlStr);
                return {
                  scheme: () => url.protocol.replace(':', ''),
                  host: () => url.hostname,
                  port: () => url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80),
                  encodedPath: () => url.pathname,
                  query: () => url.search.replace('?', ''),
                  fragment: () => url.hash.replace('#', ''),
                  toString: () => url.href,
                  newBuilder: () => ({
                    addQueryParameter: (name: string, value: string) => {
                      url.searchParams.append(name, value);
                      return this;
                    },
                    build: () => url.href,
                  }),
                };
              } catch {
                return null;
              }
            },
          },
        },
        android: {
          text: {
            TextUtils: {
              isEmpty: (str: any) => !str || str === '' || str === 'null' || str === 'undefined',
              isDigitsOnly: (str: string) => /^\d+$/.test(str),
              join: (delimiter: string, tokens: string[]) => tokens.join(delimiter),
            },
          },
          util: {
            Base64: {
              // Android Base64 编码标志
              DEFAULT: 0,
              NO_PADDING: 1,
              NO_WRAP: 2,
              CRLF: 4,
              URL_SAFE: 8,
              NO_CLOSE: 16,
              // 编码方法
              encodeToString: (input: number[] | string, flags: number = 0) => {
                const data = typeof input === 'string' 
                  ? input 
                  : Buffer.from(input).toString('utf8');
                let result = Buffer.from(data).toString('base64');
                // 处理标志
                if (flags & 8) { // URL_SAFE
                  result = result.replace(/\+/g, '-').replace(/\//g, '_');
                }
                if (flags & 1) { // NO_PADDING
                  result = result.replace(/=+$/, '');
                }
                return result;
              },
              encode: (input: number[] | string, flags: number = 0) => {
                const str = typeof input === 'string' 
                  ? input 
                  : Buffer.from(input).toString('utf8');
                return Array.from(Buffer.from(str).toString('base64'));
              },
              decode: (str: string, flags: number = 0) => {
                let input = str;
                if (flags & 8) { // URL_SAFE
                  input = input.replace(/-/g, '+').replace(/_/g, '/');
                }
                return Array.from(Buffer.from(input, 'base64'));
              },
            },
          },
        },
      },
      
      // org.jsoup.Jsoup 兼容
      org: {
        jsoup: {
          Jsoup: {
            parse: (html: string) => {
              const cheerio = require('cheerio');
              const $ = cheerio.load(html);
              return {
                select: (selector: string) => {
                  const el = $(selector).first();
                  return {
                    attr: (name: string) => el.attr(name) || '',
                    text: () => el.text(),
                    html: () => el.html() || '',
                    first: () => ({
                      attr: (name: string) => el.attr(name) || '',
                      text: () => el.text(),
                      html: () => el.html() || '',
                    }),
                  };
                },
                body: () => ({
                  text: () => $('body').text(),
                  html: () => $('body').html() || '',
                }),
              };
            },
            connect: (url: string) => ({
              get: () => {
                const response = syncHttpRequest(url);
                const cheerio = require('cheerio');
                const $ = cheerio.load(response.body);
                return {
                  select: (selector: string) => {
                    const el = $(selector).first();
                    return {
                      attr: (name: string) => el.attr(name) || '',
                      text: () => el.text(),
                    };
                  },
                  body: () => ({
                    text: () => $('body').text(),
                    html: () => $('body').html() || '',
                  }),
                };
              },
            }),
          },
        },
      },
      
      // 标准全局对象
      JSON,
      parseInt,
      parseFloat,
      encodeURIComponent,
      decodeURIComponent,
      encodeURI: globalThis.encodeURI,
      decodeURI: globalThis.decodeURI,
      String,
      Number,
      Boolean,
      Array,
      Object,
      Math,
      Date,
      RegExp,
      Buffer,
      Map,
      Set,
      console: {
        log: (...args: any[]) => console.log('[JS]', ...args),
        warn: (...args: any[]) => console.warn('[JS]', ...args),
        error: (...args: any[]) => console.error('[JS]', ...args),
      },
      setTimeout,
      clearTimeout,
    };
  }

  /**
   * 获取绝对 URL
   */
  private getAbsoluteURL(baseUrl: string, url: string): string {
    if (!url) return '';

    // 已经是绝对 URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // data URL 直接返回（不应该出现，但防止错误）
    if (url.startsWith('data:')) {
      console.warn('[AnalyzeUrl] 检测到 data URL，可能是解析错误:', url.substring(0, 50));
      return url;
    }

    // 协议相对 URL
    if (url.startsWith('//')) {
      const protocol = baseUrl.startsWith('https') ? 'https:' : 'http:';
      return protocol + url;
    }

    // 相对 URL - 手动拼接避免 URL 构造函数的问题
    if (url.startsWith('/')) {
      return baseUrl + url;
    }
    
    // 尝试使用 URL 构造函数
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return baseUrl + '/' + url;
    }
  }

  /**
   * 获取最终的请求 URL
   */
  public getUrl(): string {
    return this.url;
  }

  /**
   * 获取请求方法
   */
  public getMethod(): 'GET' | 'POST' {
    return this.method;
  }

  /**
   * 获取请求头
   */
  public getHeaders(): Record<string, string> {
    return this.headerMap;
  }

  /**
   * 获取请求体
   */
  public getBody(): string | null {
    return this.body;
  }
}

/**
 * 构建搜索 URL
 * @param source 书源
 * @param keyword 搜索关键词
 * @param page 页码
 * @param variables 变量
 */
export function buildSearchUrl(
  source: BookSource,
  keyword: string,
  page: number = 1,
  variables: Record<string, any> = {}
): AnalyzeUrl | null {
  if (!source.searchUrl) {
    return null;
  }

  // 获取基础 URL
  let baseUrl = '';
  try {
    const url = new URL(source.bookSourceUrl);
    baseUrl = `${url.protocol}//${url.host}`;
  } catch {
    baseUrl = source.bookSourceUrl;
  }

  // 预设变量
  const vars: Record<string, any> = {
    ...variables,
    url: baseUrl,
  };

  // 加载 jsLib
  if (source.jsLib) {
    vars['_jsLib'] = source.jsLib;
  }

  // 执行 loginUrl 初始化脚本
  if (source.loginUrl) {
    try {
      const loginAnalyze = new AnalyzeUrl(source.loginUrl, {
        baseUrl,
        source,
        variables: vars,
      });
      // loginUrl 执行后变量会被更新
    } catch (e) {
      console.warn('[buildSearchUrl] loginUrl 执行失败:', e);
    }
  }

  // 构建搜索 URL
  return new AnalyzeUrl(source.searchUrl, {
    key: keyword,
    page,
    baseUrl,
    source,
    variables: vars,
  });
}

export default AnalyzeUrl;
