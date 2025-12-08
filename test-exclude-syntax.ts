/**
 * 测试排除语法 !0
 */
import { parseList, ParseContext, parseFromElement } from './src/main/debug/rule-parser';
import { httpRequest } from './src/main/debug/http-client';

async function test() {
  // 测试漫畫狗的目录规则
  const url = 'https://dogemanga.com/m/3E6-dFJl';
  const result = await httpRequest({ 
    url, 
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' } 
  });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  const ctx: ParseContext = {
    body: result.body || '',
    baseUrl: 'https://dogemanga.com',
    variables: {}
  };
  
  // 测试各种规则
  const rules = [
    'class.site-selector@tag.option',           // 不排除
    'class.site-selector@tag.option!0',         // 排除第0个
    '-class.site-selector@tag.option!0',        // 倒序 + 排除第0个
    '.site-selector option',                    // CSS 选择器
    '.site-selector option:not(:first-child)',  // CSS 排除
  ];
  
  for (const rule of rules) {
    console.log(`\n规则: "${rule}"`);
    const elements = parseList(ctx, rule);
    console.log(`  结果数量: ${elements.length}`);
    
    if (elements.length > 0) {
      // 打印前3个
      for (let i = 0; i < Math.min(3, elements.length); i++) {
        const el = elements[i];
        if (el.text) {
          console.log(`  [${i}] ${el.text().trim().substring(0, 30)}`);
        } else if (typeof el === 'object') {
          console.log(`  [${i}] ${JSON.stringify(el).substring(0, 50)}`);
        }
      }
    }
  }
}

test().catch(console.error);
