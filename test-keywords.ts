/**
 * 测试不同关键词
 */
import { httpRequest } from './src/main/debug/http-client';

const tests = [
  { name: '武芊漫画', url: 'https://comic.mkzcdn.com/search/keyword/?keyword=一人之下&page_num=1&page_size=20' },
  { name: '好看漫画', url: 'https://www.9comic.cn/comic22/so/comic?keyword=一人之下&p=&ver=2.0' },
  { name: '知音漫客', url: 'https://m.zymk.cn/sort/all.html?key=斗罗' },
  { name: '漫客栈子', url: 'https://comic.mkzhan.com/search/keyword/?keyword=一人之下&page_num=1&page_size=20' },
  { name: '快看漫画', url: 'https://search.kkmh.com/search/complex?q=一人之下' },
];

async function test() {
  for (const t of tests) {
    console.log(`\n${t.name}: ${t.url.substring(0, 60)}...`);
    const result = await httpRequest({ url: t.url });
    if (result.success) {
      console.log(`  状态: ${result.statusCode}, 长度: ${result.body?.length}`);
      console.log(`  预览: ${result.body?.substring(0, 200)}`);
    } else {
      console.log(`  失败: ${result.error}`);
    }
  }
}

test().catch(console.error);
