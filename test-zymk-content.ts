/**
 * 调试知音漫客正文
 */
import { httpRequest } from './src/main/debug/http-client';
import * as cheerio from 'cheerio';

async function test() {
  // 章节URL格式: 433822.html (相对路径)
  // 尝试不同的URL格式
  const urls = [
    'https://m.zymk.cn/101/1.html',
    'https://m.zymk.cn/101/433822.html',
    'https://m.zymk.cn/read/101/1.html',
  ];
  
  for (const url of urls) {
    console.log('\n尝试URL:', url);
  
    const result = await httpRequest({ 
      url, 
      headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36' } 
    });
    
    if (!result.success) {
      console.log('请求失败:', result.error);
      continue;
    }
    
    console.log('响应状态:', result.statusCode);
    console.log('响应长度:', result.body?.length);
    
    const $ = cheerio.load(result.body || '');
    
    console.log('\n=== 图片选择器测试 ===');
    console.log('.comic-page:', $('.comic-page').length);
    console.log('.comic-page img:', $('.comic-page img').length);
    console.log('.comic-contain:', $('.comic-contain').length);
    console.log('.comic-contain img:', $('.comic-contain img').length);
    console.log('img[data-original]:', $('img[data-original]').length);
    console.log('img[data-src]:', $('img[data-src]').length);
    console.log('img:', $('img').length);
    
    // 查找所有包含 comic 的类
    const comicClasses: string[] = [];
    $('[class*="comic"]').each((_, el) => {
      const cls = $(el).attr('class') || '';
      if (!comicClasses.includes(cls)) comicClasses.push(cls);
    });
    console.log('\n包含comic的类:', comicClasses);
    
    // 打印所有图片
    console.log('\n=== 所有图片 ===');
    $('img').each((i, el) => {
      if (i >= 10) return;
      const src = $(el).attr('src') || '';
      const dataSrc = $(el).attr('data-src') || '';
      const dataOriginal = $(el).attr('data-original') || '';
      console.log(`[${i}] src=${src.substring(0, 50)} data-src=${dataSrc.substring(0, 50)} data-original=${dataOriginal.substring(0, 50)}`);
    });
    
    break; // 成功后退出循环
  }
}

test().catch(console.error);
