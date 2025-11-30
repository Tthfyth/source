/**
 * 书源编辑配置
 * 参考 Legado 项目的 bookSourceEditConfig.ts
 */

export interface FieldConfig {
  title: string;
  id: string;
  namespace?: string;
  type: 'String' | 'Boolean' | 'Number' | 'Array';
  array?: string[];
  hint?: string;
  required?: boolean;
}

export interface TabConfig {
  name: string;
  children: FieldConfig[];
}

export type SourceEditConfig = Record<string, TabConfig>;

const bookSourceEditConfig: SourceEditConfig = {
  base: {
    name: '基本',
    children: [
      {
        title: '源类型',
        id: 'bookSourceType',
        type: 'Array',
        array: ['文本', '图片'],
        required: true,
        hint: '选择书源类型',
      },
      {
        title: '源域名',
        id: 'bookSourceUrl',
        type: 'String',
        hint: '通常填写网站主页，例: https://www.example.com',
        required: true,
      },
      {
        title: '源名称',
        id: 'bookSourceName',
        type: 'String',
        hint: '会显示在源列表',
        required: true,
      },
      {
        title: '源分组',
        id: 'bookSourceGroup',
        type: 'String',
        hint: '描述源的特征信息',
      },
      {
        title: '源注释',
        id: 'bookSourceComment',
        type: 'String',
        hint: '描述源作者和状态',
      },
      {
        title: '登录地址',
        id: 'loginUrl',
        type: 'String',
        hint: '填写网站登录网址，仅在需要登录的源有用',
      },
      {
        title: '登录界面',
        id: 'loginUi',
        type: 'String',
        hint: '自定义登录界面',
      },
      {
        title: '登录检测',
        id: 'loginCheckJs',
        type: 'String',
        hint: '登录检测js',
      },
      {
        title: '封面解密',
        id: 'coverDecodeJs',
        type: 'String',
        hint: '封面解密js',
      },
      {
        title: '链接验证',
        id: 'bookUrlPattern',
        type: 'String',
        hint: '书籍URL正则，当详情页URL与源URL的域名不一致时有效',
      },
      {
        title: '请求头',
        id: 'header',
        type: 'String',
        hint: '客户端标识，JSON格式',
      },
      {
        title: '变量说明',
        id: 'variableComment',
        type: 'String',
        hint: '书源变量说明',
      },
      {
        title: '并发率',
        id: 'concurrentRate',
        type: 'String',
        hint: '如1000(访问间隔1000ms)或者1/1000(1000ms内访问1次)',
      },
      {
        title: 'JS库',
        id: 'jsLib',
        type: 'String',
        hint: 'js库，可填写js或者key-value object获取在线js文件',
      },
    ],
  },
  search: {
    name: '搜索',
    children: [
      {
        title: '搜索地址',
        id: 'searchUrl',
        type: 'String',
        hint: '[域名可省略]/search.php@kw={{key}}',
      },
      {
        title: '校验文字',
        namespace: 'ruleSearch',
        id: 'checkKeyWord',
        type: 'String',
        hint: '校验关键字，强烈建议填写',
      },
      {
        title: '列表规则',
        namespace: 'ruleSearch',
        id: 'bookList',
        type: 'String',
        hint: '选择书籍节点 (规则结果为List<Element>)',
      },
      {
        title: '书名规则',
        namespace: 'ruleSearch',
        id: 'name',
        type: 'String',
        hint: '选择节点书名 (规则结果为String)',
      },
      {
        title: '作者规则',
        namespace: 'ruleSearch',
        id: 'author',
        type: 'String',
        hint: '选择节点作者 (规则结果为String)',
      },
      {
        title: '分类规则',
        namespace: 'ruleSearch',
        id: 'kind',
        type: 'String',
        hint: '选择节点分类信息 (规则结果为String)',
      },
      {
        title: '字数规则',
        namespace: 'ruleSearch',
        id: 'wordCount',
        type: 'String',
        hint: '选择节点字数信息 (规则结果为String)',
      },
      {
        title: '最新章节',
        namespace: 'ruleSearch',
        id: 'lastChapter',
        type: 'String',
        hint: '选择节点最新章节 (规则结果为String)',
      },
      {
        title: '简介规则',
        namespace: 'ruleSearch',
        id: 'intro',
        type: 'String',
        hint: '选择节点书籍简介 (规则结果为String)',
      },
      {
        title: '封面规则',
        namespace: 'ruleSearch',
        id: 'coverUrl',
        type: 'String',
        hint: '选择节点书籍封面 (规则结果为String类型的url)',
      },
      {
        title: '详情地址',
        namespace: 'ruleSearch',
        id: 'bookUrl',
        type: 'String',
        hint: '选择书籍详情页网址 (规则结果为String类型的url)',
      },
    ],
  },
  find: {
    name: '发现',
    children: [
      {
        title: '发现地址',
        id: 'exploreUrl',
        type: 'String',
        hint: '单个发现格式<name>::<url>，用换行符或&&连接',
      },
      {
        title: '列表规则',
        namespace: 'ruleExplore',
        id: 'bookList',
        type: 'String',
        hint: '选择书籍节点 (规则结果为List<Element>)',
      },
      {
        title: '书名规则',
        namespace: 'ruleExplore',
        id: 'name',
        type: 'String',
        hint: '选择节点书名 (规则结果为String)',
      },
      {
        title: '作者规则',
        namespace: 'ruleExplore',
        id: 'author',
        type: 'String',
        hint: '选择节点作者 (规则结果为String)',
      },
      {
        title: '分类规则',
        namespace: 'ruleExplore',
        id: 'kind',
        type: 'String',
        hint: '选择节点分类信息 (规则结果为String)',
      },
      {
        title: '字数规则',
        namespace: 'ruleExplore',
        id: 'wordCount',
        type: 'String',
        hint: '选择节点字数信息 (规则结果为String)',
      },
      {
        title: '最新章节',
        namespace: 'ruleExplore',
        id: 'lastChapter',
        type: 'String',
        hint: '选择节点最新章节 (规则结果为String)',
      },
      {
        title: '简介规则',
        namespace: 'ruleExplore',
        id: 'intro',
        type: 'String',
        hint: '选择节点书籍简介 (规则结果为String)',
      },
      {
        title: '封面规则',
        namespace: 'ruleExplore',
        id: 'coverUrl',
        type: 'String',
        hint: '选择节点书籍封面 (规则结果为String类型的url)',
      },
      {
        title: '详情地址',
        namespace: 'ruleExplore',
        id: 'bookUrl',
        type: 'String',
        hint: '选择书籍详情页网址 (规则结果为String类型的url)',
      },
    ],
  },
  detail: {
    name: '详情',
    children: [
      {
        title: '预处理',
        namespace: 'ruleBookInfo',
        id: 'init',
        type: 'String',
        hint: '用于加速详情信息检索，只支持AllInOne规则',
      },
      {
        title: '书名规则',
        namespace: 'ruleBookInfo',
        id: 'name',
        type: 'String',
        hint: '选择节点书名 (规则结果为String)',
      },
      {
        title: '作者规则',
        namespace: 'ruleBookInfo',
        id: 'author',
        type: 'String',
        hint: '选择节点作者 (规则结果为String)',
      },
      {
        title: '分类规则',
        namespace: 'ruleBookInfo',
        id: 'kind',
        type: 'String',
        hint: '选择节点分类信息 (规则结果为String)',
      },
      {
        title: '字数规则',
        namespace: 'ruleBookInfo',
        id: 'wordCount',
        type: 'String',
        hint: '选择节点字数信息 (规则结果为String)',
      },
      {
        title: '最新章节',
        namespace: 'ruleBookInfo',
        id: 'lastChapter',
        type: 'String',
        hint: '选择节点最新章节 (规则结果为String)',
      },
      {
        title: '简介规则',
        namespace: 'ruleBookInfo',
        id: 'intro',
        type: 'String',
        hint: '选择节点书籍简介 (规则结果为String)',
      },
      {
        title: '封面规则',
        namespace: 'ruleBookInfo',
        id: 'coverUrl',
        type: 'String',
        hint: '选择节点书籍封面 (规则结果为String类型的url)',
      },
      {
        title: '目录地址',
        namespace: 'ruleBookInfo',
        id: 'tocUrl',
        type: 'String',
        hint: '选择书籍目录页网址 (与详情页相同时可省略)',
      },
      {
        title: '修改书籍',
        namespace: 'ruleBookInfo',
        id: 'canReName',
        type: 'String',
        hint: '允许修改书名作者(规则结果为String类型，默认不允许)',
      },
      {
        title: '下载URL',
        namespace: 'ruleBookInfo',
        id: 'downloadUrls',
        type: 'String',
        hint: '文件类书源下载地址 (多个链接返回数组)',
      },
    ],
  },
  toc: {
    name: '目录',
    children: [
      {
        title: '更新前JS',
        namespace: 'ruleToc',
        id: 'preUpdateJs',
        type: 'String',
        hint: '更新目录前调用JS，动态更新目录链接',
      },
      {
        title: '列表规则',
        namespace: 'ruleToc',
        id: 'chapterList',
        type: 'String',
        hint: '选择目录列表的章节节点 (规则结果为List<Element>)',
      },
      {
        title: '章节名称',
        namespace: 'ruleToc',
        id: 'chapterName',
        type: 'String',
        hint: '选择章节名称 (规则结果为String)',
      },
      {
        title: '章节地址',
        namespace: 'ruleToc',
        id: 'chapterUrl',
        type: 'String',
        hint: '选择章节链接 (规则结果为String类型的Url)',
      },
      {
        title: '标题处理',
        namespace: 'ruleToc',
        id: 'formatJs',
        type: 'String',
        hint: '遍历去重后的章节列表的回调，提供index、title变量',
      },
      {
        title: '卷名标识',
        namespace: 'ruleToc',
        id: 'isVolume',
        type: 'String',
        hint: '章节名称是否是卷名 (规则结果为Bool)',
      },
      {
        title: '章节信息',
        namespace: 'ruleToc',
        id: 'updateTime',
        type: 'String',
        hint: '选择章节信息（如更新时间） (规则结果为String)',
      },
      {
        title: '收费标识',
        namespace: 'ruleToc',
        id: 'isVip',
        type: 'String',
        hint: '章节是否为VIP章节 (规则结果为Bool)',
      },
      {
        title: '购买标识',
        namespace: 'ruleToc',
        id: 'isPay',
        type: 'String',
        hint: '章节是否为已购买 (规则结果为Bool)',
      },
      {
        title: '翻页规则',
        namespace: 'ruleToc',
        id: 'nextTocUrl',
        type: 'String',
        hint: '选择目录下一页链接 (规则结果为List<String>或String)',
      },
    ],
  },
  content: {
    name: '正文',
    children: [
      {
        title: '正文规则',
        namespace: 'ruleContent',
        id: 'content',
        type: 'String',
        hint: '选择正文内容 (规则结果为String)',
      },
      {
        title: '标题规则',
        namespace: 'ruleContent',
        id: 'title',
        type: 'String',
        hint: '获取结果将会覆盖章节标题 (规则结果为String)',
      },
      {
        title: '翻页规则',
        namespace: 'ruleContent',
        id: 'nextContentUrl',
        type: 'String',
        hint: '选择下一分页(不是下一章)链接',
      },
      {
        title: '脚本注入',
        namespace: 'ruleContent',
        id: 'webJs',
        type: 'String',
        hint: '注入javascript，用于模拟鼠标点击等',
      },
      {
        title: '资源正则',
        namespace: 'ruleContent',
        id: 'sourceRegex',
        type: 'String',
        hint: '匹配资源的url特征，用于嗅探',
      },
      {
        title: '替换规则',
        namespace: 'ruleContent',
        id: 'replaceRegex',
        type: 'String',
        hint: '多页内容合并后替换，用于正文净化',
      },
      {
        title: '图片样式',
        namespace: 'ruleContent',
        id: 'imageStyle',
        type: 'String',
        hint: 'FULL:铺满 不填:默认样式',
      },
      {
        title: '图片解密',
        namespace: 'ruleContent',
        id: 'imageDecode',
        type: 'String',
        hint: '填写JavaScript 返回解密图片的bytes',
      },
      {
        title: '购买操作',
        namespace: 'ruleContent',
        id: 'payAction',
        type: 'String',
        hint: '填写JavaScript 返回购买链接或者调用购买接口',
      },
    ],
  },
  other: {
    name: '其他',
    children: [
      {
        title: '启用搜索',
        id: 'enabled',
        type: 'Boolean',
        hint: '是否启用此书源的搜索功能',
      },
      {
        title: '启用发现',
        id: 'enabledExplore',
        type: 'Boolean',
        hint: '是否启用此书源的发现功能',
      },
      {
        title: 'CookieJar',
        id: 'enabledCookieJar',
        type: 'Boolean',
        hint: '是否自动管理Cookie',
      },
      {
        title: '搜索权重',
        id: 'weight',
        type: 'Number',
        hint: '用于智能排序的权重值',
      },
      {
        title: '排序编号',
        id: 'customOrder',
        type: 'Number',
        hint: '手动排序的序号，数值越小越靠前',
      },
    ],
  },
};

export default bookSourceEditConfig;
