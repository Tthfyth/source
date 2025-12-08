/**
 * 调试知音漫客目录
 */
import { httpRequest } from './src/main/debug/http-client';
import * as cheerio from 'cheerio';
import { parseList, ParseContext } from './src/main/debug/rule-parser';

async function test() {
  const url = 'https://m.zymk.cn/101/';
  const result = await httpRequest({ 
    url, 
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36' } 
  });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  const $ = cheerio.load(result.body || '');
  
  console.log('=== 页面结构 ===');
  console.log('#chapterList:', $('#chapterList').length);
  console.log('#chapterList a:', $('#chapterList a').length);
  console.log('.chapter-list:', $('.chapter-list').length);
  console.log('.chapter-list a:', $('.chapter-list a').length);
  
  // 查找所有包含 chapter 的元素
  const chapterEls: string[] = [];
  $('[id*="chapter"], [class*="chapter"]').each((_, el) => {
    const id = $(el).attr('id') || '';
    const cls = $(el).attr('class') || '';
    const tag = $(el).prop('tagName');
    const key = `${tag}#${id}.${cls}`;
    if (!chapterEls.includes(key)) chapterEls.push(key);
  });
  console.log('\n包含chapter的元素:', chapterEls.slice(0, 10));
  
  // 查找所有链接
  console.log('\n=== 链接分析 ===');
  const links = $('a[href*="/"]');
  console.log('总链接数:', links.length);
  
  // 查找章节链接模式
  const chapterLinks = $('a[href*="/101/"]');
  console.log('包含/101/的链接:', chapterLinks.length);
  
  if (chapterLinks.length > 0) {
    console.log('\n前5个章节链接:');
    chapterLinks.slice(0, 5).each((i, el) => {
      console.log(`  [${i + 1}] ${$(el).text().trim().substring(0, 30)} - ${$(el).attr('href')}`);
    });
  }
  
  // 测试规则
  const ctx: ParseContext = {
    body: result.body || '',
    baseUrl: 'https://m.zymk.cn',
    variables: {}
  };
  
  const rules = [
    'id.chapterList@tag.a',
    '#chapterList a',
    '.chapter-list a',
    'a[href*="/101/"]',
  ];
  
  console.log('\n=== 规则测试 ===');
  for (const rule of rules) {
    const elements = parseList(ctx, rule);
    console.log(`规则 "${rule}": ${elements.length} 个元素`);
  }
}

test().catch(console.error);
