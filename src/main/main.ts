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
import fs from 'fs';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
// import MenuBuilder from './menu'; // 已禁用默认菜单
import { resolveHtmlPath } from './util';
import { 
  SourceDebugger, 
  BookSource, 
  YiciyuanDebugger, 
  isYiciyuanSource, 
  parseExploreUrl,
  parseLoginUi,
  checkLoginStatus,
  executeLogin,
  executeButtonAction,
  getLoginInfo,
  removeLoginInfo,
  getLoginHeader,
  removeLoginHeader,
} from './debug';
import { getAIService, ChatMessage } from './ai/ai-service';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    
    // 配置自动更新
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    
    // 开发模式下也检查更新（需要 dev-app-update.yml）
    if (!app.isPackaged) {
      autoUpdater.forceDevUpdateConfig = true;
    }

    // 检查更新事件
    autoUpdater.on('checking-for-update', () => {
      log.info('正在检查更新...');
      this.sendStatusToWindow('checking-for-update');
    });

    autoUpdater.on('update-available', (info) => {
      log.info('发现新版本:', info.version);
      this.sendStatusToWindow('update-available', info);
      // 显示更新对话框
      if (mainWindow) {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: '发现新版本',
          message: `发现新版本 ${info.version}，是否立即下载？`,
          buttons: ['立即下载', '稍后提醒'],
          defaultId: 0,
        }).then(({ response }) => {
          if (response === 0) {
            autoUpdater.downloadUpdate();
          }
        });
      }
    });

    autoUpdater.on('update-not-available', (info) => {
      log.info('当前已是最新版本');
      this.sendStatusToWindow('update-not-available', info);
    });

    autoUpdater.on('error', (err) => {
      log.error('更新错误:', err);
      // 简化错误信息，避免显示过长的技术细节
      let errorMessage = '网络连接失败，请稍后重试';
      if (err.message) {
        if (err.message.includes('404') || err.message.includes('latest.yml')) {
          errorMessage = '暂无更新信息，请前往 GitHub 查看';
        } else if (err.message.includes('net::') || err.message.includes('ENOTFOUND') || err.message.includes('ETIMEDOUT')) {
          errorMessage = '网络连接失败，请检查网络后重试';
        } else if (err.message.includes('certificate') || err.message.includes('SSL')) {
          errorMessage = '网络安全验证失败，请检查网络环境';
        }
      }
      this.sendStatusToWindow('error', errorMessage);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      log.info(`下载进度: ${progressObj.percent.toFixed(1)}%`);
      this.sendStatusToWindow('download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('更新下载完成:', info.version);
      this.sendStatusToWindow('update-downloaded', info);
      // 显示安装对话框
      if (mainWindow) {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: '更新已就绪',
          message: `新版本 ${info.version} 已下载完成，是否立即安装并重启？`,
          buttons: ['立即安装', '稍后安装'],
          defaultId: 0,
        }).then(({ response }) => {
          if (response === 0) {
            autoUpdater.quitAndInstall();
          }
        });
      }
    });

    // 启动时检查更新
    autoUpdater.checkForUpdates();
  }

  sendStatusToWindow(status: string, data?: any) {
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { status, data });
    }
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
 * 自动识别源格式（Legado 或 异次元）
 */
ipcMain.handle(
  'debug:search',
  async (_event, source: any, keyword: string) => {
    try {
      if (isYiciyuanSource(source)) {
        const debugger_ = new YiciyuanDebugger(source);
        const result = await debugger_.debugSearch(keyword);
        return result;
      } else {
        const debugger_ = new SourceDebugger(source as BookSource);
        const result = await debugger_.debugSearch(keyword);
        return result;
      }
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
 * 发现测试
 * 自动识别源格式（Legado 或 异次元）
 */
ipcMain.handle(
  'debug:explore',
  async (_event, source: any, exploreUrl: string) => {
    try {
      if (isYiciyuanSource(source)) {
        const debugger_ = new YiciyuanDebugger(source);
        const result = await debugger_.debugExplore(exploreUrl);
        return result;
      } else {
        const debugger_ = new SourceDebugger(source as BookSource);
        const result = await debugger_.debugExplore(exploreUrl);
        return result;
      }
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
 * 解析发现分类列表
 * 支持 JS 动态规则
 */
ipcMain.handle(
  'debug:parseExploreCategories',
  async (_event, source: any) => {
    try {
      const categories = await parseExploreUrl(source as BookSource);
      return { success: true, categories };
    } catch (error: any) {
      return {
        success: false,
        categories: [],
        error: error.message || String(error),
      };
    }
  }
);

/**
 * 书籍详情测试
 * 自动识别源格式（Legado 或 异次元）
 */
ipcMain.handle(
  'debug:bookInfo',
  async (_event, source: any, bookUrl: string) => {
    try {
      if (isYiciyuanSource(source)) {
        const debugger_ = new YiciyuanDebugger(source);
        const result = await debugger_.debugBookInfo(bookUrl);
        return result;
      } else {
        const debugger_ = new SourceDebugger(source as BookSource);
        const result = await debugger_.debugBookInfo(bookUrl);
        return result;
      }
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
 * 自动识别源格式（Legado 或 异次元）
 */
ipcMain.handle(
  'debug:toc',
  async (_event, source: any, tocUrl: string) => {
    try {
      if (isYiciyuanSource(source)) {
        const debugger_ = new YiciyuanDebugger(source);
        const result = await debugger_.debugToc(tocUrl);
        return result;
      } else {
        const debugger_ = new SourceDebugger(source as BookSource);
        const result = await debugger_.debugToc(tocUrl);
        return result;
      }
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
 * 自动识别源格式（Legado 或 异次元）
 */
ipcMain.handle(
  'debug:content',
  async (_event, source: any, contentUrl: string) => {
    try {
      if (isYiciyuanSource(source)) {
        const debugger_ = new YiciyuanDebugger(source);
        const result = await debugger_.debugContent(contentUrl);
        return result;
      } else {
        const debugger_ = new SourceDebugger(source as BookSource);
        const result = await debugger_.debugContent(contentUrl);
        return result;
      }
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
// IPC 通信接口 - 登录功能
// ============================================

/**
 * 解析登录 UI 配置
 */
ipcMain.handle('debug:parseLoginUi', async (_event, loginUi: string) => {
  try {
    const items = parseLoginUi(loginUi);
    return { success: true, items };
  } catch (error: any) {
    return { success: false, items: [], error: error.message };
  }
});

/**
 * 检查登录状态
 */
ipcMain.handle('debug:checkLoginStatus', async (_event, source: any) => {
  try {
    const status = checkLoginStatus(source as BookSource);
    return { success: true, ...status };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

/**
 * 执行登录
 */
ipcMain.handle('debug:executeLogin', async (_event, source: any, loginData: Record<string, string>) => {
  try {
    const result = await executeLogin(source as BookSource, loginData);
    return result;
  } catch (error: any) {
    return { success: false, message: error.message };
  }
});

/**
 * 执行按钮动作
 */
ipcMain.handle('debug:executeButtonAction', async (_event, source: any, action: string, loginData: Record<string, string>) => {
  try {
    const result = await executeButtonAction(source as BookSource, action, loginData);
    return result;
  } catch (error: any) {
    return { success: false, message: error.message };
  }
});

/**
 * 获取登录信息
 */
ipcMain.handle('debug:getLoginInfo', async (_event, sourceKey: string) => {
  try {
    const info = getLoginInfo(sourceKey);
    return { success: true, info };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

/**
 * 删除登录信息
 */
ipcMain.handle('debug:removeLoginInfo', async (_event, sourceKey: string) => {
  try {
    removeLoginInfo(sourceKey);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

/**
 * 获取登录头部
 */
ipcMain.handle('debug:getLoginHeader', async (_event, sourceKey: string) => {
  try {
    const header = getLoginHeader(sourceKey);
    return { success: true, header };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

/**
 * 删除登录头部
 */
ipcMain.handle('debug:removeLoginHeader', async (_event, sourceKey: string) => {
  try {
    removeLoginHeader(sourceKey);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC 通信接口 - 文件操作
// ============================================

/**
 * 保存书源到文件
 */
ipcMain.handle('file:saveSource', async (_event, filePath: string, content: string) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
});

/**
 * 选择文件保存路径
 */
ipcMain.handle('file:selectSavePath', async (_event, defaultPath?: string) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '保存书源',
      defaultPath: defaultPath || 'booksource.json',
      filters: [
        { name: 'JSON 文件', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });
    return {
      success: !result.canceled,
      filePath: result.filePath,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
});

/**
 * 选择并读取文件
 */
ipcMain.handle('file:openFile', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '导入书源',
      filters: [
        { name: 'JSON 文件', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    
    return {
      success: true,
      filePath,
      content,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
});

// ============================================
// IPC 通信接口 - 应用更新
// ============================================

/**
 * 手动检查更新
 */
ipcMain.handle('app:checkForUpdates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      success: true,
      updateInfo: result?.updateInfo,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
});

/**
 * 下载更新
 */
ipcMain.handle('app:downloadUpdate', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
});

/**
 * 安装更新并重启
 */
ipcMain.handle('app:quitAndInstall', () => {
  autoUpdater.quitAndInstall();
});

/**
 * 获取应用版本
 */
ipcMain.handle('app:getVersion', () => {
  // 打包后使用 app.getVersion()，开发模式下从 package.json 读取
  if (app.isPackaged) {
    return app.getVersion();
  }
  // 开发模式下读取 release/app/package.json
  try {
    const path = require('path');
    const fs = require('fs');
    // 从项目根目录查找
    const possiblePaths = [
      path.join(process.cwd(), 'release/app/package.json'),
      path.join(__dirname, '../../../release/app/package.json'),
      path.join(__dirname, '../../../../release/app/package.json'),
    ];
    for (const pkgPath of possiblePaths) {
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.version) {
          return pkg.version;
        }
      }
    }
  } catch (e) {
    console.error('Failed to read version:', e);
  }
  return '0.0.0';
});

/**
 * 打开外部链接
 */
ipcMain.handle('app:openExternal', async (_event, url: string) => {
  const { shell } = require('electron');
  await shell.openExternal(url);
});

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
 * 指定供应商和模型发送请求
 */
ipcMain.handle('ai:chatWithProvider', async (_event, messages: ChatMessage[], providerId: string, modelId?: string) => {
  try {
    const aiService = getAIService();
    return await aiService.chatWithProvider(messages, providerId, modelId);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
});

/**
 * 获取 AI 供应商列表（旧接口）
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
 * 获取 AI 供应商列表（新接口，包含完整配置）
 */
ipcMain.handle('ai:getProvidersV2', async () => {
  try {
    const aiService = getAIService();
    return { success: true, providers: aiService.getProvidersV2() };
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
 * 设置当前活动的供应商和模型
 */
ipcMain.handle('ai:setActiveProvider', async (_event, providerId: string, modelId?: string) => {
  try {
    const aiService = getAIService();
    aiService.setActiveProvider(providerId, modelId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

/**
 * 获取当前活动的供应商和模型
 */
ipcMain.handle('ai:getActiveProvider', async () => {
  try {
    const aiService = getAIService();
    return { success: true, ...aiService.getActiveProvider() };
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
    title: 'SourceDebug - 书源调试器',
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

  // 隐藏默认菜单栏
  mainWindow.setMenuBarVisibility(false);

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
 * 单实例锁定 - 确保只能打开一个应用窗口
 */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 如果获取不到锁，说明已经有一个实例在运行，直接退出
  app.quit();
} else {
  // 当第二个实例启动时，聚焦到已存在的窗口
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

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
}
