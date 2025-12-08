/**
 * 规则解析器
 * 参考 Legado 实现，支持 CSS选择器、XPath、JSONPath、正则表达式、JavaScript
 */
import * as cheerio from 'cheerio';
import { JSONPath } from 'jsonpath-plus';
import { decode } from 'html-entities';
import * as vm from 'vm';
import * as crypto from 'crypto';
import * as xpath from 'xpath';
import { DOMParser } from '@xmldom/xmldom';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { CacheManager } from './cache-manager';
import { CookieStore } from './cookie-manager';

// HTTP 请求缓存 (用于 JS 中的同步请求模拟)
const httpRequestCache = new Map<string, { body: string; headers: Record<string, string> }>();

/**
 * 修复 Legado 风格的 JSONPath
 * Legado 使用 jayway jsonpath，支持以下特殊写法：
 * 1. $.data.page[*]image -> $.data.page[*].image (省略点号)
 * 2. $.data.[*] -> $.data[*] (多余的点号)
 * 3. .chapters[*] -> $.chapters[*] (省略 $ 前缀)
 */
function fixLegadoJsonPath(path: string): string {
  let fixed = path;
  // 在 ] 后面如果紧跟字母或 $，自动添加点号
  fixed = fixed.replace(/\]([a-zA-Z_$])/g, '].$1');
  // 移除 .[ 中多余的点号，变成 [
  fixed = fixed.replace(/\.\[/g, '[');
  // 如果以 . 开头，添加 $ 前缀
  if (fixed.startsWith('.')) {
    fixed = '$' + fixed;
  }
  return fixed;
}

/**
 * 同步 HTTP 请求 (用于 JS 沙箱中)
 * 注意: 这是一个阻塞操作，仅用于规则解析
 */
export function syncHttpRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  } = {}
): { body: string; headers: Record<string, string>; url: string; code: number } {
  const { method = 'GET', headers = {}, body, timeout = 30000 } = options;

  // 检查缓存
  const cacheKey = `${method}:${url}:${body || ''}`;
  if (httpRequestCache.has(cacheKey)) {
    const cached = httpRequestCache.get(cacheKey)!;
    return { body: cached.body, headers: cached.headers, url, code: 200 };
  }

  try {
    // 使用 child_process 执行同步请求
    const { execSync } = require('child_process');
    
    // 构建 curl 命令
    let curlCmd = `curl -s -L --max-time ${Math.floor(timeout / 1000)}`;
    curlCmd += ` -X ${method}`;
    
    // 添加请求头
    for (const [key, value] of Object.entries(headers)) {
      curlCmd += ` -H "${key}: ${value}"`;
    }
    
    // 添加默认 User-Agent
    if (!headers['User-Agent'] && !headers['user-agent']) {
      curlCmd += ` -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"`;
    }
    
    // 添加请求体
    if (body) {
      curlCmd += ` -d "${body.replace(/"/g, '\\"')}"`;
    }
    
    curlCmd += ` "${url}"`;
    
    const result = execSync(curlCmd, {
      encoding: 'utf8',
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    const response = { body: result, headers: {}, url, code: 200 };
    
    // 缓存结果
    httpRequestCache.set(cacheKey, { body: result, headers: {} });
    
    return response;
  } catch (error: any) {
    console.error('[HTTP] Request failed:', error.message);
    return { body: '', headers: {}, url, code: 0 };
  }
}

/**
 * 异步 HTTP 请求
 */
export function asyncHttpRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  } = {}
): Promise<{ body: string; headers: Record<string, string>; url: string; code: number }> {
  return new Promise((resolve) => {
    const { method = 'GET', headers = {}, body, timeout = 30000 } = options;

    try {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const lib = isHttps ? https : http;

      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...headers,
        },
        timeout,
      };

      const req = lib.request(requestOptions, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const responseHeaders: Record<string, string> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            if (typeof value === 'string') {
              responseHeaders[key] = value;
            } else if (Array.isArray(value)) {
              responseHeaders[key] = value.join(', ');
            }
          }
          resolve({
            body: data,
            headers: responseHeaders,
            url: res.headers.location || url,
            code: res.statusCode || 0,
          });
        });
      });

      req.on('error', (error) => {
        console.error('[HTTP] Request error:', error.message);
        resolve({ body: '', headers: {}, url, code: 0 });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ body: '', headers: {}, url, code: 0 });
      });

      if (body) {
        req.write(body);
      }
      req.end();
    } catch (error: any) {
      console.error('[HTTP] Request failed:', error.message);
      resolve({ body: '', headers: {}, url, code: 0 });
    }
  });
}

// 解析模式
export enum RuleMode {
  Default = 'default', // CSS选择器（默认）
  XPath = 'xpath',
  Json = 'json',
  Regex = 'regex',
}

export interface ParseContext {
  body: string; // 原始响应体
  baseUrl: string; // 基础URL
  variables: Record<string, any>; // 变量存储
  result?: any; // 上一步结果
  isJson?: boolean; // 是否为JSON内容
}

export interface ParseResult {
  success: boolean;
  data?: any;
  error?: string;
  matchCount?: number;
}

// 解析后的规则
interface SourceRule {
  rule: string;
  mode: RuleMode;
  replaceRegex: string;
  replacement: string;
  replaceFirst: boolean;
}

/**
 * 判断内容是否为 JSON
 */
export function detectJson(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (
    (trimmed.startsWith('{') || trimmed.startsWith('[')) &&
    (trimmed.endsWith('}') || trimmed.endsWith(']'))
  ) {
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * HTML 格式化 - 参考 Legado HtmlFormatter
 * 将 HTML 标签转换为纯文本，保留换行
 */
export function formatHtml(html: string, keepImg: boolean = false): string {
  if (!html) return '';

  let content = html;

  // 替换 HTML 实体
  content = content.replace(/(&nbsp;)+/g, ' ');
  content = content.replace(/(&ensp;|&emsp;)/g, ' ');
  content = content.replace(
    /(&thinsp;|&zwnj;|&zwj;|\u2009|\u200C|\u200D)/g,
    ''
  );

  // 移除注释
  content = content.replace(/<!--[\s\S]*?-->/g, '');

  // 将块级标签转换为换行
  content = content.replace(
    /<\/?(?:div|p|br|hr|h\d|article|dd|dl)[^>]*>/gi,
    '\n'
  );

  // 移除其他 HTML 标签（可选保留 img）
  if (keepImg) {
    content = content.replace(/<\/?(?!img)[a-zA-Z]+(?=[ >])[^<>]*>/g, '');
  } else {
    content = content.replace(/<\/?[a-zA-Z]+(?=[ >])[^<>]*>/g, '');
  }

  // 处理换行和缩进
  content = content.replace(/\s*\n+\s*/g, '\n　　');
  content = content.replace(/^[\n\s]+/, '　　');
  content = content.replace(/[\n\s]+$/, '');

  // 解码 HTML 实体
  if (content.includes('&')) {
    content = decode(content);
  }

  return content;
}

/**
 * 格式化正文内容（文本书源）
 */
export function formatContent(content: string): string {
  if (!content) return '';

  // 使用 HTML 格式化
  let formatted = formatHtml(content, false);

  // 确保每段有缩进
  const lines = formatted.split('\n');
  formatted = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('　　')) return trimmed;
      return '　　' + trimmed;
    })
    .filter(Boolean)
    .join('\n');

  return formatted;
}

/**
 * 提取图片URL列表（图片书源）
 * 参考 Legado HtmlFormatter.formatKeepImg
 */
export function extractImageUrls(content: string, baseUrl: string): string[] {
  if (!content) return [];

  const images: string[] = [];

  // 正则匹配 img 标签中的 src（支持 src 和 data-src）
  // 修复：使用非贪婪匹配，支持 <img src="..."> 格式
  const imgPattern = /<img\s+(?:[^>]*?\s)?(?:data-src|src)\s*=\s*["']([^"']+)["']/gi;
  let match;

  while ((match = imgPattern.exec(content)) !== null) {
    let imgUrl = match[1];
    if (imgUrl) {
      // 处理相对URL（参数顺序：url, baseUrl）
      imgUrl = resolveUrl(imgUrl, baseUrl);
      if (imgUrl && !images.includes(imgUrl)) {
        images.push(imgUrl);
      }
    }
  }

  // 如果没有找到 img 标签，尝试直接匹配图片URL
  if (images.length === 0) {
    const urlPattern = /(https?:\/\/[^\s<>"']+\.(?:jpg|jpeg|png|gif|webp|bmp)(?:\?[^\s<>"']*)?)/gi;
    while ((match = urlPattern.exec(content)) !== null) {
      const imgUrl = match[1];
      if (imgUrl && !images.includes(imgUrl)) {
        images.push(imgUrl);
      }
    }
  }

  return images;
}

/**
 * 格式化图片内容（图片书源）
 * 保留 img 标签，返回带图片的 HTML
 */
export function formatImageContent(content: string, baseUrl: string): string {
  if (!content) return '';

  // 使用 HTML 格式化，保留 img 标签
  let formatted = formatHtml(content, true);

  // 处理 img 标签中的相对 URL
  formatted = formatted.replace(
    /<img[^>]*\s(?:data-src|src)\s*=\s*['"]([^'"]+)['"][^>]*>/gi,
    (match, src) => {
      const absoluteUrl = resolveUrl(baseUrl, src);
      return `<img src="${absoluteUrl}">`;
    }
  );

  return formatted;
}

/**
 * 解析单条规则字符串，识别规则类型
 */
export function parseSourceRule(
  ruleStr: string,
  isJson: boolean = false
): SourceRule {
  let rule = ruleStr.trim();
  let mode = RuleMode.Default;
  let replaceRegex = '';
  let replacement = '';
  let replaceFirst = false;

  // 判断规则类型
  if (rule.toLowerCase().startsWith('@css:')) {
    mode = RuleMode.Default;
    rule = rule.substring(5);
  } else if (rule.startsWith('@@')) {
    mode = RuleMode.Default;
    rule = rule.substring(2);
  } else if (rule.toLowerCase().startsWith('@xpath:')) {
    mode = RuleMode.XPath;
    rule = rule.substring(7);
  } else if (rule.toLowerCase().startsWith('@json:')) {
    mode = RuleMode.Json;
    rule = rule.substring(6);
  } else if (isJson || rule.startsWith('$.') || rule.startsWith('$[')) {
    mode = RuleMode.Json;
  } else if (rule.startsWith('/') && !rule.startsWith('//')) {
    // XPath 以 / 开头但不是 //
    mode = RuleMode.XPath;
  } else if (rule.startsWith(':')) {
    mode = RuleMode.Regex;
    rule = rule.substring(1);
  }

  // 分离正则替换规则
  // 格式: ##regex##replacement 或 ##regex##replacement### (replaceFirst/OnlyOne)
  const ruleParts = rule.split('##');
  rule = ruleParts[0].trim();
  if (ruleParts.length > 1) {
    replaceRegex = ruleParts[1];
  }
  if (ruleParts.length > 2) {
    replacement = ruleParts[2];
  }
  // 检查是否为 OnlyOne 模式 (以 ### 结尾，即第4部分存在)
  if (ruleParts.length > 3) {
    replaceFirst = true;
  }

  return { rule, mode, replaceRegex, replacement, replaceFirst };
}

/**
 * 解析索引表达式
 * 支持: [0], [1,2,3], [0:10], [0:10:2], [!0,1], [-1:0] 等
 */
function parseIndexExpression(expr: string, totalLength: number): number[] {
  const indices: number[] = [];
  const isExclude = expr.startsWith('!');
  const content = isExclude ? expr.substring(1) : expr;

  const parts = content.split(',').map((p) => p.trim());

  for (const part of parts) {
    if (part.includes(':')) {
      // 区间格式 start:end 或 start:end:step
      const rangeParts = part.split(':').map((p) => p.trim());
      let start = rangeParts[0] ? parseInt(rangeParts[0]) : 0;
      let end = rangeParts[1] ? parseInt(rangeParts[1]) : totalLength - 1;
      let step = rangeParts[2] ? parseInt(rangeParts[2]) : 1;

      // 处理负数索引
      if (start < 0) start = totalLength + start;
      if (end < 0) end = totalLength + end;
      if (step < 0) step = Math.abs(step);

      // 确保在范围内
      start = Math.max(0, Math.min(start, totalLength - 1));
      end = Math.max(0, Math.min(end, totalLength - 1));

      if (start <= end) {
        for (let i = start; i <= end; i += step) indices.push(i);
      } else {
        // 反向
        for (let i = start; i >= end; i -= step) indices.push(i);
      }
    } else {
      // 单个索引
      let idx = parseInt(part);
      if (idx < 0) idx = totalLength + idx;
      if (idx >= 0 && idx < totalLength) indices.push(idx);
    }
  }

  if (isExclude) {
    // 排除模式：返回不在indices中的所有索引
    const result: number[] = [];
    for (let i = 0; i < totalLength; i++) {
      if (!indices.includes(i)) result.push(i);
    }
    return result;
  }

  return indices;
}

/**
 * Legado 语法选择器
 * 支持: class.xxx, id.xxx, tag.xxx, tag.xxx.n, text.xxx, children, 数组索引等
 */
function selectWithLegadoSyntax(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<any>,
  selector: string
): cheerio.Cheerio<any> {
  // children - 获取所有子元素
  if (selector === 'children') {
    return $el.children();
  }

  // 数组索引格式 [index] 或 [start:end:step]
  // 注意：需要区分 CSS 属性选择器 [property="xxx"] 和数组索引 [0] 或 [0:10]
  if (selector.startsWith('[') && selector.endsWith(']')) {
    const expr = selector.slice(1, -1);
    // 如果包含 = 或 ~ 或 ^ 或 $ 或 * 等 CSS 属性选择器特征，则当作 CSS 选择器处理
    if (/[=~^$*|]/.test(expr) || /^[a-zA-Z]/.test(expr)) {
      // CSS 属性选择器，使用 cheerio 的 find
      return $el.find(selector);
    }
    // 否则当作数组索引处理
    const children = $el.children();
    const indices = parseIndexExpression(expr, children.length);
    const result = $();
    for (const idx of indices) {
      result.add(children.eq(idx));
    }
    return result.length > 0 ? result : children.filter((i) => indices.includes(i));
  }

  // text.xxx - 查找包含特定文本的元素
  if (selector.startsWith('text.')) {
    const searchText = selector.substring(5);
    return $el.find('*').filter((_, el) => {
      const text = $(el).clone().children().remove().end().text();
      return text.includes(searchText);
    });
  }

  // class.xxx 或 class.xxx.index 格式
  // Legado 中 class.section-list fix 表示同时具有 section-list 和 fix 两个类
  // 空格分隔的多个类名作为 AND 条件
  if (selector.startsWith('class.')) {
    const afterClass = selector.substring(6);
    
    // 查找最后的索引部分（数字或[...]）
    // 例如: "section-list fix" -> className="section-list fix", indexPart=null
    // 例如: "section-list.0" -> className="section-list", indexPart="0"
    // 例如: "section-list fix.0" -> className="section-list fix", indexPart="0"
    let className = afterClass;
    let indexPart: string | null = null;
    
    // 检查是否以 .数字 或 .[...] 结尾
    const indexMatch = afterClass.match(/\.(-?\d+|\[.+\])$/);
    if (indexMatch) {
      className = afterClass.substring(0, afterClass.length - indexMatch[0].length);
      indexPart = indexMatch[1];
    }
    
    // 处理空格分隔的多类名：转换为 CSS 选择器 .class1.class2
    const classSelector = className.split(/\s+/).map(c => `.${c}`).join('');
    const found = $el.find(classSelector);

    if (indexPart) {
      // 有索引
      if (/^-?\d+$/.test(indexPart)) {
        const index = parseInt(indexPart);
        return index < 0 ? found.eq(found.length + index) : found.eq(index);
      }
      // 可能是数组表达式
      if (indexPart.startsWith('[')) {
        const indices = parseIndexExpression(
          indexPart.slice(1, -1),
          found.length
        );
        return found.filter((i) => indices.includes(i));
      }
    }

    // 如果没找到，检查自身是否匹配所有类名
    if (found.length === 0 && $el.hasClass) {
      const allMatch = className.split(/\s+/).every(c => $el.hasClass(c));
      if (allMatch) return $el;
    }
    return found;
  }

  // id.xxx 格式
  if (selector.startsWith('id.')) {
    const id = selector.substring(3);
    return $el.find(`#${id}`);
  }

  // tag.xxx 或 tag.xxx.index 或 tag.xxx!exclude 格式
  if (selector.startsWith('tag.')) {
    const afterTag = selector.substring(4);
    
    // 检查是否有排除语法 (tag.option!0 或 tag.option!0:2)
    const excludeMatch = afterTag.match(/^([a-z0-9_-]+)!(.+)$/i);
    if (excludeMatch) {
      const tag = excludeMatch[1];
      const excludeExpr = excludeMatch[2];
      const allTags = $el.find(tag);
      
      // 解析排除的索引
      const excludeIndices = excludeExpr.split(':').map((n) => {
        const idx = parseInt(n);
        return idx < 0 ? allTags.length + idx : idx;
      });
      return allTags.filter((i) => !excludeIndices.includes(i));
    }
    
    const parts = afterTag.split('.');
    const tag = parts[0];
    let allTags = $el.find(tag);

    if (parts.length > 1) {
      const indexPart = parts.slice(1).join('.');
      // 处理 ! 排除和 . 选择
      if (indexPart.startsWith('!')) {
        // 排除模式
        const excludeIndices = indexPart
          .substring(1)
          .split(':')
          .map((n) => {
            const idx = parseInt(n);
            return idx < 0 ? allTags.length + idx : idx;
          });
        return allTags.filter((i) => !excludeIndices.includes(i));
      }

      // 处理区间 start:end:step
      if (indexPart.includes(':')) {
        const indices = parseIndexExpression(indexPart, allTags.length);
        return allTags.filter((i) => indices.includes(i));
      }

      // 单个索引
      const index = parseInt(indexPart);
      if (!isNaN(index)) {
        return index < 0
          ? allTags.eq(allTags.length + index)
          : allTags.eq(index);
      }
    }
    return allTags;
  }

  // 纯标签名.index 格式，如 a.0, p.1, div.-1
  if (/^[a-z]+\.-?\d+$/i.test(selector)) {
    const match = selector.match(/^([a-z]+)\.(-?\d+)$/i);
    if (match) {
      const tag = match[1];
      const index = parseInt(match[2]);
      const allTags = $el.find(tag);
      return index < 0 ? allTags.eq(allTags.length + index) : allTags.eq(index);
    }
  }

  // 纯标签名.排除格式，如 a!0, div!1:3
  if (/^[a-z]+![0-9:,-]+$/i.test(selector)) {
    const match = selector.match(/^([a-z]+)!(.+)$/i);
    if (match) {
      const tag = match[1];
      const allTags = $el.find(tag);
      const excludeIndices = parseIndexExpression('!' + match[2], allTags.length);
      return allTags.filter((i) => excludeIndices.includes(i));
    }
  }

  // CSS类名.index 格式，如 .pt-info.0, .pt-name.1
  if (/^\.[a-z0-9_-]+\.-?\d+$/i.test(selector)) {
    const match = selector.match(/^\.([a-z0-9_-]+)\.(-?\d+)$/i);
    if (match) {
      const className = match[1];
      const index = parseInt(match[2]);
      const allEls = $el.find(`.${className}`);
      return index < 0 ? allEls.eq(allEls.length + index) : allEls.eq(index);
    }
  }

  // 普通 CSS 选择器或标签名
  return $el.find(selector);
}

/**
 * CSS 选择器解析
 * 支持 Legado 规则语法
 */
function parseCss(html: string, rule: string, baseUrl: string): any[] {
  const $ = cheerio.load(html);
  const results: any[] = [];

  // 解析规则：选择器@属性 或 选择器##正则
  let fullRule = rule;
  let regex: RegExp | null = null;
  let replaceStr = '';

  // 处理正则替换 ##regex##replacement
  if (fullRule.includes('##')) {
    const parts = fullRule.split('##');
    fullRule = parts[0];
    if (parts[1]) {
      try {
        regex = new RegExp(parts[1], 'g');
      } catch {
        // ignore
      }
    }
    if (parts[2] !== undefined) {
      replaceStr = parts[2];
    }
  }

  // 解析链式规则，如 h2@a@href, .info@p@text
  const attrNames = [
    'text',
    'href',
    'src',
    'html',
    'innerHTML',
    'outerHtml',
    'textNodes',
    'content',
    'alt',
    'title',
    'value',
    'data-original',
    'data-src',
  ];
  const parts = fullRule.split('@');
  let attr = 'text';
  let selectorParts: string[] = [];

  // 从后往前找属性
  // 如果只有一个部分且是属性名，则整个规则就是属性
  if (parts.length === 1) {
    const onlyPart = parts[0].toLowerCase();
    if (attrNames.includes(onlyPart) || onlyPart.startsWith('data-')) {
      attr = parts[0];
      selectorParts = [];
    } else {
      selectorParts = parts;
    }
  } else if (parts.length > 1) {
    const lastPart = parts[parts.length - 1].toLowerCase();
    if (attrNames.includes(lastPart) || lastPart.startsWith('data-')) {
      attr = parts.pop()!;
    }
    selectorParts = parts;
  } else {
    selectorParts = parts;
  }

  // 执行链式选择
  let elements: cheerio.Cheerio<any>;
  
  // 如果没有选择器，选择根元素的直接子元素（通常是 body 的内容）
  if (selectorParts.length === 0 || (selectorParts.length === 1 && !selectorParts[0])) {
    // 尝试获取 body 内容，如果没有 body 则获取所有顶级元素
    const body = $('body');
    if (body.length > 0) {
      elements = body.children();
      // 如果 body 只有一个子元素，直接使用它
      if (elements.length === 1) {
        elements = $(elements[0]);
      } else if (elements.length === 0) {
        // body 为空，尝试获取 body 本身的文本
        elements = body;
      }
    } else {
      // 没有 body，获取根元素的直接子元素
      elements = $.root().children();
      if (elements.length === 1) {
        elements = $(elements[0]);
      }
    }
  } else {
    elements = $.root();
    for (const selectorPart of selectorParts) {
      if (!selectorPart) continue;
      elements = selectWithLegadoSyntax($, elements, selectorPart);
      if (elements.length === 0) break;
    }
  }

  // 如果选择器没有找到元素，回退到根元素的第一个子元素
  // 这处理了规则和 bookList 相同的情况
  if (elements.length === 0 && selectorParts.length > 0) {
    const body = $('body');
    if (body.length > 0) {
      const children = body.children();
      if (children.length === 1) {
        elements = $(children[0]);
      } else if (children.length > 1) {
        elements = children;
      } else {
        elements = body;
      }
    }
  }

  // 执行选择
  elements.each((_, el) => {
    let value: string;

    if (attr === 'text') {
      value = $(el).text().trim();
      // 如果是 text.xxx 格式，去掉前缀
      const lastSelector = selectorParts[selectorParts.length - 1] || '';
      if (lastSelector.startsWith('text.')) {
        const prefix = lastSelector.substring(5);
        if (value.startsWith(prefix)) {
          value = value.substring(prefix.length).trim();
        }
      }
    } else if (attr === 'textNodes') {
      // textNodes: 只获取直接文本节点，用换行连接
      const textNodes: string[] = [];
      $(el)
        .contents()
        .each((_, node) => {
          if (node.type === 'text') {
            const text = (node as any).data?.trim();
            if (text) textNodes.push(text);
          }
        });
      value = textNodes.join('\n');
    } else if (attr === 'ownText') {
      // ownText: 只获取直接文本，不包括子元素文本
      value = $(el).clone().children().remove().end().text().trim();
    } else if (attr === 'html' || attr === 'innerHTML') {
      // html: 移除 script 和 style 标签
      const clone = $(el).clone();
      clone.find('script, style').remove();
      value = clone.html() || '';
    } else if (attr === 'outerHtml' || attr === 'all') {
      value = $.html(el);
    } else if (attr === 'href' || attr === 'src') {
      const attrValue = $(el).attr(attr) || '';
      // 处理相对URL
      value = resolveUrl(attrValue, baseUrl);
    } else {
      value = $(el).attr(attr) || '';
    }

    // 应用正则替换
    if (regex && value) {
      if (replaceStr !== undefined && replaceStr !== '') {
        value = value.replace(regex, replaceStr);
      } else {
        const match = value.match(regex);
        if (match) {
          value = match[1] || match[0];
        }
      }
    }

    if (value) {
      results.push(value);
    }
  });

  return results;
}

/**
 * JSONPath 解析
 */
function parseJson(json: string | object, rule: string): any[] {
  try {
    const data = typeof json === 'string' ? JSON.parse(json) : json;

    // 移除前缀
    let path = rule;
    if (path.startsWith('@json:')) {
      path = path.substring(6);
    }
    if (!path.startsWith('$')) {
      path = '$.' + path;
    }
    // 修复 Legado 风格的 JSONPath
    path = fixLegadoJsonPath(path);

    const results = JSONPath({ path, json: data, wrap: false });
    
    // 如果结果是数组，直接返回；否则包装成数组
    if (Array.isArray(results)) {
      return results;
    }
    return results !== undefined ? [results] : [];
  } catch {
    return [];
  }
}

/**
 * 正则表达式解析
 */
function parseRegex(text: string, rule: string): any[] {
  try {
    // 移除前缀
    let pattern = rule;
    if (pattern.startsWith(':')) {
      pattern = pattern.substring(1);
    }

    const regex = new RegExp(pattern, 'g');
    const results: string[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      results.push(match[1] || match[0]);
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * XPath 解析 - 使用真正的 xpath 库
 * 完整支持 XPath 1.0 语法
 */
function parseXPath(html: string, rule: string, baseUrl: string): any[] {
  try {
    // 移除前缀
    let xpathExpr = rule;
    if (xpathExpr.toLowerCase().startsWith('@xpath:')) {
      xpathExpr = xpathExpr.substring(7);
    }

    // 预处理 HTML，修复常见问题
    let processedHtml = html
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    // 使用 xmldom 解析 HTML
    const parser = new DOMParser({
      errorHandler: {
        warning: () => {},
        error: () => {},
        fatalError: () => {},
      },
    });

    // 尝试作为 HTML 解析
    let doc: Document;
    try {
      doc = parser.parseFromString(processedHtml, 'text/html');
    } catch {
      // 如果 HTML 解析失败，尝试作为 XML
      try {
        doc = parser.parseFromString(processedHtml, 'text/xml');
      } catch {
        // 回退到 cheerio 方式
        return parseXPathFallback(html, xpathExpr, baseUrl);
      }
    }

    if (!doc || !doc.documentElement) {
      return parseXPathFallback(html, xpathExpr, baseUrl);
    }

    // 执行 XPath 查询
    const results: string[] = [];
    
    try {
      const nodes = xpath.select(xpathExpr, doc);
      
      if (typeof nodes === 'string') {
        // 直接返回字符串结果
        results.push(nodes);
      } else if (typeof nodes === 'number') {
        results.push(String(nodes));
      } else if (typeof nodes === 'boolean') {
        results.push(String(nodes));
      } else if (Array.isArray(nodes)) {
        for (const node of nodes) {
          if (node === null || node === undefined) continue;
          
          // 处理不同类型的节点
          if (typeof node === 'string') {
            results.push(node);
          } else if (typeof node === 'number') {
            results.push(String(node));
          } else if (typeof node === 'object') {
            const nodeObj = node as any;
            if (nodeObj.nodeValue) {
              // 文本节点或属性节点
              let value = nodeObj.nodeValue as string;
              // 处理 URL
              if (nodeObj.nodeName === 'href' || nodeObj.nodeName === 'src') {
                value = resolveUrl(value, baseUrl);
              }
              results.push(value);
            } else if (nodeObj.textContent) {
              // 元素节点 - 获取文本内容
              const text = nodeObj.textContent as string;
              if (text) results.push(text.trim());
            } else if (typeof nodeObj.toString === 'function') {
              results.push(nodeObj.toString());
            }
          }
        }
      }
    } catch (xpathError) {
      console.error('[XPath] Query error:', xpathError);
      // 回退到简单实现
      return parseXPathFallback(html, xpathExpr, baseUrl);
    }

    return results;
  } catch (error) {
    console.error('[XPath] Parse error:', error);
    return [];
  }
}

/**
 * XPath 解析回退方案 - 使用 cheerio 模拟
 */
function parseXPathFallback(html: string, xpathExpr: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const results: string[] = [];

  // 转换常见 XPath 为 CSS 选择器
  const cssSelector = xpathToCSS(xpathExpr);

  if (cssSelector.attr) {
    $(cssSelector.selector).each((_, el) => {
      const value = $(el).attr(cssSelector.attr!);
      if (value) {
        if (cssSelector.attr === 'href' || cssSelector.attr === 'src') {
          results.push(resolveUrl(value, baseUrl));
        } else {
          results.push(value);
        }
      }
    });
  } else if (cssSelector.text) {
    $(cssSelector.selector).each((_, el) => {
      const text = $(el).text().trim();
      if (text) results.push(text);
    });
  } else {
    $(cssSelector.selector).each((_, el) => {
      const html = $(el).html();
      if (html) results.push(html);
    });
  }

  return results;
}

/**
 * 简单的 XPath 到 CSS 转换 (用于回退)
 */
function xpathToCSS(xpathStr: string): {
  selector: string;
  attr?: string;
  text?: boolean;
} {
  let selector = xpathStr;
  let attr: string | undefined;
  let text = false;

  // 处理 /text()
  if (selector.endsWith('/text()')) {
    selector = selector.replace('/text()', '');
    text = true;
  }

  // 处理 /@attr
  const attrMatch = selector.match(/\/@([a-zA-Z-]+)$/);
  if (attrMatch) {
    attr = attrMatch[1];
    selector = selector.replace(/\/@[a-zA-Z-]+$/, '');
  }

  // 转换 XPath 语法到 CSS
  selector = selector
    .replace(/^\/\//, '') // 移除开头的 //
    .replace(/\/\//g, ' ') // // -> 后代选择器
    .replace(/\//g, ' > ') // / -> 子选择器
    .replace(/\[@([a-zA-Z-]+)="([^"]+)"\]/g, '[$1="$2"]') // [@attr="value"]
    .replace(/\[@([a-zA-Z-]+)\]/g, '[$1]') // [@attr]
    .replace(/\[(\d+)\]/g, ':nth-child($1)') // [n] -> :nth-child(n)
    .replace(/\[position\(\)>(\d+)\]/g, ':nth-child(n+$1)') // [position()>n]
    .replace(/\[contains\(@class,\s*"([^"]+)"\)\]/g, '.$1') // [contains(@class,"x")]
    .replace(/\[contains\(text\(\),\s*"([^"]+)"\)\]/g, ':contains("$1")') // [contains(text(),"x")]
    .trim();

  if (!selector) selector = '*';

  return { selector, attr, text };
}

/**
 * 获取 XPath 元素列表 (用于 parseList)
 */
function getXPathElements(html: string, xpathExpr: string): any[] {
  try {
    const parser = new DOMParser({
      errorHandler: { warning: () => {}, error: () => {}, fatalError: () => {} },
    });
    
    const doc = parser.parseFromString(html, 'text/html');
    if (!doc) return [];
    
    const nodes = xpath.select(xpathExpr, doc);
    if (Array.isArray(nodes)) {
      return nodes.filter(n => n && typeof n === 'object');
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * 创建对称加密对象 (模拟 Legado 的 SymmetricCrypto)
 * 支持 AES, DES, DESede(3DES) 等算法
 */
function createSymmetricCrypto(
  transformation: string,
  key: string | number[],
  iv?: string | number[] | null
) {
  // 解析 transformation: 算法/模式/填充
  const parts = transformation.split('/');
  const algorithm = parts[0].toLowerCase();
  const mode = (parts[1] || 'ECB').toUpperCase();
  const padding = parts[2] || 'PKCS5Padding';

  // 转换 key 和 iv 为 Buffer
  const keyBuffer =
    typeof key === 'string' ? Buffer.from(key, 'utf8') : Buffer.from(key);
  const ivBuffer = iv
    ? typeof iv === 'string'
      ? Buffer.from(iv, 'utf8')
      : Buffer.from(iv)
    : null;

  // 映射算法名称
  let cipherAlgorithm = algorithm;
  if (algorithm === 'aes') {
    const keyLen = keyBuffer.length;
    if (keyLen === 16) cipherAlgorithm = 'aes-128';
    else if (keyLen === 24) cipherAlgorithm = 'aes-192';
    else cipherAlgorithm = 'aes-256';
  } else if (algorithm === 'desede' || algorithm === '3des') {
    cipherAlgorithm = 'des-ede3';
  }

  const cipherName = `${cipherAlgorithm}-${mode.toLowerCase()}`;

  return {
    // 解密为 Buffer
    decrypt(data: string | number[]): Buffer | null {
      try {
        const inputBuffer =
          typeof data === 'string'
            ? Buffer.from(data, 'base64')
            : Buffer.from(data);
        const decipher = ivBuffer
          ? crypto.createDecipheriv(cipherName, keyBuffer, ivBuffer)
          : crypto.createDecipheriv(cipherName, keyBuffer, Buffer.alloc(0));

        if (padding === 'NoPadding' || padding === 'NONE') {
          decipher.setAutoPadding(false);
        }

        return Buffer.concat([decipher.update(inputBuffer), decipher.final()]);
      } catch (e) {
        console.error('[Crypto] decrypt error:', e);
        return null;
      }
    },

    // 解密为字符串
    decryptStr(data: string | number[]): string | null {
      const result = this.decrypt(data);
      return result ? result.toString('utf8') : null;
    },

    // 加密为 Buffer
    encrypt(data: string | number[]): Buffer | null {
      try {
        const inputBuffer =
          typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
        const cipher = ivBuffer
          ? crypto.createCipheriv(cipherName, keyBuffer, ivBuffer)
          : crypto.createCipheriv(cipherName, keyBuffer, Buffer.alloc(0));

        if (padding === 'NoPadding' || padding === 'NONE') {
          cipher.setAutoPadding(false);
        }

        return Buffer.concat([cipher.update(inputBuffer), cipher.final()]);
      } catch (e) {
        console.error('[Crypto] encrypt error:', e);
        return null;
      }
    },

    // 加密为 Base64 字符串
    encryptBase64(data: string | number[]): string | null {
      const result = this.encrypt(data);
      return result ? result.toString('base64') : null;
    },

    // 加密为 Hex 字符串
    encryptHex(data: string | number[]): string | null {
      const result = this.encrypt(data);
      return result ? result.toString('hex') : null;
    },
  };
}

/**
 * 将 Rhino JS 特有语法转换为标准 ES6 语法
 */
function convertRhinoToES6(code: string): string {
  let result = code;
  
  // 1. 转换 let 表达式: let (x = value) expr -> ((x) => expr)(value)
  // 复杂情况: if (let (list = $.data) list != 0) { -> if (((list) => list != 0)($.data)) {
  result = result.replace(
    /let\s*\(\s*(\w+)\s*=\s*([^)]+)\)\s*([^;{\n)]+)/g,
    (match, varName, value, expr) => {
      const cleanExpr = expr.trim();
      return `((${varName}) => ${cleanExpr})(${value})`;
    }
  );
  
  // 2. 转换 for each 语法: for each (x in arr) -> for (let x of arr)
  result = result.replace(
    /for\s+each\s*\(\s*((?:var|let|const)?\s*\w+)\s+in\s+/g,
    'for ($1 of '
  );
  
  // 3. 转换 Java 风格的数组声明
  result = result.replace(/new\s+[\w.]+\[\]/g, '[]');
  
  // 4. 转换 with 语句中的 JavaImporter
  result = result.replace(/with\s*\(\s*\w+\s*\)\s*\{/g, '{');
  
  // 5. 处理 Java 类型转换
  result = result.replace(/\(java\.lang\.String\)\s*(\w+)/g, 'String($1)');
  result = result.replace(/\(java\.lang\.Integer\)\s*(\w+)/g, 'parseInt($1)');
  
  return result;
}

/**
 * JavaScript 规则执行
 * 使用 Node.js 内置 vm 模块
 * 完整实现 Legado JsExtensions 接口
 */
function executeJs(
  code: string,
  context: {
    result: any;
    src: string;
    baseUrl: string;
    variables: Record<string, any>;
  }
): any {
  try {
    // 预处理 {{}} 变量 - 在 JS 执行前替换
    let preprocessedCode = code;
    const jsResult = context.variables._jsResult || context.result;
    
    // 替换 {{$.xxx}} 格式的 JSONPath 变量
    preprocessedCode = preprocessedCode.replace(/\{\{\$\.([^}]+)\}\}/g, (_, path) => {
      if (jsResult && typeof jsResult === 'object') {
        // 简单的属性访问
        const value = path.split('.').reduce((obj: any, key: string) => obj?.[key], jsResult);
        return value !== undefined ? String(value) : '';
      }
      return '';
    });
    
    // 转换 Rhino JS 语法为标准 ES6
    const convertedCode = convertRhinoToES6(preprocessedCode);
    
    // 创建沙箱环境 - 完整实现 Legado java 对象
    const sandbox = {
      result: jsResult,
      src: context.src,
      baseUrl: context.baseUrl,
      
      // book 对象 - 当前解析的书籍信息
      book: context.variables._book || {
        name: '',
        author: '',
        kind: '',
        intro: '',
        wordCount: '',
        lastChapter: '',
        tocUrl: '',
        bookUrl: '',
        coverUrl: '',
        customTag: '',
        canUpdate: true,
        variable: '',
        getVariable: () => context.variables._bookVariable || '',
        putVariable: (key: string, value: any) => {
          context.variables._bookVariable = value;
          return value;
        },
      },
      
      // chapter 对象 - 当前解析的章节信息
      chapter: context.variables._chapter || {
        title: '',
        url: '',
        index: 0,
        isVip: false,
        isPay: false,
        variable: '',
        getVariable: () => context.variables._chapterVariable || '',
        putVariable: (key: string, value: any) => {
          context.variables._chapterVariable = value;
          return value;
        },
      },

      /**
       * java 对象 - 模拟 Legado JsExtensions
       * 参考: legado/app/src/main/java/io/legado/app/help/JsExtensions.kt
       */
      java: {
        // ==================== 变量存取 ====================
        getVar: (key: string) => context.variables[key] || '',
        put: (key: string, value: any) => {
          context.variables[key] = value;
          return value;
        },
        get: (key: string) => context.variables[key],

        // ==================== 网络请求 ====================
        // 使用 syncHttpRequest 实现同步 HTTP 请求
        ajax: (url: string | string[]) => {
          const urlStr = Array.isArray(url) ? url[0] : url;
          if (!urlStr) return '';
          try {
            const response = syncHttpRequest(urlStr);
            return response.body;
          } catch (e: any) {
            console.error('[JS] ajax error:', e.message);
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
            return syncHttpRequest(urlStr, { headers });
          } catch (e: any) {
            console.error('[JS] connect error:', e.message);
            return { body: '', headers: {}, url: urlStr, code: 0 };
          }
        },
        post: (urlStr: string, body: string, headers: Record<string, string> = {}) => {
          try {
            return syncHttpRequest(urlStr, { method: 'POST', headers, body });
          } catch (e: any) {
            console.error('[JS] post error:', e.message);
            return { body: '', headers: {}, url: urlStr, code: 0 };
          }
        },
        // HTTP GET 请求 (与变量 get 区分)
        httpGet: (urlStr: string, headers: Record<string, string> = {}) => {
          try {
            return syncHttpRequest(urlStr, { method: 'GET', headers });
          } catch (e: any) {
            console.error('[JS] httpGet error:', e.message);
            return { body: '', headers: {}, url: urlStr, code: 0 };
          }
        },
        head: (urlStr: string, headers: Record<string, string> = {}) => {
          try {
            return syncHttpRequest(urlStr, { method: 'HEAD', headers });
          } catch (e: any) {
            console.error('[JS] head error:', e.message);
            return { body: '', headers: {}, url: urlStr, code: 0 };
          }
        },
        // 获取字节数据
        getByteStr: (url: string) => {
          try {
            const response = syncHttpRequest(url);
            return response.body;
          } catch {
            return '';
          }
        },

        // ==================== 字符串与字节数组转换 ====================
        strToBytes: (str: string, charset?: string) =>
          Array.from(Buffer.from(str, (charset || 'utf8') as BufferEncoding)),
        bytesToStr: (bytes: number[], charset?: string) =>
          Buffer.from(bytes).toString((charset || 'utf8') as BufferEncoding),

        // ==================== Base64 编解码 ====================
        base64Decode: (str: string, charset?: string) => {
          if (!str) return '';
          const buffer = Buffer.from(str, 'base64');
          return buffer.toString((charset || 'utf8') as BufferEncoding);
        },
        base64DecodeToByteArray: (str: string, flags?: number) => {
          if (!str) return null;
          return Array.from(Buffer.from(str, 'base64'));
        },
        base64Encode: (str: string, flags?: number) => {
          if (!str) return '';
          return Buffer.from(str, 'utf8').toString('base64');
        },

        // ==================== Hex 编解码 ====================
        hexDecodeToByteArray: (hex: string) => {
          if (!hex) return null;
          return Array.from(Buffer.from(hex, 'hex'));
        },
        hexDecodeToString: (hex: string) => {
          if (!hex) return null;
          return Buffer.from(hex, 'hex').toString('utf8');
        },
        hexEncodeToString: (str: string) => {
          if (!str) return null;
          return Buffer.from(str, 'utf8').toString('hex');
        },

        // ==================== MD5 编码 ====================
        md5Encode: (str: string) => {
          return crypto.createHash('md5').update(str).digest('hex');
        },
        md5Encode16: (str: string) => {
          return crypto
            .createHash('md5')
            .update(str)
            .digest('hex')
            .substring(8, 24);
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
            return crypto
              .createHash(algorithm.toLowerCase())
              .update(data)
              .digest('base64');
          } catch {
            return '';
          }
        },

        // ==================== HMAC ====================
        HMacHex: (data: string, algorithm: string, key: string) => {
          try {
            return crypto
              .createHmac(algorithm.toLowerCase().replace('hmac', ''), key)
              .update(data)
              .digest('hex');
          } catch {
            return '';
          }
        },
        HMacBase64: (data: string, algorithm: string, key: string) => {
          try {
            return crypto
              .createHmac(algorithm.toLowerCase().replace('hmac', ''), key)
              .update(data)
              .digest('base64');
          } catch {
            return '';
          }
        },

        // ==================== 对称加密 ====================
        createSymmetricCrypto: (
          transformation: string,
          key: string | number[],
          iv?: string | number[] | null
        ) => createSymmetricCrypto(transformation, key, iv),

        // 旧版 AES 方法 (兼容)
        aesDecodeToString: (
          str: string,
          key: string,
          transformation: string,
          iv: string
        ) => createSymmetricCrypto(transformation, key, iv).decryptStr(str),
        aesDecodeToByteArray: (
          str: string,
          key: string,
          transformation: string,
          iv: string
        ) => {
          const result = createSymmetricCrypto(transformation, key, iv).decrypt(str);
          return result ? Array.from(result) : null;
        },
        aesEncodeToString: (
          data: string,
          key: string,
          transformation: string,
          iv: string
        ) => {
          const result = createSymmetricCrypto(transformation, key, iv).encrypt(data);
          return result ? result.toString('utf8') : null;
        },
        aesEncodeToBase64String: (
          data: string,
          key: string,
          transformation: string,
          iv: string
        ) => createSymmetricCrypto(transformation, key, iv).encryptBase64(data),
        aesBase64DecodeToString: (
          str: string,
          key: string,
          transformation: string,
          iv: string
        ) => createSymmetricCrypto(transformation, key, iv).decryptStr(str),

        // 旧版 DES 方法 (兼容)
        desDecodeToString: (
          data: string,
          key: string,
          transformation: string,
          iv: string
        ) => createSymmetricCrypto(transformation, key, iv).decryptStr(data),
        desEncodeToString: (
          data: string,
          key: string,
          transformation: string,
          iv: string
        ) => {
          const result = createSymmetricCrypto(transformation, key, iv).encrypt(data);
          return result ? result.toString('utf8') : null;
        },

        // 旧版 3DES 方法 (兼容)
        tripleDESDecodeStr: (
          data: string,
          key: string,
          mode: string,
          padding: string,
          iv: string
        ) =>
          createSymmetricCrypto(`DESede/${mode}/${padding}`, key, iv).decryptStr(
            data
          ),
        tripleDESEncodeBase64Str: (
          data: string,
          key: string,
          mode: string,
          padding: string,
          iv: string
        ) =>
          createSymmetricCrypto(`DESede/${mode}/${padding}`, key, iv).encryptBase64(
            data
          ),

        // ==================== URL 编解码 ====================
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
        timeFormat: (time: number | string) => {
          try {
            const timestamp = typeof time === 'string' ? parseInt(time) : time;
            if (isNaN(timestamp) || !isFinite(timestamp)) return '';
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().replace('T', ' ').replace('Z', '');
          } catch {
            return '';
          }
        },
        timeFormatUTC: (time: number | string, format: string, sh: number) => {
          try {
            const timestamp = typeof time === 'string' ? parseInt(time) : time;
            if (isNaN(timestamp) || !isFinite(timestamp)) return '';
            const date = new Date(timestamp + (sh || 0) * 3600 * 1000);
            if (isNaN(date.getTime())) return '';
            return date.toISOString();
          } catch {
            return '';
          }
        },

        // ==================== 中文转换 ====================
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
            '议': '議', '论': '論',
          };
          let result = text;
          for (const [s, t] of Object.entries(s2tMap)) {
            result = result.replace(new RegExp(s, 'g'), t);
          }
          return result;
        },

        // ==================== 编码转换 ====================
        utf8ToGbk: (str: string) => {
          // UTF-8 转 GBK - Node.js 中需要 iconv-lite 库
          // 这里返回原字符串，实际使用时需要安装 iconv-lite
          console.warn('[JS] java.utf8ToGbk() 需要 iconv-lite 库支持');
          return str;
        },

        // ==================== 工具方法 ====================
        randomUUID: () => crypto.randomUUID(),
        androidId: () => 'node-' + crypto.randomUUID().substring(0, 8),
        
        htmlFormat: (str: string) => {
          // HTML 格式化 - 保留图片
          return str
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<p[^>]*>/gi, '\n')
            .replace(/<\/p>/gi, '')
            .replace(/<(?!img)[^>]+>/g, '')
            .trim();
        },
        
        // 导入脚本
        importScript: (path: string) => {
          console.warn('[JS] java.importScript() 在沙箱中受限');
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

        // ==================== 日志输出 ====================
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

        // ==================== 内容解析 (AnalyzeRule 兼容) ====================
        // 设置解析内容和 baseUrl，返回 AnalyzeRule 兼容对象
        setContent: (content: any, baseUrl?: string) => {
          context.variables['_content'] = content;
          if (baseUrl) {
            context.variables['_baseUrl'] = baseUrl;
          }
          // 返回兼容对象以支持链式调用
          const analyzeRule = {
            setContent: (c: any, b?: string) => {
              context.variables['_content'] = c;
              if (b) context.variables['_baseUrl'] = b;
              return analyzeRule;
            },
            getString: (rule: string, isUrl?: boolean) => sandbox.java.getString(rule, null, isUrl),
            getStringList: (rule: string, isUrl?: boolean) => sandbox.java.getStringList(rule, null, isUrl),
            getElements: (rule: string) => sandbox.java.getElements(rule),
          };
          return analyzeRule;
        },
        
        // 获取文本列表
        getStringList: (rule: string, mContent?: any, isUrl?: boolean) => {
          if (!rule) return null;
          const cheerio = require('cheerio');
          const content = mContent || context.variables['_content'] || context.src;
          const baseUrl = context.variables['_baseUrl'] || context.baseUrl;
          
          
          try {
            // 解析规则
            const parts = rule.split('@');
            const selector = parts.slice(0, -1).join('@') || parts[0];
            const attr = parts.length > 1 ? parts[parts.length - 1] : 'text';
            
            let $: any;
            if (typeof content === 'string') {
              // 检查是否是 JSON
              if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                try {
                  const json = JSON.parse(content);
                  const { JSONPath } = require('jsonpath-plus');
                  let jsonRule = rule.startsWith('@json:') ? rule.substring(6) : rule;
                  jsonRule = fixLegadoJsonPath(jsonRule);
                  const results = JSONPath({ path: jsonRule, json, wrap: true });
                  const resultArray = Array.isArray(results) ? results : [results];
                  // 添加 toArray 方法以兼容 Legado 的 Java List
                  (resultArray as any).toArray = () => resultArray;
                  return resultArray;
                } catch (e) {
                  // 不是有效 JSON，继续用 HTML 解析
                  // console.log('[getStringList] JSON parse error:', e);
                }
              }
              $ = cheerio.load(content);
            } else {
              $ = content;
            }
            
            const results: string[] = [];
            $(selector).each((_: number, el: any) => {
              let value: string;
              if (attr === 'text') {
                value = $(el).text().trim();
              } else if (attr === 'html') {
                value = $(el).html() || '';
              } else if (attr === 'textNodes') {
                value = $(el).contents().filter(function(this: any) {
                  return this.type === 'text';
                }).text().trim();
              } else {
                value = $(el).attr(attr) || '';
              }
              
              // 如果是 URL，转为绝对路径
              if (isUrl && value && baseUrl) {
                try {
                  value = new URL(value, baseUrl).href;
                } catch {}
              }
              
              if (value) results.push(value);
            });
            
            // 添加 toArray 方法以兼容 Legado 的 Java List
            const resultWithToArray = results as any;
            resultWithToArray.toArray = () => results;
            return results.length > 0 ? resultWithToArray : null;
          } catch {
            return null;
          }
        },
        
        // 获取单个文本
        getString: (rule: string, mContent?: any, isUrl?: boolean) => {
          if (!rule) return '';
          const cheerio = require('cheerio');
          const content = mContent || context.variables['_content'] || context.src;
          const baseUrl = context.variables['_baseUrl'] || context.baseUrl;
          
          // 解析规则：selector@attr 或 selector@text
          const parts = rule.split('@');
          const selector = parts.slice(0, -1).join('@') || parts[0];
          const attr = parts.length > 1 ? parts[parts.length - 1] : 'text';
          
          try {
            let $: any;
            if (typeof content === 'string') {
              // 检查是否是 JSON
              if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                try {
                  const json = JSON.parse(content);
                  const { JSONPath } = require('jsonpath-plus');
                  let jsonRule = rule.startsWith('@json:') ? rule.substring(6) : rule;
                  jsonRule = fixLegadoJsonPath(jsonRule);
                  const results = JSONPath({ path: jsonRule, json, wrap: false });
                  return Array.isArray(results) ? results[0]?.toString() || '' : results?.toString() || '';
                } catch {
                  // 不是有效 JSON，继续用 HTML 解析
                }
              }
              $ = cheerio.load(content);
            } else if (Array.isArray(content) && content.length > 0) {
              $ = cheerio.load('<div></div>');
              const wrapper = $('div');
              content.forEach((el: any) => wrapper.append(el));
            } else {
              $ = content;
            }
            
            const el = selector ? $(selector).first() : $;
            
            let value: string;
            if (attr === 'text') {
              value = el.text().trim();
            } else if (attr === 'html') {
              value = el.html() || '';
            } else if (attr === 'all') {
              value = el.toString();
            } else if (attr === 'textNodes') {
              value = el.contents().filter(function(this: any) {
                return this.type === 'text';
              }).text().trim();
            } else {
              value = el.attr(attr) || '';
            }
            
            // 如果是 URL，转为绝对路径
            if (isUrl && value && baseUrl) {
              try {
                value = new URL(value, baseUrl).href;
              } catch {}
            }
            
            return value;
          } catch {
            return '';
          }
        },
        
        // 获取元素列表 - 返回带有 attr() 方法的元素包装对象
        // 参考 Legado AnalyzeByJSoup.getElements()
        getElements: (rule: string, mContent?: any) => {
          if (!rule) return [];
          const cheerio = require('cheerio');
          const content = mContent || context.variables['_content'] || context.src;
          
          try {
            let $: any;
            if (typeof content === 'string') {
              // 检查是否是 JSON
              if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                try {
                  const json = JSON.parse(content);
                  const { JSONPath } = require('jsonpath-plus');
                  let jsonRule = rule.startsWith('@json:') ? rule.substring(6) : rule;
                  jsonRule = fixLegadoJsonPath(jsonRule);
                  const results = JSONPath({ path: jsonRule, json, wrap: true });
                  return Array.isArray(results) ? results : [results];
                } catch {
                  // 不是有效 JSON，继续用 HTML 解析
                }
              }
              $ = cheerio.load(content);
            } else {
              $ = content;
            }
            
            // 包装元素，添加 attr() 方法以兼容 Legado 的 JSoup Element
            const elements = $(rule).toArray();
            return elements.map((el: any) => {
              const $el = $(el);
              return {
                // 获取/设置属性
                attr: (name: string, value?: string) => {
                  if (value !== undefined) {
                    $el.attr(name, value);
                    return $el;
                  }
                  return $el.attr(name) || '';
                },
                // 获取文本
                text: () => $el.text(),
                // 获取 HTML
                html: () => $el.html() || '',
                outerHtml: () => $.html($el),
                // 获取子元素
                select: (selector: string) => $el.find(selector).toArray(),
                // 原始元素
                _element: el,
                _$: $el,
              };
            });
          } catch {
            return [];
          }
        },
        
        // 获取单个元素
        getElement: (rule: string, mContent?: any) => {
          const elements = sandbox.java.getElements(rule, mContent);
          return elements.length > 0 ? elements[0] : null;
        },
        getWebViewUA: () => {
          return 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36';
        },
        // ==================== WebView ====================
        webView: (html: string | null, url: string | null, js: string | null) => {
          console.log('[JS] java.webView() 使用 Puppeteer 执行');
          try {
            const { webViewSyncCached } = require('./webview');
            return webViewSyncCached(html, url, js);
          } catch (e: any) {
            console.error('[JS] java.webView() error:', e.message);
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

        // ==================== Cookie 操作 ====================
        getCookie: (tag: string, key?: string) => {
          // 需要 Cookie 存储支持
          console.warn('[JS] java.getCookie() 需要 Cookie 存储支持');
          return '';
        },

        // ==================== 字体解析 (TTF) ====================
        queryTTF: (data: any, useCache?: boolean) => {
          console.warn('[JS] java.queryTTF() 需要 TTF 解析库支持');
          return null;
        },
        replaceFont: (
          text: string,
          errorQueryTTF: any,
          correctQueryTTF: any,
          filter?: boolean
        ) => {
          console.warn('[JS] java.replaceFont() 需要 TTF 解析库支持');
          return text;
        },

        // ==================== 文件操作 (受限) ====================
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

        // ==================== 压缩文件 ====================
        getZipStringContent: (url: string, path: string, charsetName?: string) => {
          console.warn('[JS] java.getZipStringContent() 需要额外实现');
          return '';
        },
        unzipFile: (zipPath: string) => {
          console.warn('[JS] java.unzipFile() 需要额外实现');
          return '';
        },

        // ==================== 章节数转换 ====================
        toNumChapter: (s: string) => {
          if (!s) return null;
          // 简单实现：将中文数字转为阿拉伯数字
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

      // ==================== org.jsoup.Jsoup 兼容 ====================
      org: {
        jsoup: {
          Jsoup: {
            parse: (html: string) => {
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
      
      // ==================== Cookie 和 Cache ====================
      // cookie 对象 - 使用持久化的 CookieStore
      cookie: {
        getCookie: (tag: string, key?: string) => {
          if (key) {
            return CookieStore.getKey(tag, key);
          }
          return CookieStore.getCookie(tag);
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
      },
      // cache 对象 - 使用持久化的 CacheManager
      cache: {
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
      },

      // ==================== 全局 Get/Put 函数 ====================
      Get: (key: string) => context.variables[key],
      Put: (key: string, value: any) => {
        context.variables[key] = value;
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

      // Map 函数 - 获取 loginUi 配置值（Legado 特有）
      Map: (name: string) => {
        return context.variables[`_loginUi_${name}`] || '';
      },

      // surl 函数 - 获取书源 URL（某些书源使用）
      surl: () => {
        return context.variables['_sourceUrl'] || context.baseUrl || '';
      },

      // flfl 对象 - 分类映射（某些书源使用）
      flfl: context.variables['_flfl'] || {},

      // u_a 变量 - User-Agent
      u_a: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',

      // Packages 模拟（Java 包）
      Packages: {
        java: {
          lang: {
            Thread: {
              sleep: (ms: number) => {
                // 同步等待（在 Node.js 中不推荐，但为了兼容）
                const end = Date.now() + ms;
                while (Date.now() < end) {}
              },
            },
          },
        },
      },

      // source 对象（书源相关方法）- 参考 Legado BaseSource.kt
      source: {
        // 获取保存的数据 - source.get(key)
        get: (key: string) => context.variables[`v_${key}`] || context.variables[key] || '',
        // 保存数据 - source.put(key, value)
        put: (key: string, value: any) => {
          context.variables[`v_${key}`] = String(value);
          return String(value);
        },
        // 获取登录信息
        getLoginInfoMap: () => context.variables['_loginInfo'] || {},
        getLoginInfo: () => context.variables['_loginInfoStr'] || null,
        putLoginInfo: (info: string) => {
          try {
            context.variables['_loginInfo'] = JSON.parse(info);
            context.variables['_loginInfoStr'] = info;
            return true;
          } catch {
            return false;
          }
        },
        // 获取书源标识
        getKey: () => context.variables['_sourceUrl'] || context.baseUrl || '',
        getTag: () => context.variables['_sourceUrl'] || context.baseUrl || '',
        // 设置自定义变量 - source.setVariable(jsonString)
        setVariable: (data: string | null) => {
          if (data) {
            context.variables['_sourceVariable'] = data;
            try {
              // 同时解析为对象方便访问
              const parsed = JSON.parse(data);
              if (typeof parsed === 'object') {
                Object.assign(context.variables, parsed);
              }
            } catch {}
          } else {
            delete context.variables['_sourceVariable'];
          }
        },
        // 获取自定义变量 - source.getVariable() 返回整个变量字符串
        getVariable: () => context.variables['_sourceVariable'] || '',
        // 登录头相关
        getLoginHeader: () => context.variables['_loginHeader'] || null,
        getLoginHeaderMap: () => {
          const header = context.variables['_loginHeader'];
          if (!header) return null;
          try {
            return JSON.parse(header);
          } catch {
            return null;
          }
        },
        putLoginHeader: (header: string) => {
          context.variables['_loginHeader'] = header;
        },
        removeLoginHeader: () => {
          delete context.variables['_loginHeader'];
        },
      },

      // ==================== 全局工具函数 ====================
      JSON: JSON,
      parseInt: parseInt,
      parseFloat: parseFloat,
      encodeURIComponent: encodeURIComponent,
      decodeURIComponent: decodeURIComponent,
      encodeURI: encodeURI,
      decodeURI: decodeURI,
      String: String,
      Number: Number,
      Boolean: Boolean,
      Array: Array,
      Object: Object,
      Math: Math,
      Date: Date,
      RegExp: RegExp,
      Buffer: Buffer,
      Function: Function,
      Error: Error,
      // Base64 编解码 - 某些混淆代码需要
      atob: (str: string) => Buffer.from(str, 'base64').toString('utf8'),
      btoa: (str: string) => Buffer.from(str, 'utf8').toString('base64'),
      console: {
        log: (...args: any[]) => console.log('[JS]', ...args),
        warn: (...args: any[]) => console.warn('[JS]', ...args),
        error: (...args: any[]) => console.error('[JS]', ...args),
      },
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      setInterval: setInterval,
      clearInterval: clearInterval,
      
      // Legado 内置函数
      // Url() - 返回书源 URL
      Url: () => {
        const sourceUrl = context.variables._sourceUrl || context.baseUrl || '';
        // 提取基础 URL（协议 + 域名）
        try {
          const url = new URL(sourceUrl);
          return `${url.protocol}//${url.host}`;
        } catch {
          return sourceUrl;
        }
      },
      
      // eval 函数支持
      eval: (code: string) => {
        try {
          const innerScript = new vm.Script(code);
          return innerScript.runInContext(vm.createContext(sandbox), { timeout: 5000 });
        } catch (e) {
          console.error('[JS] eval error:', e);
          return null;
        }
      },
    };

    // 添加 window 和 global 对象（指向 sandbox 自身）
    // 某些混淆代码使用 Function("return this")() 获取全局对象
    (sandbox as any).window = sandbox;
    (sandbox as any).global = sandbox;
    (sandbox as any).globalThis = sandbox;
    (sandbox as any).self = sandbox;

    // 创建上下文
    const vmContext = vm.createContext(sandbox);

    // 先加载 jsLib（如果有）
    // jsLib 可能是 JSON 对象（指向远程 JS 文件的 URL）或直接的 JS 代码
    const jsLib = context.variables['_jsLib'];
    if (jsLib) {
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
                  const convertedJsLib = convertRhinoToES6(jsCode);
                  const jsLibScript = new vm.Script(convertedJsLib);
                  jsLibScript.runInContext(vmContext, { timeout: 10000 });
                }
              }
            }
          } catch (jsonError) {
            // 不是有效的 JSON，作为普通 JS 代码执行
            const convertedJsLib = convertRhinoToES6(jsLib);
            const jsLibScript = new vm.Script(convertedJsLib);
            jsLibScript.runInContext(vmContext, { timeout: 5000 });
          }
        } else {
          // 直接作为 JS 代码执行
          const convertedJsLib = convertRhinoToES6(jsLib);
          const jsLibScript = new vm.Script(convertedJsLib);
          jsLibScript.runInContext(vmContext, { timeout: 5000 });
        }
      } catch (e) {
        console.error('[JS] jsLib execution error:', e);
      }
    }

    // 执行代码（使用已转换的代码）
    const script = new vm.Script(convertedCode);
    const result = script.runInContext(vmContext, { timeout: 5000 });
    return result;
  } catch (error) {
    console.error('JS execution error:', error);
    return null;
  }
}

/**
 * 处理 JavaScript 规则
 */
function processJsRule(
  rule: string,
  context: {
    result: any;
    src: string;
    baseUrl: string;
    variables: Record<string, any>;
  }
): { processed: string; hasJs: boolean; jsResult: any } {
  let processed = rule;
  let hasJs = false;
  let jsResult: any = null;

  // 处理 <js>...</js>
  const jsTagRegex = /<js>([\s\S]*?)<\/js>/gi;
  let match;
  while ((match = jsTagRegex.exec(rule)) !== null) {
    hasJs = true;
    const jsCode = match[1];
    jsResult = executeJs(jsCode, context);
    processed = processed.replace(
      match[0],
      jsResult !== null ? String(jsResult) : ''
    );
  }

  // 处理 @js: (必须在规则末尾)
  if (processed.includes('@js:')) {
    const jsIndex = processed.lastIndexOf('@js:');
    const jsCode = processed.substring(jsIndex + 4).trim();
    const beforeJs = processed.substring(0, jsIndex);

    // 检查是否是正则替换规则 @js:##regex##replacement###
    // 这种情况下 @js: 后面跟的是正则替换，不是 JS 代码
    if (jsCode.startsWith('##') || jsCode.startsWith('#')) {
      // 这是正则替换规则，不是 JS
      // 保持原样，让后续的正则处理逻辑处理
      // processed 保持不变
    } else {
      hasJs = true;
      jsResult = executeJs(jsCode, context);
      processed = beforeJs;
    }
  }

  return { processed, hasJs, jsResult };
}

/**
 * 处理变量替换 {{}} 和 {}
 */
function processVariables(
  rule: string,
  context: {
    variables: Record<string, any>;
    baseUrl: string;
    body: string;
  }
): string {
  let processed = rule;

  // 处理 {{}} - 可以包含 JS 或其他规则
  const doubleBraceRegex = /\{\{([\s\S]*?)\}\}/g;
  processed = processed.replace(doubleBraceRegex, (_, content) => {
    // 检查是否是 JS
    if (
      !content.startsWith('@@') &&
      !content.startsWith('@xpath:') &&
      !content.startsWith('@json:') &&
      !content.startsWith('@css:') &&
      !content.startsWith('$.') &&
      !content.startsWith('//')
    ) {
      // 默认为 JS
      const result = executeJs(content, {
        result: null,
        src: context.body,
        baseUrl: context.baseUrl,
        variables: context.variables,
      });
      return result !== null ? String(result) : '';
    }

    // 其他规则类型
    let innerRule = content;
    if (innerRule.startsWith('@@')) {
      innerRule = innerRule.substring(2); // Default 规则
    }

    // 对于 JSONPath，先检查 variables 中是否有对应的值
    // 例如 {{$..comic_id}} 或 {{$.comic_id}}，先检查 variables.comic_id
    if (innerRule.startsWith('$.') || innerRule.startsWith('$..')) {
      // 提取最后一个属性名
      const pathMatch = innerRule.match(/\.(\w+)$/);
      if (pathMatch) {
        const varName = pathMatch[1];
        if (context.variables[varName] !== undefined) {
          return String(context.variables[varName]);
        }
      }
    }

    // 执行内部规则
    const ctx: ParseContext = {
      body: context.body,
      baseUrl: context.baseUrl,
      variables: context.variables,
    };
    const result = parseRule(ctx, innerRule);
    return result.success && result.data ? String(result.data) : '';
  });

  // 处理 {} - JSONPath 简写或变量引用
  // 注意：不处理看起来像 JSON 对象的内容（如 {'webView': true}）
  const singleBraceRegex = /\{([^{}]+)\}/g;
  processed = processed.replace(singleBraceRegex, (match, path) => {
    // 如果内容包含 ' 或 " 或 :，可能是 JSON 对象，保持原样
    if (path.includes("'") || path.includes('"') || path.includes(':')) {
      return match; // 返回原始匹配，不做替换
    }
    
    if (path.startsWith('$.')) {
      try {
        const data = JSON.parse(context.body);
        const results = JSONPath({ path, json: data, wrap: false });
        return results !== undefined ? String(results) : '';
      } catch {
        return '';
      }
    }
    // 只处理看起来像变量名的内容（字母数字下划线）
    if (/^[\w]+$/.test(path)) {
      return context.variables[path] !== undefined ? String(context.variables[path]) : '';
    }
    return match; // 不是有效变量名，保持原样
  });

  return processed;
}

/**
 * 处理 @put 和 @get
 */
function processPutGet(
  rule: string,
  context: {
    variables: Record<string, any>;
    body: string;
    baseUrl: string;
  }
): string {
  let processed = rule;

  // @put:{key:rule, key2:rule2}
  // 注意：规则中可能包含冒号（如 $..xxx），所以只按第一个冒号分割
  const putRegex = /@put:\{([^}]+)\}/g;
  processed = processed.replace(putRegex, (_, content) => {
    const pairs = content.split(',');
    for (const pair of pairs) {
      const colonIndex = pair.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = pair.substring(0, colonIndex).trim();
      const valueRule = pair.substring(colonIndex + 1).trim();
      
      if (key && valueRule) {
        const ctx: ParseContext = {
          body: context.body,
          baseUrl: context.baseUrl,
          variables: context.variables,
        };
        const result = parseRule(ctx, valueRule);
        if (result.success && result.data) {
          context.variables[key] = result.data;
        }
      }
    }
    return '';
  });

  // @get:{key}
  const getRegex = /@get:\{([^}]+)\}/g;
  processed = processed.replace(getRegex, (_, key) => {
    const value = context.variables[key.trim()];
    return value !== undefined ? String(value) : '';
  });

  return processed;
}

/**
 * 解析 URL，处理相对路径
 */
export function resolveUrl(url: string, baseUrl: string): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('//')
  ) {
    if (url.startsWith('//')) {
      const protocol = baseUrl.startsWith('https') ? 'https:' : 'http:';
      return protocol + url;
    }
    return url;
  }

  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

/**
 * 解析规则分隔符
 * 支持 || (或) 和 && (与) 和 %% (格式化)
 * 注意：不在 JS 代码块内部分割
 * 
 * 参考 Legado AnalyzeRule.kt 的规则解析
 * 规则格式: rule1||rule2@js:code 或 rule1&&rule2##regex##replacement
 * 
 * 返回值增加 jsSuffix 字段，用于在所有规则执行完后应用 @js: 代码
 */
export function splitRule(rule: string): {
  rules: string[];
  operator: 'or' | 'and' | 'format';
  jsSuffix?: string;  // @js: 后缀，应用于最终结果
  headerSuffix?: string; // @Header:{} 后缀，用于请求头（异次元格式）
} {
  // 如果包含 <js></js> 代码块，不进行分割
  if (/<js>[\s\S]*?<\/js>/i.test(rule)) {
    return { rules: [rule], operator: 'or' };
  }
  
  // 先处理 @Header:{} 后缀（异次元格式）
  // 格式: rule@Header:{key:value}
  let headerSuffix: string | undefined;
  let ruleWithoutHeader = rule;
  const headerMatch = rule.match(/@Header:\{[^}]+\}$/);
  if (headerMatch) {
    headerSuffix = headerMatch[0];
    ruleWithoutHeader = rule.substring(0, rule.length - headerSuffix.length).trim();
  }
  
  // 处理 @js: 后缀 - 先分离 @js: 部分
  // 格式: rule1||rule2@js:code
  // 应该解析为: 先执行 (rule1||rule2)，然后将结果传递给 @js:code
  let mainRule = ruleWithoutHeader;
  let jsSuffix: string | undefined;
  
  // 查找 @js: 的位置
  const jsIndex = rule.indexOf('@js:');
  if (jsIndex > 0) {
    const beforeJs = rule.substring(0, jsIndex);
    // 检查 @js: 前面是否有 || 或 && 或 %%
    if (beforeJs.includes('||') || beforeJs.includes('&&') || beforeJs.includes('%%')) {
      mainRule = beforeJs;
      jsSuffix = rule.substring(jsIndex);
    }
  }
  
  let rules: string[];
  let operator: 'or' | 'and' | 'format' = 'or';
  
  if (mainRule.includes('||')) {
    rules = mainRule.split('||');
    operator = 'or';
  } else if (mainRule.includes('&&')) {
    rules = mainRule.split('&&');
    operator = 'and';
  } else if (mainRule.includes('%%')) {
    rules = mainRule.split('%%');
    operator = 'format';
  } else {
    rules = [mainRule];
  }
  
  return { rules, operator, jsSuffix, headerSuffix };
}

/**
 * 执行单条规则
 */
function executeSingleRule(
  content: string | object,
  rule: string,
  baseUrl: string,
  variables: Record<string, any> = {}
): any[] {
  rule = rule.trim();

  if (!rule) return [];

  // 处理换行符分隔的规则链
  // 例如: "a.0@href\n@js:##regex##replacement###"
  // 第一条规则获取结果，后续规则对结果进行处理
  // 注意：如果规则包含 <js>...</js> 标签，不进行换行分割
  const hasJsTag = /<js>[\s\S]*?<\/js>/i.test(rule);
  if (rule.includes('\n') && !hasJsTag) {
    let lines = rule.split('\n').map(l => l.trim()).filter(l => l);
    
    // 处理 @js: 后面紧跟换行符的情况
    // 例如: "@js:\ncode" 应该合并为 "@js:code"
    // 或者: "rule1\n@js:\ncode" 中的 "@js:" 和 "code" 应该合并
    const mergedLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // 如果当前行是 "@js:" 且后面还有行，合并后续所有行作为 JS 代码
      if (line === '@js:' && i + 1 < lines.length) {
        // 合并后续所有行作为 JS 代码
        const jsCode = lines.slice(i + 1).join('\n');
        mergedLines.push('@js:' + jsCode);
        break; // JS 代码是最后的处理，不再继续
      } else {
        mergedLines.push(line);
      }
    }
    lines = mergedLines;
    
    if (lines.length > 1) {
      // 执行第一条规则
      let results = executeSingleRule(content, lines[0], baseUrl, variables);
      
      // 对结果应用后续规则
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        
        // 检查是否是正则替换规则 @js:##regex##replacement###
        if (line.startsWith('@js:##') || line.startsWith('##')) {
          const regexRule = line.startsWith('@js:') ? line.substring(4) : line;
          const parts = regexRule.split('##').filter(p => p !== '');
          if (parts.length >= 1) {
            const pattern = parts[0];
            const replacement = parts[1] || '';
            try {
              const regex = new RegExp(pattern, 'g');
              results = results.map(r => String(r).replace(regex, replacement));
            } catch {
              // 忽略正则错误
            }
          }
        } else if (line.startsWith('@js:') || line.startsWith('<js>')) {
          // JS 规则：将整个结果数组作为 result 传递
          // 如果结果是数组，先用换行符连接成字符串
          const resultStr = Array.isArray(results) ? results.join('\n') : String(results);
          const jsContext = {
            result: resultStr,
            src: typeof content === 'string' ? content : JSON.stringify(content),
            baseUrl,
            variables,
          };
          const { jsResult } = processJsRule(line, jsContext);
          if (jsResult !== null) {
            results = Array.isArray(jsResult) ? jsResult : [jsResult];
          }
        } else {
          // 其他规则，对每个结果执行
          const newResults: any[] = [];
          for (const r of results) {
            const subResults = executeSingleRule(r, line, baseUrl, variables);
            newResults.push(...subResults);
          }
          results = newResults;
        }
      }
      
      return results;
    }
  }

  const text = typeof content === 'string' ? content : JSON.stringify(content);
  // 保留原始对象用于 JS 规则中的 result
  const originalContent = content;

  // 1. 处理 @put/@get（在 JS 代码块外部）
  rule = processPutGet(rule, { variables, body: text, baseUrl });

  // 2. 检测是否包含 JS 代码块
  const hasJsBlock = /<js>[\s\S]*?<\/js>/i.test(rule) || rule.includes('@js:');
  
  // 3. 如果没有 JS 代码块，处理变量替换 {{}} 和 {}
  // 如果有 JS 代码块，变量替换会在 JS 执行时通过沙箱变量处理
  if (!hasJsBlock) {
    rule = processVariables(rule, { variables, body: text, baseUrl });
  }

  // 4. 处理 JavaScript - result 使用原始对象（如果是对象的话）
  const jsContext = { 
    result: typeof originalContent === 'object' ? originalContent : text, 
    src: text, 
    baseUrl, 
    variables 
  };
  const { processed, hasJs, jsResult } = processJsRule(rule, jsContext);

  if (hasJs && jsResult !== null) {
    // 如果有 JS 且有结果，直接返回 JS 结果
    if (Array.isArray(jsResult)) return jsResult;
    return [jsResult];
  }

  rule = processed.trim();
  if (!rule) return hasJs && jsResult !== null ? [jsResult] : [];

  // 4. JSON 规则
  if (
    rule.startsWith('@json:') ||
    rule.startsWith('$.') ||
    rule.startsWith('$[')
  ) {
    // 处理 ## 正则替换
    let jsonRule = rule;
    let replaceRegex = '';
    let replacement = '';
    
    if (rule.includes('##')) {
      const parts = rule.split('##');
      jsonRule = parts[0];
      replaceRegex = parts[1] || '';
      replacement = parts[2] || '';
    }
    
    let results = parseJson(content, jsonRule);
    
    // 应用正则替换
    if (replaceRegex && results.length > 0) {
      try {
        const regex = new RegExp(replaceRegex, 'g');
        results = results.map(r => {
          if (typeof r === 'string') {
            return r.replace(regex, replacement);
          }
          return r;
        });
      } catch {}
    }
    
    return results;
  }

  // 5. XPath 规则
  if (
    rule.toLowerCase().startsWith('@xpath:') ||
    (rule.startsWith('//') && !rule.startsWith('//'))
  ) {
    return parseXPath(text, rule, baseUrl);
  }
  // 以 // 开头的 XPath
  if (rule.startsWith('//')) {
    return parseXPath(text, rule, baseUrl);
  }

  // 6. 正则规则
  if (rule.startsWith(':')) {
    return parseRegex(text, rule);
  }

  // 7. 纯 URL 或纯字符串（不包含选择器特征）
  // 如果规则是以 http:// 或 https:// 开头，直接返回
  if (rule.startsWith('http://') || rule.startsWith('https://')) {
    return [rule];
  }

  // 8. CSS 选择器（默认）
  if (typeof content === 'string') {
    return parseCss(content, rule, baseUrl);
  }

  return [];
}

/**
 * 主解析函数
 */
export function parseRule(ctx: ParseContext, rule: string): ParseResult {
  if (!rule || !rule.trim()) {
    return { success: false, error: '规则为空' };
  }

  try {
    const { rules, operator, jsSuffix } = splitRule(rule);
    let results: any[] = [];
    const allResults: any[][] = []; // 用于 %% 格式化

    for (const r of rules) {
      const ruleResults = executeSingleRule(
        ctx.body,
        r,
        ctx.baseUrl,
        ctx.variables
      );

      if (operator === 'or') {
        // 或：有结果就返回
        if (ruleResults.length > 0) {
          results = ruleResults;
          break;
        }
      } else if (operator === 'and') {
        // 与：合并结果
        results = results.concat(ruleResults);
      } else if (operator === 'format') {
        // 格式化：收集所有结果用于交叉合并
        allResults.push(ruleResults);
      }
    }

    // 处理 %% 格式化：依次取数
    if (operator === 'format' && allResults.length > 0) {
      results = [];
      const maxLen = Math.max(...allResults.map((arr) => arr.length));
      for (let i = 0; i < maxLen; i++) {
        for (const arr of allResults) {
          if (i < arr.length) {
            results.push(arr[i]);
          }
        }
      }
    }

    // 处理 @js: 后缀 - 将结果传递给 JS 代码
    if (jsSuffix && results.length > 0) {
      const jsCode = jsSuffix.substring(4); // 去掉 @js:
      const jsResults: any[] = [];
      for (const result of results) {
        try {
          const jsContext = {
            result: result,
            src: ctx.body,
            baseUrl: ctx.baseUrl,
            variables: ctx.variables,
          };
          const jsResult = executeJs(jsCode, jsContext);
          if (jsResult !== null && jsResult !== undefined) {
            jsResults.push(jsResult);
          }
        } catch (e) {
          // JS 执行失败，保留原结果
          jsResults.push(result);
        }
      }
      results = jsResults;
    }

    return {
      success: true,
      data: results.length === 1 ? results[0] : results,
      matchCount: results.length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

/**
 * 解析列表规则，返回元素列表
 */
export function parseList(
  ctx: ParseContext,
  rule: string
): cheerio.Cheerio<any>[] | any[] {
  if (!rule || !rule.trim()) return [];

  try {
    let shouldReverse = false;
    let actualRule = rule.trim();

    // 检查是否需要倒置列表
    if (actualRule.startsWith('-')) {
      shouldReverse = true;
      actualRule = actualRule.substring(1).trim();
    }

    let results: any[] = [];

    // 正则 AllInOne 模式
    if (actualRule.startsWith(':')) {
      const pattern = actualRule.substring(1);
      const regex = new RegExp(pattern, 'g');
      let match;
      while ((match = regex.exec(ctx.body)) !== null) {
        // 返回捕获组作为对象
        const item: Record<string, string> = {};
        for (let i = 1; i < match.length; i++) {
          item[`$${i}`] = match[i] || '';
        }
        results.push(item);
      }
      return shouldReverse ? results.reverse() : results;
    }

    // 先处理 || 分隔符（或规则）
    // 例如: "$..list[*]||$.data[*]" 应该先尝试第一个，如果没结果再尝试第二个
    if (actualRule.includes('||') && !actualRule.includes('@js:') && !/<js>/i.test(actualRule)) {
      const orRules = actualRule.split('||');
      for (const orRule of orRules) {
        const orResults = parseList({ ...ctx }, orRule.trim());
        if (orResults.length > 0) {
          return shouldReverse ? orResults.reverse() : orResults;
        }
      }
      return [];
    }

    // JSON 列表
    // 支持格式: @json:, $., data.xxx (异次元图源格式)
    // 注意: 需要排除 Legado 语法前缀 (class., id., tag., text.)
    // 还需要排除 HTML 标签.类名 格式 (如 ul.book-list, div.container)
    const legadoPrefixes = ['class.', 'id.', 'tag.', 'text.'];
    const isLegadoSyntax = legadoPrefixes.some(prefix => actualRule.startsWith(prefix));
    
    // 检查是否是 HTML 标签.类名 格式（CSS 选择器）
    // HTML 标签通常是短的小写字母，后面跟 . 和类名
    const htmlTags = ['a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main', 'map', 'mark', 'menu', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 'slot', 'small', 'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr'];
    const firstPart = actualRule.split(/[.@#\[\s]/)[0].toLowerCase();
    const isHtmlTagSelector = htmlTags.includes(firstPart);
    
    const isJsonPath = actualRule.startsWith('@json:') || actualRule.startsWith('$.') || 
      (!isLegadoSyntax && !isHtmlTagSelector && /^[a-zA-Z_]\w*\./.test(actualRule));
    
    if (isJsonPath) {
      // 如果是 data.xxx 格式，转换为 $.data.xxx
      let jsonRule = actualRule;
      if (!jsonRule.startsWith('@json:') && !jsonRule.startsWith('$.') && /^[a-zA-Z_]\w*\./.test(jsonRule)) {
        jsonRule = '$.' + jsonRule;
      }
      results = parseJson(ctx.body, jsonRule);
      results = Array.isArray(results) ? results : [results];
      return shouldReverse ? results.reverse() : results;
    }

    // CSS 列表
    const $ = cheerio.load(ctx.body);

    // 处理链式选择器
    const { rules, operator } = splitRule(actualRule);

    for (const r of rules) {
      const ruleElements: cheerio.Cheerio<any>[] = [];

      // 使用 selectWithLegadoSyntax 处理复杂选择器
      const parts = r.split('@');
      let $current = $.root();

      for (const part of parts) {
        if (!part) continue;
        $current = selectWithLegadoSyntax($, $current, part);
      }

      $current.each((_, el) => {
        ruleElements.push($(el));
      });

      if (operator === 'or' && ruleElements.length > 0) {
        results = ruleElements;
        break;
      } else if (operator === 'and') {
        results = results.concat(ruleElements);
      } else {
        results = ruleElements;
      }
    }

    return shouldReverse ? results.reverse() : results;
  } catch {
    return [];
  }
}

/**
 * 从元素中解析规则
 * @param element - Cheerio 元素或 JSON 对象
 * @param rule - 解析规则
 * @param baseUrl - 基础 URL
 * @param variables - 额外的变量（如当前解析的书籍数据）
 */
export function parseFromElement(
  element: cheerio.Cheerio<any> | object,
  rule: string,
  baseUrl: string,
  variables?: Record<string, any>
): ParseResult {
  if (!rule || !rule.trim()) {
    return { success: false, error: '规则为空' };
  }

  try {
    let content: string;
    let elementData: any = null;

    if (
      typeof element === 'object' &&
      'html' in element &&
      typeof element.html === 'function'
    ) {
      // Cheerio 元素 - 使用 toString() 获取外部 HTML（包括元素本身）
      const cheerioEl = element as cheerio.Cheerio<any>;
      // 获取外部 HTML，包括元素标签本身
      content = cheerioEl.toString() || cheerioEl.html() || '';
    } else {
      // JSON 对象
      content = JSON.stringify(element);
      elementData = element;
    }

    const ctx: ParseContext = {
      body: content,
      baseUrl,
      variables: {
        ...variables,
        // 将元素数据作为 result 变量传递给 JS 规则
        _elementData: elementData,
      },
    };

    // 如果规则是纯 JS 且元素是 JSON 对象，将元素数据作为 result
    if (elementData && (rule.startsWith('<js>') || rule.startsWith('@js:'))) {
      ctx.variables._jsResult = elementData;
    }

    return parseRule(ctx, rule);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

/**
 * 应用正则替换
 */
export function applyReplaceRegex(
  result: string,
  replaceRegex: string,
  replacement: string,
  replaceFirst: boolean
): string {
  if (!replaceRegex) return result;

  try {
    const regex = new RegExp(replaceRegex, 'g');

    if (replaceFirst) {
      const match = result.match(regex);
      if (match && match[0]) {
        return match[0].replace(new RegExp(replaceRegex), replacement);
      }
      return '';
    } else {
      return result.replace(regex, replacement);
    }
  } catch {
    return result.replace(replaceRegex, replacement);
  }
}

/**
 * HTML 实体解码
 */
export function unescapeHtml(str: string): string {
  if (!str || str.indexOf('&') === -1) return str;

  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
  };

  return str.replace(/&[#\w]+;/g, (entity) => {
    if (entities[entity]) return entities[entity];
    const match = entity.match(/&#(\d+);/);
    if (match) return String.fromCharCode(parseInt(match[1], 10));
    const hexMatch = entity.match(/&#x([0-9a-f]+);/i);
    if (hexMatch) return String.fromCharCode(parseInt(hexMatch[1], 16));
    return entity;
  });
}

export default {
  RuleMode,
  parseRule,
  parseList,
  parseFromElement,
  applyReplaceRegex,
  unescapeHtml,
  formatContent,
  detectJson,
  parseSourceRule,
  resolveUrl,
  splitRule,
  syncHttpRequest,
  asyncHttpRequest,
  createSymmetricCrypto,
};
