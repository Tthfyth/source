/**
 * 测试知音漫客选择器
 */
import { httpRequest } from './src/main/debug/http-client';
import * as cheerio from 'cheerio';

async function test() {
  const url = 'https://m.zymk.cn/sort/all.html?key=斗破苍穹';
  const result = await httpRequest({ url });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  const body = result.body || '';
  const $ = cheerio.load(body);
  
  // 测试各种选择器
  console.log('.item 数量:', $('.item').length);
  console.log('[class="item"] 数量:', $('[class="item"]').length);
  console.log('.item h3 数量:', $('.item h3').length);
  
  // 打印第一个 .item 的 HTML
  const firstItem = $('.item').first();
  if (firstItem.length) {
    console.log('\n第一个 .item HTML:', firstItem.html()?.substring(0, 300));
  }
}

test().catch(console.error);
