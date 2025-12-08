/**
 * 直接调试 executeJs
 */
import * as vm from 'vm';

// 从 rule-parser.ts 复制的简化版 executeJs
function executeJs(
  code: string,
  context: {
    result: any;
    src: string;
    baseUrl: string;
    variables: Record<string, any>;
  }
): any {
  try {
    console.log('[executeJs] 输入代码:', code.substring(0, 100) + '...');
    console.log('[executeJs] src 长度:', context.src.length);
    
    // 预处理 {{}} 变量 - 在 JS 执行前替换
    let preprocessedCode = code;
    const jsResult = context.variables._jsResult || context.result;
    
    // 替换 {{$.xxx}} 格式的 JSONPath 变量
    preprocessedCode = preprocessedCode.replace(/\{\{\$\.([^}]+)\}\}/g, (_, path) => {
      if (jsResult && typeof jsResult === 'object') {
        const value = path.split('.').reduce((obj: any, key: string) => obj?.[key], jsResult);
        return value !== undefined ? String(value) : '';
      }
      return '';
    });
    
    console.log('[executeJs] 预处理后代码:', preprocessedCode.substring(0, 100) + '...');
    
    const sandbox: any = {
      result: jsResult,
      src: context.src,
      baseUrl: context.baseUrl,
      java: {
        put: (key: string, value: any) => {
          context.variables[key] = value;
          console.log(`[executeJs] java.put("${key}", "${value}")`);
        },
        get: (key: string) => context.variables[key],
      },
      console,
    };

    const vmContext = vm.createContext(sandbox);
    const script = new vm.Script(preprocessedCode);
    const result = script.runInContext(vmContext, { timeout: 5000 });
    console.log('[executeJs] 执行结果:', result);
    return result;
  } catch (error: any) {
    console.error('[executeJs] 执行错误:', error.message);
    return null;
  }
}

// 测试
import { httpRequest } from './src/main/debug/http-client';

async function test() {
  const url = 'https://manhuafree.com/manga/doupocangqiong-zhiyinmankerenxiang';
  const result = await httpRequest({ url });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  const body = result.body || '';
  console.log('响应长度:', body.length);
  
  const jsCode = `
var mid=src.match(/data\\-mid\\="(\\d+)"/)[1];
java.put("mid",mid)
var r=\`https://api-get-v2.mgsearcher.com/api/manga/get?mid=\${mid}&mode=all\`
r;
`;

  console.log('\nJS 代码:', jsCode);
  
  const execResult = executeJs(jsCode, {
    result: null,
    src: body,
    baseUrl: url,
    variables: {}
  });
  
  console.log('\n最终结果:', execResult);
}

test().catch(console.error);
