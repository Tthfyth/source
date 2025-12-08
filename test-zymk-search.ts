/**
 * 调试知音漫客搜索
 */
import { httpRequest } from './src/main/debug/http-client';
import * as cheerio from 'cheerio';

async function test() {
  // 知音漫客的搜索需要通过分类页面
  // 尝试不同的搜索方式
  
  const testUrls = [
    // 分类页面带搜索参数
    'https://m.zymk.cn/sort/all.html?key=斗罗',
    // 直接分类页面
    'https://m.zymk.cn/sort/all.html',
    // PC版搜索
    'https://www.zymk.cn/search.html?keyword=斗罗',
    // 尝试 API
    'https://www.zymk.cn/search/getSearchResult?keyword=斗罗&page=1',
  ];
  
  for (const url of testUrls) {
    console.log(`\n=== 测试: ${url} ===`);
    
    const result = await httpRequest({
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://m.zymk.cn/'
      }
    });
    
    if (!result.success) {
      console.log('请求失败:', result.error);
      continue;
    }
    
    console.log('状态:', result.statusCode);
    console.log('长度:', result.body?.length);
    
    // 检查是否是 JSON
    if (result.body?.startsWith('{') || result.body?.startsWith('[')) {
      console.log('JSON 响应:', result.body?.substring(0, 500));
      continue;
    }
    
    const $ = cheerio.load(result.body || '');
    
    // 查找漫画列表
    console.log('页面标题:', $('title').text());
    
    // 尝试各种选择器
    const selectors = [
      '.comic-sort li',
      '.comic-list li',
      '.search-list li',
      '.list-comic li',
      'ul li a',
    ];
    
    for (const sel of selectors) {
      const count = $(sel).length;
      if (count > 0) {
        console.log(`选择器 "${sel}": ${count} 个`);
        // 打印第一个
        const first = $(sel).first();
        console.log('  第一个:', first.text().substring(0, 50));
        console.log('  链接:', first.find('a').attr('href') || first.attr('href'));
      }
    }
    
    // 如果找到 comic-sort，打印详细信息
    if ($('.comic-sort li').length > 0) {
      console.log('\n--- 漫画列表详情 ---');
      $('.comic-sort li').slice(0, 3).each((i, el) => {
        const $el = $(el);
        console.log(`[${i + 1}]`);
        console.log('  HTML:', $el.html()?.substring(0, 200));
      });
    }
  }
}

test().catch(console.error);
