/**
 * 调试包子漫画章节
 */
import { httpRequest } from './src/main/debug/http-client';
import * as cheerio from 'cheerio';
import { parseList, ParseContext } from './src/main/debug/rule-parser';

async function test() {
  const url = 'https://cn.bzmanga.com/comic/hzw-one-piece';
  const result = await httpRequest({ 
    url, 
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:34.0) Gecko/20100101 Firefox/34.0' } 
  });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  const $ = cheerio.load(result.body || '');
  
  console.log('=== 页面结构 ===');
  console.log('.comics-chapters__item:', $('.comics-chapters__item').length);
  console.log('.section-title:', $('.section-title').length);
  
  // 打印 section-title 内容
  $('.section-title').each((i, el) => {
    console.log(`  section-title[${i}]: ${$(el).text().trim()}`);
  });
  
  // 查找章节目录
  console.log('\n=== 章节目录 ===');
  const chapterItems = $('.comics-chapters__item');
  console.log('章节数量:', chapterItems.length);
  
  if (chapterItems.length > 0) {
    console.log('\n前5个章节:');
    chapterItems.slice(0, 5).each((i, el) => {
      console.log(`  [${i + 1}] ${$(el).text().trim()} - ${$(el).attr('href')}`);
    });
  }
  
  // 测试规则
  const ctx: ParseContext = {
    body: result.body || '',
    baseUrl: 'https://cn.bzmanga.com',
    variables: {}
  };
  
  const rules = [
    '.comics-chapters__item',
    'class.comics-chapters__item',
    'a.comics-chapters__item',
  ];
  
  console.log('\n=== 规则测试 ===');
  for (const rule of rules) {
    const elements = parseList(ctx, rule);
    console.log(`规则 "${rule}": ${elements.length} 个元素`);
  }
}

test().catch(console.error);
