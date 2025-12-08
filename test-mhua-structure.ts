/**
 * 分析漫画屋页面结构
 */
import { httpRequest } from './src/main/debug/http-client';
import * as cheerio from 'cheerio';

async function test() {
  const detailUrl = 'https://www.mhua5.com/index.php/comic/doupocangkong';
  const result = await httpRequest({ 
    url: detailUrl, 
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 9) AppleWebKit/537.36' } 
  });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  const $ = cheerio.load(result.body || '');
  
  // 查找包含章节链接的区域
  console.log('=== 查找章节区域 ===');
  
  // 查找所有包含 /index.php/chapter/ 的链接
  const chapterLinks = $('a[href*="/chapter/"]');
  console.log('章节链接数量:', chapterLinks.length);
  
  if (chapterLinks.length > 0) {
    console.log('\n前5个章节链接:');
    chapterLinks.slice(0, 5).each((i, el) => {
      console.log(`  [${i + 1}] ${$(el).text().trim()} - ${$(el).attr('href')}`);
    });
    
    // 查找父元素
    const firstLink = chapterLinks.first();
    const parent = firstLink.parent();
    const grandParent = parent.parent();
    
    console.log('\n链接的父元素:');
    console.log('  parent tag:', parent.prop('tagName'));
    console.log('  parent class:', parent.attr('class'));
    console.log('  grandParent tag:', grandParent.prop('tagName'));
    console.log('  grandParent class:', grandParent.attr('class'));
  }
  
  // 查找 chapter-list 或类似的类
  console.log('\n=== 查找章节列表容器 ===');
  const containers = [
    '.chapter-list',
    '.chapters',
    '.comic-chapters',
    '[class*="chapter"]',
    '.list-wrap',
  ];
  
  for (const sel of containers) {
    const els = $(sel);
    if (els.length > 0) {
      console.log(`${sel}: ${els.length} 个`);
      console.log(`  子元素 a 数量: ${els.find('a').length}`);
    }
  }
  
  // 打印页面中所有 ul 的类名和 li 数量
  console.log('\n=== 所有 ul 元素 ===');
  $('ul').each((i, el) => {
    const cls = $(el).attr('class') || '(无类名)';
    const liCount = $(el).children('li').length;
    const aCount = $(el).find('a[href*="/chapter/"]').length;
    if (aCount > 0) {
      console.log(`  ul.${cls}: ${liCount} 个 li, ${aCount} 个章节链接`);
    }
  });
}

test().catch(console.error);
