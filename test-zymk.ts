/**
 * 测试知音漫客
 */
import { httpRequest } from './src/main/debug/http-client';

async function test() {
  const url = 'https://m.zymk.cn/sort/all.html?key=斗破苍穹';
  const result = await httpRequest({ url });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  const body = result.body || '';
  console.log('响应长度:', body.length);
  console.log('包含 class="item":', body.includes('class="item"'));
  console.log('包含 class=\'item\':', body.includes("class='item'"));
  console.log('响应预览:', body.substring(0, 1000));
}

test().catch(console.error);
