/**
 * 测试 G社漫画目录
 */
import { httpRequest } from './src/main/debug/http-client';

async function test() {
  const url = 'https://manhuafree.com/manga/doupocangqiong-zhiyinmankerenxiang';
  const result = await httpRequest({ url });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  const body = result.body || '';
  console.log('长度:', body.length);
  
  // 搜索 chapters
  const idx = body.indexOf('chapters');
  if (idx > 0) {
    console.log('chapters 上下文:', body.substring(idx - 50, idx + 200));
  }
  
  // 搜索 JSON 数据
  const scriptMatch = body.match(/<script[^>]*>.*?chapters.*?<\/script>/s);
  if (scriptMatch) {
    console.log('\n找到包含 chapters 的 script:', scriptMatch[0].substring(0, 500));
  }
  
  // 搜索 __NUXT__
  const nuxtMatch = body.match(/__NUXT__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
  if (nuxtMatch) {
    console.log('\n找到 __NUXT__ 数据');
    try {
      // 尝试解析
      const nuxtData = eval('(' + nuxtMatch[1] + ')');
      console.log('NUXT keys:', Object.keys(nuxtData));
    } catch (e: any) {
      console.log('解析失败:', e.message);
    }
  }
}

test().catch(console.error);
