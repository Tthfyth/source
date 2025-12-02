// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

// --------- 书源调试 API ---------
const debugApiHandler = {
  /**
   * 搜索测试
   */
  search: (source: any, keyword: string) => {
    return ipcRenderer.invoke('debug:search', source, keyword);
  },

  /**
   * 发现测试
   */
  explore: (source: any, exploreUrl: string) => {
    return ipcRenderer.invoke('debug:explore', source, exploreUrl);
  },

  /**
   * 书籍详情测试
   */
  bookInfo: (source: any, bookUrl: string) => {
    return ipcRenderer.invoke('debug:bookInfo', source, bookUrl);
  },

  /**
   * 目录测试
   */
  toc: (source: any, tocUrl: string) => {
    return ipcRenderer.invoke('debug:toc', source, tocUrl);
  },

  /**
   * 正文测试
   */
  content: (source: any, contentUrl: string) => {
    return ipcRenderer.invoke('debug:content', source, contentUrl);
  },
};

contextBridge.exposeInMainWorld('debugApi', debugApiHandler);

// --------- 文件操作 API ---------
const fileApiHandler = {
  /**
   * 保存书源到文件
   */
  saveSourceToFile: (filePath: string, content: string) => {
    return ipcRenderer.invoke('file:saveSource', filePath, content);
  },

  /**
   * 选择文件保存路径
   */
  selectSavePath: (defaultPath?: string) => {
    return ipcRenderer.invoke('file:selectSavePath', defaultPath);
  },

  /**
   * 选择并读取文件（返回内容和路径）
   */
  openFile: () => {
    return ipcRenderer.invoke('file:openFile');
  },
};

contextBridge.exposeInMainWorld('fileApi', fileApiHandler);

// --------- AI 服务 API ---------
const aiApiHandler = {
  /**
   * AI 聊天
   */
  chat: (messages: Array<{ role: string; content: string }>) => {
    return ipcRenderer.invoke('ai:chat', messages);
  },

  /**
   * AI 聊天（带知识库，用于书源规则生成）
   */
  chatWithKnowledge: (userMessage: string, pageContent?: any, chatHistory?: Array<{ role: string; content: string }>) => {
    return ipcRenderer.invoke('ai:chatWithKnowledge', userMessage, pageContent, chatHistory);
  },

  /**
   * 指定供应商和模型发送请求
   */
  chatWithProvider: (messages: Array<{ role: string; content: string }>, providerId: string, modelId?: string) => {
    return ipcRenderer.invoke('ai:chatWithProvider', messages, providerId, modelId);
  },

  /**
   * 获取 AI 供应商列表（旧接口）
   */
  getProviders: () => {
    return ipcRenderer.invoke('ai:getProviders');
  },

  /**
   * 获取 AI 供应商列表（新接口，包含完整配置）
   */
  getProvidersV2: () => {
    return ipcRenderer.invoke('ai:getProvidersV2');
  },

  /**
   * 更新 AI 供应商配置
   */
  updateProvider: (id: string, config: any) => {
    return ipcRenderer.invoke('ai:updateProvider', id, config);
  },

  /**
   * 设置当前活动的供应商和模型
   */
  setActiveProvider: (providerId: string, modelId?: string) => {
    return ipcRenderer.invoke('ai:setActiveProvider', providerId, modelId);
  },

  /**
   * 获取当前活动的供应商和模型
   */
  getActiveProvider: () => {
    return ipcRenderer.invoke('ai:getActiveProvider');
  },

  /**
   * 获取使用统计
   */
  getUsageStats: () => {
    return ipcRenderer.invoke('ai:getUsageStats');
  },

  /**
   * 分步教学式规则生成（适用于复杂网站）
   */
  generateRuleStepByStep: (pageContent: {
    url: string;
    title: string;
    html?: string;
    sections?: Array<{ name: string; selector: string; html: string }>;
    pageType?: 'search' | 'detail' | 'toc' | 'content' | 'unknown';
  }) => {
    return ipcRenderer.invoke('ai:generateRuleStepByStep', pageContent);
  },

  /**
   * 发送用户修正（用于 AI 学习）
   */
  sendUserCorrection: (data: {
    original: any;
    corrected: any;
    url: string;
    ruleType: string;
  }) => {
    ipcRenderer.send('user-corrected-rule', data);
  },

  /**
   * 使用 Puppeteer 提取网页内容
   */
  extractPage: (url: string) => {
    return ipcRenderer.invoke('puppeteer:extract', url);
  },
};

contextBridge.exposeInMainWorld('aiApi', aiApiHandler);

export type ElectronHandler = typeof electronHandler;
export type DebugApiHandler = typeof debugApiHandler;
export type AIApiHandler = typeof aiApiHandler;
