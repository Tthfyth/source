/**
 * 测试好看漫画详情页解析
 */
import { httpRequest } from './src/main/debug/http-client';
import { parseRule, ParseContext } from './src/main/debug/rule-parser';

async function test() {
  const url = 'https://www.9comic.cn/comic22/book/show?id=103&imei=aanid10d';
  const result = await httpRequest({ url });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  const body = result.body || '';
  console.log('响应长度:', body.length);
  console.log('响应预览:', body.substring(0, 500));
  
  // 测试 init 规则
  const initRule = '$.data';
  const ctx: ParseContext = {
    body,
    baseUrl: url,
    variables: {}
  };
  
  console.log('\n=== 测试 init 规则 ===');
  const initResult = parseRule(ctx, initRule);
  console.log('init 结果:', initResult.success ? '成功' : '失败');
  if (initResult.data) {
    const initData = initResult.data;
    console.log('init 数据类型:', typeof initData);
    if (typeof initData === 'object') {
      console.log('init 数据 keys:', Object.keys(initData));
      console.log('init 数据 id:', (initData as any).id);
    }
  }
  
  // 测试 tocUrl 规则
  console.log('\n=== 测试 tocUrl 规则 ===');
  const tocUrlRule = 'https://www.9comic.cn/comic22/book/listChapter?imei=aanid10d10df686793008&id={{$.id}}&p=1&n=10000';
  
  // 使用 init 结果作为 body
  if (initResult.data) {
    const ctx2: ParseContext = {
      body: typeof initResult.data === 'string' ? initResult.data : JSON.stringify(initResult.data),
      baseUrl: url,
      variables: {
        _jsResult: initResult.data
      }
    };
    
    const tocUrlResult = parseRule(ctx2, tocUrlRule);
    console.log('tocUrl 结果:', tocUrlResult);
  }
}

test().catch(console.error);
