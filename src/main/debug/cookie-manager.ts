/**
 * CookieManager - Cookie 管理器
 * 参考 Legado CookieStore.kt 实现
 * 
 * 提供 Cookie 的存储、获取、删除功能
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Cookie 文件路径
const CACHE_DIR = path.join(os.homedir(), '.legado-source-debug');
const COOKIE_FILE = path.join(CACHE_DIR, 'cookies.json');

// Cookie 存储
let cookieStore: Record<string, string> = {};
let cookieLoaded = false;

/**
 * 确保缓存目录存在
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * 加载 Cookie
 */
function loadCookies(): void {
  if (cookieLoaded) return;
  
  try {
    ensureCacheDir();
    if (fs.existsSync(COOKIE_FILE)) {
      const data = fs.readFileSync(COOKIE_FILE, 'utf8');
      cookieStore = JSON.parse(data);
    }
  } catch (e) {
    console.error('[CookieManager] 加载 Cookie 失败:', e);
    cookieStore = {};
  }
  cookieLoaded = true;
}

/**
 * 保存 Cookie
 */
function saveCookies(): void {
  try {
    ensureCacheDir();
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookieStore, null, 2));
  } catch (e) {
    console.error('[CookieManager] 保存 Cookie 失败:', e);
  }
}

/**
 * 从 URL 获取域名
 */
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * Cookie 管理器
 * 参考 Legado CookieStore
 */
export const CookieStore = {
  /**
   * 设置 Cookie
   * @param url URL 或域名
   * @param cookie Cookie 字符串
   */
  setCookie(url: string, cookie: string): void {
    loadCookies();
    const domain = getDomain(url);
    cookieStore[domain] = cookie;
    saveCookies();
  },

  /**
   * 替换 Cookie（合并新旧 Cookie）
   * @param url URL 或域名
   * @param cookie 新的 Cookie 字符串
   */
  replaceCookie(url: string, cookie: string): void {
    loadCookies();
    const domain = getDomain(url);
    const oldCookie = cookieStore[domain] || '';
    
    // 解析旧 Cookie
    const cookieMap: Record<string, string> = {};
    oldCookie.split(';').forEach(part => {
      const [key, value] = part.trim().split('=');
      if (key) cookieMap[key] = value || '';
    });
    
    // 合并新 Cookie
    cookie.split(';').forEach(part => {
      const [key, value] = part.trim().split('=');
      if (key) cookieMap[key] = value || '';
    });
    
    // 重新组合
    const newCookie = Object.entries(cookieMap)
      .map(([k, v]) => v ? `${k}=${v}` : k)
      .join('; ');
    
    cookieStore[domain] = newCookie;
    saveCookies();
  },

  /**
   * 获取 Cookie
   * @param url URL 或域名
   * @returns Cookie 字符串
   */
  getCookie(url: string): string {
    loadCookies();
    const domain = getDomain(url);
    return cookieStore[domain] || '';
  },

  /**
   * 获取指定 key 的 Cookie 值
   * @param url URL 或域名
   * @param key Cookie 名称
   * @returns Cookie 值
   */
  getKey(url: string, key: string): string {
    const cookie = this.getCookie(url);
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${key}=([^;]*)`));
    return match ? match[1] : '';
  },

  /**
   * 删除 Cookie
   * @param url URL 或域名
   */
  removeCookie(url: string): void {
    loadCookies();
    const domain = getDomain(url);
    delete cookieStore[domain];
    saveCookies();
  },

  /**
   * 清除所有 Cookie
   */
  clear(): void {
    cookieStore = {};
    saveCookies();
  },

  /**
   * 获取所有域名
   */
  getDomains(): string[] {
    loadCookies();
    return Object.keys(cookieStore);
  },

  /**
   * 检查是否包含指定 key
   */
  contains(url: string, key: string): boolean {
    const cookie = this.getCookie(url);
    return cookie.includes(`${key}=`);
  },
};

// 导出默认实例
export default CookieStore;
