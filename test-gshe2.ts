/**
 * 测试 G社漫画目录页面
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
  console.log('响应长度:', body.length);
  
  // 搜索 JSON 数据
  const nuxtMatch = body.match(/__NUXT__\s*=\s*\(function\([^)]*\)\{return\s*(\{[\s\S]*?\})\s*\}\(/);
  if (nuxtMatch) {
    console.log('\n找到 __NUXT__ 数据');
    console.log('数据预览:', nuxtMatch[1].substring(0, 500));
  }
  
  // 搜索 chapters
  const chaptersMatch = body.match(/chapters["\s]*:["\s]*\[/);
  if (chaptersMatch) {
    console.log('\n找到 chapters 数组');
    const idx = body.indexOf(chaptersMatch[0]);
    console.log('上下文:', body.substring(idx, idx + 300));
  }
  
  // 搜索 data-mid
  const midMatch = body.match(/data-mid="(\d+)"/);
  if (midMatch) {
    console.log('\n找到 data-mid:', midMatch[1]);
  }
  
  // 搜索 script 标签中的 JSON
  const scriptMatches = body.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
  if (scriptMatches) {
    for (const script of scriptMatches) {
      if (script.includes('chapters')) {
        console.log('\n包含 chapters 的 script:', script.substring(0, 500));
        break;
      }
    }
  }
}

test().catch(console.error);
