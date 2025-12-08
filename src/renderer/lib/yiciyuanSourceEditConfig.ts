/**
 * 异次元图源编辑配置
 * 参考: https://www.yckceo.com/yiciyuan/tuyuan/
 */

import type { FieldConfig, TabConfig, SourceEditConfig } from './bookSourceEditConfig';

const yiciyuanSourceEditConfig: SourceEditConfig = {
  base: {
    name: '基本',
    children: [
      {
        title: '源类型',
        id: 'bookSourceType',
        type: 'String',
        hint: '源类型，如：漫画、小说',
      },
      {
        title: '源地址',
        id: 'bookSourceUrl',
        type: 'String',
        hint: '源网站地址',
        required: true,
      },
      {
        title: '源名称',
        id: 'bookSourceName',
        type: 'String',
        hint: '源显示名称',
        required: true,
      },
      {
        title: '源分组',
        id: 'bookSourceGroup',
        type: 'String',
        hint: '源分组信息',
      },
      {
        title: '源备注',
        id: 'sourceRemark',
        type: 'String',
        hint: '源备注说明',
      },
      {
        title: '是否启用',
        id: 'enable',
        type: 'Boolean',
        hint: '是否启用此源',
      },
      {
        title: 'User-Agent',
        id: 'httpUserAgent',
        type: 'String',
        hint: '自定义请求头User-Agent',
      },
      {
        title: '延迟时间',
        id: 'bookDelayTime',
        type: 'String',
        hint: '请求延迟时间',
      },
      {
        title: '单线程',
        id: 'bookSingleThread',
        type: 'String',
        hint: '是否单线程请求（是/否）',
      },
      {
        title: '序号',
        id: 'serialNumber',
        type: 'Number',
        hint: '排序序号',
      },
      {
        title: '权重',
        id: 'weight',
        type: 'Number',
        hint: '源权重',
      },
      {
        title: '登录地址',
        id: 'loginUrl',
        type: 'String',
        hint: '登录页面地址',
      },
      {
        title: '登录结果',
        id: 'loginUrlResult',
        type: 'String',
        hint: '登录结果处理',
      },
    ],
  },
  search: {
    name: '搜索',
    children: [
      {
        title: '搜索地址',
        id: 'ruleSearchUrl',
        type: 'String',
        hint: '搜索URL，使用searchKey代替关键字，searchPage代替页码',
      },
      {
        title: '搜索下一页',
        id: 'ruleSearchUrlNext',
        type: 'String',
        hint: '搜索结果下一页URL',
      },
      {
        title: '列表规则',
        id: 'ruleSearchList',
        type: 'String',
        hint: '搜索结果列表规则',
      },
      {
        title: '书名规则',
        id: 'ruleSearchName',
        type: 'String',
        hint: '书名提取规则',
      },
      {
        title: '作者规则',
        id: 'ruleSearchAuthor',
        type: 'String',
        hint: '作者提取规则',
      },
      {
        title: '分类规则',
        id: 'ruleSearchKind',
        type: 'String',
        hint: '分类提取规则',
      },
      {
        title: '最新章节',
        id: 'ruleSearchLastChapter',
        type: 'String',
        hint: '最新章节提取规则',
      },
      {
        title: '封面规则',
        id: 'ruleSearchCoverUrl',
        type: 'String',
        hint: '封面URL提取规则',
      },
      {
        title: '封面解密',
        id: 'ruleSearchCoverDecoder',
        type: 'String',
        hint: '封面解密规则',
      },
      {
        title: '详情地址',
        id: 'ruleSearchNoteUrl',
        type: 'String',
        hint: '详情页URL提取规则',
      },
    ],
  },
  find: {
    name: '发现',
    children: [
      {
        title: '发现地址',
        id: 'ruleFindUrl',
        type: 'String',
        hint: '发现分类URL，格式：分类名::URL，多个用换行分隔',
      },
    ],
  },
  detail: {
    name: '详情',
    children: [
      {
        title: 'URL匹配',
        id: 'ruleBookUrlPattern',
        type: 'String',
        hint: '详情页URL匹配规则',
      },
      {
        title: '书名规则',
        id: 'ruleBookName',
        type: 'String',
        hint: '书名提取规则',
      },
      {
        title: '作者规则',
        id: 'ruleBookAuthor',
        type: 'String',
        hint: '作者提取规则',
      },
      {
        title: '分类规则',
        id: 'ruleBookKind',
        type: 'String',
        hint: '分类提取规则',
      },
      {
        title: '最新章节',
        id: 'ruleBookLastChapter',
        type: 'String',
        hint: '最新章节提取规则',
      },
      {
        title: '简介规则',
        id: 'ruleIntroduce',
        type: 'String',
        hint: '简介提取规则',
      },
      {
        title: '封面规则',
        id: 'ruleCoverUrl',
        type: 'String',
        hint: '封面URL提取规则',
      },
      {
        title: '封面解密',
        id: 'ruleCoverDecoder',
        type: 'String',
        hint: '封面解密规则',
      },
    ],
  },
  toc: {
    name: '目录',
    children: [
      {
        title: '目录地址',
        id: 'ruleChapterUrl',
        type: 'String',
        hint: '目录页URL规则',
      },
      {
        title: '目录下一页',
        id: 'ruleChapterUrlNext',
        type: 'String',
        hint: '目录下一页URL规则',
      },
      {
        title: '列表规则',
        id: 'ruleChapterList',
        type: 'String',
        hint: '章节列表规则',
      },
      {
        title: '章节名称',
        id: 'ruleChapterName',
        type: 'String',
        hint: '章节名称提取规则',
      },
      {
        title: '内容地址',
        id: 'ruleContentUrl',
        type: 'String',
        hint: '章节内容URL提取规则',
      },
      {
        title: '章节ID',
        id: 'ruleChapterId',
        type: 'String',
        hint: '章节ID提取规则',
      },
      {
        title: '父章节ID',
        id: 'ruleChapterParentId',
        type: 'String',
        hint: '父章节ID规则（用于分卷）',
      },
      {
        title: '父章节名',
        id: 'ruleChapterParentName',
        type: 'String',
        hint: '父章节名称规则（用于分卷）',
      },
    ],
  },
  content: {
    name: '正文',
    children: [
      {
        title: '正文规则',
        id: 'ruleBookContent',
        type: 'String',
        hint: '正文内容提取规则',
      },
      {
        title: '正文解密',
        id: 'ruleBookContentDecoder',
        type: 'String',
        hint: '正文解密规则',
      },
      {
        title: '下一页',
        id: 'ruleContentUrlNext',
        type: 'String',
        hint: '正文下一页URL规则',
      },
    ],
  },
};

export default yiciyuanSourceEditConfig;

// 获取异次元图源所有字段ID列表
export function getYiciyuanFieldIds(): string[] {
  const ids: string[] = [];
  for (const tab of Object.values(yiciyuanSourceEditConfig)) {
    for (const field of tab.children) {
      ids.push(field.id);
    }
  }
  return ids;
}

// 创建默认的异次元图源
export function createDefaultYiciyuanSource(): Record<string, any> {
  return {
    bookSourceUrl: `temp://yiciyuan-${Date.now()}`,
    bookSourceName: '新建异次元图源',
    bookSourceGroup: '',
    bookSourceType: '漫画',
    sourceRemark: '',
    enable: true,
    serialNumber: 0,
    weight: 0,
    lastUpdateTime: Date.now(),
    httpUserAgent: '',
    bookDelayTime: '',
    bookSingleThread: '否',
    loginUrl: '',
    loginUrlResult: '',
    ruleSearchUrl: '',
    ruleSearchUrlNext: '',
    ruleSearchList: '',
    ruleSearchName: '',
    ruleSearchAuthor: '',
    ruleSearchKind: '',
    ruleSearchLastChapter: '',
    ruleSearchCoverUrl: '',
    ruleSearchCoverDecoder: '',
    ruleSearchNoteUrl: '',
    ruleFindUrl: '',
    ruleBookUrlPattern: '',
    ruleBookName: '',
    ruleBookAuthor: '',
    ruleBookKind: '',
    ruleBookLastChapter: '',
    ruleIntroduce: '',
    ruleCoverUrl: '',
    ruleCoverDecoder: '',
    ruleChapterUrl: '',
    ruleChapterUrlNext: '',
    ruleChapterList: '',
    ruleChapterName: '',
    ruleContentUrl: '',
    ruleChapterId: '',
    ruleChapterParentId: '',
    ruleChapterParentName: '',
    ruleBookContent: '',
    ruleBookContentDecoder: '',
    ruleContentUrlNext: '',
  };
}
