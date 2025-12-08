/**
 * 测试 G社漫画 tocUrl 规则解析 - 详细调试
 */
import { httpRequest } from './src/main/debug/http-client';
import { parseRule, ParseContext } from './src/main/debug/rule-parser';

async function test() {
  const url = 'https://manhuafree.com/manga/doupocangqiong-zhiyinmankerenxiang';
  const result = await httpRequest({ url });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  const body = result.body || '';
  console.log('响应长度:', body.length);
  
  // 检查 data-mid 是否存在
  const midMatch = body.match(/data-mid="(\d+)"/);
  console.log('data-mid 匹配:', midMatch ? midMatch[1] : '未找到');
  
  // 简化的 tocUrl 规则测试
  const simpleRule = `<js>
var mid = src.match(/data-mid="(\\d+)"/)[1];
java.put("mid", mid);
"https://api-get-v2.mgsearcher.com/api/manga/get?mid=" + mid + "&mode=all";
</js>`;

  console.log('\n简化规则:', simpleRule);
  
  const ctx: ParseContext = {
    body,
    baseUrl: url,
    variables: {}
  };
  
  const parseResult = parseRule(ctx, simpleRule);
  console.log('\n解析结果:', JSON.stringify(parseResult, null, 2));
  
  // 测试原始规则
  const originalRule = `<js>

var mid=src.match(/data\\-mid\\="(\\d+)"/)[1];
java.put("mid",mid)
var r=\`https://api-get-v2.mgsearcher.com/api/manga/get?mid=\${mid}&mode=all\`
r;

</js>`;

  console.log('\n原始规则:', originalRule);
  
  const parseResult2 = parseRule(ctx, originalRule);
  console.log('\n原始规则解析结果:', JSON.stringify(parseResult2, null, 2));
}

test().catch(console.error);
