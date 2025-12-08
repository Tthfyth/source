/**
 * G站漫画调试测试
 */
import { YiciyuanDebugger } from './src/main/debug/yiciyuan-debugger';

// G站完整图源配置
const gStationSource = {
  "bookDelayTime": "",
  "bookSingleThread": "否",
  "bookSourceGroup": "◯ 漫画",
  "bookSourceName": "◯ G站",
  "bookSourceType": "漫画",
  "bookSourceUrl": "https://m.g-mh.org",
  "enable": true,
  "httpUserAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
  "lastUpdateTime": 0,
  "loginUrl": "",
  "loginUrlResult": "",
  "ruleBookAuthor": ".text-small@a@text",
  "ruleBookContent": "@js:\nsrc = JSON.parse(result).data.info.images.images;\np = \"https://f40-1-4.g-mh.online\";\nimg = src.map(i => p + i.url);\nimg@Header:{Referer:\"https://baozimh.org/\"}",
  "ruleBookContentDecoder": "",
  "ruleBookKind": ".text-sm@.p-1@text#\\,",
  "ruleBookLastChapter": "",
  "ruleBookName": "",
  "ruleBookUrlPattern": "",
  "ruleChapterId": "",
  "ruleChapterList": "data.chapters",
  "ruleChapterName": "$.attributes.title\n@js:\na = \" \" + result",
  "ruleChapterParentId": "",
  "ruleChapterParentName": "",
  "ruleChapterUrl": "@js:\nid = \"#bookmarkData\"; ai = \"data-mid\";\ni = org.jsoup.Jsoup.parse(result).select(id).attr(ai);\np = \"https://api-get-v2.mgsearcher.com/api/\";\nu = p + \"manga/get?mid=\" + i + \"&mode=all\";\njava.put(\"id\", i);\nu@Header:{Referer:host}",
  "ruleChapterUrlNext": "",
  "ruleContentUrl": "$.id\n@js:\np = \"https://api-get-v2.mgsearcher.com/api/\";\na = \"chapter/getinfo?m=\" + java.get(\"id\") + \"&c=\";\nu = p + a + result;\nu@Header:{Referer:host}",
  "ruleContentUrlNext": "",
  "ruleCoverDecoder": "",
  "ruleCoverUrl": "",
  "ruleFindUrl": "◯ 主页 ::https://m.g-mh.org/\n\n⚬ 系统 ::/manga-tag/xitong/page/searchPage\n \n⚬ 重生 ::/manga-tag/zhongsheng/page/searchPage",
  "ruleIntroduce": ".line-clamp-4@text#\\\\n",
  "ruleSearchAuthor": "",
  "ruleSearchCoverDecoder": "",
  "ruleSearchCoverUrl": "img@src\n@js:\nresult = String(result).replace(/w=(\\d+)/, \"w=320\");\n@Header:{Referer:host}",
  "ruleSearchKind": "",
  "ruleSearchLastChapter": "",
  "ruleSearchList": ".slicarda&&.pb-2",
  "ruleSearchName": "h3@text\n@js:\njava.put(\"name\",result);",
  "ruleSearchNoteUrl": "a@href",
  "ruleSearchUrl": "https://m.g-mh.org/s/searchKey",
  "ruleSearchUrlNext": "",
  "serialNumber": 6,
  "sourceRemark": "可能要魔法",
  "weight": 8102
};

async function testGStation() {
  console.log('G站漫画完整测试');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('');

  const debugger_ = new YiciyuanDebugger(gStationSource);

  // 1. 搜索测试
  console.log('=== 1. 搜索测试 ===');
  const searchResult = await debugger_.debugSearch('斗罗大陆');
  console.log(`搜索结果: ${searchResult.success ? '成功' : '失败'}`);
  
  let bookUrl = '';
  if (searchResult.parsedItems && searchResult.parsedItems.length > 0) {
    console.log(`找到 ${searchResult.parsedItems.length} 本漫画`);
    searchResult.parsedItems.slice(0, 5).forEach((book: any, i: number) => {
      console.log(`  [${i + 1}] ${book.name} - ${book.bookUrl}`);
    });
    bookUrl = searchResult.parsedItems[0].bookUrl || '';
  } else {
    console.log('搜索日志:');
    searchResult.logs.forEach(log => {
      console.log(`  [${log.category}] ${log.message}`);
    });
  }
  console.log('');

  // 2. 详情测试
  if (bookUrl) {
    console.log('=== 2. 详情测试 ===');
    console.log(`URL: ${bookUrl}`);
    const detailResult = await debugger_.debugBookInfo(bookUrl);
    console.log(`详情结果: ${detailResult.success ? '成功' : '失败'}`);
    
    if (detailResult.success && detailResult.parsedItems?.length) {
      const info = detailResult.parsedItems[0];
      console.log(`   书名: ${info.name || '(未获取)'}`);
      console.log(`   作者: ${info.author || '(未获取)'}`);
      const introStr = Array.isArray(info.intro) ? info.intro.join(' ') : String(info.intro || '(未获取)');
      console.log(`   简介: ${introStr.substring(0, 50)}...`);
    } else {
      console.log(`   ⚠️ 详情获取失败`);
    }
    
    // 显示详情日志
    console.log('\n详情解析日志:');
    detailResult.logs.slice(-10).forEach(log => {
      console.log(`  [${log.category}] ${log.message}`);
    });
    console.log('');

    // 3. 目录测试 - G站需要先获取API数据
    console.log('=== 3. 目录测试 ===');
    const tocResult = await debugger_.debugToc(bookUrl);
    console.log(`目录结果: ${tocResult.success ? '成功' : '失败'}`);
    
    let chapterUrl = '';
    if (tocResult.parsedItems && tocResult.parsedItems.length > 0) {
      console.log(`共 ${tocResult.parsedItems.length} 个章节`);
      tocResult.parsedItems.slice(0, 5).forEach((chapter: any, i: number) => {
        console.log(`  [${i + 1}] ${chapter.name || '(无名称)'} - ${chapter.url || '(无URL)'}`);
        if (i === 0) chapterUrl = chapter.url || '';
      });
    } else {
      console.log('目录解析日志:');
      tocResult.logs.forEach(log => {
        console.log(`  [${log.category}] ${log.message}`);
      });
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
        contentResult.imageUrls.slice(0, 3).forEach((url: string, i: number) => {
          console.log(`  [${i + 1}] ${url.substring(0, 80)}...`);
        });
      } else {
        console.log('正文解析日志:');
        contentResult.logs.forEach(log => {
          console.log(`  [${log.category}] ${log.message}`);
        });
      }
    }
  }

  console.log('\n测试完成!');
}

testGStation().catch(console.error);
