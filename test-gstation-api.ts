/**
 * 测试G站API响应格式
 */
import { httpRequest } from './src/main/debug/http-client';

async function testApi() {
  const url = 'https://api-get-v2.mgsearcher.com/api/manga/get?mid=133&mode=all';
  
  console.log('请求API:', url);
  const result = await httpRequest({
    url,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      'Referer': 'https://m.g-mh.org/',
    },
  });
  
  if (result.success) {
    console.log('请求成功');
    const body = result.body || '';
    console.log('响应长度:', body.length);
    
    // 尝试解析JSON
    try {
      const json = JSON.parse(body);
      console.log('JSON解析成功');
      console.log('顶层键:', Object.keys(json));
      
      if (json.data) {
        console.log('data键:', Object.keys(json.data));
        if (json.data.chapters) {
          console.log('chapters类型:', typeof json.data.chapters);
          console.log('chapters长度:', Array.isArray(json.data.chapters) ? json.data.chapters.length : 'N/A');
          if (Array.isArray(json.data.chapters) && json.data.chapters.length > 0) {
            console.log('第一个章节:', JSON.stringify(json.data.chapters[0], null, 2));
          }
        }
      }
    } catch (e: any) {
      console.log('JSON解析失败:', e.message);
      console.log('响应前500字符:', body.substring(0, 500));
    }
  } else {
    console.log('请求失败:', result.error);
  }
}

testApi().catch(console.error);
