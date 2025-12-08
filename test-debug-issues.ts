/**
 * 调试各图源的具体问题
 */
import { httpRequest } from './src/main/debug/http-client';
import * as cheerio from 'cheerio';
import { parseList, parseFromElement, ParseContext } from './src/main/debug/rule-parser';

// 1. 包子漫画 - 目录规则问题
async function debugBaozi() {
  console.log('\n=== 包子漫画 目录调试 ===');
  
  const url = 'https://cn.bzmanga.com/comic/hzw-one-piece';
  const result = await httpRequest({ url, headers: { 'User-Agent': 'Mozilla/5.0' } });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  const $ = cheerio.load(result.body || '');
  
  // 测试各种目录选择器
  console.log('选择器测试:');
  console.log('  .comics-chapters__item:', $('.comics-chapters__item').length);
  console.log('  .section-title:', $('.section-title').length);
  console.log('  a[href*="chapter"]:', $('a[href*="chapter"]').length);
  
  // 打印章节目录区域
  const chapterItems = $('.comics-chapters__item');
  if (chapterItems.length > 0) {
    console.log('\n前3个章节:');
    chapterItems.slice(0, 3).each((i, el) => {
      console.log(`  [${i + 1}] ${$(el).text().trim()} - ${$(el).attr('href')}`);
    });
  }
}

// 2. 腾讯漫画 - 目录规则问题
async function debugTencent() {
  console.log('\n=== 腾讯漫画 目录调试 ===');
  
  const url = 'https://m.ac.qq.com/comic/index/id/531040';
  const result = await httpRequest({ 
    url, 
    headers: { 'User-Agent': 'Mozilla/5.0 (Android 9; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0' } 
  });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  const $ = cheerio.load(result.body || '');
  
  console.log('选择器测试:');
  console.log('  class.chapter-wrap:', $('[class*="chapter"]').length);
  console.log('  .chapter-wrap:', $('.chapter-wrap').length);
  console.log('  .chapter-wrap a:', $('.chapter-wrap a').length);
  console.log('  .chapter-list:', $('.chapter-list').length);
  console.log('  .chapter-list a:', $('.chapter-list a').length);
  console.log('  a[href*="chapter"]:', $('a[href*="chapter"]').length);
  
  // 查找所有包含 chapter 的类
  const chapterClasses: string[] = [];
  $('[class*="chapter"]').each((_, el) => {
    const cls = $(el).attr('class');
    if (cls && !chapterClasses.includes(cls)) chapterClasses.push(cls);
  });
  console.log('包含chapter的类:', chapterClasses.slice(0, 10));
  
  // 打印页面中的链接
  const links = $('a[href*="/chapter/"]');
  if (links.length > 0) {
    console.log('\n章节链接:');
    links.slice(0, 5).each((i, el) => {
      console.log(`  [${i + 1}] ${$(el).text().trim().substring(0, 30)} - ${$(el).attr('href')}`);
    });
  }
}

// 3. 漫画屋 - 正文规则问题
async function debugMhua() {
  console.log('\n=== 漫画屋 正文调试 ===');
  
  // 先获取目录
  const detailUrl = 'https://www.mhua5.com/index.php/comic/doupocangkong';
  const detailResult = await httpRequest({ 
    url: detailUrl, 
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 9) AppleWebKit/537.36' } 
  });
  
  if (!detailResult.success) {
    console.log('详情请求失败:', detailResult.error);
    return;
  }
  
  const $detail = cheerio.load(detailResult.body || '');
  
  // 获取第一章链接
  const chapterList = $detail('.clearfix li a');
  console.log('章节数量:', chapterList.length);
  
  if (chapterList.length === 0) {
    // 尝试其他选择器
    console.log('尝试其他选择器:');
    console.log('  ul li a:', $detail('ul li a').length);
    console.log('  .chapter-list a:', $detail('.chapter-list a').length);
    console.log('  a[href*="chapter"]:', $detail('a[href*="chapter"]').length);
    return;
  }
  
  const firstChapterHref = chapterList.last().attr('href');
  console.log('第一章链接:', firstChapterHref);
  
  if (!firstChapterHref) return;
  
  const chapterUrl = firstChapterHref.startsWith('http') ? firstChapterHref : 'https://www.mhua5.com' + firstChapterHref;
  console.log('完整URL:', chapterUrl);
  
  // 获取正文
  const contentResult = await httpRequest({ 
    url: chapterUrl, 
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 9) AppleWebKit/537.36' } 
  });
  
  if (!contentResult.success) {
    console.log('正文请求失败:', contentResult.error);
    return;
  }
  
  const $content = cheerio.load(contentResult.body || '');
  
  console.log('\n正文选择器测试:');
  console.log('  class.comic-list:', $content('.comic-list').length);
  console.log('  .comic-list li:', $content('.comic-list li').length);
  console.log('  .comic-list img:', $content('.comic-list img').length);
  console.log('  img[data-src]:', $content('img[data-src]').length);
  console.log('  img[src]:', $content('img[src]').length);
  
  // 打印图片
  const images = $content('.comic-list img, img[data-src]');
  if (images.length > 0) {
    console.log('\n前3张图片:');
    images.slice(0, 3).each((i, el) => {
      console.log(`  [${i + 1}] src=${$content(el).attr('src')?.substring(0, 50)} data-src=${$content(el).attr('data-src')?.substring(0, 50)}`);
    });
  }
}

// 4. 漫畫狗 - 目录规则问题 (!0 排除语法)
async function debugDogeManga() {
  console.log('\n=== 漫畫狗 目录调试 ===');
  
  const url = 'https://dogemanga.com/m/3E6-dFJl';
  const result = await httpRequest({ 
    url, 
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' } 
  });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  const $ = cheerio.load(result.body || '');
  
  console.log('选择器测试:');
  console.log('  .site-selector:', $('.site-selector').length);
  console.log('  .site-selector option:', $('.site-selector option').length);
  console.log('  select option:', $('select option').length);
  
  // 规则: -class.site-selector@tag.option!0
  // 意思是: 倒序，class.site-selector 下的 option，排除第0个
  const options = $('.site-selector option');
  if (options.length > 0) {
    console.log('\n章节选项 (前5个):');
    options.slice(0, 5).each((i, el) => {
      console.log(`  [${i}] ${$(el).text().trim().substring(0, 30)} - value=${$(el).attr('value')}`);
    });
  }
}

// 5. 知音漫客 - 详情URL重复问题
async function debugZymk() {
  console.log('\n=== 知音漫客 详情调试 ===');
  
  // 搜索结果中的URL有重复问题
  const searchUrl = 'https://m.zymk.cn/sort/all.html';
  const result = await httpRequest({ 
    url: searchUrl, 
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36' } 
  });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  const $ = cheerio.load(result.body || '');
  
  // 测试搜索列表规则
  const ctx: ParseContext = {
    body: result.body || '',
    baseUrl: 'https://m.zymk.cn',
    variables: {}
  };
  
  const elements = parseList(ctx, '.comic-sort li');
  console.log('列表元素数量:', elements.length);
  
  if (elements.length > 0) {
    const firstEl = elements[0];
    
    // 测试各种URL规则
    const urlRules = [
      '.comic-item a@href',
      '.thumbnail a@href',
      'a@href',
      'tag.a.0@href'
    ];
    
    console.log('\nURL规则测试:');
    for (const rule of urlRules) {
      const urlResult = parseFromElement(firstEl, rule, 'https://m.zymk.cn', {});
      console.log(`  "${rule}": ${urlResult.success ? urlResult.data : '失败'}`);
    }
    
    // 打印元素HTML
    if (firstEl.html) {
      console.log('\n第一个元素HTML:');
      console.log(firstEl.html()?.substring(0, 500));
    }
  }
}

async function main() {
  await debugBaozi();
  await debugTencent();
  await debugMhua();
  await debugDogeManga();
  await debugZymk();
}

main().catch(console.error);
