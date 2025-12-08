/**
 * 测试全免漫画 API
 */
import { httpRequest } from './src/main/debug/http-client';

async function test() {
  const url = 'https://api-cdn.kaimanhua.com/comic-api/v2/comic/getcomicdata?comic_id=86351&client-type=android&productname=qmmh&client-channel=xiaomi&platformname=android&client-version=1.4.8';
  
  console.log('请求:', url);
  const result = await httpRequest({
    url,
    headers: {
      'User-Agent': 'okhttp/4.9.1',
    }
  });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  console.log('响应长度:', result.body?.length);
  console.log('响应预览:', result.body?.substring(0, 500));
  
  // 尝试解析 JSON
  try {
    const json = JSON.parse(result.body || '{}');
    console.log('\nJSON keys:', Object.keys(json));
    console.log('data keys:', Object.keys(json.data || {}));
    console.log('chapters:', json.data?.chapters?.length);
  } catch (e: any) {
    console.log('JSON 解析失败:', e.message);
  }
}

test().catch(console.error);
