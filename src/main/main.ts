/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { SourceDebugger, BookSource } from './debug';
import { getAIService, ChatMessage } from './ai/ai-service';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

// ============================================
// IPC 通信接口 - 书源调试
// ============================================

/**
 * 搜索测试
 */
ipcMain.handle(
  'debug:search',
  async (_event, source: BookSource, keyword: string) => {
    try {
      const debugger_ = new SourceDebugger(source);
      const result = await debugger_.debugSearch(keyword);
      return result;
    } catch (error: any) {
      return {
        success: false,
        logs: [],
        error: error.message || String(error),
      };
    }
  }
);

/**
 * 书籍详情测试
 */
ipcMain.handle(
  'debug:bookInfo',
  async (_event, source: BookSource, bookUrl: string) => {
    try {
      const debugger_ = new SourceDebugger(source);
      const result = await debugger_.debugBookInfo(bookUrl);
      return result;
    } catch (error: any) {
      return {
        success: false,
        logs: [],
        error: error.message || String(error),
      };
    }
  }
);

/**
 * 目录测试
 */
ipcMain.handle(
  'debug:toc',
  async (_event, source: BookSource, tocUrl: string) => {
    try {
      const debugger_ = new SourceDebugger(source);
      const result = await debugger_.debugToc(tocUrl);
      return result;
    } catch (error: any) {
      return {
        success: false,
        logs: [],
        error: error.message || String(error),
      };
    }
  }
);

/**
 * 正文测试
 */
ipcMain.handle(
  'debug:content',
  async (_event, source: BookSource, contentUrl: string) => {
    try {
      const debugger_ = new SourceDebugger(source);
      const result = await debugger_.debugContent(contentUrl);
      return result;
    } catch (error: any) {
      return {
        success: false,
        logs: [],
        error: error.message || String(error),
      };
    }
  }
);

// ============================================
// IPC 通信接口 - AI 服务
// ============================================

/**
 * AI 聊天
 */
ipcMain.handle('ai:chat', async (_event, messages: ChatMessage[]) => {
  try {
    const aiService = getAIService();
    return await aiService.chat(messages);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
});

/**
 * AI 聊天（带知识库，用于书源规则生成）
 */
ipcMain.handle('ai:chatWithKnowledge', async (_event, userMessage: string, pageContent?: any, chatHistory?: any[]) => {
  try {
    const aiService = getAIService();
    return await aiService.chatWithKnowledge(userMessage, pageContent, chatHistory);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
});

/**
 * 获取 AI 供应商列表
 */
ipcMain.handle('ai:getProviders', async () => {
  try {
    const aiService = getAIService();
    return { success: true, providers: aiService.getProviders() };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

/**
 * 更新 AI 供应商配置
 */
ipcMain.handle('ai:updateProvider', async (_event, id: string, config: any) => {
  try {
    const aiService = getAIService();
    aiService.updateProvider(id, config);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

/**
 * 获取 AI 使用统计
 */
ipcMain.handle('ai:getUsageStats', async () => {
  try {
    const aiService = getAIService();
    return { success: true, stats: aiService.getUsageStats() };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

/**
 * 分步教学式规则生成（适用于复杂网站）
 */
ipcMain.handle('ai:generateRuleStepByStep', async (_event, pageContent: any) => {
  try {
    const aiService = getAIService();
    return await aiService.generateRuleStepByStep(pageContent);
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Puppeteer 网页抓取
 */
ipcMain.handle('puppeteer:extract', async (_event, url: string) => {
  try {
    const { getPuppeteerService } = require('./services/puppeteer-service');
    const service = getPuppeteerService();
    const content = await service.extractPageContent(url);
    const simplified = service.simplifyContent(content);
    return { success: true, content: simplified };
  } catch (error: any) {
    console.error('Puppeteer 抓取失败:', error);
    return { success: false, error: error.message };
  }
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default({ showDevTools: false });
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
