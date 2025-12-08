/**
 * 直接调试 parseRule
 */
import { httpRequest } from './src/main/debug/http-client';
import { parseRule, ParseContext, splitRule } from './src/main/debug/rule-parser';

async function test() {
  const url = 'https://manhuafree.com/manga/doupocangqiong-zhiyinmankerenxiang';
  const result = await httpRequest({ url });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  const body = result.body || '';
  console.log('响应长度:', body.length);
  console.log('包含 data-mid:', body.includes('data-mid'));
  
  // 测试 splitRule
  const rule = `<js>
var mid=src.match(/data\\-mid\\="(\\d+)"/)[1];
java.put("mid",mid)
var r=\`https://api-get-v2.mgsearcher.com/api/manga/get?mid=\${mid}&mode=all\`
r;
</js>`;

  console.log('\n规则:', rule);
  
  const splitResult = splitRule(rule);
  console.log('\nsplitRule 结果:', splitResult);
  
  // 测试 parseRule
  const ctx: ParseContext = {
    body,
    baseUrl: url,
    variables: {}
  };
  
  console.log('\n调用 parseRule...');
  const parseResult = parseRule(ctx, rule);
  console.log('parseRule 结果:', parseResult);
}

test().catch(console.error);
