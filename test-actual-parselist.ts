/**
 * 直接测试实际的 parseList 函数
 */
import { parseList, ParseContext } from './src/main/debug/rule-parser';
import { httpRequest } from './src/main/debug/http-client';

async function test() {
  const result = await httpRequest({
    url: 'https://m.ac.qq.com/search/result?word=斗破苍穹',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Android 9; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0'
    }
  });
  
  const ctx: ParseContext = {
    body: result.body || '',
    baseUrl: 'https://m.ac.qq.com',
    variables: {}
  };
  
  console.log('body 长度:', ctx.body.length);
  console.log('body 包含 comic-item:', ctx.body.includes('comic-item'));
  console.log('body 包含 class="comic-item":', ctx.body.includes('class="comic-item"'));
  
  // 测试各种规则
  const rules = [
    'class.comic-item',
    '.comic-item',
    'div.comic-item',
  ];
  
  for (const rule of rules) {
    console.log(`\n规则 "${rule}":`);
    const elements = parseList(ctx, rule);
    console.log(`  结果数量: ${elements.length}`);
    if (elements.length > 0) {
      console.log(`  第一个元素类型: ${typeof elements[0]}`);
      if (typeof elements[0] === 'object' && elements[0].html) {
        console.log(`  第一个元素 HTML 长度: ${elements[0].html()?.length}`);
      }
    }
  }
}

test().catch(console.error);
