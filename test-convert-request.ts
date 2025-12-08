/**
 * 武芊漫画全流程测试
 * 测试转化后：搜索、详情、目录、正文
 */

import { convertSource } from './src/renderer/utils/sourceConverter';
import { BookSource, BookSourceType, SourceFormat, detectSourceFormat } from './src/renderer/types';
import { SourceDebugger } from './src/main/debug/source-debugger';
import { YiciyuanDebugger, isYiciyuanSource } from './src/main/debug/yiciyuan-debugger';

// 武芊漫画书源
const wuqianSource: BookSource = {
  bookSourceComment: "\n[✅已验证]",
  bookSourceGroup: "源仓库,漫画 书源",
  bookSourceName: "武芊漫画",
  bookSourceType: BookSourceType.Image,
  bookSourceUrl: "https://comic.mkzcdn.com",
  customOrder: 100,
  enabled: true,
  enabledExplore: true,
  exploreUrl: "@js:\nlet url = 'https://comic.mkzcdn.com/search/filter/?audience=0&order=sort&page_num={{page}}&page_size=18&theme_id=class'\nlet class_name=\"全部&修真&霸总&恋爱&校园&冒险&搞笑&生活&热血&架空&后宫&玄幻&悬疑&恐怖&灵异&动作&科幻&战争&古风&穿越&竞技&励志&同人&真人\".split(\"&\");\nlet class_url=\"0&2&1&3&4&5&6&7&8&9&10&12&13&14&15&16&17&18&19&20&21&23&24&26\".split(\"&\")\n\nlet sort_name='推荐&最热&最新'.split(\"&\")\nlet sort_url='3&1&2'.split(\"&\")\nlet model = (title,url,num)=>{\n    return {title:title,url:url,style:{layout_flexGroup:1,layout_flexBasisPercent:num}}\n}\n\ntop=[{\"title\":\"热门人气\",\"url\":\"https://comic.mkzcdn.com/search/filter/?order=1&page_num={{page}}&page_size=12\",\"style\":{\"layout_flexBasisPercent\":0.4,\"layout_flexGrow\":1}},\n{\"title\":\"更新时间\",\"url\":\"https://comic.mkzcdn.com/search/filter/?order=2&page_num={{page}}&page_size=12\",\"style\":{\"layout_flexBasisPercent\":0.4,\"layout_flexGrow\":1}}]\n\n\n\nlet list = []\nlist=list.concat(top)\n\nfor (let i = 0; i < sort_name.length; i++) {\n    list.push(model(sort_name[i],\"\",1))\n    for (let j = 0; j < class_name.length; j++) {\n        let t = url.replace(\"sort\",`${sort_url[i]}`).replace(\"class\",`${class_url[j]}`)\n        list.push(model(class_name[j],t,0.15))\n    }\n}\nJSON.stringify(list)",
  header: "",
  lastUpdateTime: Date.now(),
  respondTime: 0,
  weight: 0,
  searchUrl: "https://comic.mkzcdn.com/search/keyword/?keyword={{key}}&page_num={{page}}&page_size=20",
  ruleSearch: {
    author: "$.author_title",
    bookList: "$..list[*]",
    bookUrl: "https://comic.mkzcdn.com/comic/info/?comic_id={{$.comic_id}}",
    coverUrl: "$.cover",
    intro: "$.feature",
    lastChapter: "$.chapter_title",
    name: "$.title"
  },
  ruleBookInfo: {
    init: "",
    intro: "$..content##^##<br/>",
    kind: "$..theme_id\n@js:\nlet class_name=\"全部&修真&霸总&恋爱&校园&冒险&搞笑&生活&热血&架空&后宫&玄幻&悬疑&恐怖&灵异&动作&科幻&战争&古风&穿越&竞技&励志&同人&真人\".split(\"&\");\nlet class_url=\"0&2&1&3&4&5&6&7&8&9&10&12&13&14&15&16&17&18&19&20&21&23&24&26\".split(\"&\")\n\nlet res=Array.from(result)[0].split(\",\")\n\nfor(var i=0;i<class_url.length;i++){\n\tfor(var j=0;j<res.length;j++){\n\t\tif(class_url[i]==res[j]){\n\t\t\t  res[j]=class_name[i]\n\t\t\t}\n}\n}\n\n\nres.join(\",\")",
    name: "@put:{comic_id:$..comic_id}",
    tocUrl: "https://comic.mkzcdn.com/chapter/v1/?comic_id={{$..comic_id}}"
  },
  ruleToc: {
    chapterList: "$.data",
    chapterName: "$.title",
    chapterUrl: "https://comic.mkzcdn.com/chapter/content/?chapter_id={{$.chapter_id}}&comic_id=@get:{comic_id}",
    updateTime: "$..start_time\n@js:\"🕗 \"+java.timeFormat(result*1000)+\"    \"+(new Date(result*1000)>new Date()?\"❗️未发布\":\"\")"
  },
  ruleContent: {
    content: "$.data[*].image\n@js:\nresult.split(\"\\n\").map(x=>'<img src=\"'+x+'\">').join(\"\\n\")"
  }
};

/**
 * 使用项目调试器测试书源
 */
async function testWithDebugger(source: any, label: string): Promise<{ success: boolean; count: number; logs: string[] }> {
  const isYiciyuan = isYiciyuanSource(source);
  const formatLabel = isYiciyuan ? '异次元' : 'Legado';
  
  console.log(`\n=== ${label} (${formatLabel}调试器) ===\n`);
  
  let result: any;
  
  if (isYiciyuan) {
    const debugger_ = new YiciyuanDebugger(source);
    result = await debugger_.debugSearch('我的');
  } else {
    const debugger_ = new SourceDebugger(source);
    result = await debugger_.debugSearch('我的');
  }
  
  // 输出日志
  const logs: string[] = [];
  if (result.logs) {
    result.logs.forEach((log: any) => {
      const msg = `[${log.type}] ${log.message}`;
      logs.push(msg);
      console.log(msg);
    });
  }
  
  const count = result.parsedItems?.length || 0;
  console.log(`\n结果: ${result.success ? '✅' : '❌'} 解析到 ${count} 条数据`);
  
  return { success: result.success && count > 0, count, logs };
}

/**
 * 执行 N 次转换
 */
function convertNTimes(source: any, times: number): any {
  let current = source;
  for (let i = 0; i < times; i++) {
    const result = convertSource(current);
    if (result.success) {
      current = result.result;
    } else {
      console.log(`转换失败: ${result.error}`);
      return current;
    }
  }
  return current;
}

async function runTests() {
  console.log('========================================');
  console.log('武芊漫画全流程测试');
  console.log('========================================');

  // 1. 转换书源
  console.log('\n=== 1. 转换书源 ===');
  const convertResult = convertSource(wuqianSource);
  if (!convertResult.success) {
    console.log('❌ 转换失败:', convertResult.error);
    return;
  }
  const yiciyuanSource = convertResult.result;
  console.log('✅ 转换成功');
  console.log('格式:', isYiciyuanSource(yiciyuanSource) ? '异次元' : 'Legado');
  console.log('ruleSearchUrl:', yiciyuanSource.ruleSearchUrl);
  console.log('ruleSearchList:', yiciyuanSource.ruleSearchList);

  // 2. 测试搜索
  console.log('\n=== 2. 测试搜索 ===');
  
  // 先直接请求看看响应
  const { httpRequest } = require('./src/main/debug/http-client');
  const testUrl = 'https://comic.mkzcdn.com/search/keyword/?keyword=漫画&page_num=1&page_size=20';
  const testResult = await httpRequest({ url: testUrl });
  console.log('直接请求响应长度:', testResult.body?.length);
  console.log('响应内容预览:', testResult.body?.substring(0, 500));
  
  // 测试 JSON 解析
  const { parseList } = require('./src/main/debug/rule-parser');
  const testBody = testResult.body;
  const testCtx = { body: testBody, baseUrl: 'https://comic.mkzcdn.com', variables: {} };
  const testElements = parseList(testCtx, '$..list[*]');
  console.log('\nparseList 测试结果:', testElements?.length || 0);
  if (testElements && testElements.length > 0) {
    console.log('第一个元素:', JSON.stringify(testElements[0]).substring(0, 200));
  }
  
  const yiciyuanDebugger = new YiciyuanDebugger(yiciyuanSource);
  const searchResult: any = await yiciyuanDebugger.debugSearch('漫画');
  
  console.log('\n搜索结果:', searchResult.success ? '✅' : '❌');
  console.log('解析数量:', searchResult.parsedItems?.length || 0);
  
  // 打印搜索日志
  console.log('\n--- 搜索日志 ---');
  searchResult.logs?.slice(0, 8).forEach((log: any) => {
    console.log(`[${log.type}] ${log.message}`);
  });
  
  if (searchResult.parsedItems && searchResult.parsedItems.length > 0) {
    const firstBook = searchResult.parsedItems[0];
    console.log('\n第一本书:', firstBook.name);
    console.log('书籍URL:', firstBook.bookUrl);
    
    // 3. 测试详情
    if (firstBook.bookUrl) {
      console.log('\n=== 3. 测试详情 ===');
      
      const bookInfoResult: any = await yiciyuanDebugger.debugBookInfo(firstBook.bookUrl);
      console.log('详情结果:', bookInfoResult.success ? '✅' : '❌');
      if (bookInfoResult.parsedItems?.[0]) {
        console.log('书名:', bookInfoResult.parsedItems[0].name);
        console.log('简介:', bookInfoResult.parsedItems[0].intro?.substring(0, 50) + '...');
      }
      
      // 打印详情日志
      bookInfoResult.logs?.slice(0, 5).forEach((log: any) => {
        console.log(`[${log.type}] ${log.message}`);
      });
      
      // 4. 测试目录
      console.log('\n=== 4. 测试目录 ===');
      const tocResult: any = await yiciyuanDebugger.debugToc(firstBook.bookUrl);
      console.log('目录结果:', tocResult.success ? '✅' : '❌');
      console.log('章节数量:', tocResult.parsedItems?.length || 0);
      
      // 打印目录日志
      tocResult.logs?.slice(0, 5).forEach((log: any) => {
        console.log(`[${log.type}] ${log.message}`);
      });
      
      if (tocResult.parsedItems && tocResult.parsedItems.length > 0) {
        const firstChapter = tocResult.parsedItems[0];
        console.log('\n第一章:', firstChapter.name || firstChapter.title);
        console.log('章节URL:', firstChapter.url || firstChapter.chapterUrl);
        
        // 5. 测试正文
        const chapterUrl = firstChapter.url || firstChapter.chapterUrl;
        if (chapterUrl) {
          console.log('\n=== 5. 测试正文 ===');
          const contentResult: any = await yiciyuanDebugger.debugContent(chapterUrl);
          console.log('正文结果:', contentResult.success ? '✅' : '❌');
          
          // 打印正文日志
          contentResult.logs?.slice(0, 5).forEach((log: any) => {
            console.log(`[${log.type}] ${log.message}`);
          });
          
          if (contentResult.imageUrls && contentResult.imageUrls.length > 0) {
            console.log('图片数量:', contentResult.imageUrls.length);
            console.log('第一张图片:', contentResult.imageUrls[0]?.substring(0, 80) + '...');
          }
        }
      }
    }
  }

  // 汇总
  console.log('\n========================================');
  console.log('测试汇总');
  console.log('========================================');
  console.log('搜索:', searchResult.success && (searchResult.parsedItems?.length || 0) > 0 ? '✅' : '❌');
}

runTests();
