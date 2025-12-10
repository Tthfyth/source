import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BookSource,
  DebugLog,
  TestMode,
  TestResult,
  RequestHeader,
  LogCategory,
  ThemeMode,
  YiciyuanSource,
  AnySource,
} from '../types';
import { BookSourceType, SourceFormat, detectSourceFormat, getSourceFormatLabel } from '../types';
import { createDefaultYiciyuanSource } from '../lib/yiciyuanSourceEditConfig';

// 本地存储 key
const STORAGE_KEY = 'book-source-store';

// 生成唯一ID（用于日志等）
const generateId = () => Math.random().toString(36).substring(2, 15);

// 生成临时书源URL
const generateTempUrl = () => `temp://new-source-${Date.now()}`;

// 创建默认书源（符合Legado规范）
const createDefaultSource = (): BookSource => ({
  bookSourceUrl: generateTempUrl(),
  bookSourceName: '新建书源',
  bookSourceGroup: '',
  bookSourceType: BookSourceType.Text,
  bookSourceComment: '',
  enabled: true,
  enabledExplore: true,
  customOrder: 0,
  weight: 0,
  lastUpdateTime: Date.now(),
  respondTime: 180000,
  searchUrl: '',
  exploreUrl: '',
  ruleSearch: {
    bookList: '',
    name: '',
    author: '',
    intro: '',
    kind: '',
    lastChapter: '',
    updateTime: '',
    bookUrl: '',
    coverUrl: '',
    wordCount: '',
  },
  ruleExplore: {
    bookList: '',
    name: '',
    author: '',
    intro: '',
    kind: '',
    lastChapter: '',
    updateTime: '',
    bookUrl: '',
    coverUrl: '',
    wordCount: '',
  },
  ruleBookInfo: {
    init: '',
    name: '',
    author: '',
    intro: '',
    kind: '',
    lastChapter: '',
    updateTime: '',
    coverUrl: '',
    tocUrl: '',
    wordCount: '',
  },
  ruleToc: {
    chapterList: '',
    chapterName: '',
    chapterUrl: '',
    isVolume: '',
    updateTime: '',
    nextTocUrl: '',
  },
  ruleContent: {
    content: '',
    nextContentUrl: '',
    replaceRegex: '',
  },
});

// 声明全局 fileApi
declare global {
  interface Window {
    fileApi?: {
      saveSourceToFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
      selectSavePath: (defaultPath?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      openFile: () => Promise<{ success: boolean; canceled?: boolean; filePath?: string; content?: string; error?: string }>;
    };
  }
}

interface BookSourceState {
  // 书源列表（支持 Legado 和 异次元 两种格式）
  sources: AnySource[];
  // 当前选中的书源ID
  activeSourceId: string | null;
  // 当前编辑的代码
  sourceCode: string;
  // 是否有未保存的修改
  isModified: boolean;
  // 导入的文件路径（用于同步保存）
  loadedFilePath: string | null;
  // 调试日志
  debugLogs: DebugLog[];
  // 日志过滤器
  logFilters: LogCategory[];
  // 测试模式
  testMode: TestMode;
  // 测试URL/关键词
  testInput: string;
  // 测试历史
  testHistory: string[];
  // 是否正在加载
  isLoading: boolean;
  // 测试结果
  testResult: TestResult | null;
  // 章节列表（用于正文测试时切换章节）
  chapterList: Array<{ name: string; url: string }>;
  // 当前章节索引
  currentChapterIndex: number;
  // 请求头配置
  requestHeaders: RequestHeader[];
  // 编辑器视图模式
  editorViewMode: 'text' | 'visual' | 'table';
  // 主题模式
  themeMode: ThemeMode;
  // AI 分析开关（测试结果附加到 AI 对话）
  aiAnalysisEnabled: boolean;

  // Actions
  selectSource: (url: string) => void;
  createSource: (format?: SourceFormat) => AnySource;
  updateSourceCode: (code: string) => void;
  saveCurrentSource: () => boolean;
  saveToFile: () => Promise<boolean>;
  deleteSource: (url: string) => void;
  importSources: (jsonStr: string, filePath?: string) => number;
  exportSources: (urls?: string[]) => string;
  clearAllSources: () => void;
  addLog: (log: Omit<DebugLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  runTest: () => Promise<void>;
  runTestWithParams: (mode: TestMode, input: string) => Promise<void>;
  toggleSourceEnabled: (url: string) => void;
  setTestMode: (mode: TestMode) => void;
  setTestInput: (input: string) => void;
  setLogFilters: (filters: LogCategory[]) => void;
  setEditorViewMode: (mode: 'text' | 'visual' | 'table') => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAiAnalysisEnabled: (enabled: boolean) => void;
  addRequestHeader: () => void;
  removeRequestHeader: (index: number) => void;
  updateRequestHeader: (
    index: number,
    field: 'key' | 'value',
    value: string
  ) => void;
  // 获取当前源的格式
  getCurrentSourceFormat: () => SourceFormat;
  // 获取指定源的格式
  getSourceFormat: (url: string) => SourceFormat;
}

// 格式化解析数据用于显示
function formatParsedData(
  items: unknown
): Array<{ key: string; value: string; matched: boolean }> {
  if (!items) return [];

  if (typeof items === 'string') {
    return [{ key: 'content', value: items.substring(0, 500), matched: true }];
  }

  if (Array.isArray(items)) {
    const result: Array<{ key: string; value: string; matched: boolean }> = [];
    items.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        Object.entries(item).forEach(([key, value]) => {
          if (value) {
            result.push({
              key: `[${index + 1}] ${key}`,
              value: String(value).substring(0, 200),
              matched: true,
            });
          }
        });
      } else {
        result.push({
          key: `[${index + 1}]`,
          value: String(item),
          matched: true,
        });
      }
    });
    return result;
  }

  if (typeof items === 'object' && items !== null) {
    return Object.entries(items).map(([key, value]) => ({
      key,
      value: String(value).substring(0, 200),
      matched: !!value,
    }));
  }

  return [];
}

export const useBookSourceStore = create<BookSourceState>()(
  persist(
    (set, get) => ({
  sources: [],
  activeSourceId: null,
  sourceCode: '',
  isModified: false,
  loadedFilePath: null,
  debugLogs: [],
  logFilters: ['request', 'parse', 'field', 'error'],
  testMode: 'search',
  testInput: '',
  testHistory: [],
  isLoading: false,
  testResult: null,
  chapterList: [],
  currentChapterIndex: -1,
  requestHeaders: [
    {
      key: 'User-Agent',
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      enabled: true,
    },
  ],
  editorViewMode: 'text',
  themeMode: 'light',
  aiAnalysisEnabled: true,

  selectSource: (url: string) => {
    const source = get().sources.find((s) => s.bookSourceUrl === url);
    set({
      activeSourceId: url,
      sourceCode: source ? JSON.stringify(source, null, 2) : '',
      isModified: false,
      // 切换书源时重置测试器状态
      testMode: 'search',
      testInput: '',
      testResult: null,
      debugLogs: [],
      chapterList: [],
      currentChapterIndex: -1,
    });
  },

  createSource: (format: SourceFormat = SourceFormat.Legado) => {
    const newSource = format === SourceFormat.Yiciyuan 
      ? createDefaultYiciyuanSource() as YiciyuanSource
      : createDefaultSource();
    set((state) => ({
      sources: [...state.sources, newSource],
      activeSourceId: newSource.bookSourceUrl,
      sourceCode: JSON.stringify(newSource, null, 2),
      isModified: false,
    }));
    return newSource;
  },

  updateSourceCode: (code: string) => {
    set({ sourceCode: code, isModified: true });
  },

  saveCurrentSource: () => {
    const state = get();
    if (!state.activeSourceId) return false;

    try {
      const parsed = JSON.parse(state.sourceCode) as BookSource;
      const sources = [...state.sources];

      if (state.activeSourceId.startsWith('temp://')) {
        const index = sources.findIndex(
          (s) => s.bookSourceUrl === state.activeSourceId
        );
        if (index !== -1) {
          sources[index] = parsed;
        }
        set({
          sources,
          activeSourceId: parsed.bookSourceUrl,
          isModified: false,
        });
      } else {
        parsed.lastUpdateTime = Date.now();
        const index = sources.findIndex(
          (s) => s.bookSourceUrl === state.activeSourceId
        );
        if (index !== -1) {
          sources[index] = parsed;
        }
        // 如果 bookSourceUrl 发生变化，需要更新 activeSourceId
        const newActiveId = parsed.bookSourceUrl !== state.activeSourceId 
          ? parsed.bookSourceUrl 
          : state.activeSourceId;
        set({ sources, activeSourceId: newActiveId, isModified: false });
      }
      return true;
    } catch {
      return false;
    }
  },

  deleteSource: (url: string) => {
    const state = get();
    const sources = state.sources.filter((s) => s.bookSourceUrl !== url);
    let newActiveId = state.activeSourceId;
    let newSourceCode = state.sourceCode;

    if (state.activeSourceId === url) {
      newActiveId = sources[0]?.bookSourceUrl || null;
      const newSource = sources.find((s) => s.bookSourceUrl === newActiveId);
      newSourceCode = newSource ? JSON.stringify(newSource, null, 2) : '';
    }

    set({
      sources,
      activeSourceId: newActiveId,
      sourceCode: newSourceCode,
    });
  },

  // 保存到文件（同步保存到导入的外部文件）
  saveToFile: async () => {
    const state = get();
    if (!state.loadedFilePath) {
      // 如果没有导入的文件路径，让用户选择保存位置
      if (!window.fileApi) return false;
      const result = await window.fileApi.selectSavePath();
      if (!result.success || !result.filePath) return false;
      set({ loadedFilePath: result.filePath });
    }

    const filePath = get().loadedFilePath;
    if (!filePath || !window.fileApi) return false;

    // 保存所有书源到文件
    const content = JSON.stringify(state.sources, null, 2);
    const result = await window.fileApi.saveSourceToFile(filePath, content);
    return result.success;
  },

  importSources: (jsonStr: string, filePath?: string) => {
    try {
      // 尝试解析 JSON，处理可能的双重转义
      let data;
      try {
        data = JSON.parse(jsonStr);
      } catch {
        // 如果解析失败，尝试去除多余的转义
        const cleaned = jsonStr.replace(/\\\\/g, '\\');
        data = JSON.parse(cleaned);
      }

      const newSources: BookSource[] = Array.isArray(data) ? data : [data];
      const state = get();
      const sources = [...state.sources];

      newSources.forEach((source) => {
        const existIndex = sources.findIndex(
          (s) => s.bookSourceUrl === source.bookSourceUrl
        );
        if (existIndex !== -1) {
          sources[existIndex] = source;
        } else {
          sources.push(source);
        }
      });

      // 总是选中第一个导入的书源
      const firstSource = newSources[0];
      set({
        sources,
        activeSourceId: firstSource.bookSourceUrl,
        sourceCode: JSON.stringify(firstSource, null, 2),
        isModified: false,
        // 记录导入的文件路径
        loadedFilePath: filePath || state.loadedFilePath,
      });

      return newSources.length;
    } catch (e) {
      console.error('导入书源失败', e);
      return 0;
    }
  },

  exportSources: (urls?: string[]) => {
    const state = get();
    const toExport = urls
      ? state.sources.filter((s) => urls.includes(s.bookSourceUrl))
      : state.sources;
    return JSON.stringify(toExport, null, 2);
  },

  clearAllSources: () => {
    set({
      sources: [],
      activeSourceId: null,
      sourceCode: '',
      isModified: false,
    });
  },

  addLog: (log: Omit<DebugLog, 'id' | 'timestamp'>) => {
    set((state) => {
      let logs = [
        ...state.debugLogs,
        { ...log, id: generateId(), timestamp: new Date() },
      ];
      if (logs.length > 1000) {
        logs = logs.slice(-500);
      }
      return { debugLogs: logs };
    });
  },

  clearLogs: () => {
    set({ debugLogs: [] });
  },

  runTest: async () => {
    const state = get();
    if (!state.testInput.trim()) return;

    const activeSource = state.sources.find(
      (s) => s.bookSourceUrl === state.activeSourceId
    );
    if (!activeSource) {
      get().addLog({
        level: 'error',
        category: 'error',
        message: '请先选择一个书源',
      });
      return;
    }

    set({ isLoading: true, testResult: null });

    // 添加到历史
    const history = state.testHistory.includes(state.testInput)
      ? state.testHistory
      : [state.testInput, ...state.testHistory].slice(0, 20);
    set({ testHistory: history });

    const modeNames: Record<string, string> = {
      search: '搜索',
      detail: '详情',
      toc: '目录',
      content: '正文',
    };

    get().addLog({
      level: 'info',
      category: 'request',
      message: `开始${modeNames[state.testMode]}测试: ${state.testInput}`,
    });

    try {
      if (!window.debugApi) {
        throw new Error('调试API不可用，请在Electron环境中运行');
      }

      let currentSource: AnySource;
      try {
        currentSource = JSON.parse(state.sourceCode);
      } catch {
        currentSource = activeSource;
      }

      type DebugResult = {
        success: boolean;
        logs?: Array<{
          level: 'info' | 'success' | 'warning' | 'error';
          category: LogCategory;
          message: string;
          details?: string;
        }>;
        requestResult?: { statusCode?: number; responseTime?: number; body?: string };
        parsedItems?: unknown;
        imageUrls?: string[];  // 图片书源的图片URL列表
        error?: string;
      };

      let result: DebugResult;

      switch (state.testMode) {
        case 'search':
          result = (await window.debugApi.search(currentSource, state.testInput)) as DebugResult;
          break;
        case 'explore':
          result = (await window.debugApi.explore(currentSource, state.testInput)) as DebugResult;
          break;
        case 'detail':
          result = (await window.debugApi.bookInfo(currentSource, state.testInput)) as DebugResult;
          break;
        case 'toc':
          result = (await window.debugApi.toc(currentSource, state.testInput)) as DebugResult;
          break;
        case 'content':
          result = (await window.debugApi.content(currentSource, state.testInput)) as DebugResult;
          break;
        default:
          throw new Error(`未知的测试模式: ${state.testMode}`);
      }

      if (result.logs && Array.isArray(result.logs)) {
        for (const log of result.logs) {
          get().addLog({
            level: log.level,
            category: log.category,
            message: log.message,
            details: log.details,
          });
        }
      }

      if (result.success) {
        const testResultData: TestResult = {
          success: true,
          statusCode: result.requestResult?.statusCode,
          responseTime: result.requestResult?.responseTime,
          rawResponse: result.requestResult?.body,
          parsedData: formatParsedData(result.parsedItems),
          rawParsedItems: result.parsedItems as unknown[],
        };

        // 图片书源添加图片URL列表
        if (result.imageUrls && result.imageUrls.length > 0) {
          testResultData.imageUrls = result.imageUrls;
        }

        // 目录测试成功后保存章节列表
        if (state.testMode === 'toc' && Array.isArray(result.parsedItems)) {
          const chapters = result.parsedItems
            .map((item: any) => ({
              name: item.name || item.chapterName || item.title || '',
              url: item.url || item.chapterUrl || item.href || '',
            }))
            .filter((ch: { name: string; url: string }) => ch.name && ch.url);
          set({ chapterList: chapters, currentChapterIndex: -1 });
        }

        // 正文测试时更新当前章节索引
        if (state.testMode === 'content') {
          const chapterList = get().chapterList;
          const currentIndex = chapterList.findIndex(ch => ch.url === state.testInput);
          if (currentIndex !== -1) {
            set({ currentChapterIndex: currentIndex });
          }
        }

        set({ testResult: testResultData });

        const itemCount = result.imageUrls?.length || 
          (Array.isArray(result.parsedItems) ? result.parsedItems.length : 1);
        const itemType = result.imageUrls?.length ? '张图片' : '条数据';

        get().addLog({
          level: 'success',
          category: 'parse',
          message: `测试完成，解析到 ${itemCount} ${itemType}`,
        });
      } else {
        set({ testResult: { success: false, error: result.error } });
        get().addLog({
          level: 'error',
          category: 'error',
          message: `测试失败: ${result.error}`,
        });
      }
    } catch (error) {
      set({ testResult: { success: false, error: String(error) } });
      get().addLog({
        level: 'error',
        category: 'error',
        message: `测试异常: ${error}`,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  // 使用指定参数运行测试（用于点击跳转）
  runTestWithParams: async (mode: TestMode, input: string) => {
    // 先更新状态
    set({ testMode: mode, testInput: input });
    // 然后执行测试
    await get().runTest();
  },

  toggleSourceEnabled: (url: string) => {
    set((state) => ({
      sources: state.sources.map((s) => {
        if (s.bookSourceUrl !== url) return s;
        // 根据源格式切换不同的启用字段
        const format = detectSourceFormat(s);
        if (format === SourceFormat.Yiciyuan) {
          return { ...s, enable: !(s as YiciyuanSource).enable };
        }
        return { ...s, enabled: !(s as BookSource).enabled };
      }),
    }));
  },

  setTestMode: (mode: TestMode) => {
    set({ testMode: mode });
  },

  setTestInput: (input: string) => {
    set({ testInput: input });
  },

  setLogFilters: (filters: LogCategory[]) => {
    set({ logFilters: filters });
  },

  setEditorViewMode: (mode: 'text' | 'visual' | 'table') => {
    set({ editorViewMode: mode });
  },

  setThemeMode: (mode: ThemeMode) => {
    set({ themeMode: mode });
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (mode === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },

  setAiAnalysisEnabled: (enabled: boolean) => {
    set({ aiAnalysisEnabled: enabled });
  },

  addRequestHeader: () => {
    set((state) => ({
      requestHeaders: [
        ...state.requestHeaders,
        { key: '', value: '', enabled: true },
      ],
    }));
  },

  removeRequestHeader: (index: number) => {
    set((state) => ({
      requestHeaders: state.requestHeaders.filter((_, i) => i !== index),
    }));
  },

  updateRequestHeader: (
    index: number,
    field: 'key' | 'value',
    value: string
  ) => {
    set((state) => ({
      requestHeaders: state.requestHeaders.map((h, i) =>
        i === index ? { ...h, [field]: value } : h
      ),
    }));
  },

  // 获取当前源的格式
  getCurrentSourceFormat: () => {
    const state = get();
    if (!state.activeSourceId) return SourceFormat.Legado;
    const source = state.sources.find(s => s.bookSourceUrl === state.activeSourceId);
    return source ? detectSourceFormat(source) : SourceFormat.Legado;
  },

  // 获取指定源的格式
  getSourceFormat: (url: string) => {
    const source = get().sources.find(s => s.bookSourceUrl === url);
    return source ? detectSourceFormat(source) : SourceFormat.Legado;
  },
}),
    {
      name: STORAGE_KEY,
      // 只持久化需要保存的字段
      partialize: (state) => ({
        sources: state.sources,
        testHistory: state.testHistory,
        requestHeaders: state.requestHeaders,
        editorViewMode: state.editorViewMode,
        themeMode: state.themeMode,
        aiAnalysisEnabled: state.aiAnalysisEnabled,
      }),
    }
  )
);

// 声明 window.debugApi 类型
declare global {
  interface Window {
    debugApi?: {
      search: (source: AnySource, keyword: string) => Promise<unknown>;
      explore: (source: AnySource, exploreUrl: string) => Promise<unknown>;
      parseExploreCategories: (source: AnySource) => Promise<{
        success: boolean;
        categories?: Array<{ title: string; url: string; group: string; style?: any }>;
        error?: string;
      }>;
      bookInfo: (source: AnySource, bookUrl: string) => Promise<unknown>;
      toc: (source: AnySource, tocUrl: string) => Promise<unknown>;
      content: (source: AnySource, contentUrl: string) => Promise<unknown>;
      // 登录相关
      parseLoginUi: (loginUi: string) => Promise<{
        success: boolean;
        items?: Array<{ name: string; type: string; action?: string }>;
        error?: string;
      }>;
      checkLoginStatus: (source: AnySource) => Promise<{
        success: boolean;
        hasLoginUrl?: boolean;
        hasLoginUi?: boolean;
        isLoggedIn?: boolean;
        loginInfo?: Record<string, string>;
        error?: string;
      }>;
      executeLogin: (source: AnySource, loginData: Record<string, string>) => Promise<{
        success: boolean;
        message?: string;
        loginHeader?: Record<string, string>;
      }>;
      executeButtonAction: (source: AnySource, action: string, loginData: Record<string, string>) => Promise<{
        success: boolean;
        message?: string;
        result?: any;
      }>;
      getLoginInfo: (sourceKey: string) => Promise<{
        success: boolean;
        info?: Record<string, string>;
        error?: string;
      }>;
      removeLoginInfo: (sourceKey: string) => Promise<{ success: boolean; error?: string }>;
      getLoginHeader: (sourceKey: string) => Promise<{
        success: boolean;
        header?: Record<string, string>;
        error?: string;
      }>;
      removeLoginHeader: (sourceKey: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}
