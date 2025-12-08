/**
 * 调试武芊漫画搜索
 */
import { httpRequest } from './src/main/debug/http-client';
import { parseList, ParseContext } from './src/main/debug/rule-parser';

async function test() {
  const url = 'https://comic.mkzcdn.com/search/keyword/?keyword=斗破苍穹&page_num=1&page_size=20';
  
  console.log('请求URL:', url);
  
  const result = await httpRequest({ url });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  console.log('响应状态:', result.statusCode);
  console.log('响应长度:', result.body?.length);
  console.log('响应预览:', result.body?.substring(0, 500));
  
  // 尝试解析 JSON
  try {
    const json = JSON.parse(result.body || '');
    console.log('\nJSON 结构:');
    console.log('  keys:', Object.keys(json));
    if (json.data) {
      console.log('  data keys:', Object.keys(json.data));
      if (json.data.list) {
        console.log('  list 长度:', json.data.list.length);
        if (json.data.list.length > 0) {
          console.log('  第一项:', JSON.stringify(json.data.list[0], null, 2).substring(0, 500));
        }
      }
    }
  } catch (e) {
    console.log('JSON 解析失败');
  }
  
  // 测试 parseList
  const ctx: ParseContext = {
    body: result.body || '',
    baseUrl: 'https://comic.mkzcdn.com',
    variables: {}
  };
  
  const rules = [
    '$..list[*]',
    '$.data.list[*]',
    '@json:$.data.list[*]',
  ];
  
  console.log('\n=== parseList 测试 ===');
  for (const rule of rules) {
    const items = parseList(ctx, rule);
    console.log(`规则 "${rule}": ${items.length} 个元素`);
    if (items.length > 0) {
      console.log('  第一项:', JSON.stringify(items[0]).substring(0, 200));
    }
  }
}

test().catch(console.error);
