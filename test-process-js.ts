/**
 * 测试 processJsRule
 */

// 模拟 processJsRule
function processJsRule(rule: string) {
  let processed = rule;
  let hasJs = false;
  let jsResult: any = null;

  // 处理 <js>...</js>
  const jsTagRegex = /<js>([\s\S]*?)<\/js>/gi;
  let match;
  while ((match = jsTagRegex.exec(rule)) !== null) {
    hasJs = true;
    const jsCode = match[1];
    console.log('提取的 JS 代码:', JSON.stringify(jsCode));
    console.log('匹配的完整内容:', JSON.stringify(match[0]));
    // jsResult = executeJs(jsCode, context);
    jsResult = 'MOCK_RESULT';
    processed = processed.replace(
      match[0],
      jsResult !== null ? String(jsResult) : ''
    );
  }

  return { processed, hasJs, jsResult };
}

// 测试规则
const rule1 = `<js>
var mid = src.match(/data-mid="(\\d+)"/)[1];
java.put("mid", mid);
"https://api-get-v2.mgsearcher.com/api/manga/get?mid=" + mid + "&mode=all";
</js>`;

console.log('=== 测试规则 1 ===');
console.log('输入:', JSON.stringify(rule1));
const result1 = processJsRule(rule1);
console.log('结果:', result1);

const rule2 = `<js>

var mid=src.match(/data\\-mid\\="(\\d+)"/)[1];
java.put("mid",mid)
var r=\`https://api-get-v2.mgsearcher.com/api/manga/get?mid=\${mid}&mode=all\`
r;

</js>`;

console.log('\n=== 测试规则 2 ===');
console.log('输入:', JSON.stringify(rule2));
const result2 = processJsRule(rule2);
console.log('结果:', result2);
