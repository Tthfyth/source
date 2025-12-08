/**
 * 测试好看漫画目录解析
 */
import { httpRequest } from './src/main/debug/http-client';
import { parseList, parseFromElement, ParseContext } from './src/main/debug/rule-parser';

async function test() {
  // 先获取详情
  const detailUrl = 'https://www.9comic.cn/comic22/book/show?id=102&imei=aanid10d10df686793008';
  console.log('请求详情:', detailUrl);
  
  const detailResult = await httpRequest({ url: detailUrl });
  if (!detailResult.success) {
    console.log('详情请求失败:', detailResult.error);
    return;
  }
  
  console.log('详情响应长度:', detailResult.body?.length);
  
  // 解析 JSON
  const json = JSON.parse(detailResult.body || '{}');
  console.log('data 数组长度:', json.data?.length);
  
  if (json.data?.length > 0) {
    console.log('第一章:', JSON.stringify(json.data[0]));
  }
  
  // 测试 parseList
  const ctx: ParseContext = {
    body: detailResult.body || '',
    baseUrl: 'https://www.9comic.cn',
    variables: {}
  };
  
  const chapters = parseList(ctx, '$.data[*]');
  console.log('\nparseList 结果:', chapters.length, '章');
  
  if (chapters.length > 0) {
    const first: any = chapters[0];
    console.log('第一章对象:', JSON.stringify(first).substring(0, 200));
    console.log('第一章 id:', first.id);
    console.log('第一章 name:', first.name);
  }
}

test().catch(console.error);
