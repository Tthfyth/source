/**
 * 调试搜索规则解析
 */
import { httpRequest } from './src/main/debug/http-client';
import * as cheerio from 'cheerio';

async function debugTencentComic() {
  console.log('=== 腾讯漫画搜索调试 ===\n');
  
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
  
  // 尝试不同的选择器
  console.log('\n--- 选择器测试 ---');
  console.log('class.comic-item:', $('class.comic-item').length);
  console.log('.comic-item:', $('.comic-item').length);
  console.log('[class="comic-item"]:', $('[class="comic-item"]').length);
  console.log('[class*="comic-item"]:', $('[class*="comic-item"]').length);
  console.log('.mod-search-result:', $('.mod-search-result').length);
  console.log('.search-result:', $('.search-result').length);
  
  // 打印页面结构
  console.log('\n--- 页面结构 ---');
  console.log('body children:', $('body').children().length);
  
  // 查找所有包含 comic 的类
  const comicClasses: string[] = [];
  $('[class*="comic"]').each((_, el) => {
    const cls = $(el).attr('class');
    if (cls && !comicClasses.includes(cls)) {
      comicClasses.push(cls);
    }
  });
  console.log('包含comic的类:', comicClasses.slice(0, 10));
  
  // 打印前500字符
  console.log('\n--- 响应预览 ---');
  console.log(result.body?.substring(0, 1000));
}

async function debugZymk() {
  console.log('\n\n=== 知音漫客搜索调试 ===\n');
  
  const url = 'https://m.zymk.cn/sort/all.html?key=斗罗';
  console.log('请求URL:', url);
  
  const result = await httpRequest({
    url,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  console.log('响应状态:', result.statusCode);
  console.log('响应长度:', result.body?.length);
  
  const $ = cheerio.load(result.body || '');
  
  console.log('\n--- 选择器测试 ---');
  console.log('class.comic-sort:', $('class.comic-sort').length);
  console.log('.comic-sort:', $('.comic-sort').length);
  console.log('.comic-sort li:', $('.comic-sort li').length);
  console.log('.comic-list:', $('.comic-list').length);
  console.log('.comic-item:', $('.comic-item').length);
  
  // 查找所有包含 comic 的类
  const comicClasses: string[] = [];
  $('[class*="comic"]').each((_, el) => {
    const cls = $(el).attr('class');
    if (cls && !comicClasses.includes(cls)) {
      comicClasses.push(cls);
    }
  });
  console.log('包含comic的类:', comicClasses.slice(0, 10));
}

async function debugMkzhan() {
  console.log('\n\n=== 漫客栈API搜索调试 ===\n');
  
  const url = 'https://comic.mkzhan.com/search/keyword/?keyword=斗破&page_num=1&page_size=20';
  console.log('请求URL:', url);
  
  const result = await httpRequest({
    url,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Redmi K30 Pro) AppleWebKit/537.36'
    }
  });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  console.log('响应状态:', result.statusCode);
  console.log('响应长度:', result.body?.length);
  
  // 尝试解析JSON
  try {
    const json = JSON.parse(result.body || '');
    console.log('JSON解析成功');
    console.log('顶层键:', Object.keys(json));
    if (json.data) {
      console.log('data键:', Object.keys(json.data));
      if (json.data.list) {
        console.log('list长度:', json.data.list.length);
        if (json.data.list.length > 0) {
          console.log('第一项:', JSON.stringify(json.data.list[0], null, 2).substring(0, 500));
        }
      }
    }
  } catch (e) {
    console.log('JSON解析失败');
    console.log('响应预览:', result.body?.substring(0, 500));
  }
}

async function main() {
  await debugTencentComic();
  await debugZymk();
  await debugMkzhan();
}

main().catch(console.error);
