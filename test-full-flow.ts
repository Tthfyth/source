/**
 * 完整流程测试：搜索 -> 详情 -> 目录 -> 正文
 * 测试成功的图源
 */
import { YiciyuanDebugger } from './src/main/debug/yiciyuan-debugger';

const testSources = [
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
      "ruleContentUrl": "href",
      "ruleBookContent": "amp-img@src"
    },
    keyword: "海贼王"
  },
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
      "ruleContentUrl": "$.id\n@js:\np = \"https://api-get-v2.mgsearcher.com/api/\";\na = \"chapter/getinfo?m=\" + java.get(\"id\") + \"&c=\";\nu = p + a + result;\nu",
      "ruleBookContent": "@js:\nsrc = JSON.parse(result).data.info.images.images;\np = \"https://f40-1-4.g-mh.online\";\nimg = src.map(i => p + i.url);\nimg"
    },
    keyword: "斗罗"
  },
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
      "ruleIntroduce": "class.head-info-desc@text",
      "ruleCoverUrl": "div.head-banner@img@src",
      "ruleChapterList": "class.chapter-list@tag.a",
      "ruleChapterName": "class.chapter-title@text||text",
      "ruleContentUrl": "href",
      "ruleBookContent": "class.comic-page@tag.img@data-src"
    },
    keyword: "斗破苍穹"
  },
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
      "ruleContentUrl": "href",
      "ruleBookContent": "class.comiclist@tag.img@data-src"
    },
    keyword: "火影"
  },
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
      "ruleBookName": "class.comic-name@h1@text",
      "ruleBookAuthor": "class.au-name@text",
      "ruleIntroduce": "class.comic-intro@text",
      "ruleCoverUrl": "class.box-back@style",
      "ruleChapterList": "-class.list-wrap@tag.a",
      "ruleChapterName": "text",
      "ruleContentUrl": "href",
      "ruleBookContent": "class.comic-list@tag.img@data-src||class.comic-list@tag.img@src"
    },
    keyword: "斗破苍穹"
  },
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
      "ruleIntroduce": "class.text-truncate@text",
      "ruleCoverUrl": "class.site-manga__cover-image@src",
      "ruleChapterList": "-class.site-selector@tag.option!0",
      "ruleChapterName": "text",
      "ruleContentUrl": "value",
      "ruleBookContent": "class.site-reader__image@data-page-image-url"
    },
    keyword: "进击的巨人"
  },
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
      "ruleSearchName": ".thumbnail a@title",
      "ruleSearchNoteUrl": ".thumbnail a@href",
      "ruleSearchCoverUrl": ".thumbnail img@data-src",
      "ruleBookName": "h1.name@text",
      "ruleBookAuthor": "class.author@text",
      "ruleIntroduce": "class.comic-detail@tag.p.0@text",
      "ruleCoverUrl": ".cover-bg img@data-src",
      "ruleChapterList": "-class.chapterlist@tag.li",
      "ruleChapterName": "tag.a@title",
      "ruleContentUrl": "tag.a@href",
      "ruleBookContent": "class.comic-page@tag.img@data-original||class.comic-contain@tag.img@data-src"
    },
    keyword: "凤逆天下"
  }
];

async function testFullFlow(item: typeof testSources[0]) {
  console.log('\n' + '═'.repeat(70));
  console.log(`📚 ${item.name}`);
  console.log(`🔗 ${item.source.bookSourceUrl}`);
  console.log('═'.repeat(70));

  const debugger_ = new YiciyuanDebugger(item.source);
  
  // 1. 搜索测试
  console.log('\n【1. 搜索测试】');
  console.log(`   关键词: ${item.keyword}`);
  
  const searchResult = await debugger_.debugSearch(item.keyword);
  if (!searchResult.success || !searchResult.parsedItems?.length) {
    console.log(`   ❌ 搜索失败: ${searchResult.error || '无结果'}`);
    return { name: item.name, search: false, detail: false, toc: false, content: false };
  }
  
  const books = searchResult.parsedItems;
  console.log(`   ✅ 找到 ${books.length} 本漫画`);
  books.slice(0, 3).forEach((book: any, i: number) => {
    console.log(`      [${i + 1}] ${book.name || '(无名称)'}`);
  });
  
  // 获取第一本书的URL
  const firstBook = books[0];
  const bookUrl = firstBook.bookUrl;
  if (!bookUrl) {
    console.log('   ⚠️ 无法获取书籍URL');
    return { name: item.name, search: true, detail: false, toc: false, content: false };
  }
  
  // 2. 详情测试
  console.log('\n【2. 详情测试】');
  console.log(`   URL: ${bookUrl.substring(0, 60)}...`);
  
  const detailResult = await debugger_.debugBookInfo(bookUrl);
  if (!detailResult.success) {
    console.log(`   ❌ 详情失败: ${detailResult.error}`);
    return { name: item.name, search: true, detail: false, toc: false, content: false };
  }
  
  const bookInfo: any = detailResult.parsedItems;
  console.log(`   ✅ 详情获取成功`);
  console.log(`      书名: ${bookInfo?.name || '(未获取)'}`);
  console.log(`      作者: ${bookInfo?.author || '(未获取)'}`);
  const intro = bookInfo?.intro ? String(bookInfo.intro) : '';
  console.log(`      简介: ${intro.substring(0, 50)}...`);
  
  // 3. 目录测试
  console.log('\n【3. 目录测试】');
  
  const tocResult = await debugger_.debugToc(bookUrl);
  if (!tocResult.success || !tocResult.parsedItems?.length) {
    console.log(`   ❌ 目录失败: ${tocResult.error || '无章节'}`);
    return { name: item.name, search: true, detail: true, toc: false, content: false };
  }
  
  const chapters = tocResult.parsedItems;
  console.log(`   ✅ 共 ${chapters.length} 个章节`);
  chapters.slice(0, 3).forEach((ch: any, i: number) => {
    console.log(`      [${i + 1}] ${ch.name || '(无名称)'}`);
  });
  
  // 获取第一章的URL
  const firstChapter = chapters[0];
  const chapterUrl = firstChapter.url;
  if (!chapterUrl) {
    console.log('   ⚠️ 无法获取章节URL');
    return { name: item.name, search: true, detail: true, toc: true, content: false };
  }
  
  // 4. 正文测试
  console.log('\n【4. 正文测试】');
  console.log(`   章节: ${firstChapter.name || '第一章'}`);
  
  const contentResult = await debugger_.debugContent(chapterUrl);
  if (!contentResult.success) {
    console.log(`   ❌ 正文失败: ${contentResult.error}`);
    return { name: item.name, search: true, detail: true, toc: true, content: false };
  }
  
  const content = contentResult.parsedItems;
  const images = Array.isArray(content) ? content : (content ? [content] : []);
  
  if (images.length === 0) {
    console.log(`   ⚠️ 未获取到图片`);
    return { name: item.name, search: true, detail: true, toc: true, content: false };
  }
  
  console.log(`   ✅ 获取到 ${images.length} 张图片`);
  images.slice(0, 3).forEach((img: any, i: number) => {
    const imgUrl = String(img);
    console.log(`      [${i + 1}] ${imgUrl.substring(0, 50)}...`);
  });
  
  return { name: item.name, search: true, detail: true, toc: true, content: true };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║              异次元图源完整流程测试                                  ║');
  console.log('║              搜索 → 详情 → 目录 → 正文                               ║');
  console.log('║              ' + new Date().toLocaleString() + '                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  const results: any[] = [];
  
  for (const source of testSources) {
    try {
      const result = await testFullFlow(source);
      results.push(result);
    } catch (error: any) {
      console.log(`\n❌ ${source.name} 测试异常: ${error.message}`);
      results.push({ name: source.name, search: false, detail: false, toc: false, content: false });
    }
  }

  // 汇总
  console.log('\n\n' + '═'.repeat(70));
  console.log('                          测 试 结 果 汇 总');
  console.log('═'.repeat(70));
  console.log('\n图源名称          搜索    详情    目录    正文    状态');
  console.log('─'.repeat(70));
  
  let fullSuccess = 0;
  for (const r of results) {
    const s = r.search ? '✅' : '❌';
    const d = r.detail ? '✅' : '❌';
    const t = r.toc ? '✅' : '❌';
    const c = r.content ? '✅' : '❌';
    const allPass = r.search && r.detail && r.toc && r.content;
    const status = allPass ? '🎉 完美' : (r.search ? '⚠️ 部分' : '❌ 失败');
    if (allPass) fullSuccess++;
    console.log(`${r.name.padEnd(16)}  ${s}      ${d}      ${t}      ${c}      ${status}`);
  }
  
  console.log('─'.repeat(70));
  console.log(`\n📊 完整通过: ${fullSuccess}/${results.length} 个图源`);
  console.log('═'.repeat(70));
}

main().catch(console.error);
