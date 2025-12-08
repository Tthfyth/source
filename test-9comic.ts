/**
 * 测试好看漫画解析
 */
import { httpRequest } from './src/main/debug/http-client';
import { parseList, parseFromElement, ParseContext } from './src/main/debug/rule-parser';

async function test() {
  const url = 'https://www.9comic.cn/comic22/so/comic?keyword=一人之下&p=&ver=2.0';
  
  console.log('请求:', url);
  const result = await httpRequest({ url });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  console.log('响应状态:', result.statusCode);
  console.log('响应长度:', result.body?.length);
  
  // 解析 JSON
  try {
    const json = JSON.parse(result.body || '');
    console.log('\nJSON 结构:');
    console.log('  code:', json.code);
    console.log('  data.type:', json.data?.type);
    console.log('  data.list 长度:', json.data?.list?.length);
    
    if (json.data?.list?.length > 0) {
      console.log('  第一项:', JSON.stringify(json.data.list[0]).substring(0, 200));
    }
  } catch (e) {
    console.log('JSON 解析失败');
  }
  
  // 测试 parseList
  const ctx: ParseContext = {
    body: result.body || '',
    baseUrl: 'https://www.9comic.cn',
    variables: {}
  };
  
  const rules = [
    '$..list[*]',
    '$.data.list[*]',
    '$..list[*]||$.data[*]',
  ];
  
  console.log('\n=== parseList 测试 ===');
  for (const rule of rules) {
    const items = parseList(ctx, rule);
    console.log(`规则 "${rule}": ${items.length} 个元素`);
    if (items.length > 0) {
      const first: any = items[0];
      console.log(`  第一项 title: ${first.title}`);
    }
  }
}

test().catch(console.error);
