/**
 * 测试特定书源的搜索解析
 */
import { httpRequest } from './src/main/debug/http-client';
import { parseList, parseFromElement, ParseContext } from './src/main/debug/rule-parser';
import * as fs from 'fs';

const sourcesJson = fs.readFileSync('shareBookSource(1).json', 'utf8');
const allSources = JSON.parse(sourcesJson);

// 测试几个有代表性的书源
const testCases = [
  { index: 22, keyword: '斗破苍穹' },  // 好看漫画
  { index: 26, keyword: '斗罗大陆' },  // 知音漫客
  { index: 28, keyword: '斗破苍穹' },  // 酸奶漫画
  { index: 34, keyword: '斗破苍穹' },  // 漫客栈子
];

async function testSource(source: any, keyword: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📚 ${source.bookSourceName}`);
  console.log(`🔗 ${source.bookSourceUrl}`);
  
  // 构建搜索URL
  let searchUrl = source.searchUrl;
  if (!searchUrl) {
    console.log('❌ 无搜索URL');
    return;
  }
  
  // 替换关键词和页码
  searchUrl = searchUrl
    .replace(/\{\{key\}\}/g, encodeURIComponent(keyword))
    .replace(/\{\{page\}\}/g, '1');
  
  // 处理相对URL
  if (searchUrl.startsWith('/')) {
    searchUrl = source.bookSourceUrl + searchUrl;
  }
  
  console.log(`搜索URL: ${searchUrl}`);
  
  // 发送请求
  const result = await httpRequest({ 
    url: searchUrl,
    headers: source.header ? JSON.parse(source.header) : {}
  });
  
  if (!result.success) {
    console.log(`❌ 请求失败: ${result.error}`);
    return;
  }
  
  console.log(`✅ 响应: ${result.statusCode}, ${result.body?.length} 字节`);
  
  // 解析书籍列表
  const ruleSearch = source.ruleSearch;
  if (!ruleSearch || !ruleSearch.bookList) {
    console.log('❌ 无搜索规则');
    return;
  }
  
  console.log(`书籍列表规则: ${ruleSearch.bookList}`);
  
  const ctx: ParseContext = {
    body: result.body || '',
    baseUrl: source.bookSourceUrl,
    variables: {}
  };
  
  const bookList = parseList(ctx, ruleSearch.bookList);
  console.log(`解析结果: ${bookList.length} 本书`);
  
  if (bookList.length > 0) {
    const firstBook: any = bookList[0];
    console.log('\n第一本书:');
    
    // 解析各字段
    const fields = ['name', 'author', 'coverUrl', 'bookUrl'];
    for (const field of fields) {
      const rule = ruleSearch[field];
      if (rule) {
        const fieldResult = parseFromElement(firstBook, rule, source.bookSourceUrl, {});
        console.log(`  ${field}: ${fieldResult.success ? String(fieldResult.data).substring(0, 60) : '失败 - ' + fieldResult.error}`);
      }
    }
  } else {
    // 打印响应预览帮助调试
    console.log('\n响应预览:');
    console.log(result.body?.substring(0, 500));
  }
}

async function main() {
  for (const tc of testCases) {
    const source = allSources[tc.index];
    if (source) {
      await testSource(source, tc.keyword);
    }
  }
}

main().catch(console.error);
