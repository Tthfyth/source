/**
 * Puppeteer 网页抓取服务
 * 用于提取网页关键结构，供 AI 分析生成书源规则
 */

import puppeteer, { Browser, Page } from 'puppeteer-core';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// 页面内容结构
export interface PageContent {
  url: string;
  title: string;
  // 完整的 body HTML（压缩后）
  bodyHtml: string;
  // 关键区域的完整 HTML
  sections: {
    name: string;
    selector: string;
    html: string;
  }[];
  // 页面特征
  features: {
    hasPagination: boolean;
    usesLazyLoad: boolean;
    dynamicLoading: boolean;
    hasLogin: boolean;
    isEncrypted: boolean;
    charset: string;
  };
  // 示例数据
  samples: {
    bookTitles: string[];
    chapterTitles: string[];
    sampleText: string;
  };
}

// 简化后的内容（用于发送给 AI）
export interface SimplifiedContent {
  url: string;
  title: string;
  // 完整页面 HTML（压缩后，限制长度）
  html: string;
  // 关键区域
  sections: {
    name: string;
    selector: string;
    html: string;
  }[];
  features: PageContent['features'];
  samples: PageContent['samples'];
}

class PuppeteerService {
  private browser: Browser | null = null;
  private chromePath: string | null = null;

  constructor() {
    this.findChromePath();
  }

  /**
   * 查找系统中的 Chrome/Edge 浏览器路径
   */
  private findChromePath() {
    const possiblePaths = [
      // Windows Chrome
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
      // Windows Edge
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      // macOS
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      // Linux
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ];

    for (const p of possiblePaths) {
      if (p && fs.existsSync(p)) {
        this.chromePath = p;
        console.log('找到浏览器:', p);
        return;
      }
    }

    console.warn('未找到 Chrome/Edge 浏览器，请手动安装');
  }

  /**
   * 启动浏览器
   */
  private async launchBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    if (!this.chromePath) {
      throw new Error('未找到 Chrome/Edge 浏览器，请安装后重试');
    }

    this.browser = await puppeteer.launch({
      headless: true,
      executablePath: this.chromePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    return this.browser;
  }

  /**
   * 提取页面内容
   */
  async extractPageContent(url: string): Promise<PageContent> {
    const browser = await this.launchBrowser();
    const page = await browser.newPage();

    try {
      // 设置 User-Agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // 设置视口
      await page.setViewport({ width: 1920, height: 1080 });

      // 访问页面
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // 等待页面加载
      await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});

      // 在页面中提取内容
      const content = await page.evaluate(() => {
        /**
         * 压缩 HTML，移除无用内容但保留完整结构
         */
        const compressHtml = (html: string): string => {
          return html
            // 移除 script 和 style 标签及内容
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
            // 移除注释
            .replace(/<!--[\s\S]*?-->/g, '')
            // 移除 SVG 内容（保留标签）
            .replace(/<svg[\s\S]*?<\/svg>/gi, '<svg/>')
            // 压缩空白
            .replace(/\s+/g, ' ')
            .replace(/>\s+</g, '><')
            // 移除空属性
            .replace(/\s+(?:onclick|onload|onerror|onmouseover)="[^"]*"/gi, '')
            .trim();
        };

        /**
         * 获取元素的完整 HTML（压缩后）
         */
        const getElementHtml = (el: Element | null, maxLength = 5000): string => {
          if (!el) return '';
          const html = el.outerHTML || '';
          const compressed = compressHtml(html);
          return compressed.slice(0, maxLength);
        };

        /**
         * 获取选择器路径
         */
        const getSelectorPath = (el: Element): string => {
          const parts: string[] = [];
          let current: Element | null = el;
          let depth = 0;
          
          while (current && current !== document.body && depth < 5) {
            const tag = current.tagName.toLowerCase();
            const id = current.id;
            const classes = Array.from(current.classList)
              .filter(c => c && !c.match(/^(clearfix|cf|row|col-|container|wrapper|\d+|ng-|js-|is-|has-|active|show|hide)/))
              .slice(0, 3);
            
            if (id && !id.match(/^\d/)) {
              parts.unshift(`#${id}`);
              break;
            } else if (classes.length) {
              parts.unshift(`.${classes.join('.')}`);
            } else {
              parts.unshift(tag);
            }
            
            current = current.parentElement;
            depth++;
          }
          
          return parts.join(' ');
        };

        // 关键区域选择器配置
        const sectionSelectors = [
          { name: 'searchResult', selectors: ['.search-result', '.search-list', '#search-result', '.result-list', '[class*="search-item"]', '.modern-search-results'] },
          { name: 'bookList', selectors: ['.book-list', '.novel-list', '.book-card', '[class*="book-item"]', '.rank-list', '.list-content'] },
          { name: 'bookInfo', selectors: ['.book-info', '.book-detail', '.detail-info', '#bookinfo', '[class*="detail"]', '.info-section'] },
          { name: 'chapterList', selectors: ['.chapter-list', '#chapter-list', '.catalog', '#catalog', '[class*="chapter-item"]', '.modern-chapters-grid'] },
          { name: 'content', selectors: ['#content', '.content', '.chapter-content', '#chaptercontent', '.read-content', '.article-content'] },
          { name: 'pagination', selectors: ['.pagination', '.page-nav', '.pager', '[class*="page-"]'] },
        ];

        // 提取关键区域
        const sections: { name: string; selector: string; html: string }[] = [];
        for (const { name, selectors } of sectionSelectors) {
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) {
              sections.push({
                name,
                selector: getSelectorPath(el),
                html: getElementHtml(el, 8000) // 每个区域最多8000字符
              });
              break;
            }
          }
        }

        // 获取完整 body HTML（压缩后）
        const bodyHtml = compressHtml(document.body.innerHTML).slice(0, 50000); // 最多50000字符

        // 提取页面特征
        const features = {
          hasPagination: !!(
            document.querySelector('.next, .pagination, .page-next, [class*="page"]') ||
            document.querySelector('a[href*="page="], a[href*="_2.html"]')
          ),
          usesLazyLoad: !!(
            document.querySelector('[data-src], [data-original], [data-lazy], .lazy')
          ),
          dynamicLoading: !!(
            document.querySelector('.load-more, .ajax-load, [data-ajax], .infinite-scroll')
          ),
          hasLogin: !!(
            document.querySelector('.login, #login, [class*="login"], input[type="password"]')
          ),
          isEncrypted: !!(
            document.querySelector('[class*="encrypt"], [id*="encrypt"]') ||
            document.body.innerHTML.includes('decrypt') ||
            document.body.innerHTML.includes('加密')
          ),
          charset: document.characterSet
        };

        // 提取示例数据
        const bookTitles: string[] = [];
        const chapterTitles: string[] = [];
        
        // 尝试提取书名
        document.querySelectorAll('a[href*="book"], a[href*="novel"], .book-name, .book-title, h3 a, h2 a').forEach((el, i) => {
          if (i < 10 && el.textContent?.trim()) {
            const text = el.textContent.trim();
            if (text.length > 2 && text.length < 100 && !bookTitles.includes(text)) {
              bookTitles.push(text);
            }
          }
        });

        // 尝试提取章节名
        document.querySelectorAll('a[href*="chapter"], a[href*="read"], .chapter-name, .chapter-title').forEach((el, i) => {
          if (i < 10 && el.textContent?.trim()) {
            const text = el.textContent.trim();
            if (text.length > 2 && text.length < 100 && !chapterTitles.includes(text)) {
              chapterTitles.push(text);
            }
          }
        });

        // 提取正文示例
        let sampleText = '';
        const contentEl = document.querySelector('#content, .content, .chapter-content, .read-content, #chaptercontent');
        if (contentEl) {
          sampleText = contentEl.textContent?.trim().slice(0, 500) || '';
        }

        return {
          url: window.location.href,
          title: document.title,
          bodyHtml,
          sections,
          features,
          samples: {
            bookTitles: bookTitles.slice(0, 10),
            chapterTitles: chapterTitles.slice(0, 10),
            sampleText
          }
        };
      });

      return content as PageContent;
    } finally {
      await page.close();
    }
  }

  /**
   * 简化内容，用于发送给 AI
   * @param maxHtmlLength 完整HTML的最大长度（默认30000字符）
   */
  simplifyContent(content: PageContent, maxHtmlLength = 30000): SimplifiedContent {
    return {
      url: content.url,
      title: content.title,
      // 完整页面HTML（限制长度）
      html: content.bodyHtml.slice(0, maxHtmlLength),
      // 关键区域（每个区域限制长度）
      sections: content.sections.map(s => ({
        name: s.name,
        selector: s.selector,
        html: s.html.slice(0, 5000)
      })),
      features: content.features,
      samples: content.samples,
    };
  }

  /**
   * 关闭浏览器
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// 单例
let puppeteerService: PuppeteerService | null = null;

export function getPuppeteerService(): PuppeteerService {
  if (!puppeteerService) {
    puppeteerService = new PuppeteerService();
  }
  return puppeteerService;
}

export { PuppeteerService };
