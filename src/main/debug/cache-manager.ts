/**
 * CacheManager - 缓存管理器
 * 参考 Legado CacheManager.kt 实现
 * 
 * 提供内存缓存和文件持久化功能
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// 缓存条目接口
interface CacheEntry {
  value: string;
  deadline: number;  // 0 表示永不过期，否则为过期时间戳（毫秒）
}

// 缓存文件路径
const CACHE_DIR = path.join(os.homedir(), '.legado-source-debug');
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');

// 内存缓存 (LRU 简化版)
const memoryCache = new Map<string, any>();
const MAX_MEMORY_SIZE = 50 * 1024 * 1024; // 50MB

// 文件缓存
let fileCache: Record<string, CacheEntry> = {};
let fileCacheLoaded = false;

/**
 * 确保缓存目录存在
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * 加载文件缓存
 */
function loadFileCache(): void {
  if (fileCacheLoaded) return;
  
  try {
    ensureCacheDir();
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      fileCache = JSON.parse(data);
      // 清理过期条目
      const now = Date.now();
      for (const key of Object.keys(fileCache)) {
        const entry = fileCache[key];
        if (entry.deadline > 0 && entry.deadline < now) {
          delete fileCache[key];
        }
      }
    }
  } catch (e) {
    console.error('[CacheManager] 加载缓存失败:', e);
    fileCache = {};
  }
  fileCacheLoaded = true;
}

/**
 * 保存文件缓存
 */
function saveFileCache(): void {
  try {
    ensureCacheDir();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(fileCache, null, 2));
  } catch (e) {
    console.error('[CacheManager] 保存缓存失败:', e);
  }
}

/**
 * 缓存管理器
 */
export const CacheManager = {
  /**
   * 存储数据
   * @param key 键
   * @param value 值
   * @param saveTime 保存时间（秒），0 表示永不过期
   */
  put(key: string, value: any, saveTime: number = 0): void {
    const strValue = typeof value === 'string' ? value : JSON.stringify(value);
    const deadline = saveTime === 0 ? 0 : Date.now() + saveTime * 1000;
    
    // 存入内存
    memoryCache.set(key, strValue);
    
    // 存入文件
    loadFileCache();
    fileCache[key] = { value: strValue, deadline };
    saveFileCache();
  },

  /**
   * 仅存入内存
   */
  putMemory(key: string, value: any): void {
    memoryCache.set(key, value);
  },

  /**
   * 从内存获取
   */
  getFromMemory(key: string): any {
    return memoryCache.get(key);
  },

  /**
   * 删除内存缓存
   */
  deleteMemory(key: string): void {
    memoryCache.delete(key);
  },

  /**
   * 获取数据
   */
  get(key: string): string | null {
    // 先从内存获取
    const memValue = memoryCache.get(key);
    if (memValue !== undefined) {
      return typeof memValue === 'string' ? memValue : JSON.stringify(memValue);
    }
    
    // 从文件获取
    loadFileCache();
    const entry = fileCache[key];
    if (entry) {
      // 检查是否过期
      if (entry.deadline === 0 || entry.deadline > Date.now()) {
        memoryCache.set(key, entry.value);
        return entry.value;
      } else {
        // 已过期，删除
        delete fileCache[key];
        saveFileCache();
      }
    }
    
    return null;
  },

  /**
   * 获取整数
   */
  getInt(key: string): number | null {
    const value = this.get(key);
    if (value === null) return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  },

  /**
   * 获取长整数
   */
  getLong(key: string): number | null {
    return this.getInt(key);
  },

  /**
   * 获取浮点数
   */
  getDouble(key: string): number | null {
    const value = this.get(key);
    if (value === null) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  },

  /**
   * 获取浮点数
   */
  getFloat(key: string): number | null {
    return this.getDouble(key);
  },

  /**
   * 删除数据
   */
  delete(key: string): void {
    memoryCache.delete(key);
    loadFileCache();
    delete fileCache[key];
    saveFileCache();
  },

  /**
   * 清除所有缓存
   */
  clear(): void {
    memoryCache.clear();
    fileCache = {};
    saveFileCache();
  },

  /**
   * 清除书源相关变量
   */
  clearSourceVariables(): void {
    const prefixes = ['v_', 'userInfo_', 'loginHeader_', 'sourceVariable_'];
    
    // 清除内存缓存
    for (const key of memoryCache.keys()) {
      if (prefixes.some(p => key.startsWith(p))) {
        memoryCache.delete(key);
      }
    }
    
    // 清除文件缓存
    loadFileCache();
    for (const key of Object.keys(fileCache)) {
      if (prefixes.some(p => key.startsWith(p))) {
        delete fileCache[key];
      }
    }
    saveFileCache();
  },

  /**
   * 获取缓存统计
   */
  getStats(): { memoryCount: number; fileCount: number; filePath: string } {
    loadFileCache();
    return {
      memoryCount: memoryCache.size,
      fileCount: Object.keys(fileCache).length,
      filePath: CACHE_FILE,
    };
  },

  /**
   * 列出所有键
   */
  keys(): string[] {
    loadFileCache();
    const allKeys = new Set<string>();
    for (const key of memoryCache.keys()) {
      allKeys.add(key);
    }
    for (const key of Object.keys(fileCache)) {
      allKeys.add(key);
    }
    return Array.from(allKeys);
  },
};

// 导出默认实例
export default CacheManager;
