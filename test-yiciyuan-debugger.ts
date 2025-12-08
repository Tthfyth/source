/**
 * 异次元图源调试器测试
 * 测试最新的异次元图源
 */
import { YiciyuanDebugger, isYiciyuanSource } from './src/main/debug/yiciyuan-debugger';

// 测试图源列表
const testSources = [
  {
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
    "ruleContentUrl": "href",
    "ruleBookContent": ".comic-contain img@src"
  },
  {
    "bookSourceName": "巴卡漫画",
    "bookSourceUrl": "https://bakamh.ru",
    "bookSourceType": "漫画",
    "enable": true,
    "httpUserAgent": "Mozilla/5.0 (Linux; U; Android 16; zh-cn) AppleWebKit/537.36 Chrome/135.0.7049.79 Mobile Safari/537.36",
    "ruleSearchUrl": "https://bakamh.ru/page/searchPage/?s=searchKey&post_type=wp-manga",
    "ruleSearchList": "//*[@id=\"loop-content\"]/div",
    "ruleSearchName": "//h3/a/text()",
    "ruleSearchNoteUrl": "//h3/a/@href",
    "ruleSearchCoverUrl": ".img-responsive@src",
    "ruleBookName": "//h1/text()",
    "ruleBookAuthor": "//div[5]/div[2]/div/a/text()",
    "ruleIntroduce": "//div[11]/div/p/text()",
    "ruleChapterList": "-//li[contains(@class, 'chapter-loveYou')]/a",
    "ruleChapterName": "text",
    "ruleContentUrl": "storage-chapter-url",
    "ruleBookContent": "//img[@class=\"wp-manga-chapter-img\"]/@src"
  }
];

async function testSource(source: any) {
  console.log('\n' + '='.repeat(60));
  console.log(`测试图源: ${source.bookSourceName}`);
  console.log(`源地址: ${source.bookSourceUrl}`);
  console.log('='.repeat(60));

  // 检测是否为异次元图源
  const isYiciyuan = isYiciyuanSource(source);
  console.log(`源格式检测: ${isYiciyuan ? '异次元图源' : 'Legado图源'}`);

  if (!isYiciyuan) {
    console.log('跳过非异次元图源');
    return;
  }

  const debugger_ = new YiciyuanDebugger(source);

  // 测试搜索
  console.log('\n--- 搜索测试 ---');
  try {
    const searchResult = await debugger_.debugSearch('漫画');
    console.log(`搜索结果: ${searchResult.success ? '成功' : '失败'}`);
    if (searchResult.parsedItems && searchResult.parsedItems.length > 0) {
      console.log(`找到 ${searchResult.parsedItems.length} 本漫画`);
      // 显示前3个结果
      searchResult.parsedItems.slice(0, 3).forEach((book: any, i: number) => {
        console.log(`  [${i + 1}] ${book.name || '(无名称)'} - ${book.author || '(无作者)'}`);
        if (book.bookUrl) console.log(`      URL: ${book.bookUrl}`);
      });
    }
    // 显示日志
    searchResult.logs.slice(-5).forEach(log => {
      console.log(`  [${log.category}] ${log.message}`);
    });
  } catch (error: any) {
    console.log(`搜索异常: ${error.message}`);
  }
}

async function main() {
  console.log('异次元图源调试器测试');
  console.log('测试时间:', new Date().toLocaleString());

  for (const source of testSources) {
    await testSource(source);
  }

  console.log('\n测试完成');
}

main().catch(console.error);
