/**
 * 书源调试器
 * 核心调试引擎，执行书源规则并返回结果
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
 * 书源调试器类
 */
export class SourceDebugger {
  private source: BookSource;
  private logs: DebugLog[] = [];
  private variables: Record<string, any> = {};

  constructor(source: BookSource) {
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
   * 构建搜索URL
   */
  private buildSearchUrl(keyword: string, page: number = 1): string {
    let url = this.source.searchUrl || '';

    // 替换关键词
    url = url.replace(/\{\{key\}\}/g, encodeURIComponent(keyword));
    url = url.replace(/\{\{page\}\}/g, String(page));

    // 处理相对URL
    if (url && !url.startsWith('http')) {
      url = this.getBaseUrl() + (url.startsWith('/') ? '' : '/') + url;
    }

    return url;
  }

  /**
   * 解析请求头
   */
  private getHeaders(): Record<string, string> {
    if (this.source.header) {
      return parseHeaders(this.source.header);
    }
    return {};
  }

  /**
   * 执行搜索测试
   */
  async debugSearch(keyword: string): Promise<DebugResult> {
    this.logs = [];

    try {
      // 1. 构建搜索URL
      const searchUrl = this.buildSearchUrl(keyword);
      if (!searchUrl) {
        this.log('error', 'error', '搜索URL为空');
        return { success: false, logs: this.logs, error: '搜索URL为空' };
      }

      this.log('info', 'request', `构建搜索URL: ${searchUrl}`);

      // 2. 发送请求
      const requestResult = await httpRequest({
        url: searchUrl,
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

      const ctx: ParseContext = {
        body: requestResult.body || '',
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

        // 解析各字段
        const fields: (keyof BookListRule)[] = [
          'name',
          'author',
          'intro',
          'kind',
          'lastChapter',
          'updateTime',
          'bookUrl',
          'coverUrl',
          'wordCount',
        ];

        for (const field of fields) {
          const rule = ruleSearch[field];
          if (rule) {
            const result = parseFromElement(
              element as cheerio.Cheerio<any>,
              rule,
              this.getBaseUrl()
            );
            if (result.success && result.data) {
              (book as any)[field] = Array.isArray(result.data)
                ? result.data[0]
                : result.data;
              this.log(
                'success',
                'field',
                `[${i + 1}] ${field}: ${(book as any)[field]}`
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
   */
  async debugBookInfo(bookUrl: string): Promise<DebugResult> {
    this.logs = [];

    try {
      // 处理相对URL
      let url = bookUrl;
      if (!url.startsWith('http')) {
        url = this.getBaseUrl() + (url.startsWith('/') ? '' : '/') + url;
      }

      this.log('info', 'request', `请求书籍详情: ${url}`);

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

      const ctx: ParseContext = {
        body: requestResult.body || '',
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
   */
  async debugToc(tocUrl: string): Promise<DebugResult> {
    this.logs = [];

    try {
      let url = tocUrl;
      if (!url.startsWith('http')) {
        url = this.getBaseUrl() + (url.startsWith('/') ? '' : '/') + url;
      }

      this.log('info', 'request', `请求目录: ${url}`);

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
        body: requestResult.body || '',
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
            this.getBaseUrl()
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
            this.getBaseUrl()
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

        // 如果正文为空，尝试用 text 属性重新解析
        if (!content && ruleContent.content) {
          const textRule = ruleContent.content
            .replace(/@textNodes$/, '@text')
            .replace(/@html$/, '@text');
          const textResult = parseRule(ctx, textRule);
          if (textResult.success && textResult.data) {
            if (Array.isArray(textResult.data)) {
              content = textResult.data.filter(Boolean).join('\n');
            } else {
              content = String(textResult.data);
            }
            this.log(
              'info',
              'field',
              `使用 text 属性重新解析，长度: ${content.length}`
            );
          }
        }
      }

      // 根据书源类型处理内容
      const isImageSource = this.source.bookSourceType === BookSourceType.IMAGE;
      let imageUrls: string[] = [];

      if (isImageSource) {
        // 图片书源：提取图片URL列表
        this.log('info', 'parse', '图片书源模式');
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
            if (rule.includes('##')) {
              const [pattern, replacement] = rule.split('##');
              content = content.replace(new RegExp(pattern, 'g'), replacement || '');
            }
          }
          this.log('info', 'parse', '已应用替换规则');
        } catch {
          this.log('warning', 'parse', '替换规则执行失败');
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

export default SourceDebugger;
