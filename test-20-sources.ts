/**
 * 测试20个异次元图源
 * 从 https://www.yck2025.com/yiciyuan/tuyuan/index.html 挑选
 * 修复了 class.xxx 格式被错误识别为 JSON 路径的问题
 */
import { YiciyuanDebugger, isYiciyuanSource } from './src/main/debug/yiciyuan-debugger';

// 20个测试图源（优化后的配置）
const testSources = [
  // 1. 包子漫画cn (已验证可用)
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
      "ruleSearchAuthor": ".tags@text",
      "ruleBookName": "h1.comics-detail__title@text",
      "ruleBookAuthor": "h2.comics-detail__author@text",
      "ruleIntroduce": "p.comics-detail__desc@text",
      "ruleCoverUrl": ".pure-u-1-1 amp-img@src",
      "ruleChapterList": ".comics-chapters__item",
      "ruleChapterName": "text",
      "ruleContentUrl": "href"
    },
    keyword: "海贼王"
  },
  // 2. G站漫画 (已验证可用)
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
      "ruleChapterName": "$.attributes.title",
      "ruleContentUrl": "$.id\n@js:\np = \"https://api-get-v2.mgsearcher.com/api/\";\na = \"chapter/getinfo?m=\" + java.get(\"id\") + \"&c=\";\nu = p + a + result;\nu"
    },
    keyword: "斗罗"
  },
  // 3. 腾讯漫画
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
      "ruleSearchLastChapter": "class.comic-update@text",
      "ruleBookName": "li.head-info-title@h1@text",
      "ruleBookAuthor": "li.author-wr@text",
      "ruleIntroduce": "class.head-info-desc@text",
      "ruleCoverUrl": "div.head-banner@img@src"
    },
    keyword: "斗破苍穹"
  },
  // 4. 酷看漫画
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
      "ruleSearchLastChapter": "class.chapter@tag.a@text",
      "ruleBookName": "class.info@h1@text",
      "ruleBookAuthor": "class.subtitle.1@text",
      "ruleIntroduce": "class.content@text",
      "ruleCoverUrl": "class.cover@tag.img.0@src",
      "ruleChapterList": "id.detail-list-select@tag.a",
      "ruleChapterName": "text",
      "ruleContentUrl": "href"
    },
    keyword: "火影"
  },
  // 5. 风车漫画
  {
    name: "风车漫画",
    source: {
      "bookSourceName": "风车漫画",
      "bookSourceUrl": "https://m.qyy158.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android) Mobile",
      "ruleSearchUrl": "https://m.qyy158.com/search/?searchkey=searchKey",
      "ruleSearchList": "class.block-content@tag.li||class.cartoon-block-box@tag.li",
      "ruleSearchName": "class.article-info@tag.a.0@text||class.cart-info@tag.p@text",
      "ruleSearchNoteUrl": "tag.a.0@href",
      "ruleSearchCoverUrl": "tag.img@src",
      "ruleSearchAuthor": "class.article-info@tag.a.1@text",
      "ruleBookAuthor": "tag.p.2@text",
      "ruleIntroduce": "class.article-desc@text",
      "ruleChapterList": "class.chapter-list@tag.a",
      "ruleChapterName": "text",
      "ruleContentUrl": "href",
      "ruleBookContent": "img.lazy-img@data-original"
    },
    keyword: "斗罗"
  },
  // 6. 波洞漫画
  {
    name: "波洞漫画",
    source: {
      "bookSourceName": "波洞",
      "bookSourceUrl": "http://ikmmh.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
      "ruleSearchUrl": "http://ikmmh.com/search?searchkey=searchKey",
      "ruleSearchList": "id.js_comicSortList@tag.li",
      "ruleSearchName": "class.title@text",
      "ruleSearchNoteUrl": "tag.a@href",
      "ruleSearchCoverUrl": "img.img@src",
      "ruleSearchLastChapter": "span.chapter@text",
      "ruleBookName": "[property=\"og:title\"]@content",
      "ruleBookAuthor": "[property=\"og:cartoon:author\"]@content",
      "ruleIntroduce": "[property=\"og:description\"]@content",
      "ruleCoverUrl": "meta[property=\"og:image\"]@content"
    },
    keyword: "海贼王"
  },
  // 7. 漫客栈
  {
    name: "漫客栈",
    source: {
      "bookSourceName": "漫客栈-A",
      "bookSourceUrl": "http://comic.mkzhan.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 12; Redmi K30 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36",
      "ruleSearchUrl": "https://comic.mkzhan.com/search/keyword/?keyword=searchKey&page_num=1&page_size=20",
      "ruleSearchList": "$.data.list.*",
      "ruleSearchName": "$.title",
      "ruleSearchNoteUrl": "https://comic.mkzhan.com/comic/info/?comic_id={$.comic_id}",
      "ruleSearchCoverUrl": "$.cover",
      "ruleSearchAuthor": "$.author_title",
      "ruleSearchLastChapter": "$.chapter_title",
      "ruleBookName": "$.data.title",
      "ruleBookLastChapter": "$.data.chapter_title",
      "ruleIntroduce": "$.data.content",
      "ruleChapterList": "$.data.*",
      "ruleChapterName": "$.title",
      "ruleChapterUrl": "https://comic.mkzhan.com/chapter/?comic_id={$.data.comic_id}"
    },
    keyword: "斗破"
  },
  // 8. 知音漫客
  {
    name: "知音漫客",
    source: {
      "bookSourceName": "知音漫客📱💡",
      "bookSourceUrl": "https://m.zymk.cn",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "ruleSearchUrl": "https://m.zymk.cn/sort/all.html?key=searchKey",
      "ruleSearchList": "class.comic-sort@tag.li",
      "ruleSearchName": "tag.h3@text",
      "ruleSearchNoteUrl": "tag.a.0@href",
      "ruleSearchCoverUrl": "tag.img@data-src",
      "ruleSearchLastChapter": "tag.span.0@text",
      "ruleBookName": "h1.name@text",
      "ruleBookAuthor": "class.author@text",
      "ruleIntroduce": "class.comic-detail@tag.p.0@text",
      "ruleCoverUrl": ".cover-bg img@data-src",
      "ruleBookKind": "class.tags-box@text"
    },
    keyword: "斗罗"
  },
  // 9. 包子漫画₁
  {
    name: "包子漫画₁",
    source: {
      "bookSourceName": "包子漫画₁",
      "bookSourceUrl": "https://cn.baozimh.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:34.0) Gecko/20100101 Firefox/34.0",
      "ruleSearchUrl": "https://cn.baozimh.com/search?q=searchKey",
      "ruleSearchList": ".comics-card",
      "ruleSearchName": ".comics-card__title@text",
      "ruleSearchNoteUrl": "tag.a.0@href",
      "ruleSearchCoverUrl": "amp-img@src",
      "ruleSearchAuthor": ".tags@text",
      "ruleBookName": "h1.comics-detail__title@text",
      "ruleBookAuthor": "h2.comics-detail__author@text",
      "ruleIntroduce": "p.comics-detail__desc@text",
      "ruleCoverUrl": ".pure-u-1-1 amp-img@src"
    },
    keyword: "一拳超人"
  },
  // 10. 漫画1234
  {
    name: "漫画1234",
    source: {
      "bookSourceName": "漫画1234",
      "bookSourceUrl": "https://www.hmh1234.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "ruleSearchUrl": "https://www.hmh1234.com/search?keyword=searchKey",
      "ruleSearchList": ".mh-item",
      "ruleSearchName": "h2.title@text",
      "ruleSearchNoteUrl": "a@href",
      "ruleSearchCoverUrl": ".mh-cover@style",
      "ruleBookName": ".info h1@text",
      "ruleIntroduce": ".content@text"
    },
    keyword: "海贼王"
  },
  // 11. 来漫画
  {
    name: "来漫画",
    source: {
      "bookSourceName": "来漫画",
      "bookSourceUrl": "https://www.laimanhua8.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "ruleSearchUrl": "https://www.laimanhua8.com/search/?keywords=searchKey",
      "ruleSearchList": ".mh-item",
      "ruleSearchName": "h2.title@text",
      "ruleSearchNoteUrl": "a@href",
      "ruleSearchCoverUrl": ".mh-cover@style"
    },
    keyword: "火影"
  },
  // 12. 漫画屋
  {
    name: "漫画屋",
    source: {
      "bookSourceName": "漫画屋",
      "bookSourceUrl": "https://www.mhua5.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "ruleSearchUrl": "https://www.mhua5.com/search/?keywords=searchKey",
      "ruleSearchList": ".mh-item",
      "ruleSearchName": "h2.title@text",
      "ruleSearchNoteUrl": "a@href",
      "ruleSearchCoverUrl": ".mh-cover@style"
    },
    keyword: "斗破"
  },
  // 13. 漫百库
  {
    name: "漫百库",
    source: {
      "bookSourceName": "漫百库",
      "bookSourceUrl": "https://www.manhuabaiku.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "ruleSearchUrl": "https://www.manhuabaiku.com/search/?keywords=searchKey",
      "ruleSearchList": ".mh-item",
      "ruleSearchName": "h2.title@text",
      "ruleSearchNoteUrl": "a@href",
      "ruleSearchCoverUrl": ".mh-cover@style"
    },
    keyword: "进击的巨人"
  },
  // 14. 聚合漫画屋
  {
    name: "聚合漫画屋",
    source: {
      "bookSourceName": "聚合漫画屋",
      "bookSourceUrl": "https://www.52hah.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "ruleSearchUrl": "https://www.52hah.com/search/?keywords=searchKey",
      "ruleSearchList": ".mh-item",
      "ruleSearchName": "h2.title@text",
      "ruleSearchNoteUrl": "a@href",
      "ruleSearchCoverUrl": ".mh-cover@style"
    },
    keyword: "海贼王"
  },
  // 15. ACG漫画网
  {
    name: "ACG漫画网",
    source: {
      "bookSourceName": "ACG漫画网",
      "bookSourceUrl": "https://www.acgomh.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "ruleSearchUrl": "https://www.acgomh.com/search/?keywords=searchKey",
      "ruleSearchList": ".mh-item",
      "ruleSearchName": "h2.title@text",
      "ruleSearchNoteUrl": "a@href",
      "ruleSearchCoverUrl": ".mh-cover@style"
    },
    keyword: "鬼灭之刃"
  },
  // 16. 笔趣阁漫画
  {
    name: "笔趣阁漫画",
    source: {
      "bookSourceName": "笔趣阁漫画",
      "bookSourceUrl": "https://www.biqug.org",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "ruleSearchUrl": "https://www.biqug.org/search/?keywords=searchKey",
      "ruleSearchList": ".mh-item",
      "ruleSearchName": "h2.title@text",
      "ruleSearchNoteUrl": "a@href",
      "ruleSearchCoverUrl": ".mh-cover@style"
    },
    keyword: "斗罗"
  },
  // 17. 仙漫网
  {
    name: "仙漫网",
    source: {
      "bookSourceName": "仙漫网",
      "bookSourceUrl": "https://m.gaonaojin.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "ruleSearchUrl": "https://m.gaonaojin.com/search/?keywords=searchKey",
      "ruleSearchList": ".mh-item",
      "ruleSearchName": "h2.title@text",
      "ruleSearchNoteUrl": "a@href",
      "ruleSearchCoverUrl": ".mh-cover@style"
    },
    keyword: "火影"
  },
  // 18. 好漫8
  {
    name: "好漫8",
    source: {
      "bookSourceName": "好漫8",
      "bookSourceUrl": "http://www.haoman8.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "ruleSearchUrl": "http://www.haoman8.com/search/?keywords=searchKey",
      "ruleSearchList": ".mh-item",
      "ruleSearchName": "h2.title@text",
      "ruleSearchNoteUrl": "a@href",
      "ruleSearchCoverUrl": ".mh-cover@style"
    },
    keyword: "海贼王"
  },
  // 19. 拼拼漫画
  {
    name: "拼拼漫画",
    source: {
      "bookSourceName": "拼拼漫画📱🍙",
      "bookSourceUrl": "https://m.pinmh.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "ruleSearchUrl": "https://m.pinmh.com/search/?keywords=searchKey",
      "ruleSearchList": ".mh-item",
      "ruleSearchName": "h2.title@text",
      "ruleSearchNoteUrl": "a@href",
      "ruleSearchCoverUrl": ".mh-cover@style"
    },
    keyword: "斗破"
  },
  // 20. 亲亲漫画
  {
    name: "亲亲漫画",
    source: {
      "bookSourceName": "亲亲漫画-M",
      "bookSourceUrl": "https://m.acgqd.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "ruleSearchUrl": "https://m.acgqd.com/search/?keywords=searchKey",
      "ruleSearchList": ".mh-item",
      "ruleSearchName": "h2.title@text",
      "ruleSearchNoteUrl": "a@href",
      "ruleSearchCoverUrl": ".mh-cover@style"
    },
    keyword: "火影"
  }
];

async function testSource(item: { name: string; source: any; keyword: string }, index: number) {
  const startTime = Date.now();
  console.log(`\n[${index + 1}/20] 📚 ${item.name}`);
  console.log(`     🔗 ${item.source.bookSourceUrl}`);

  // 检测源格式
  const isYiciyuan = isYiciyuanSource(item.source);
  if (!isYiciyuan) {
    console.log(`     ⚠️  非异次元格式，跳过`);
    return { name: item.name, success: false, reason: '非异次元格式', time: 0 };
  }

  const debugger_ = new YiciyuanDebugger(item.source);

  try {
    // 搜索测试
    const searchResult = await debugger_.debugSearch(item.keyword);
    const elapsed = Date.now() - startTime;
    
    if (!searchResult.success) {
      console.log(`     ❌ 搜索失败: ${searchResult.error?.substring(0, 50) || '未知错误'}`);
      return { name: item.name, success: false, reason: searchResult.error?.substring(0, 30) || '搜索失败', time: elapsed };
    }

    const bookCount = searchResult.parsedItems?.length || 0;
    if (bookCount === 0) {
      console.log(`     ⚠️  搜索无结果 (${elapsed}ms)`);
      return { name: item.name, success: false, reason: '无搜索结果', time: elapsed };
    }

    console.log(`     ✅ 找到 ${bookCount} 本漫画 (${elapsed}ms)`);
    
    // 显示前2个结果
    searchResult.parsedItems!.slice(0, 2).forEach((book: any, i: number) => {
      console.log(`        [${i + 1}] ${book.name || '(无名称)'}`);
    });

    return { name: item.name, success: true, bookCount, time: elapsed };
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.log(`     ❌ 异常: ${error.message?.substring(0, 50) || '未知错误'}`);
    return { name: item.name, success: false, reason: error.message?.substring(0, 30) || '异常', time: elapsed };
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              异次元图源批量测试 (20个图源)                   ║');
  console.log('║              测试时间: ' + new Date().toLocaleString() + '                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const results: any[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < testSources.length; i++) {
    const result = await testSource(testSources[i], i);
    results.push(result);
    if (result.success) successCount++;
    else failCount++;
  }

  // 汇总结果
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                       测试结果汇总                           ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  
  // 成功的图源
  console.log('║ ✅ 成功的图源:                                               ║');
  for (const r of results.filter(r => r.success)) {
    const info = `${r.name} (${r.bookCount}本, ${r.time}ms)`;
    console.log(`║    ${info.padEnd(54)} ║`);
  }
  
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║ ❌ 失败的图源:                                               ║');
  for (const r of results.filter(r => !r.success)) {
    const info = `${r.name}: ${r.reason || '未知'}`;
    console.log(`║    ${info.padEnd(54)} ║`);
  }
  
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║ 📊 总计: ${successCount} 成功 / ${failCount} 失败 / ${results.length} 总数                        ║`);
  console.log(`║ 📈 成功率: ${((successCount / results.length) * 100).toFixed(1)}%                                          ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

main().catch(console.error);
