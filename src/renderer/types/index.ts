// ============================================
// Legado 书源完整类型定义
// 参考: https://github.com/gedoor/legado
// ============================================

// 书源类型枚举
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
