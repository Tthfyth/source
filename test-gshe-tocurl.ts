/**
 * 测试 G社漫画 tocUrl 规则解析
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
  
  // tocUrl 规则
  const tocUrlRule = `<js>
var mid=src.match(/data\\-mid\\="(\\d+)"/)[1];
java.put("mid",mid)
var r=\`https://api-get-v2.mgsearcher.com/api/manga/get?mid=\${mid}&mode=all\`
r;
</js>`;

  console.log('\ntocUrl 规则:', tocUrlRule);
  
  const ctx: ParseContext = {
    body,
    baseUrl: url,
    variables: {}
  };
  
  const parseResult = parseRule(ctx, tocUrlRule);
  console.log('\n解析结果:', parseResult);
  
  if (parseResult.success && parseResult.data) {
    console.log('\n解析出的 tocUrl:', parseResult.data);
    
    // 尝试请求这个 URL
    const tocResult = await httpRequest({ url: String(parseResult.data) });
    if (tocResult.success) {
      console.log('\ntocUrl 响应长度:', tocResult.body?.length);
      console.log('tocUrl 响应预览:', tocResult.body?.substring(0, 500));
    } else {
      console.log('\ntocUrl 请求失败:', tocResult.error);
    }
  }
}

test().catch(console.error);
