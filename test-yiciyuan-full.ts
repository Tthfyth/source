/**
 * 异次元图源完整测试
 * 测试搜索、详情、目录、正文功能
 */
import { YiciyuanDebugger, isYiciyuanSource } from './src/main/debug/yiciyuan-debugger';

// 包子漫画cn 图源
const baoziSource = {
  "bookSourceName": "包子漫画cn",
  "bookSourceUrl": "https://cn.bzmanga.com",
  "bookSourceType": "漫画",
  "enable": true,
  "httpUserAgent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:34.0) Gecko/20100101 Firefox/34.0",
  "ruleSearchUrl": "https://cn.bzmanga.com/search?q=searchKey",
  "ruleSearchList": ".comics-card",
  "ruleSearchName": ".comics-card__title@text",
  "ruleSearchNoteUrl": "tag.a.0@href",
  "ruleSearchCoverUrl": "amp-img@src",
  "ruleBookName": "h1.comics-detail__title@text",
  "ruleBookAuthor": "h2.comics-detail__author@text",
  "ruleIntroduce": "p.comics-detail__desc@text",
  "ruleCoverUrl": ".pure-u-1-1 amp-img@src",
  "ruleChapterList": ".comics-chapters__item",
  "ruleChapterName": "text",
  "ruleContentUrl": "a@href",
  "ruleBookContent": "amp-img@src"
};

async function runFullTest() {
  console.log('异次元图源完整功能测试');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('测试图源:', baoziSource.bookSourceName);
  console.log('');

  const debugger_ = new YiciyuanDebugger(baoziSource);

  // 1. 搜索测试
  console.log('=== 1. 搜索测试 ===');
  const searchResult = await debugger_.debugSearch('一拳超人');
  console.log(`搜索结果: ${searchResult.success ? '成功' : '失败'}`);
  
  let bookUrl = '';
  if (searchResult.parsedItems && searchResult.parsedItems.length > 0) {
    console.log(`找到 ${searchResult.parsedItems.length} 本漫画`);
    const firstBook = searchResult.parsedItems[0];
    console.log(`第一本: ${firstBook.name}`);
    bookUrl = firstBook.bookUrl || '';
    console.log(`详情URL: ${bookUrl}`);
  }
  console.log('');

  // 2. 详情测试
  if (bookUrl) {
    console.log('=== 2. 详情测试 ===');
    const detailResult = await debugger_.debugBookInfo(bookUrl);
    console.log(`详情结果: ${detailResult.success ? '成功' : '失败'}`);
    
    if (detailResult.parsedItems && detailResult.parsedItems.length > 0) {
      const bookInfo = detailResult.parsedItems[0];
      console.log(`书名: ${bookInfo.name || '(未获取)'}`);
      console.log(`作者: ${bookInfo.author || '(未获取)'}`);
      console.log(`简介: ${(bookInfo.intro || '(未获取)').substring(0, 100)}...`);
      console.log(`封面: ${bookInfo.coverUrl || '(未获取)'}`);
      console.log(`目录URL: ${bookInfo.tocUrl || bookUrl}`);
    }
    console.log('');

    // 3. 目录测试
    console.log('=== 3. 目录测试 ===');
    const tocResult = await debugger_.debugToc(bookUrl);
    console.log(`目录结果: ${tocResult.success ? '成功' : '失败'}`);
    
    let chapterUrl = '';
    if (tocResult.parsedItems && tocResult.parsedItems.length > 0) {
      console.log(`共 ${tocResult.parsedItems.length} 个章节`);
      // 显示前5个章节
      tocResult.parsedItems.slice(0, 5).forEach((chapter: any, i: number) => {
        console.log(`  [${i + 1}] ${chapter.name || '(无名称)'}`);
        if (i === 0) chapterUrl = chapter.url || '';
      });
      if (tocResult.parsedItems.length > 5) {
        console.log(`  ... 还有 ${tocResult.parsedItems.length - 5} 个章节`);
      }
    }
    console.log('');

    // 4. 正文测试
    if (chapterUrl) {
      console.log('=== 4. 正文测试 ===');
      console.log(`章节URL: ${chapterUrl}`);
      const contentResult = await debugger_.debugContent(chapterUrl);
      console.log(`正文结果: ${contentResult.success ? '成功' : '失败'}`);
      
      if (contentResult.imageUrls && contentResult.imageUrls.length > 0) {
        console.log(`图片数量: ${contentResult.imageUrls.length}`);
        // 显示前3张图片URL
        contentResult.imageUrls.slice(0, 3).forEach((url: string, i: number) => {
          console.log(`  [${i + 1}] ${url.substring(0, 80)}...`);
        });
      } else {
        console.log('未找到图片');
        // 显示日志帮助调试
        contentResult.logs.forEach(log => {
          console.log(`  [${log.category}] ${log.message}`);
        });
      }
    }
  }

  console.log('\n测试完成!');
}

runFullTest().catch(console.error);
