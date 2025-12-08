/**
 * 书源格式转换工具
 * 支持 Legado 图源 <-> 异次元图源 互转
 * 
 * 关键差异：
 * 1. 搜索URL占位符：异次元用 searchKey/searchPage，Legado用 {{key}}/{{page}}
 * 2. 规则语法：异次元可带 @Header:{} 后缀，Legado用 @css:/@json:/@xpath: 前缀
 * 3. 属性取值：异次元用 tag.a@text，Legado用 a@text 或 CSS选择器
 */

import { 
  BookSource, 
  YiciyuanSource, 
  BookSourceType, 
  SourceFormat, 
  detectSourceFormat 
} from '../types';

// ============================================
// 规则语法转换
// ============================================

/**
 * Legado 规则 -> 异次元规则
 * - 移除 @css:/@json:/@xpath: 前缀（异次元自动识别）
 * - 处理复合规则（||, &&, @@）
 * 
 * 注意：保持幂等性，多次转换结果不变
 */
function legadoRuleToYiciyuan(rule: string | undefined): string {
  if (!rule) return '';
  
  let result = rule.trim();
  
  // 移除 Legado 规则类型前缀（异次元自动识别）
  // 但保留 @js: 因为两者都支持
  result = result.replace(/^@(css|json|xpath):/i, '');
  
  // <js></js> 格式两者都支持，保持不变以确保幂等性
  // 不再转换为 @js: 格式，因为会导致多次转换出问题
  
  return result;
}

/**
 * 异次元规则 -> Legado 规则
 * - 保持规则基本不变（Legado 解析器兼容性较好）
 * - 保留 @Header:{} 后缀（本项目的解析器会处理它）
 * 
 * 注意：保持幂等性，多次转换结果不变
 * 重要：不移除 @Header:{} 后缀，以保证往返转换的完整性
 */
function yiciyuanRuleToLegado(rule: string | undefined): string {
  if (!rule) return '';
  
  // 保持原样，不做任何修改
  // @Header:{} 后缀会被本项目的解析器正确处理
  return rule.trim();
}

/**
 * Legado 搜索URL -> 异次元搜索URL
 * {{key}} -> searchKey
 * {{page}} -> searchPage
 * ,{ -> 分离 POST 参数
 * 
 * 注意：先替换带运算符的占位符，避免部分匹配
 */
function legadoSearchUrlToYiciyuan(url: string | undefined): string {
  if (!url) return '';
  
  let result = url.trim();
  
  // 如果已经是异次元格式，直接返回（幂等性）
  if (result.includes('searchKey') || result.includes('searchPage')) {
    return result;
  }
  
  // 处理 POST 请求格式（先处理，因为 JSON 中也有占位符）
  // Legado: url,{"method":"POST","body":"key={{key}}"}
  // 异次元: url@post->key=searchKey
  const postMatch = result.match(/^(.+?),\s*(\{.+\})$/s);
  if (postMatch) {
    const baseUrl = postMatch[1];
    try {
      const config = JSON.parse(postMatch[2]);
      if (config.method?.toUpperCase() === 'POST' && config.body) {
        let body = config.body;
        // 先替换带运算符的，再替换普通的
        body = body.replace(/\{\{page-1\}\}/g, 'searchPage-1');
        body = body.replace(/\{\{page\+1\}\}/g, 'searchPage+1');
        body = body.replace(/\{\{page\}\}/g, 'searchPage');
        body = body.replace(/\{\{key\}\}/g, 'searchKey');
        result = `${baseUrl}@post->${body}`;
        return result;
      }
    } catch {
      // JSON 解析失败，继续普通处理
    }
  }
  
  // 替换占位符（先替换带运算符的，避免部分匹配）
  result = result.replace(/\{\{page-1\}\}/g, 'searchPage-1');
  result = result.replace(/\{\{page\+1\}\}/g, 'searchPage+1');
  result = result.replace(/\{\{page\}\}/g, 'searchPage');
  result = result.replace(/\{\{key\}\}/g, 'searchKey');
  
  return result;
}

/**
 * 异次元搜索URL -> Legado 搜索URL
 * searchKey -> {{key}}
 * searchPage -> {{page}}
 * @post-> -> POST 配置
 * 
 * 注意：先替换带运算符的占位符，避免部分匹配
 */
function yiciyuanSearchUrlToLegado(url: string | undefined): string {
  if (!url) return '';
  
  let result = url.trim();
  
  // 如果已经是 Legado 格式，直接返回（幂等性）
  if (result.includes('{{key}}') || result.includes('{{page}}')) {
    return result;
  }
  
  // 处理 POST 请求格式
  // 异次元: url@post->key=searchKey
  // Legado: url,{"method":"POST","body":"key={{key}}"}
  const postMatch = result.match(/^(.+?)@post->(.+)$/i);
  if (postMatch) {
    const baseUrl = postMatch[1];
    let body = postMatch[2];
    // 先替换带运算符的，再替换普通的
    body = body.replace(/searchPage-1/g, '{{page-1}}');
    body = body.replace(/searchPage\+1/g, '{{page+1}}');
    body = body.replace(/searchPage(?!-|\+)/g, '{{page}}');
    body = body.replace(/searchKey/g, '{{key}}');
    result = `${baseUrl},{"method":"POST","body":"${body}"}`;
    return result;
  }
  
  // 替换占位符（先替换带运算符的，避免部分匹配）
  // 使用负向前瞻确保 searchPage 后面不是 - 或 +
  result = result.replace(/searchPage-1/g, '{{page-1}}');
  result = result.replace(/searchPage\+1/g, '{{page+1}}');
  result = result.replace(/searchPage(?!-|\+)/g, '{{page}}');
  result = result.replace(/searchKey/g, '{{key}}');
  
  return result;
}

/**
 * Legado 发现URL -> 异次元发现URL
 */
function legadoExploreUrlToYiciyuan(url: string | undefined): string {
  if (!url) return '';
  
  let result = url.trim();
  
  // 如果已经是异次元格式，直接返回（幂等性）
  if (result.includes('searchPage')) {
    return result;
  }
  
  // 先替换带运算符的，避免部分匹配
  result = result.replace(/\{\{page-1\}\}/g, 'searchPage-1');
  result = result.replace(/\{\{page\+1\}\}/g, 'searchPage+1');
  result = result.replace(/\{\{page\}\}/g, 'searchPage');
  
  return result;
}

/**
 * 异次元发现URL -> Legado 发现URL
 */
function yiciyuanExploreUrlToLegado(url: string | undefined): string {
  if (!url) return '';
  
  let result = url.trim();
  
  // 如果已经是 Legado 格式，直接返回（幂等性）
  if (result.includes('{{page}}')) {
    return result;
  }
  
  // 先替换带运算符的，避免部分匹配
  result = result.replace(/searchPage-1/g, '{{page-1}}');
  result = result.replace(/searchPage\+1/g, '{{page+1}}');
  result = result.replace(/searchPage(?!-|\+)/g, '{{page}}');
  
  return result;
}

// ============================================
// 主转换函数
// ============================================

/**
 * Legado 图源 -> 异次元图源
 * 
 * 注意：异次元格式没有 header 字段，但我们在转换结果中保留它
 * 以便异次元调试器能正确处理请求头
 */
export function legadoToYiciyuan(source: BookSource): YiciyuanSource {
  // 解析 header，提取 User-Agent
  const headerObj = parseHeaderJson(source.header);
  
  const result: YiciyuanSource & { header?: string } = {
    // 基本信息
    bookSourceUrl: source.bookSourceUrl || '',
    bookSourceName: source.bookSourceName || '',
    bookSourceGroup: source.bookSourceGroup || '',
    bookSourceType: '漫画',
    sourceRemark: source.bookSourceComment || '',
    
    // 状态控制
    enable: source.enabled !== false,
    serialNumber: source.customOrder || 0,
    weight: source.weight || 0,
    lastUpdateTime: source.lastUpdateTime || Date.now(),
    
    // 请求配置
    httpUserAgent: headerObj['User-Agent'] || '',
    
    // 登录相关
    loginUrl: source.loginUrl || '',
    
    // 搜索规则 - 转换URL和规则语法
    ruleSearchUrl: legadoSearchUrlToYiciyuan(source.searchUrl),
    ruleSearchList: legadoRuleToYiciyuan(source.ruleSearch?.bookList),
    ruleSearchName: legadoRuleToYiciyuan(source.ruleSearch?.name),
    ruleSearchAuthor: legadoRuleToYiciyuan(source.ruleSearch?.author),
    ruleSearchKind: legadoRuleToYiciyuan(source.ruleSearch?.kind),
    ruleSearchLastChapter: legadoRuleToYiciyuan(source.ruleSearch?.lastChapter),
    ruleSearchCoverUrl: legadoRuleToYiciyuan(source.ruleSearch?.coverUrl),
    ruleSearchNoteUrl: legadoRuleToYiciyuan(source.ruleSearch?.bookUrl),
    
    // 发现规则
    ruleFindUrl: legadoExploreUrlToYiciyuan(source.exploreUrl),
    
    // 详情规则
    ruleBookUrlPattern: source.bookUrlPattern || '',
    ruleBookName: legadoRuleToYiciyuan(source.ruleBookInfo?.name),
    ruleBookAuthor: legadoRuleToYiciyuan(source.ruleBookInfo?.author),
    ruleBookKind: legadoRuleToYiciyuan(source.ruleBookInfo?.kind),
    ruleBookLastChapter: legadoRuleToYiciyuan(source.ruleBookInfo?.lastChapter),
    ruleIntroduce: legadoRuleToYiciyuan(source.ruleBookInfo?.intro),
    ruleCoverUrl: legadoRuleToYiciyuan(source.ruleBookInfo?.coverUrl),
    
    // 目录规则
    ruleChapterUrl: legadoRuleToYiciyuan(source.ruleBookInfo?.tocUrl),
    ruleChapterUrlNext: legadoRuleToYiciyuan(source.ruleToc?.nextTocUrl),
    ruleChapterList: legadoRuleToYiciyuan(source.ruleToc?.chapterList),
    ruleChapterName: legadoRuleToYiciyuan(source.ruleToc?.chapterName),
    ruleContentUrl: legadoRuleToYiciyuan(source.ruleToc?.chapterUrl),
    
    // 正文规则
    ruleBookContent: legadoRuleToYiciyuan(source.ruleContent?.content),
    ruleContentUrlNext: legadoRuleToYiciyuan(source.ruleContent?.nextContentUrl),
  };
  
  // 保留原始 header（异次元调试器会使用它）
  if (source.header) {
    (result as any).header = source.header;
  }
  
  // 清理空字段
  return cleanEmptyFields(result) as YiciyuanSource;
}

/**
 * 异次元图源 -> Legado 图源
 */
export function yiciyuanToLegado(source: YiciyuanSource): BookSource {
  const result: BookSource = {
    // 基本信息
    bookSourceUrl: source.bookSourceUrl || '',
    bookSourceName: source.bookSourceName || '',
    bookSourceGroup: source.bookSourceGroup || '',
    bookSourceType: BookSourceType.Image, // 图片类型
    bookSourceComment: source.sourceRemark || '',
    
    // 状态控制
    enabled: source.enable !== false,
    enabledExplore: !!source.ruleFindUrl,
    customOrder: source.serialNumber || 0,
    weight: source.weight || 0,
    
    // 时间信息
    lastUpdateTime: source.lastUpdateTime || Date.now(),
    respondTime: 0,
    
    // 请求头
    header: source.httpUserAgent 
      ? JSON.stringify({ 'User-Agent': source.httpUserAgent })
      : undefined,
    
    // 登录相关
    loginUrl: source.loginUrl || undefined,
    
    // 搜索配置 - 转换URL和规则语法
    searchUrl: yiciyuanSearchUrlToLegado(source.ruleSearchUrl),
    ruleSearch: {
      bookList: yiciyuanRuleToLegado(source.ruleSearchList),
      name: yiciyuanRuleToLegado(source.ruleSearchName),
      author: yiciyuanRuleToLegado(source.ruleSearchAuthor),
      kind: yiciyuanRuleToLegado(source.ruleSearchKind),
      lastChapter: yiciyuanRuleToLegado(source.ruleSearchLastChapter),
      coverUrl: yiciyuanRuleToLegado(source.ruleSearchCoverUrl),
      bookUrl: yiciyuanRuleToLegado(source.ruleSearchNoteUrl),
    },
    
    // 发现配置
    exploreUrl: yiciyuanExploreUrlToLegado(source.ruleFindUrl),
    ruleExplore: {
      // 异次元通常搜索和发现共用规则
      bookList: yiciyuanRuleToLegado(source.ruleSearchList),
      name: yiciyuanRuleToLegado(source.ruleSearchName),
      author: yiciyuanRuleToLegado(source.ruleSearchAuthor),
      kind: yiciyuanRuleToLegado(source.ruleSearchKind),
      lastChapter: yiciyuanRuleToLegado(source.ruleSearchLastChapter),
      coverUrl: yiciyuanRuleToLegado(source.ruleSearchCoverUrl),
      bookUrl: yiciyuanRuleToLegado(source.ruleSearchNoteUrl),
    },
    
    // 详情规则
    bookUrlPattern: source.ruleBookUrlPattern || undefined,
    ruleBookInfo: {
      name: yiciyuanRuleToLegado(source.ruleBookName),
      author: yiciyuanRuleToLegado(source.ruleBookAuthor),
      kind: yiciyuanRuleToLegado(source.ruleBookKind),
      lastChapter: yiciyuanRuleToLegado(source.ruleBookLastChapter),
      intro: yiciyuanRuleToLegado(source.ruleIntroduce),
      coverUrl: yiciyuanRuleToLegado(source.ruleCoverUrl),
      tocUrl: yiciyuanRuleToLegado(source.ruleChapterUrl),
    },
    
    // 目录规则
    ruleToc: {
      chapterList: yiciyuanRuleToLegado(source.ruleChapterList),
      chapterName: yiciyuanRuleToLegado(source.ruleChapterName),
      chapterUrl: yiciyuanRuleToLegado(source.ruleContentUrl),
      nextTocUrl: yiciyuanRuleToLegado(source.ruleChapterUrlNext),
    },
    
    // 正文规则
    ruleContent: {
      content: yiciyuanRuleToLegado(source.ruleBookContent),
      nextContentUrl: yiciyuanRuleToLegado(source.ruleContentUrlNext),
      imageStyle: 'FULL', // 图源默认全宽显示
    },
  };
  
  // 保留原始 header（如果异次元源中有的话，可能是从 Legado 转换来的）
  const sourceAny = source as any;
  if (sourceAny.header) {
    result.header = sourceAny.header;
  }
  
  // 清理空字段
  return cleanEmptyFields(result) as BookSource;
}

/**
 * 转换结果类型
 */
export interface ConvertResult {
  success: boolean;
  result?: any;
  fromFormat: SourceFormat;
  toFormat: SourceFormat;
  error?: string;
}

/**
 * 检查是否为图片类型书源
 * Legado: bookSourceType === 2
 * 异次元: bookSourceType === '漫画' 或类似
 */
function isImageSource(source: any): boolean {
  // Legado 格式
  if (typeof source.bookSourceType === 'number') {
    return source.bookSourceType === BookSourceType.Image; // 2
  }
  // 异次元格式
  if (typeof source.bookSourceType === 'string') {
    return ['漫画', '图片', 'comic', 'image'].includes(source.bookSourceType.toLowerCase());
  }
  return false;
}

/**
 * 自动检测并转换源格式
 * 只支持图片类型书源的转换
 */
export function convertSource(source: any): ConvertResult {
  const fromFormat = detectSourceFormat(source);
  
  // 检查是否为图片类型
  if (!isImageSource(source)) {
    const typeName = source.bookSourceType === 0 ? '文字' 
      : source.bookSourceType === 1 ? '音频'
      : source.bookSourceType === 3 ? '文件'
      : `未知(${source.bookSourceType})`;
    return {
      success: false,
      fromFormat,
      toFormat: fromFormat === SourceFormat.Yiciyuan ? SourceFormat.Legado : SourceFormat.Yiciyuan,
      error: `只支持图片类型书源转换，当前书源类型为：${typeName}`,
    };
  }
  
  if (fromFormat === SourceFormat.Yiciyuan) {
    return {
      success: true,
      result: yiciyuanToLegado(source as YiciyuanSource),
      fromFormat: SourceFormat.Yiciyuan,
      toFormat: SourceFormat.Legado,
    };
  } else {
    return {
      success: true,
      result: legadoToYiciyuan(source as BookSource),
      fromFormat: SourceFormat.Legado,
      toFormat: SourceFormat.Yiciyuan,
    };
  }
}

// ============================================
// 工具函数
// ============================================

/**
 * 解析 header JSON 获取指定字段
 */
function parseHeader(header: string | undefined, key: string): string {
  if (!header) return '';
  try {
    const parsed = JSON.parse(header);
    return parsed[key] || '';
  } catch {
    return '';
  }
}

/**
 * 解析 header JSON 为对象
 */
function parseHeaderJson(header: string | undefined): Record<string, string> {
  if (!header) return {};
  try {
    return JSON.parse(header);
  } catch {
    return {};
  }
}

/**
 * 清理对象中的空字段
 */
function cleanEmptyFields(obj: any): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      const cleaned = cleanEmptyFields(value);
      if (Object.keys(cleaned).length > 0) {
        result[key] = cleaned;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}
