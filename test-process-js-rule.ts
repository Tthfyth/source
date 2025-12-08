/**
 * 直接测试 processJsRule 和 executeJs
 */
import * as vm from 'vm';

// 简化版 executeJs
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
    console.log('[executeJs] 代码长度:', code.length);
    console.log('[executeJs] src 长度:', context.src.length);
    
    const sandbox: any = {
      result: context.result,
      src: context.src,
      baseUrl: context.baseUrl,
      java: {
        put: (key: string, value: any) => {
          context.variables[key] = value;
        },
        get: (key: string) => context.variables[key],
      },
      console,
    };

    const vmContext = vm.createContext(sandbox);
    const script = new vm.Script(code);
    const result = script.runInContext(vmContext, { timeout: 5000 });
    console.log('[executeJs] 结果:', result);
    return result;
  } catch (error: any) {
    console.error('[executeJs] 错误:', error.message);
    return null;
  }
}

// 简化版 processJsRule
function processJsRule(
  rule: string,
  context: {
    result: any;
    src: string;
    baseUrl: string;
    variables: Record<string, any>;
  }
): { processed: string; hasJs: boolean; jsResult: any } {
  let processed = rule;
  let hasJs = false;
  let jsResult: any = null;

  console.log('[processJsRule] 输入规则长度:', rule.length);
  console.log('[processJsRule] 输入规则预览:', rule.substring(0, 100));

  // 处理 <js>...</js>
  const jsTagRegex = /<js>([\s\S]*?)<\/js>/gi;
  let match;
  while ((match = jsTagRegex.exec(rule)) !== null) {
    hasJs = true;
    const jsCode = match[1];
    console.log('[processJsRule] 提取 JS 代码长度:', jsCode.length);
    console.log('[processJsRule] 提取 JS 代码预览:', jsCode.substring(0, 100));
    jsResult = executeJs(jsCode, context);
    console.log('[processJsRule] JS 执行结果:', jsResult);
    processed = processed.replace(
      match[0],
      jsResult !== null ? String(jsResult) : ''
    );
  }

  console.log('[processJsRule] hasJs:', hasJs);
  console.log('[processJsRule] jsResult:', jsResult);
  console.log('[processJsRule] processed:', processed.substring(0, 100));

  return { processed, hasJs, jsResult };
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
  
  const rule = `<js>
var mid=src.match(/data\\-mid\\="(\\d+)"/)[1];
java.put("mid",mid)
var r=\`https://api-get-v2.mgsearcher.com/api/manga/get?mid=\${mid}&mode=all\`
r;
</js>`;

  console.log('\n规则:', rule);
  
  const context = {
    result: null,
    src: body,
    baseUrl: url,
    variables: {}
  };
  
  const processResult = processJsRule(rule, context);
  console.log('\n最终结果:', processResult);
}

test().catch(console.error);
