/**
 * Legado 书源字段说明
 * 参考: https://mgz0227.github.io/The-tutorial-of-Legado/Rule/source.html
 */

export interface FieldDoc {
  name: string;
  description: string;
  example?: string;
  tips?: string;
}

// 书源基本信息字段说明
export const basicFields: Record<string, FieldDoc> = {
  bookSourceUrl: {
    name: '书源URL',
    description: '书源的唯一标识，通常是网站的根地址',
    example: 'https://www.example.com',
    tips: '必填，作为书源的主键',
  },
  bookSourceName: {
    name: '书源名称',
    description: '书源的显示名称',
    example: '示例书源',
    tips: '必填，用于在列表中显示',
  },
  bookSourceGroup: {
    name: '书源分组',
    description: '书源所属的分组，用于分类管理',
    example: '优质书源',
  },
  bookSourceType: {
    name: '书源类型',
    description: '0=文本, 1=音频, 2=图片, 3=文件',
    example: '0',
    tips: '默认为0（文本类型）',
  },
  bookSourceComment: {
    name: '书源注释',
    description: '书源的说明或备注信息',
  },
  enabled: {
    name: '是否启用',
    description: '控制书源是否参与搜索',
    tips: 'true=启用, false=禁用',
  },
  enabledExplore: {
    name: '启用发现',
    description: '控制是否显示发现页',
    tips: 'true=启用, false=禁用',
  },
  customOrder: {
    name: '自定义排序',
    description: '手动排序的序号，数值越小越靠前',
  },
  weight: {
    name: '智能排序权重',
    description: '用于智能排序的权重值',
  },
  lastUpdateTime: {
    name: '最后更新时间',
    description: '书源最后修改的时间戳',
  },
  respondTime: {
    name: '响应时间',
    description: '书源的响应时间（毫秒）',
  },
  header: {
    name: '请求头',
    description: 'HTTP请求头，JSON格式',
    example: '{"User-Agent": "Mozilla/5.0..."}',
    tips: '可设置User-Agent、Cookie等',
  },
  loginUrl: {
    name: '登录地址',
    description: '需要登录的书源，填写登录页面URL',
  },
  loginUi: {
    name: '登录UI配置',
    description: '自定义登录界面的配置，JSON格式',
  },
  loginCheckJs: {
    name: '登录检测JS',
    description: '用于检测是否已登录的JavaScript代码',
  },
  bookUrlPattern: {
    name: '书籍URL正则',
    description: '用于匹配书籍详情页URL的正则表达式',
  },
  concurrentRate: {
    name: '并发率',
    description: '控制请求并发数，格式: 次数/时间(秒)',
    example: '1/1',
    tips: '1/1 表示每秒最多1次请求',
  },
  jsLib: {
    name: 'JS库',
    description: '自定义JavaScript函数库，可在规则中调用',
  },
  enabledCookieJar: {
    name: '启用CookieJar',
    description: '是否自动管理Cookie',
  },
};

// 搜索URL说明
export const searchUrlDoc: FieldDoc = {
  name: '搜索URL',
  description: '搜索请求的URL模板',
  example: '/search?key={{key}}&page={{page}}',
  tips: `支持变量:
- {{key}}: 搜索关键词
- {{page}}: 页码
- {{(page-1)*20}}: 计算表达式

POST请求格式:
/search,{
  "method": "POST",
  "body": "key={{key}}&page={{page}}",
  "charset": "gbk"
}`,
};

// 发现URL说明
export const exploreUrlDoc: FieldDoc = {
  name: '发现URL',
  description: '发现页的URL配置，每行一个分类',
  example: `玄幻::https://example.com/xuanhuan/{{page}}
都市::https://example.com/dushi/{{page}}`,
  tips: '格式: 分类名::URL，支持{{page}}变量',
};

// 搜索规则字段说明
export const searchRuleFields: Record<string, FieldDoc> = {
  bookList: {
    name: '书籍列表',
    description: '获取搜索结果列表的规则',
    example: '@css:.search-list li',
    tips: '返回多个元素，每个元素代表一本书',
  },
  name: {
    name: '书名',
    description: '从列表项中获取书名的规则',
    example: '@css:.book-name@text',
  },
  author: {
    name: '作者',
    description: '从列表项中获取作者的规则',
    example: '@css:.author@text',
  },
  intro: {
    name: '简介',
    description: '从列表项中获取简介的规则',
    example: '@css:.intro@text',
  },
  kind: {
    name: '分类/标签',
    description: '从列表项中获取分类的规则',
    example: '@css:.category@text',
  },
  lastChapter: {
    name: '最新章节',
    description: '从列表项中获取最新章节的规则',
    example: '@css:.latest@text',
  },
  updateTime: {
    name: '更新时间',
    description: '从列表项中获取更新时间的规则',
  },
  bookUrl: {
    name: '书籍URL',
    description: '从列表项中获取详情页URL的规则',
    example: '@css:a@href',
    tips: '必填，用于跳转到详情页',
  },
  coverUrl: {
    name: '封面URL',
    description: '从列表项中获取封面图片URL的规则',
    example: '@css:img@src',
  },
  wordCount: {
    name: '字数',
    description: '从列表项中获取字数的规则',
  },
  checkKeyWord: {
    name: '校验关键字',
    description: '用于测试书源的搜索关键字',
    example: '斗罗',
  },
};

// 详情页规则字段说明
export const bookInfoRuleFields: Record<string, FieldDoc> = {
  init: {
    name: '预处理',
    description: '在解析前对页面进行预处理的规则',
    tips: '可用于处理动态加载的页面',
  },
  name: {
    name: '书名',
    description: '获取书名的规则',
    example: '//meta[@property="og:novel:book_name"]/@content',
  },
  author: {
    name: '作者',
    description: '获取作者的规则',
    example: '//meta[@property="og:novel:author"]/@content',
  },
  intro: {
    name: '简介',
    description: '获取简介的规则',
    example: '@css:.intro@text',
  },
  kind: {
    name: '分类',
    description: '获取分类的规则',
  },
  lastChapter: {
    name: '最新章节',
    description: '获取最新章节的规则',
  },
  updateTime: {
    name: '更新时间',
    description: '获取更新时间的规则',
  },
  coverUrl: {
    name: '封面URL',
    description: '获取封面图片URL的规则',
    example: '//meta[@property="og:image"]/@content',
  },
  tocUrl: {
    name: '目录URL',
    description: '获取目录页URL的规则',
    tips: '如果目录在详情页则留空',
  },
  wordCount: {
    name: '字数',
    description: '获取字数的规则',
  },
  canReName: {
    name: '允许重命名',
    description: '是否允许修改书名',
  },
  downloadUrls: {
    name: '下载地址',
    description: '文件类书源的下载地址规则',
  },
};

// 目录规则字段说明
export const tocRuleFields: Record<string, FieldDoc> = {
  preUpdateJs: {
    name: '更新前预处理',
    description: '更新目录前执行的JavaScript',
  },
  chapterList: {
    name: '章节列表',
    description: '获取章节列表的规则',
    example: '@css:.chapter-list li',
    tips: `支持正则AllInOne格式:
:href="(/chapter/[^"]*)"[^>]*>([^<]*)
$1为URL，$2为章节名`,
  },
  chapterName: {
    name: '章节名称',
    description: '从列表项中获取章节名的规则',
    example: '@css:a@text',
    tips: '正则模式下使用$2',
  },
  chapterUrl: {
    name: '章节URL',
    description: '从列表项中获取章节URL的规则',
    example: '@css:a@href',
    tips: '正则模式下使用$1',
  },
  formatJs: {
    name: '格式化JS',
    description: '格式化章节信息的JavaScript',
  },
  isVolume: {
    name: '卷标识',
    description: '判断是否为卷标题的规则',
  },
  isVip: {
    name: 'VIP标识',
    description: '判断是否为VIP章节的规则',
  },
  isPay: {
    name: '付费标识',
    description: '判断是否为付费章节的规则',
  },
  updateTime: {
    name: '更新时间',
    description: '获取章节更新时间的规则',
  },
  nextTocUrl: {
    name: '下一页URL',
    description: '目录分页时获取下一页URL的规则',
    example: '//a[text()="下一页"]/@href',
  },
};

// 正文规则字段说明
export const contentRuleFields: Record<string, FieldDoc> = {
  content: {
    name: '正文内容',
    description: '获取正文内容的规则',
    example: '@css:#content@html',
    tips: '可使用@textNodes获取纯文本',
  },
  title: {
    name: '标题',
    description: '从正文页获取章节标题的规则',
    tips: '部分网站需要从正文页获取标题',
  },
  nextContentUrl: {
    name: '下一页URL',
    description: '正文分页时获取下一页URL的规则',
  },
  webJs: {
    name: 'WebView JS',
    description: 'WebView加载后执行的JavaScript',
  },
  sourceRegex: {
    name: '资源正则',
    description: '用于嗅探音视频资源的正则表达式',
    example: '.*\\.(mp3|mp4).*',
    tips: '配合webView使用，用于音频书源',
  },
  replaceRegex: {
    name: '替换规则',
    description: '净化正文的替换规则',
    example: '##广告文字##',
    tips: '格式: ##正则##替换内容',
  },
  imageStyle: {
    name: '图片样式',
    description: '图片显示样式',
    tips: 'FULL=最大宽度',
  },
  imageDecode: {
    name: '图片解密',
    description: '图片解密的JavaScript',
  },
  payAction: {
    name: '购买操作',
    description: '付费章节的购买操作',
  },
};

// 规则语法说明
export const ruleSyntaxDoc = `
## 规则语法说明

### 1. JSOUP Default 语法
- 使用 @ 分隔，如: class.name.0@tag.a@text
- 支持: class, id, tag, text, children
- 位置从0开始，负数表示倒数
- 获取内容: text, textNodes, ownText, href, src, html, all

### 2. CSS 选择器
- 以 @css: 开头
- 例: @css:.book-list li > a@text

### 3. XPath
- 以 @XPath: 或 // 开头
- 例: //div[@class="content"]/text()

### 4. JSONPath
- 以 @json: 或 $. 开头
- 例: $.data.list[*].name

### 5. JavaScript
- 使用 <js></js> 或 @js: 包裹
- 结果存在 result 变量中

### 6. 正则表达式
- 净化: ##正则##替换内容
- AllInOne: :正则表达式 (仅列表规则)

### 7. 连接符
- && : 合并所有结果
- || : 取第一个有值的结果
- %% : 依次交替取值
`;

// 获取字段文档
export function getFieldDoc(path: string): FieldDoc | null {
  const parts = path.split('.');
  
  if (parts.length === 1) {
    if (parts[0] === 'searchUrl') return searchUrlDoc;
    if (parts[0] === 'exploreUrl') return exploreUrlDoc;
    return basicFields[parts[0]] || null;
  }
  
  if (parts.length === 2) {
    const [parent, field] = parts;
    switch (parent) {
      case 'ruleSearch':
      case 'ruleExplore':
        return searchRuleFields[field] || null;
      case 'ruleBookInfo':
        return bookInfoRuleFields[field] || null;
      case 'ruleToc':
        return tocRuleFields[field] || null;
      case 'ruleContent':
        return contentRuleFields[field] || null;
    }
  }
  
  return null;
}

// 所有字段的扁平映射（用于简单查找）
export const allFieldDocs: Record<string, FieldDoc> = {
  ...basicFields,
  searchUrl: searchUrlDoc,
  exploreUrl: exploreUrlDoc,
  // 搜索规则
  'ruleSearch.bookList': searchRuleFields.bookList,
  'ruleSearch.name': searchRuleFields.name,
  'ruleSearch.author': searchRuleFields.author,
  'ruleSearch.intro': searchRuleFields.intro,
  'ruleSearch.kind': searchRuleFields.kind,
  'ruleSearch.lastChapter': searchRuleFields.lastChapter,
  'ruleSearch.updateTime': searchRuleFields.updateTime,
  'ruleSearch.bookUrl': searchRuleFields.bookUrl,
  'ruleSearch.coverUrl': searchRuleFields.coverUrl,
  'ruleSearch.wordCount': searchRuleFields.wordCount,
  'ruleSearch.checkKeyWord': searchRuleFields.checkKeyWord,
  // 详情规则
  'ruleBookInfo.init': bookInfoRuleFields.init,
  'ruleBookInfo.name': bookInfoRuleFields.name,
  'ruleBookInfo.author': bookInfoRuleFields.author,
  'ruleBookInfo.intro': bookInfoRuleFields.intro,
  'ruleBookInfo.kind': bookInfoRuleFields.kind,
  'ruleBookInfo.lastChapter': bookInfoRuleFields.lastChapter,
  'ruleBookInfo.updateTime': bookInfoRuleFields.updateTime,
  'ruleBookInfo.coverUrl': bookInfoRuleFields.coverUrl,
  'ruleBookInfo.tocUrl': bookInfoRuleFields.tocUrl,
  'ruleBookInfo.wordCount': bookInfoRuleFields.wordCount,
  // 目录规则
  'ruleToc.preUpdateJs': tocRuleFields.preUpdateJs,
  'ruleToc.chapterList': tocRuleFields.chapterList,
  'ruleToc.chapterName': tocRuleFields.chapterName,
  'ruleToc.chapterUrl': tocRuleFields.chapterUrl,
  'ruleToc.formatJs': tocRuleFields.formatJs,
  'ruleToc.isVolume': tocRuleFields.isVolume,
  'ruleToc.isVip': tocRuleFields.isVip,
  'ruleToc.isPay': tocRuleFields.isPay,
  'ruleToc.updateTime': tocRuleFields.updateTime,
  'ruleToc.nextTocUrl': tocRuleFields.nextTocUrl,
  // 正文规则
  'ruleContent.content': contentRuleFields.content,
  'ruleContent.title': contentRuleFields.title,
  'ruleContent.nextContentUrl': contentRuleFields.nextContentUrl,
  'ruleContent.webJs': contentRuleFields.webJs,
  'ruleContent.sourceRegex': contentRuleFields.sourceRegex,
  'ruleContent.replaceRegex': contentRuleFields.replaceRegex,
  'ruleContent.imageStyle': contentRuleFields.imageStyle,
  'ruleContent.imageDecode': contentRuleFields.imageDecode,
  'ruleContent.payAction': contentRuleFields.payAction,
};
