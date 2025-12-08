/**
 * 调试知音漫客章节列表
 */
import { httpRequest } from './src/main/debug/http-client';
import * as cheerio from 'cheerio';

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
  
  // 查找 .chapterlist
  console.log('=== .chapterlist 分析 ===');
  const chapterlist = $('.chapterlist');
  console.log('.chapterlist 数量:', chapterlist.length);
  
  if (chapterlist.length > 0) {
    console.log('.chapterlist li 数量:', chapterlist.find('li').length);
    console.log('.chapterlist a 数量:', chapterlist.find('a').length);
    
    // 打印 HTML
    console.log('\n.chapterlist HTML (前1000字符):');
    console.log(chapterlist.html()?.substring(0, 1000));
  }
  
  // 查找 mk-chapterlist-box
  console.log('\n=== .mk-chapterlist-box 分析 ===');
  const mkBox = $('.mk-chapterlist-box');
  console.log('.mk-chapterlist-box 数量:', mkBox.length);
  
  if (mkBox.length > 0) {
    console.log('.mk-chapterlist-box li 数量:', mkBox.find('li').length);
    console.log('.mk-chapterlist-box a 数量:', mkBox.find('a').length);
    
    // 打印 HTML
    console.log('\n.mk-chapterlist-box HTML (前1000字符):');
    console.log(mkBox.html()?.substring(0, 1000));
  }
  
  // 查找页面中的所有 script 标签，看是否有章节数据
  console.log('\n=== Script 标签分析 ===');
  $('script').each((i, el) => {
    const text = $(el).html() || '';
    if (text.includes('chapter') || text.includes('Chapter')) {
      console.log(`\nScript[${i}] 包含 chapter:`);
      console.log(text.substring(0, 500));
    }
  });
}

test().catch(console.error);
