/**
 * 多图源测试
 * 测试最新的异次元图源
 */
import { YiciyuanDebugger, isYiciyuanSource } from './src/main/debug/yiciyuan-debugger';

// 测试图源列表
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
      "ruleBookName": "h1.comics-detail__title@text",
      "ruleBookAuthor": "h2.comics-detail__author@text",
      "ruleIntroduce": "p.comics-detail__desc@text",
      "ruleCoverUrl": ".pure-u-1-1 amp-img@src",
      "ruleChapterList": ".comics-chapters__item",
      "ruleChapterName": "text",
      "ruleContentUrl": "a@href",
      "ruleBookContent": "amp-img@src"
    },
    keyword: "海贼王"
  },
  {
    name: "如漫画",
    source: {
      "bookSourceName": "如漫画",
      "bookSourceUrl": "http://rumanhua1.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
      "ruleSearchUrl": "http://rumanhua1.com/s@k=searchKey",
      "ruleSearchList": "$.data[*]",
      "ruleSearchName": ".name",
      "ruleSearchNoteUrl": "http://rumanhua1.com/{$.id}",
      "ruleSearchCoverUrl": ".imgurl",
      "ruleSearchAuthor": ".authorName",
      "ruleBookName": "tag.h1@text",
      "ruleBookAuthor": "tag.p.2@text",
      "ruleIntroduce": ".cartoon-introduction@text",
      "ruleCoverUrl": ".book-cover img@data-src",
      "ruleChapterList": ".chaplist-box a",
      "ruleChapterName": "text",
      "ruleContentUrl": "@href",
      "ruleBookContent": ".readerContainer img@src"
    },
    keyword: "斗罗"
  },
  {
    name: "鸟鸟韩漫",
    source: {
      "bookSourceName": "鸟鸟韩漫",
      "bookSourceUrl": "https://nnhanman5.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      "ruleSearchUrl": "https://nnhanman5.com/catalog.php?key=searchKey",
      "ruleSearchList": "class.comic-list .comic-item",
      "ruleSearchName": "class.comic-title@text",
      "ruleSearchNoteUrl": "tag.a@href",
      "ruleSearchCoverUrl": "class.comic-cover img@data-src|src",
      "ruleBookName": "tag.h1@text",
      "ruleIntroduce": "class.comic-desc@text",
      "ruleBookKind": "class.tag-list a@text",
      "ruleCoverUrl": "class.comic-cover img@src",
      "ruleChapterList": "class.chapter-list li a",
      "ruleChapterName": "text",
      "ruleContentUrl": "@js:baseUrl",
      "ruleBookContent": "class.image-list img@data-src|src"
    },
    keyword: "漫画"
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
      "ruleBookKind": ".text-sm@.p-1@text",
      "ruleChapterUrl": "@js:\nid = \"#bookmarkData\"; ai = \"data-mid\";\ni = org.jsoup.Jsoup.parse(result).select(id).attr(ai);\np = \"https://api-get-v2.mgsearcher.com/api/\";\nu = p + \"manga/get?mid=\" + i + \"&mode=all\";\njava.put(\"id\", i);\nu",
      "ruleChapterList": "data.chapters",
      "ruleChapterName": "$.attributes.title",
      "ruleContentUrl": "$.id\n@js:\np = \"https://api-get-v2.mgsearcher.com/api/\";\na = \"chapter/getinfo?m=\" + java.get(\"id\") + \"&c=\";\nu = p + a + result;\nu",
      "ruleBookContent": "@js:\nsrc = JSON.parse(result).data.info.images.images;\np = \"https://f40-1-4.g-mh.online\";\nimg = src.map(i => p + i.url);\nimg"
    },
    keyword: "火影"
  },
  {
    name: "WNACG",
    source: {
      "bookSourceName": "WNACG",
      "bookSourceUrl": "https://www.wnacg.com",
      "bookSourceType": "漫画",
      "enable": true,
      "httpUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      "ruleSearchUrl": "https://www.wnacg.com/search/index.php?sname=searchKey&page=searchPage",
      "ruleSearchList": "css:.gallary_item",
      "ruleSearchName": "css:.title@text",
      "ruleSearchNoteUrl": "css:a@href",
      "ruleSearchCoverUrl": "css:.pic_box img@src",
      "ruleSearchAuthor": "css:.info@text",
      "ruleBookName": "css:h2.uwconn@text",
      "ruleBookAuthor": "css:.uwuinfo li:nth-child(1)@text",
      "ruleIntroduce": "css:.uwuinfo@text",
      "ruleCoverUrl": "css:.uwthumb img@src",
      "ruleChapterList": "css:.pic_box a",
      "ruleChapterName": "attr:title",
      "ruleContentUrl": "attr:href",
      "ruleBookContent": "css:.pic_box img@src"
    },
    keyword: "原神"
  }
];

async function testSource(item: { name: string; source: any; keyword: string }) {
  console.log('\n' + '═'.repeat(60));
  console.log(`📚 ${item.name}`);
  console.log(`🔗 ${item.source.bookSourceUrl}`);
  console.log('═'.repeat(60));

  // 检测源格式
  const isYiciyuan = isYiciyuanSource(item.source);
  console.log(`📋 格式: ${isYiciyuan ? '异次元图源 ✓' : 'Legado图源'}`);

  if (!isYiciyuan) {
    console.log('⚠️  跳过非异次元图源');
    return { name: item.name, success: false, reason: '非异次元格式' };
  }

  const debugger_ = new YiciyuanDebugger(item.source);

  try {
    // 搜索测试
    console.log(`\n🔍 搜索: "${item.keyword}"`);
    const searchResult = await debugger_.debugSearch(item.keyword);
    
    if (!searchResult.success) {
      console.log(`❌ 搜索失败: ${searchResult.error}`);
      return { name: item.name, success: false, reason: searchResult.error };
    }

    const bookCount = searchResult.parsedItems?.length || 0;
    console.log(`✅ 找到 ${bookCount} 本漫画`);

    if (bookCount > 0) {
      // 显示前3个结果
      searchResult.parsedItems!.slice(0, 3).forEach((book: any, i: number) => {
        console.log(`   [${i + 1}] ${book.name || '(无名称)'}`);
      });

      // 测试详情
      const firstBook = searchResult.parsedItems![0];
      if (firstBook.bookUrl) {
        console.log(`\n📖 详情测试: ${firstBook.name}`);
        const detailResult = await debugger_.debugBookInfo(firstBook.bookUrl);
        
        if (detailResult.success && detailResult.parsedItems?.length) {
          const info = detailResult.parsedItems[0];
          console.log(`   书名: ${info.name || '(未获取)'}`);
          console.log(`   作者: ${info.author || '(未获取)'}`);
          console.log(`   简介: ${(info.intro || '(未获取)').substring(0, 50)}...`);
        } else {
          console.log(`   ⚠️ 详情获取失败`);
        }

        // 测试目录
        console.log(`\n📑 目录测试`);
        const tocResult = await debugger_.debugToc(firstBook.bookUrl);
        
        if (tocResult.success && tocResult.parsedItems?.length) {
          console.log(`   ✅ 共 ${tocResult.parsedItems.length} 个章节`);
          tocResult.parsedItems.slice(0, 3).forEach((ch: any, i: number) => {
            console.log(`   [${i + 1}] ${ch.name || '(无名称)'}`);
          });
        } else {
          console.log(`   ⚠️ 目录获取失败`);
        }
      }
    }

    return { name: item.name, success: true, bookCount };
  } catch (error: any) {
    console.log(`❌ 异常: ${error.message}`);
    return { name: item.name, success: false, reason: error.message };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           异次元图源批量测试                               ║');
  console.log('║           测试时间: ' + new Date().toLocaleString() + '              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results: any[] = [];

  for (const item of testSources) {
    const result = await testSource(item);
    results.push(result);
  }

  // 汇总结果
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                     测试结果汇总                           ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  
  let successCount = 0;
  for (const r of results) {
    const status = r.success ? '✅' : '❌';
    const detail = r.success ? `${r.bookCount} 本` : r.reason?.substring(0, 20) || '失败';
    console.log(`║ ${status} ${r.name.padEnd(15)} ${detail.padEnd(30)} ║`);
    if (r.success) successCount++;
  }
  
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ 总计: ${successCount}/${results.length} 个图源测试通过                          ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
}

main().catch(console.error);
