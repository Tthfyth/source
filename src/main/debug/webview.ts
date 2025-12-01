/**
 * WebView 模拟模块
 * 使用 Puppeteer 实现类似 Legado BackstageWebView 的功能
 * 
 * 功能：
 * 1. 加载 URL 或 HTML 内容
 * 2. 执行 JavaScript 获取页面内容
 * 3. 等待页面渲染完成
 * 4. 支持资源嗅探和 URL 重定向捕获
 */

import puppeteer, { Browser, Page, HTTPResponse, HTTPRequest } from 'puppeteer';

// 全局浏览器实例（复用以提高性能）
let globalBrowser: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;

// 默认 User-Agent (PC)
const DEFAULT_USER_AGENT_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 移动端 User-Agent
const DEFAULT_USER_AGENT_MOBILE = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

// 默认 JS - 获取整个页面 HTML
const DEFAULT_JS = 'document.documentElement.outerHTML';

// 移动端视口配置
const MOBILE_VIEWPORT = {
  width: 375,
  height: 812,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

// PC 端视口配置
const PC_VIEWPORT = {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
};

// 常见的 Chrome 路径
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
  process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

// 查找可用的 Chrome 路径
function findChromePath(): string | undefined {
  const fs = require('fs');
  for (const chromePath of CHROME_PATHS) {
    if (chromePath && fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  return undefined;
}

/**
 * 获取或创建浏览器实例
 */
async function getBrowser(): Promise<Browser> {
  if (globalBrowser && globalBrowser.connected) {
    return globalBrowser;
  }
  
  if (browserPromise) {
    return browserPromise;
  }
  
  // 查找 Chrome 路径
  const executablePath = findChromePath();
  
  browserPromise = puppeteer.launch({
    headless: true,
    executablePath, // 使用系统安装的 Chrome
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });
  
  globalBrowser = await browserPromise;
  browserPromise = null;
  
  // 监听断开连接事件
  globalBrowser.on('disconnected', () => {
    globalBrowser = null;
  });
  
  return globalBrowser;
}

/**
 * 关闭全局浏览器实例
 */
export async function closeBrowser(): Promise<void> {
  if (globalBrowser) {
    await globalBrowser.close();
    globalBrowser = null;
  }
}

export interface WebViewOptions {
  /** 要访问的 URL */
  url?: string;
  /** 直接加载的 HTML 内容 */
  html?: string;
  /** 用于获取返回值的 JS 代码，默认返回整个页面 HTML */
  javaScript?: string;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 编码 */
  encode?: string;
  /** 延迟时间（毫秒），等待页面加载 */
  delayTime?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 资源嗅探正则 - 匹配到的资源 URL 会被返回 */
  sourceRegex?: string;
  /** URL 重定向正则 - 匹配到的跳转 URL 会被返回 */
  overrideUrlRegex?: string;
  /** 是否模拟移动端，默认 true（用于调试移动端书源） */
  isMobile?: boolean;
}

export interface WebViewResult {
  /** 是否成功 */
  success: boolean;
  /** 返回的内容（HTML 或 JS 执行结果） */
  body?: string;
  /** 最终 URL */
  url?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 使用 WebView 访问网页
 * 模拟 Legado 的 BackstageWebView 功能
 */
export async function webView(options: WebViewOptions): Promise<WebViewResult> {
  const {
    url,
    html,
    javaScript = DEFAULT_JS,
    headers = {},
    delayTime = 0,
    timeout = 60000,
    sourceRegex,
    overrideUrlRegex,
    isMobile = true, // 默认模拟移动端
  } = options;

  let page: Page | null = null;
  
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    
    // 设置视口（移动端或 PC 端）
    const viewport = isMobile ? MOBILE_VIEWPORT : PC_VIEWPORT;
    await page.setViewport(viewport);
    
    // 设置 User-Agent（移动端或 PC 端）
    const defaultUA = isMobile ? DEFAULT_USER_AGENT_MOBILE : DEFAULT_USER_AGENT_PC;
    const userAgent = headers['User-Agent'] || headers['user-agent'] || defaultUA;
    await page.setUserAgent(userAgent);
    
    // 设置额外的请求头
    const extraHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() !== 'user-agent') {
        extraHeaders[key] = value;
      }
    }
    if (Object.keys(extraHeaders).length > 0) {
      await page.setExtraHTTPHeaders(extraHeaders);
    }
    
    // 设置超时
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);
    
    // 资源嗅探和 URL 重定向捕获
    let sniffedUrl: string | null = null;
    
    if (sourceRegex) {
      const regex = new RegExp(sourceRegex);
      page.on('response', (response: HTTPResponse) => {
        const resUrl = response.url();
        if (regex.test(resUrl)) {
          sniffedUrl = resUrl;
        }
      });
    }
    
    if (overrideUrlRegex) {
      const regex = new RegExp(overrideUrlRegex);
      page.on('request', (request: HTTPRequest) => {
        const reqUrl = request.url();
        if (regex.test(reqUrl)) {
          sniffedUrl = reqUrl;
        }
      });
    }
    
    // 加载页面
    if (html) {
      // 直接加载 HTML
      if (url) {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
      } else {
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
      }
    } else if (url) {
      // 访问 URL
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    } else {
      return {
        success: false,
        error: 'url 和 html 不能同时为空',
      };
    }
    
    // 等待页面加载完成
    await page.waitForNetworkIdle({ idleTime: 500, timeout: Math.min(timeout, 10000) }).catch(() => {});
    
    // 额外延迟
    if (delayTime > 0) {
      await new Promise(resolve => setTimeout(resolve, delayTime));
    }
    
    // 如果有嗅探到的 URL，直接返回
    if (sniffedUrl) {
      return {
        success: true,
        body: sniffedUrl,
        url: page.url(),
      };
    }
    
    // 执行 JavaScript 获取内容
    let result: string;
    if (javaScript) {
      // 重试机制，类似 Legado 的 EvalJsRunnable
      let retry = 0;
      const maxRetry = 10;
      
      while (retry < maxRetry) {
        try {
          const evalResult = await page.evaluate(javaScript);
          if (evalResult !== null && evalResult !== undefined && evalResult !== '') {
            result = String(evalResult);
            break;
          }
        } catch (e) {
          // 忽略执行错误，继续重试
        }
        
        retry++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (retry >= maxRetry) {
        // 超时后返回当前页面内容
        result = await page.content();
      }
    } else {
      result = await page.content();
    }
    
    return {
      success: true,
      body: result!,
      url: page.url(),
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

/**
 * 使用 WebView 获取资源 URL
 * 对应 Legado 的 webViewGetSource
 */
export async function webViewGetSource(
  html: string | null,
  url: string | null,
  js: string | null,
  sourceRegex: string
): Promise<string> {
  const result = await webView({
    url: url || undefined,
    html: html || undefined,
    javaScript: js || undefined,
    sourceRegex,
  });
  
  return result.body || '';
}

/**
 * 使用 WebView 获取跳转 URL
 * 对应 Legado 的 webViewGetOverrideUrl
 */
export async function webViewGetOverrideUrl(
  html: string | null,
  url: string | null,
  js: string | null,
  overrideUrlRegex: string
): Promise<string> {
  const result = await webView({
    url: url || undefined,
    html: html || undefined,
    javaScript: js || undefined,
    overrideUrlRegex,
  });
  
  return result.body || '';
}

/**
 * 同步版本的 webView（用于 JS 沙箱）
 * 使用 sync-rpc 或 child_process 实现同步调用
 */
export function webViewSync(
  html: string | null,
  url: string | null,
  js: string | null,
  headers?: Record<string, string>
): string {
  // 使用 execSync 调用独立的 Node 进程来执行异步操作
  const { execSync } = require('child_process');
  const path = require('path');
  
  // 创建临时脚本内容
  const scriptContent = `
    const puppeteer = require('puppeteer');
    
    async function run() {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      
      try {
        const page = await browser.newPage();
        page.setDefaultTimeout(30000);
        
        ${headers ? `await page.setExtraHTTPHeaders(${JSON.stringify(headers)});` : ''}
        
        ${html ? `
          ${url ? `await page.goto(${JSON.stringify(url)}, { waitUntil: 'domcontentloaded' });` : ''}
          await page.setContent(${JSON.stringify(html)}, { waitUntil: 'domcontentloaded' });
        ` : `
          await page.goto(${JSON.stringify(url)}, { waitUntil: 'domcontentloaded' });
        `}
        
        // 等待网络空闲
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 }).catch(() => {});
        
        // 执行 JS 获取内容
        const jsCode = ${JSON.stringify(js || 'document.documentElement.outerHTML')};
        const result = await page.evaluate(jsCode);
        
        console.log(JSON.stringify({ success: true, body: result }));
      } catch (e) {
        console.log(JSON.stringify({ success: false, error: e.message }));
      } finally {
        await browser.close();
      }
    }
    
    run();
  `;
  
  try {
    const result = execSync(`node -e "${scriptContent.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
      encoding: 'utf8',
      timeout: 60000,
      cwd: path.dirname(__dirname),
    });
    
    const lines = result.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    const parsed = JSON.parse(lastLine);
    return parsed.body || '';
  } catch (e: any) {
    console.error('[webViewSync] error:', e.message);
    return '';
  }
}

// 缓存的 WebView 结果（用于避免重复请求）
const webViewCache = new Map<string, { body: string; timestamp: number }>();
const CACHE_TTL = 60000; // 1分钟缓存

/**
 * 带缓存的同步 WebView
 */
export function webViewSyncCached(
  html: string | null,
  url: string | null,
  js: string | null,
  headers?: Record<string, string>
): string {
  const cacheKey = JSON.stringify({ html, url, js, headers });
  const cached = webViewCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.body;
  }
  
  const result = webViewSync(html, url, js, headers);
  webViewCache.set(cacheKey, { body: result, timestamp: Date.now() });
  
  return result;
}

export default {
  webView,
  webViewGetSource,
  webViewGetOverrideUrl,
  webViewSync,
  closeBrowser,
};
