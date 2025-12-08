/**
 * 测试可靠的异次元图源
 * 专注于国内可直接访问的图源
 */
import { YiciyuanDebugger, isYiciyuanSource } from './src/main/debug/yiciyuan-debugger';

// 精选可靠图源
const testSources = [
  // 1. 包子漫画cn (已验证)
  {
    name: "包子漫画cn",
    source: {
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
      "ruleChapterList": ".comics-chapters__item",
      "ruleChapterName": "text",
      "ruleContentUrl": "href"
    },
    keyword: "海贼王"
  },
  // 2. G站漫画 (已验证)
  {
    name: "G站漫画",
    source: {
      "bookSourceName": "◯ G站",
      "bookSourceUrl": "https://m.g-mh.org",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
      "ruleSearchUrl": "https://m.g-mh.org/s/searchKey",
      "ruleSearchList": ".slicarda&&.pb-2",
      "ruleSearchName": "h3@text",
      "ruleSearchNoteUrl": "a@href",
      "ruleSearchCoverUrl": "img@src",
      "ruleBookAuthor": ".text-small@a@text",
      "ruleIntroduce": ".line-clamp-4@text",
      "ruleChapterUrl": "@js:\nid = \"#bookmarkData\"; ai = \"data-mid\";\ni = org.jsoup.Jsoup.parse(result).select(id).attr(ai);\np = \"https://api-get-v2.mgsearcher.com/api/\";\nu = p + \"manga/get?mid=\" + i + \"&mode=all\";\njava.put(\"id\", i);\nu",
      "ruleChapterList": "data.chapters",
      "ruleChapterName": "$.attributes.title"
    },
    keyword: "斗罗"
  },
  // 3. 漫画屋
  {
    name: "漫画屋",
    source: {
      "bookSourceName": "漫画屋",
      "bookSourceUrl": "https://www.mhua5.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 9; PACM00 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.5359.79 Mobile Safari/537.36",
      "ruleSearchUrl": "https://www.mhua5.com/index.php/search?key=searchKey",
      "ruleSearchList": "class.comic-list-item clearfix||class.comic-item",
      "ruleSearchName": "class.comic-name@text",
      "ruleSearchNoteUrl": "tag.a.0@href",
      "ruleSearchCoverUrl": "class.cover@data-src",
      "ruleSearchAuthor": "class.comic-author@text",
      "ruleSearchLastChapter": "class.comic-tip@text",
      "ruleBookName": "class.comic-name@h1@text",
      "ruleBookAuthor": "class.au-name@text",
      "ruleIntroduce": "class.comic-intro@text",
      "ruleChapterList": "-class.clearfix@li",
      "ruleChapterName": "tag.a@text",
      "ruleContentUrl": "tag.a@href"
    },
    keyword: "斗破苍穹"
  },
  // 4. 奇漫屋
  {
    name: "奇漫屋",
    source: {
      "bookSourceName": "奇漫屋₁",
      "bookSourceUrl": "http://m.qiman53.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android) Mobile",
      "ruleSearchUrl": "http://m.qiman53.com/spotlight?keyword=searchKey",
      "ruleSearchList": ".comic-list-item",
      "ruleSearchName": ".comic-name>a@text",
      "ruleSearchNoteUrl": ".comic-name>a@href",
      "ruleSearchCoverUrl": ".cover>img@src",
      "ruleSearchAuthor": ".comic-author@text",
      "ruleBookName": "class.box-back2@tag.h1@text",
      "ruleBookAuthor": "class.txtItme.-4@text",
      "ruleIntroduce": "class.comic-intro@text",
      "ruleCoverUrl": "class.box-back1@tag.img@src"
    },
    keyword: "火影"
  },
  // 5. 漫畫狗
  {
    name: "漫畫狗",
    source: {
      "bookSourceName": "漫畫狗",
      "bookSourceUrl": "https://dogemanga.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.102 Safari/537.36",
      "ruleSearchUrl": "https://dogemanga.com/?q=searchKey&o=0",
      "ruleSearchList": ".col-12",
      "ruleSearchName": "tag.h5@text",
      "ruleSearchNoteUrl": "tag.a.0@href",
      "ruleSearchCoverUrl": "tag.img@src",
      "ruleSearchAuthor": "tag.h6@text",
      "ruleBookName": "tag.h3@text",
      "ruleBookAuthor": "tag.h4@text",
      "ruleIntroduce": "class.text-truncate@text"
    },
    keyword: "进击的巨人"
  },
  // 6. 腾讯漫画
  {
    name: "腾讯漫画",
    source: {
      "bookSourceName": "腾讯漫画",
      "bookSourceUrl": "https://m.ac.qq.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Android 9; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0",
      "ruleSearchUrl": "https://m.ac.qq.com/search/result?word=searchKey",
      "ruleSearchList": "class.comic-item",
      "ruleSearchName": "class.comic-title@text",
      "ruleSearchNoteUrl": "class.comic-link@href",
      "ruleSearchCoverUrl": "class.comic-cover@tag.img@src",
      "ruleSearchKind": "class.comic-tag@text",
      "ruleBookName": "li.head-info-title@h1@text",
      "ruleBookAuthor": "li.author-wr@text",
      "ruleIntroduce": "class.head-info-desc@text"
    },
    keyword: "斗破苍穹"
  },
  // 7. 知音漫客 - 使用分类页面作为搜索（该站搜索需要JS）
  {
    name: "知音漫客",
    source: {
      "bookSourceName": "知音漫客📱💡",
      "bookSourceUrl": "https://m.zymk.cn",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "ruleSearchUrl": "https://m.zymk.cn/sort/all.html",
      "ruleSearchList": ".comic-sort li",
      "ruleSearchName": ".comic-item a@title",
      "ruleSearchNoteUrl": ".comic-item a@href",
      "ruleSearchCoverUrl": ".comic-item img@data-src",
      "ruleBookName": "h1.name@text",
      "ruleBookAuthor": "class.author@text",
      "ruleIntroduce": "class.comic-detail@tag.p.0@text"
    },
    keyword: "斗罗"
  },
  // 8. 漫客栈API
  {
    name: "漫客栈API",
    source: {
      "bookSourceName": "漫客栈-A",
      "bookSourceUrl": "http://comic.mkzhan.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 12; Redmi K30 Pro) AppleWebKit/537.36",
      "ruleSearchUrl": "https://comic.mkzhan.com/search/keyword/?keyword=searchKey&page_num=1&page_size=20",
      "ruleSearchList": "$.data.list.*",
      "ruleSearchName": "$.title",
      "ruleSearchNoteUrl": "https://comic.mkzhan.com/comic/info/?comic_id={$.comic_id}",
      "ruleSearchCoverUrl": "$.cover",
      "ruleSearchAuthor": "$.author_title",
      "ruleBookName": "$.data.title",
      "ruleIntroduce": "$.data.content"
    },
    keyword: "斗破"
  },
  // 9. 波洞漫画
  {
    name: "波洞漫画",
    source: {
      "bookSourceName": "波洞",
      "bookSourceUrl": "http://ikmmh.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15",
      "ruleSearchUrl": "http://ikmmh.com/search?searchkey=searchKey",
      "ruleSearchList": "id.js_comicSortList@tag.li",
      "ruleSearchName": "class.title@text",
      "ruleSearchNoteUrl": "tag.a@href",
      "ruleSearchCoverUrl": "img.img@src",
      "ruleBookName": "[property=\"og:title\"]@content",
      "ruleBookAuthor": "[property=\"og:cartoon:author\"]@content",
      "ruleIntroduce": "[property=\"og:description\"]@content"
    },
    keyword: "海贼王"
  },
  // 10. 酷看漫画
  {
    name: "酷看漫画",
    source: {
      "bookSourceName": "酷看漫画",
      "bookSourceUrl": "https://www.kukk.net",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:34.0) Gecko/20100101 Firefox/34.0",
      "ruleSearchUrl": "https://www.kukk.net/search?keyword=searchKey",
      "ruleSearchList": "class.mh-item",
      "ruleSearchName": "tag.h2@text",
      "ruleSearchNoteUrl": "tag.a@href",
      "ruleSearchCoverUrl": "class.mh-cover@style",
      "ruleBookName": "class.info@h1@text",
      "ruleBookAuthor": "class.subtitle.1@text",
      "ruleIntroduce": "class.content@text"
    },
    keyword: "火影"
  }
];

interface TestResult {
  name: string;
  success: boolean;
  bookCount?: number;
  time: number;
  reason?: string;
  firstBook?: string;
}

async function testSource(item: { name: string; source: any; keyword: string }, index: number): Promise<TestResult> {
  const startTime = Date.now();
  process.stdout.write(`[${String(index + 1).padStart(2, '0')}/10] ${item.name.padEnd(12)} `);

  if (!isYiciyuanSource(item.source)) {
    console.log('⚠️  非异次元格式');
    return { name: item.name, success: false, reason: '非异次元格式', time: 0 };
  }

  const debugger_ = new YiciyuanDebugger(item.source);

  try {
    const searchResult = await debugger_.debugSearch(item.keyword);
    const elapsed = Date.now() - startTime;
    
    if (!searchResult.success) {
      const errMsg = searchResult.error?.substring(0, 25) || '未知错误';
      console.log(`❌ ${errMsg} (${elapsed}ms)`);
      return { name: item.name, success: false, reason: errMsg, time: elapsed };
    }

    const bookCount = searchResult.parsedItems?.length || 0;
    if (bookCount === 0) {
      console.log(`  无结果 (${elapsed}ms)`);
      return { name: item.name, success: false, reason: '无搜索结果', time: elapsed };
    }

    const firstBook = String(searchResult.parsedItems![0].name || '(无名称)');
    console.log(`     ${bookCount}本 "${firstBook.substring(0, 15)}" (${elapsed}ms)`);
    return { name: item.name, success: true, bookCount, time: elapsed, firstBook };
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    const errMsg = error.message?.substring(0, 25) || '异常';
    console.log(` ${errMsg} (${elapsed}ms)`);
    return { name: item.name, success: false, reason: errMsg, time: elapsed };
  }
}

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           异次元图源可用性测试 (10个精选图源)             ║');
  console.log('║           ' + new Date().toLocaleString() + '                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  const results: TestResult[] = [];

  for (let i = 0; i < testSources.length; i++) {
    const result = await testSource(testSources[i], i);
    results.push(result);
  }

  const successResults = results.filter(r => r.success);
  const failResults = results.filter(r => !r.success);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                      测 试 结 果 汇 总');
  console.log('═══════════════════════════════════════════════════════════');
  
  if (successResults.length > 0) {
    console.log('');
    console.log('✅ 可用图源:');
    for (const r of successResults) {
      console.log(`   • ${r.name} - ${r.bookCount}本 (${r.time}ms)`);
    }
  }
  
  if (failResults.length > 0) {
    console.log('');
    console.log('❌ 不可用图源:');
    for (const r of failResults) {
      console.log(`   • ${r.name} - ${r.reason}`);
    }
  }
  
  console.log('');
  console.log('───────────────────────────────────────────────────────────');
  console.log(`📊 统计: ${successResults.length}/${results.length} 可用 (${((successResults.length / results.length) * 100).toFixed(0)}%)`);
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(console.error);
