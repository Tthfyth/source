// ============================================
// 书源类型定义
// 支持 Legado 和 异次元 两种格式
// ============================================

// 源格式枚举（用于区分 Legado 和 异次元）
export enum SourceFormat {
  Legado = 'legado',
  Yiciyuan = 'yiciyuan',
}

// 书源类型枚举（Legado 格式）
export enum BookSourceType {
  Text = 0, // 文本
  Audio = 1, // 音频
  Image = 2, // 图片
  File = 3, // 文件（下载站）
}

// 书源主体定义
export interface BookSource {
  // ===== 基本信息 =====
  bookSourceUrl: string; // 书源地址（主键）
  bookSourceName: string; // 书源名称
  bookSourceGroup?: string; // 书源分组
  bookSourceType: BookSourceType; // 书源类型
  bookSourceComment?: string; // 书源注释/说明

  // ===== 状态控制 =====
  enabled: boolean; // 是否启用
  enabledExplore: boolean; // 是否启用发现
  customOrder: number; // 手动排序编号
  weight: number; // 智能排序权重

  // ===== 时间信息 =====
  lastUpdateTime: number; // 最后更新时间
  respondTime: number; // 响应时间（毫秒）

  // ===== 高级配置 =====
  bookUrlPattern?: string; // 详情页URL正则
  header?: string; // 请求头（JSON格式）
  concurrentRate?: string; // 并发率
  jsLib?: string; // JS库
  enabledCookieJar?: boolean; // 启用CookieJar

  // ===== 登录相关 =====
  loginUrl?: string; // 登录地址
  loginUi?: string; // 登录UI配置（JSON）
  loginCheckJs?: string; // 登录检测JS

  // ===== 其他 =====
  coverDecodeJs?: string; // 封面解密JS
  variableComment?: string; // 自定义变量说明

  // ===== 搜索配置 =====
  searchUrl?: string; // 搜索URL模板
  ruleSearch?: SearchRule; // 搜索规则

  // ===== 发现配置 =====
  exploreUrl?: string; // 发现URL（多行，每行一个分类）
  exploreScreen?: string; // 发现筛选规则
  ruleExplore?: ExploreRule; // 发现规则

  // ===== 详情/目录/正文规则 =====
  ruleBookInfo?: BookInfoRule; // 书籍详情规则
  ruleToc?: TocRule; // 目录规则
  ruleContent?: ContentRule; // 正文规则
}

// 书籍列表规则（搜索/发现共用）
export interface BookListRule {
  bookList?: string; // 书籍列表规则
  name?: string; // 书名规则
  author?: string; // 作者规则
  intro?: string; // 简介规则
  kind?: string; // 分类/标签规则
  lastChapter?: string; // 最新章节规则
  updateTime?: string; // 更新时间规则
  bookUrl?: string; // 书籍详情URL规则
  coverUrl?: string; // 封面URL规则
  wordCount?: string; // 字数规则
}

// 搜索规则
export interface SearchRule extends BookListRule {
  checkKeyWord?: string; // 校验关键字（用于测试书源）
}

// 发现规则
export interface ExploreRule extends BookListRule {
  // 继承 BookListRule 的所有字段
}

// 书籍详情规则
export interface BookInfoRule {
  init?: string; // 预处理规则
  name?: string; // 书名规则
  author?: string; // 作者规则
  intro?: string; // 简介规则
  kind?: string; // 分类规则
  lastChapter?: string; // 最新章节规则
  updateTime?: string; // 更新时间规则
  coverUrl?: string; // 封面URL规则
  tocUrl?: string; // 目录URL规则
  wordCount?: string; // 字数规则
  canReName?: string; // 是否允许重命名
  downloadUrls?: string; // 下载地址规则（文件类书源）
}

// 目录规则
export interface TocRule {
  preUpdateJs?: string; // 更新前预处理JS
  chapterList?: string; // 章节列表规则
  chapterName?: string; // 章节名称规则
  chapterUrl?: string; // 章节URL规则
  formatJs?: string; // 格式化JS
  isVolume?: string; // 是否为卷标识
  isVip?: string; // 是否VIP章节
  isPay?: string; // 是否付费章节
  updateTime?: string; // 更新时间规则
  nextTocUrl?: string; // 下一页目录URL
}

// 正文规则
export interface ContentRule {
  content?: string; // 正文内容规则
  title?: string; // 标题规则（部分网站需要从正文获取）
  nextContentUrl?: string; // 下一页正文URL
  webJs?: string; // WebView执行的JS
  sourceRegex?: string; // 资源正则
  replaceRegex?: string; // 替换规则（净化正文）
  imageStyle?: string; // 图片样式（FULL=最大宽度）
  imageDecode?: string; // 图片解密JS
  payAction?: string; // 购买操作（JS或URL）
}

// 调试日志类型
export type LogLevel = 'info' | 'success' | 'warning' | 'error';
export type LogCategory = 'request' | 'parse' | 'field' | 'error';

export interface DebugLog {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: string;
}

// 测试模式
export type TestMode = 'search' | 'explore' | 'detail' | 'toc' | 'content';

// 测试结果
export interface TestResult {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  rawResponse?: string;
  parsedData?: ParsedItem[];
  rawParsedItems?: any[]; // 原始解析数据，用于可视化
  imageUrls?: string[];   // 图片书源的图片URL列表
  error?: string;
}

export interface ParsedItem {
  key: string;
  value: string;
  matched: boolean;
  children?: ParsedItem[];
}

// 树节点类型
export interface SourceTreeNode {
  key: string;
  label: string;
  type: 'source' | 'rule';
  icon?: string;
  status?: 'untested' | 'success' | 'failed';
  children?: SourceTreeNode[];
  source?: BookSource;
}

// 请求头
export interface RequestHeader {
  key: string;
  value: string;
  enabled: boolean;
}

// 布局状态
export interface LayoutState {
  leftWidth: number;
  rightWidth: number;
  bottomHeight: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomCollapsed: boolean;
}

// 书籍信息接口
export interface BookItem {
  name: string;
  author?: string;
  intro?: string;
  coverUrl?: string;
  bookUrl?: string;
  kind?: string;
  lastChapter?: string;
  wordCount?: string;
}

// 章节信息接口
export interface ChapterItem {
  name: string;
  url: string;
}

// 主题类型
export type ThemeMode = 'light' | 'dark' | 'system';

// ============================================
// 异次元图源类型定义
// 参考: https://www.yckceo.com/yiciyuan/tuyuan/
// ============================================

// 异次元图源主体定义
export interface YiciyuanSource {
  // ===== 基本信息 =====
  bookSourceUrl: string;           // 源地址（主键）
  bookSourceName: string;          // 源名称
  bookSourceGroup?: string;        // 源分组
  bookSourceType: string;          // 源类型（漫画/小说等）
  sourceRemark?: string;           // 源备注
  
  // ===== 状态控制 =====
  enable: boolean;                 // 是否启用
  serialNumber?: number;           // 序号
  weight?: number;                 // 权重
  lastUpdateTime?: number;         // 最后更新时间
  
  // ===== 请求配置 =====
  httpUserAgent?: string;          // User-Agent
  bookDelayTime?: string;          // 延迟时间
  bookSingleThread?: string;       // 单线程（是/否）
  
  // ===== 登录相关 =====
  loginUrl?: string;               // 登录地址
  loginUrlResult?: string;         // 登录结果
  
  // ===== 搜索规则 =====
  ruleSearchUrl?: string;          // 搜索地址
  ruleSearchUrlNext?: string;      // 搜索下一页
  ruleSearchList?: string;         // 搜索列表规则
  ruleSearchName?: string;         // 书名规则
  ruleSearchAuthor?: string;       // 作者规则
  ruleSearchKind?: string;         // 分类规则
  ruleSearchLastChapter?: string;  // 最新章节规则
  ruleSearchCoverUrl?: string;     // 封面规则
  ruleSearchCoverDecoder?: string; // 封面解密
  ruleSearchNoteUrl?: string;      // 详情地址规则
  
  // ===== 发现规则 =====
  ruleFindUrl?: string;            // 发现地址（多行）
  
  // ===== 详情规则 =====
  ruleBookUrlPattern?: string;     // URL匹配规则
  ruleBookName?: string;           // 书名规则
  ruleBookAuthor?: string;         // 作者规则
  ruleBookKind?: string;           // 分类规则
  ruleBookLastChapter?: string;    // 最新章节规则
  ruleIntroduce?: string;          // 简介规则
  ruleCoverUrl?: string;           // 封面规则
  ruleCoverDecoder?: string;       // 封面解密
  
  // ===== 目录规则 =====
  ruleChapterUrl?: string;         // 目录地址规则
  ruleChapterUrlNext?: string;     // 目录下一页
  ruleChapterList?: string;        // 章节列表规则
  ruleChapterName?: string;        // 章节名称规则
  ruleContentUrl?: string;         // 章节内容地址规则
  ruleChapterId?: string;          // 章节ID规则
  ruleChapterParentId?: string;    // 父章节ID
  ruleChapterParentName?: string;  // 父章节名称
  
  // ===== 正文规则 =====
  ruleBookContent?: string;        // 正文内容规则
  ruleBookContentDecoder?: string; // 正文解密
  ruleContentUrlNext?: string;     // 正文下一页
}

// 通用源类型（可以是 Legado 或 异次元）
export type AnySource = BookSource | YiciyuanSource;

// 源格式检测函数类型
export type SourceFormatDetector = (source: any) => SourceFormat;

// 检测源格式的工具函数
export function detectSourceFormat(source: any): SourceFormat {
  if (!source) return SourceFormat.Legado;
  
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
  
  // 统计匹配的字段数
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
  
  // 根据匹配数量判断格式
  return yiciyuanCount > legadoCount ? SourceFormat.Yiciyuan : SourceFormat.Legado;
}

// 获取源格式的显示名称
export function getSourceFormatLabel(format: SourceFormat): string {
  return format === SourceFormat.Yiciyuan ? '异次元' : 'Legado';
}
