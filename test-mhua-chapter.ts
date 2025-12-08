/**
 * 调试漫画屋章节URL
 */
import { httpRequest } from './src/main/debug/http-client';
import * as cheerio from 'cheerio';
import { parseList, parseFromElement, ParseContext } from './src/main/debug/rule-parser';

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
  
  // 查找章节列表结构
  console.log('=== 章节列表结构 ===');
  console.log('.clearfix:', $('.clearfix').length);
  console.log('.clearfix li:', $('.clearfix li').length);
  console.log('.clearfix li a:', $('.clearfix li a').length);
  
  // 打印第一个 li 的结构
  const firstLi = $('.clearfix li').first();
  console.log('\n第一个 li HTML:');
  console.log(firstLi.html());
  
  // 测试规则
  const ctx: ParseContext = {
    body: result.body || '',
    baseUrl: 'https://www.mhua5.com',
    variables: {}
  };
  
  // 规则: -class.clearfix@li
  console.log('\n=== 测试规则 ===');
  const rules = [
    '-class.clearfix@li',
    '-class.clearfix@tag.li',
    '.clearfix li',
    'ul.clearfix li',
  ];
  
  for (const rule of rules) {
    const elements = parseList(ctx, rule);
    console.log(`\n规则 "${rule}": ${elements.length} 个元素`);
    
    if (elements.length > 0) {
      const firstEl = elements[0];
      
      // 测试从元素中获取 href
      const urlRules = [
        'tag.a@href',
        'a@href',
        '@href',
        'href',
      ];
      
      for (const urlRule of urlRules) {
        const urlResult = parseFromElement(firstEl, urlRule, 'https://www.mhua5.com', {});
        console.log(`  URL规则 "${urlRule}": ${urlResult.success ? urlResult.data : '失败 - ' + urlResult.error}`);
      }
      
      // 打印元素HTML
      if (firstEl.html) {
        console.log(`  元素HTML: ${firstEl.html()?.substring(0, 200)}`);
      }
    }
  }
}

test().catch(console.error);
