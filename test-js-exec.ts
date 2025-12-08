/**
 * 测试 JS 执行
 */
import * as vm from 'vm';

const code = `
var mid=src.match(/data\\-mid\\="(\\d+)"/)[1];
java.put("mid",mid)
var r=\`https://api-get-v2.mgsearcher.com/api/manga/get?mid=\${mid}&mode=all\`
r;
`;

const src = `<div id="mangachapters" data-mid="76">`;

console.log('代码:', code);
console.log('src:', src);

const variables: Record<string, any> = {};

const sandbox = {
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
  const result = script.runInContext(context);
  console.log('\n执行结果:', result);
  console.log('variables:', variables);
} catch (e: any) {
  console.log('执行错误:', e.message);
}
