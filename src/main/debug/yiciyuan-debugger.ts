/**
 * 异次元图源调试器
 * 支持异次元图源格式的调试功能
 * 参考: https://www.yckceo.com/yiciyuan/tuyuan/
 */
import { httpRequest, RequestResult } from './http-client';
import {
  parseRule,
  parseList,
  parseFromElement,
  ParseContext,
  extractImageUrls,
  resolveUrl,
} from './rule-parser';

// 异次元图源类型定义
export interface YiciyuanSource {
  bookSourceUrl: string;
  bookSourceName: string;
  bookSourceGroup?: string;
  bookSourceType: string;
  sourceRemark?: string;
  enable: boolean;
  serialNumber?: number;
  weight?: number;
  lastUpdateTime?: number;
  httpUserAgent?: string;
  bookDelayTime?: string;
  bookSingleThread?: string;
  loginUrl?: string;
  loginUrlResult?: string;
  
  // 搜索规则
  ruleSearchUrl?: string;
  ruleSearchUrlNext?: string;
  ruleSearchList?: string;
  ruleSearchName?: string;
  ruleSearchAuthor?: string;
  ruleSearchKind?: string;
  ruleSearchLastChapter?: string;
  ruleSearchCoverUrl?: string;
  ruleSearchCoverDecoder?: string;
  ruleSearchNoteUrl?: string;
  
  // 发现规则
  ruleFindUrl?: string;
  
  // 详情规则
  ruleBookUrlPattern?: string;
  ruleBookName?: string;
  ruleBookAuthor?: string;
  ruleBookKind?: string;
  ruleBookLastChapter?: string;
  ruleIntroduce?: string;
  ruleCoverUrl?: string;
  ruleCoverDecoder?: string;
  
  // 目录规则
  ruleChapterUrl?: string;
  ruleChapterUrlNext?: string;
  ruleChapterList?: string;
  ruleChapterName?: string;
  ruleContentUrl?: string;
  ruleChapterId?: string;
  ruleChapterParentId?: string;
  ruleChapterParentName?: string;
  
  // 正文规则
  ruleBookContent?: string;
  ruleBookContentDecoder?: string;
  ruleContentUrlNext?: string;
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
  parsedItems?: any[];
  imageUrls?: string[];
  error?: string;
}

/**
 * 预处理规则，分离 @Header: 后缀和多行规则
 * 异次元图源规则可能包含:
 * - @Header:{...} 后缀
 * - 多行规则（用换行分隔）
 * - @js: 代码块
 */
function preprocessRule(rule: string | undefined): { rule: string; headers?: Record<string, string> } {
  if (!rule) return { rule: '' };
  
  let processedRule = rule;
  let headers: Record<string, string> | undefined;
  
  // 提取 @Header:{...} 后缀
  const headerMatch = processedRule.match(/@Header:\{([^}]+)\}$/);
  if (headerMatch) {
    processedRule = processedRule.replace(/@Header:\{[^}]+\}$/, '').trim();
    try {
      // 解析 Header 内容
      const headerStr = headerMatch[1];
      headers = {};
      // 支持格式: key:value 或 key:"value" 或 "key":"value"
      const pairs = headerStr.split(/[;,]/).filter(s => s.trim());
      for (const pair of pairs) {
        const colonIdx = pair.indexOf(':');
        if (colonIdx > 0) {
          let key = pair.substring(0, colonIdx).trim().replace(/^["']|["']$/g, '');
          let value = pair.substring(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
          // 处理特殊值
          if (value === 'host') {
            value = ''; // 将在运行时替换
          }
          headers[key] = value;
        }
      }
    } catch {
      // 解析失败，忽略
    }
  }
  
  // 处理多行规则 - 如果包含 @js: 则保留完整内容
  // 否则只取第一行（非空）
  if (!processedRule.includes('@js:') && !processedRule.includes('<js>')) {
    const lines = processedRule.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length > 0) {
      processedRule = lines[0];
    }
  }
  
  return { rule: processedRule, headers };
}

/**
 * 异次元图源调试器
 */
export class YiciyuanDebugger {
  private source: YiciyuanSource;
  private logs: DebugLog[] = [];
  private variables: Record<string, any> = {};

  constructor(source: YiciyuanSource) {
    this.source = source;
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
      message: `[异次元图源] ${message}`,
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
   * 获取请求头
   * 支持异次元的 httpUserAgent 和 Legado 的 header 字段
   * 注意：不设置默认 User-Agent，让 http-client.ts 中的默认值生效
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // 优先使用 Legado 格式的 header（转换后可能保留）
    const source = this.source as any;
    if (source.header) {
      try {
        const parsed = JSON.parse(source.header);
        Object.assign(headers, parsed);
      } catch {
        // 解析失败，忽略
      }
    }
    
    // 异次元的 httpUserAgent（仅当书源明确指定时才使用）
    if (this.source.httpUserAgent) {
      headers['User-Agent'] = this.source.httpUserAgent;
    }
    
    // 不设置默认 User-Agent，让 http-client.ts 中的 DEFAULT_HEADERS 生效
    // 这样可以保持与 Legado 调试器一致的行为
    
    return headers;
  }

  /**
   * 构建搜索URL
   * 替换 searchKey 和 searchPage
   * 注意：不对关键词进行 URL 编码，保持与 Legado 一致
   * 某些网站（如笔趣漫画）不接受 URL 编码的中文
   */
  private buildSearchUrl(keyword: string, page: number = 1): string {
    let url = this.source.ruleSearchUrl || '';
    // 不进行 URL 编码，直接替换关键词
    url = url.replace(/searchKey/g, keyword);
    url = url.replace(/searchPage/g, String(page));
    
    // 如果不是完整URL，添加基础URL
    if (!url.startsWith('http')) {
      url = this.getBaseUrl() + (url.startsWith('/') ? '' : '/') + url;
    }
    
    return url;
  }

  /**
   * 从 URL 中提取参数
   */
  private extractUrlParams(url: string): void {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.forEach((value, key) => {
        if (value && !this.variables[key]) {
          this.variables[key] = value;
          this.log('info', 'parse', `从 URL 提取参数: ${key}=${value}`);
        }
      });
    } catch {
      // URL 解析失败，忽略
    }
  }

  /**
   * 执行搜索测试
   */
  async debugSearch(keyword: string): Promise<DebugResult> {
    this.logs = [];

    try {
      const url = this.buildSearchUrl(keyword);
      const headers = this.getHeaders();
      this.log('info', 'request', `搜索: ${keyword}`);
      this.log('info', 'request', `请求URL: ${url}`);

      const requestResult = await httpRequest({
        url,
        headers,
      });

      if (!requestResult.success) {
        this.log('error', 'request', `请求失败: ${requestResult.error}`);
        return { success: false, logs: this.logs, error: requestResult.error };
      }

      this.log('success', 'request', `请求成功 ${requestResult.statusCode} (${requestResult.responseTime}ms)`);

      const body = requestResult.body || '';
      const books: any[] = [];

      // 解析搜索列表
      if (this.source.ruleSearchList) {
        const { rule: listRule } = preprocessRule(this.source.ruleSearchList);
        this.log('info', 'parse', `列表规则: "${listRule}"`);
        
        const ctx: ParseContext = {
          body,
          baseUrl: this.getBaseUrl(),
          variables: this.variables,
        };

        const elements = parseList(ctx, listRule);
        
        if (elements && elements.length > 0) {
          this.log('info', 'parse', `列表规则匹配到 ${elements.length} 个元素`);

          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const book: any = {};

            // 解析各字段（使用预处理去除 @Header 后缀）
            if (this.source.ruleSearchName) {
              const { rule } = preprocessRule(this.source.ruleSearchName);
              const result = parseFromElement(element, rule, this.getBaseUrl(), this.variables);
              book.name = result.success ? result.data : undefined;
            }

            if (this.source.ruleSearchAuthor) {
              const { rule } = preprocessRule(this.source.ruleSearchAuthor);
              const result = parseFromElement(element, rule, this.getBaseUrl(), this.variables);
              book.author = result.success ? result.data : undefined;
            }

            if (this.source.ruleSearchKind) {
              const { rule } = preprocessRule(this.source.ruleSearchKind);
              const result = parseFromElement(element, rule, this.getBaseUrl(), this.variables);
              book.kind = result.success ? result.data : undefined;
            }

            if (this.source.ruleSearchLastChapter) {
              const { rule } = preprocessRule(this.source.ruleSearchLastChapter);
              const result = parseFromElement(element, rule, this.getBaseUrl(), this.variables);
              book.lastChapter = result.success ? result.data : undefined;
            }

            if (this.source.ruleSearchCoverUrl) {
              const { rule } = preprocessRule(this.source.ruleSearchCoverUrl);
              const result = parseFromElement(element, rule, this.getBaseUrl(), this.variables);
              book.coverUrl = result.success ? resolveUrl(String(result.data), this.getBaseUrl()) : undefined;
            }

            if (this.source.ruleSearchNoteUrl) {
              const { rule } = preprocessRule(this.source.ruleSearchNoteUrl);
              const result = parseFromElement(element, rule, this.getBaseUrl(), this.variables);
              book.bookUrl = result.success ? resolveUrl(String(result.data), this.getBaseUrl()) : undefined;
            }

            books.push(book);

            // 记录前几个结果
            if (i < 3) {
              this.log('info', 'field', `[${i + 1}] ${book.name || '(无名称)'} - ${book.author || '(无作者)'}`);
            }
          }
        }
      }

      this.log('success', 'parse', `成功解析 ${books.length} 本书籍`);

      return {
        success: true,
        logs: this.logs,
        requestResult,
        parsedItems: books,
      };
    } catch (error: any) {
      this.log('error', 'error', `调试异常: ${error.message}`);
      return { success: false, logs: this.logs, error: error.message };
    }
  }

  /**
   * 执行详情测试
   */
  async debugBookInfo(bookUrl: string): Promise<DebugResult> {
    this.logs = [];
    this.extractUrlParams(bookUrl);

    try {
      let url = bookUrl;
      if (!url.startsWith('http')) {
        url = this.getBaseUrl() + (url.startsWith('/') ? '' : '/') + url;
      }

      this.log('info', 'request', `请求详情: ${url}`);

      const requestResult = await httpRequest({
        url,
        headers: this.getHeaders(),
      });

      if (!requestResult.success) {
        this.log('error', 'request', `请求失败: ${requestResult.error}`);
        return { success: false, logs: this.logs, error: requestResult.error };
      }

      this.log('success', 'request', `请求成功 ${requestResult.statusCode} (${requestResult.responseTime}ms)`);

      const body = requestResult.body || '';
      const bookInfo: any = { bookUrl: url };

      const ctx: ParseContext = {
        body,
        baseUrl: this.getBaseUrl(),
        variables: this.variables,
      };

      // 解析各字段（使用预处理去除 @Header 后缀）
      if (this.source.ruleBookName) {
        const { rule } = preprocessRule(this.source.ruleBookName);
        const result = parseRule(ctx, rule);
        bookInfo.name = result.success ? result.data : undefined;
        this.log('info', 'field', `name: ${bookInfo.name}`);
      }

      if (this.source.ruleBookAuthor) {
        const { rule } = preprocessRule(this.source.ruleBookAuthor);
        const result = parseRule(ctx, rule);
        bookInfo.author = result.success ? result.data : undefined;
        this.log('info', 'field', `author: ${bookInfo.author}`);
      }

      if (this.source.ruleIntroduce) {
        const { rule } = preprocessRule(this.source.ruleIntroduce);
        const result = parseRule(ctx, rule);
        bookInfo.intro = result.success ? result.data : undefined;
        const introStr = bookInfo.intro ? String(bookInfo.intro) : '(未获取)';
        this.log('info', 'field', `intro: ${introStr.substring(0, 100)}...`);
      }

      if (this.source.ruleBookKind) {
        const { rule } = preprocessRule(this.source.ruleBookKind);
        const result = parseRule(ctx, rule);
        bookInfo.kind = result.success ? result.data : undefined;
        this.log('info', 'field', `kind: ${bookInfo.kind}`);
      }

      if (this.source.ruleCoverUrl) {
        const { rule } = preprocessRule(this.source.ruleCoverUrl);
        const result = parseRule(ctx, rule);
        bookInfo.coverUrl = result.success ? resolveUrl(String(result.data), this.getBaseUrl()) : undefined;
        this.log('info', 'field', `coverUrl: ${bookInfo.coverUrl}`);
      }

      if (this.source.ruleChapterUrl) {
        const { rule } = preprocessRule(this.source.ruleChapterUrl);
        const result = parseRule(ctx, rule);
        bookInfo.tocUrl = result.success ? resolveUrl(String(result.data), this.getBaseUrl()) : undefined;
        this.log('info', 'field', `tocUrl: ${bookInfo.tocUrl}`);
      }

      return {
        success: true,
        logs: this.logs,
        requestResult,
        parsedItems: [bookInfo],
      };
    } catch (error: any) {
      this.log('error', 'error', `调试异常: ${error.message}`);
      return { success: false, logs: this.logs, error: error.message };
    }
  }

  /**
   * 执行目录测试
   */
  async debugToc(tocUrl: string): Promise<DebugResult> {
    this.logs = [];
    this.extractUrlParams(tocUrl);

    try {
      let url = tocUrl;
      if (!url.startsWith('http')) {
        url = this.getBaseUrl() + (url.startsWith('/') ? '' : '/') + url;
      }

      this.log('info', 'request', `请求目录页面: ${url}`);

      const requestResult = await httpRequest({
        url,
        headers: this.getHeaders(),
      });

      if (!requestResult.success) {
        this.log('error', 'request', `请求失败: ${requestResult.error}`);
        return { success: false, logs: this.logs, error: requestResult.error };
      }

      this.log('success', 'request', `请求成功 ${requestResult.statusCode} (${requestResult.responseTime}ms)`);

      let body = requestResult.body || '';
      const chapters: any[] = [];

      // 如果有 ruleChapterUrl，先执行它获取API URL，然后请求API
      if (this.source.ruleChapterUrl) {
        const { rule } = preprocessRule(this.source.ruleChapterUrl);
        this.log('info', 'parse', `执行目录URL规则: ${rule.substring(0, 100)}...`);
        
        const ctx: ParseContext = {
          body,
          baseUrl: this.getBaseUrl(),
          variables: this.variables,
        };
        
        const urlResult = parseRule(ctx, rule);
        if (urlResult.success && urlResult.data) {
          const apiUrl = String(urlResult.data);
          this.log('info', 'request', `请求目录API: ${apiUrl}`);
          
          const apiResult = await httpRequest({
            url: apiUrl,
            headers: {
              ...this.getHeaders(),
              'Referer': this.getBaseUrl(),
            },
          });
          
          if (apiResult.success) {
            body = apiResult.body || '';
            this.log('success', 'request', `API请求成功 ${apiResult.statusCode}`);
          } else {
            this.log('warning', 'request', `API请求失败: ${apiResult.error}`);
          }
        }
      }

      // 解析章节列表
      if (this.source.ruleChapterList) {
        const { rule: listRule } = preprocessRule(this.source.ruleChapterList);
        const ctx: ParseContext = {
          body,
          baseUrl: this.getBaseUrl(),
          variables: this.variables,
        };

        const elements = parseList(ctx, listRule);

        if (elements && elements.length > 0) {
          this.log('info', 'parse', `章节列表规则匹配到 ${elements.length} 个元素`);

          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const chapter: any = {};

            // 章节名称（使用预处理去除 @Header 后缀）
            if (this.source.ruleChapterName) {
              const { rule } = preprocessRule(this.source.ruleChapterName);
              const result = parseFromElement(element, rule, this.getBaseUrl(), this.variables);
              chapter.name = result.success ? result.data : undefined;
            }

            // 章节URL（使用预处理去除 @Header 后缀）
            if (this.source.ruleContentUrl) {
              const { rule } = preprocessRule(this.source.ruleContentUrl);
              const result = parseFromElement(element, rule, this.getBaseUrl(), this.variables);
              chapter.url = result.success ? resolveUrl(String(result.data), this.getBaseUrl()) : undefined;
            }

            chapters.push(chapter);

            // 记录部分结果
            if (i < 5 || i === elements.length - 1) {
              this.log('info', 'parse', `[${i + 1}] 章节: ${chapter.name || '(无名称)'} | 链接: ${chapter.url || '(无链接)'}`);
            } else if (i === 5) {
              this.log('info', 'parse', `... 省略中间 ${elements.length - 6} 个章节 ...`);
            }
          }
        }
      }

      this.log('success', 'parse', `成功解析 ${chapters.length} 个章节`);

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
   */
  async debugContent(contentUrl: string): Promise<DebugResult> {
    this.logs = [];
    this.extractUrlParams(contentUrl);

    try {
      let url = contentUrl;
      if (!url.startsWith('http')) {
        url = this.getBaseUrl() + (url.startsWith('/') ? '' : '/') + url;
      }

      this.log('info', 'request', `请求正文: ${url}`);

      const requestResult = await httpRequest({
        url,
        headers: this.getHeaders(),
      });

      if (!requestResult.success) {
        this.log('error', 'request', `请求失败: ${requestResult.error}`);
        return { success: false, logs: this.logs, error: requestResult.error };
      }

      this.log('success', 'request', `请求成功 ${requestResult.statusCode} (${requestResult.responseTime}ms)`);

      const body = requestResult.body || '';
      let content = '';
      let imageUrls: string[] = [];

      // 解析正文内容（使用预处理去除 @Header 后缀）
      if (this.source.ruleBookContent) {
        const { rule } = preprocessRule(this.source.ruleBookContent);
        const ctx: ParseContext = {
          body,
          baseUrl: this.getBaseUrl(),
          variables: this.variables,
        };

        const result = parseRule(ctx, rule);
        if (result.success) {
          content = Array.isArray(result.data) ? result.data.join('\n') : String(result.data);
        }
      }

      this.log('info', 'field', `正文内容长度: ${content.length}`);

      // 图源模式：提取图片URL
      this.log('info', 'parse', '图源模式');
      this.log('info', 'parse', `正文内容预览: ${content.substring(0, 200)}`);
      
      imageUrls = extractImageUrls(content, url);

      if (imageUrls.length > 0) {
        this.log('info', 'field', `提取到 ${imageUrls.length} 张图片`);
      } else {
        this.log('warning', 'field', '未找到图片');
      }

      return {
        success: true,
        logs: this.logs,
        requestResult,
        parsedItems: [{ content }],
        imageUrls,
      };
    } catch (error: any) {
      this.log('error', 'error', `调试异常: ${error.message}`);
      return { success: false, logs: this.logs, error: error.message };
    }
  }

  /**
   * 执行发现测试
   */
  async debugExplore(exploreUrl: string): Promise<DebugResult> {
    this.logs = [];

    try {
      let url = exploreUrl;
      
      // 处理发现URL格式：分类名::URL
      if (url.includes('::')) {
        const parts = url.split('::');
        url = parts[1] || parts[0];
      }

      // 替换页码
      url = url.replace(/searchPage/g, '1');

      if (!url.startsWith('http')) {
        url = this.getBaseUrl() + (url.startsWith('/') ? '' : '/') + url;
      }

      this.log('info', 'request', `请求发现: ${url}`);

      const requestResult = await httpRequest({
        url,
        headers: this.getHeaders(),
      });

      if (!requestResult.success) {
        this.log('error', 'request', `请求失败: ${requestResult.error}`);
        return { success: false, logs: this.logs, error: requestResult.error };
      }

      this.log('success', 'request', `请求成功 ${requestResult.statusCode} (${requestResult.responseTime}ms)`);

      const body = requestResult.body || '';
      const books: any[] = [];

      // 使用搜索规则解析（发现和搜索通常使用相同的列表规则）
      if (this.source.ruleSearchList) {
        const ctx: ParseContext = {
          body,
          baseUrl: this.getBaseUrl(),
          variables: this.variables,
        };

        const elements = parseList(ctx, this.source.ruleSearchList);

        if (elements && elements.length > 0) {
          this.log('info', 'parse', `列表规则匹配到 ${elements.length} 个元素`);

          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const book: any = {};

            if (this.source.ruleSearchName) {
              const result = parseFromElement(element, this.source.ruleSearchName, this.getBaseUrl(), this.variables);
              book.name = result.success ? result.data : undefined;
            }

            if (this.source.ruleSearchCoverUrl) {
              const result = parseFromElement(element, this.source.ruleSearchCoverUrl, this.getBaseUrl(), this.variables);
              book.coverUrl = result.success ? resolveUrl(String(result.data), this.getBaseUrl()) : undefined;
            }

            if (this.source.ruleSearchNoteUrl) {
              const result = parseFromElement(element, this.source.ruleSearchNoteUrl, this.getBaseUrl(), this.variables);
              book.bookUrl = result.success ? resolveUrl(String(result.data), this.getBaseUrl()) : undefined;
            }

            books.push(book);

            if (i < 3) {
              this.log('info', 'field', `[${i + 1}] ${book.name || '(无名称)'}`);
            }
          }
        }
      }

      this.log('success', 'parse', `成功解析 ${books.length} 本书籍`);

      return {
        success: true,
        logs: this.logs,
        requestResult,
        parsedItems: books,
      };
    } catch (error: any) {
      this.log('error', 'error', `调试异常: ${error.message}`);
      return { success: false, logs: this.logs, error: error.message };
    }
  }
}

/**
 * 检测是否为异次元图源
 */
export function isYiciyuanSource(source: any): boolean {
  if (!source) return false;
  
  // 异次元图源特有字段
  const yiciyuanFields = [
    'ruleSearchUrl',
    'ruleSearchList',
    'ruleSearchName',
    'ruleSearchNoteUrl',
    'ruleBookContent',
    'ruleFindUrl',
    'ruleChapterUrl',
    'ruleIntroduce',
    'bookSingleThread',
    'httpUserAgent',
  ];
  
  // Legado 特有字段
  const legadoFields = [
    'ruleSearch',
    'ruleExplore',
    'ruleBookInfo',
    'ruleToc',
    'ruleContent',
    'searchUrl',
    'exploreUrl',
  ];
  
  let yiciyuanCount = 0;
  let legadoCount = 0;
  
  for (const field of yiciyuanFields) {
    if (field in source && source[field] !== undefined && source[field] !== '') {
      yiciyuanCount++;
    }
  }
  
  for (const field of legadoFields) {
    if (field in source && source[field] !== undefined && source[field] !== '') {
      legadoCount++;
    }
  }
  
  return yiciyuanCount > legadoCount;
}
