/**
 * 直接测试 JS 执行
 */
import * as vm from 'vm';

// 模拟 executeJs 的简化版本
function testExecuteJs(code: string, src: string) {
  console.log('=== 测试 JS 执行 ===');
  console.log('代码:', code);
  console.log('src 长度:', src.length);
  
  const variables: Record<string, any> = {};
  
  const sandbox: any = {
    src,
    result: null,
    baseUrl: 'https://manhuafree.com',
    java: {
      put: (key: string, value: any) => {
        variables[key] = value;
        console.log(`java.put("${key}", "${value}")`);
      },
      get: (key: string) => variables[key],
    },
    console,
  };
  
  try {
    const context = vm.createContext(sandbox);
    const script = new vm.Script(code);
    const result = script.runInContext(context, { timeout: 5000 });
    console.log('执行结果:', result);
    console.log('variables:', variables);
    return result;
  } catch (e: any) {
    console.log('执行错误:', e.message);
    return null;
  }
}

// 测试用的 HTML
const html = `<div id="mangachapters" data-mid="76">`;

// 测试 1: 简单正则
console.log('\n=== 测试 1: 简单正则 ===');
testExecuteJs(`
var mid = src.match(/data-mid="(\\d+)"/)[1];
mid;
`, html);

// 测试 2: 带转义的正则
console.log('\n=== 测试 2: 带转义的正则 ===');
testExecuteJs(`
var mid = src.match(/data\\-mid\\="(\\d+)"/)[1];
mid;
`, html);

// 测试 3: 完整规则
console.log('\n=== 测试 3: 完整规则 ===');
testExecuteJs(`
var mid=src.match(/data\\-mid\\="(\\d+)"/)[1];
java.put("mid",mid)
var r=\`https://api-get-v2.mgsearcher.com/api/manga/get?mid=\${mid}&mode=all\`
r;
`, html);
