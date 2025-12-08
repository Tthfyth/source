/**
 * 深入调试腾讯漫画和知音漫客
 */
import { httpRequest } from './src/main/debug/http-client';
import * as cheerio from 'cheerio';

async function debugTencentComic() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                    腾讯漫画搜索调试');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const url = 'https://m.ac.qq.com/search/result?word=斗破苍穹';
  console.log('请求URL:', url);
  
  const result = await httpRequest({
    url,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Android 9; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0'
    }
  });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  console.log('响应状态:', result.statusCode);
  console.log('响应长度:', result.body?.length);
  
  const $ = cheerio.load(result.body || '');
  
  // 测试各种选择器
  console.log('\n--- 选择器测试 ---');
  console.log('.comic-item 数量:', $('.comic-item').length);
  
  // 解析搜索结果
  if ($('.comic-item').length > 0) {
    console.log('\n--- 搜索结果 ---');
    $('.comic-item').each((i, el) => {
      if (i >= 3) return;
      const $item = $(el);
      console.log(`[${i + 1}]`);
      console.log('  名称:', $item.find('.comic-title').text());
      console.log('  链接:', $item.find('.comic-link').attr('href'));
      console.log('  封面:', $item.find('.comic-cover img').attr('src'));
      console.log('  标签:', $item.find('.comic-tag').text());
      console.log('  更新:', $item.find('.comic-update').text());
    });
  }
}

async function debugZymk() {
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('                    知音漫客搜索调试');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // 尝试不同的搜索URL
  const urls = [
    'https://m.zymk.cn/sort/all.html?key=斗罗',
    'https://m.zymk.cn/search.html?keyword=斗罗',
    'https://m.zymk.cn/search?keyword=斗罗',
    'https://www.zymk.cn/search.html?keyword=斗罗'
  ];
  
  for (const url of urls) {
    console.log('\n--- 测试URL:', url, '---');
    
    const result = await httpRequest({
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
      }
    });
    
    if (!result.success) {
      console.log('请求失败:', result.error);
      continue;
    }
    
    console.log('响应状态:', result.statusCode);
    console.log('响应长度:', result.body?.length);
    
    const $ = cheerio.load(result.body || '');
    
    // 测试各种选择器
    console.log('选择器测试:');
    console.log('  .comic-sort li:', $('.comic-sort li').length);
    console.log('  .comic-list li:', $('.comic-list li').length);
    console.log('  .search-result li:', $('.search-result li').length);
    console.log('  .list-comic li:', $('.list-comic li').length);
    console.log('  ul li:', $('ul li').length);
    
    // 查找所有包含漫画相关的类
    const classes: string[] = [];
    $('[class]').each((_, el) => {
      const cls = $(el).attr('class');
      if (cls && (cls.includes('comic') || cls.includes('list') || cls.includes('search'))) {
        if (!classes.includes(cls)) classes.push(cls);
      }
    });
    console.log('相关类名:', classes.slice(0, 15));
    
    // 如果找到结果就停止
    if ($('.comic-sort li').length > 0 || $('.comic-list li').length > 0) {
      console.log('\n--- 搜索结果 ---');
      const items = $('.comic-sort li, .comic-list li');
      items.each((i, el) => {
        if (i >= 3) return;
        const $item = $(el);
        console.log(`[${i + 1}]`);
        console.log('  HTML:', $item.html()?.substring(0, 200));
      });
      break;
    }
    
    // 打印页面标题和部分内容
    console.log('页面标题:', $('title').text());
    console.log('页面预览:', result.body?.substring(0, 500));
  }
}

async function debugZymkApi() {
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('                  知音漫客API搜索调试');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // 尝试API搜索
  const apiUrl = 'https://m.zymk.cn/app_api/v5/getsortlist/?key=斗罗&page=1';
  console.log('API URL:', apiUrl);
  
  const result = await httpRequest({
    url: apiUrl,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
      'Referer': 'https://m.zymk.cn/'
    }
  });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  console.log('响应状态:', result.statusCode);
  console.log('响应:', result.body?.substring(0, 1000));
}

async function main() {
  await debugTencentComic();
  await debugZymk();
  await debugZymkApi();
}

main().catch(console.error);
