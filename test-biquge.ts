/**
 * 22笔趣阁书源全流程测试
 * 运行: npx ts-node test-biquge.ts
 */

import { SourceDebugger } from './src/main/debug/source-debugger';

// 测试用的章节URL
const TEST_CHAPTER_URL = 'https://www.22biqu.com/biqu82040/40280357.html';

const source = {
  bookSourceName: '22笔趣阁（pc）',
  bookSourceType: 0,
  bookSourceUrl: 'https://www.22biqu.com',
  header: JSON.stringify({
    'User-Agent': 'Mozilla/5.0 (Linux; Android 8.0.0; MI 5s Plus Build/OPR1.170623.032; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/71.0.3578.99 Mobile Safari/537.36'
  }),
  searchUrl: '/ss/,{"body": "searchkey={{key}}&submit=搜索","method": "POST"}',
  ruleSearch: {
    author: '.s4@text',
    bookList: '.txt-list.txt-list-row5 > li:not(:first-child)',
    bookUrl: 'a.0@href',
    kind: '.s1@text',
    lastChapter: '.s3@text',
    name: '.s2@text'
  },
  ruleBookInfo: {
    author: '[property="og:novel:author"]@content',
    coverUrl: '[property="og:image"]@content',
    intro: '[property="og:description"]@content',
    kind: '[property~=category|status|update_time]@content',
    lastChapter: '[property~=las?test_chapter_name]@content',
    name: '[property="og:novel:book_name"]@content'
  },
  ruleToc: {
    chapterList: 'class.section-list fix@li@a',
    chapterName: 'text',
    chapterUrl: 'href'
  },
  ruleContent: {
    content: '#content@p@html##本章未完.*',
    nextContentUrl: 'text.下一页@href'
  }
};

async function runTest() {
  console.log('========================================');
  console.log('22笔趣阁书源全流程测试');
  console.log('========================================\n');

  const debugger_ = new SourceDebugger(source as any);

  // 1. 搜索测试
  console.log('【1. 搜索测试】关键词: 系统');
  console.log('----------------------------------------');
  const searchResult = await debugger_.debugSearch('系统');
  
  if (!searchResult.success) {
    console.error('搜索失败:', searchResult.error);
    return;
  }

  console.log('搜索日志:');
  searchResult.logs?.forEach(log => {
    console.log(`  [${log.category}] ${log.message}`);
  });

  const books = (searchResult.parsedItems || []) as any[];
  console.log(`\n搜索结果: ${books.length} 本书`);
  
  if (books.length === 0) {
    console.error('未搜索到书籍');
    return;
  }

  // 显示前3本书
  books.slice(0, 3).forEach((book: any, i: number) => {
    console.log(`  [${i + 1}] ${book.name} - ${book.author} | ${book.lastChapter}`);
    console.log(`      URL: ${book.bookUrl}`);
  });

  // 2. 详情测试
  const firstBook = books[0] as any;
  const bookUrl = firstBook.bookUrl;
  
  console.log('\n【2. 详情测试】');
  console.log('----------------------------------------');
  console.log(`书籍URL: ${bookUrl}`);
  
  const detailResult = await debugger_.debugBookInfo(bookUrl);
  
  if (!detailResult.success) {
    console.error('详情获取失败:', detailResult.error);
  } else {
    console.log('详情日志:');
    detailResult.logs?.forEach(log => {
      console.log(`  [${log.category}] ${log.message}`);
    });
    
    const detail = detailResult.parsedItems?.[0] || detailResult.parsedItems;
    if (detail) {
      console.log('\n书籍详情:');
      console.log(`  书名: ${(detail as any).name}`);
      console.log(`  作者: ${(detail as any).author}`);
      console.log(`  分类: ${(detail as any).kind}`);
      console.log(`  简介: ${((detail as any).intro || '').substring(0, 100)}...`);
      console.log(`  封面: ${(detail as any).coverUrl}`);
    }
  }

  // 3. 目录测试
  console.log('\n【3. 目录测试】');
  console.log('----------------------------------------');
  console.log(`目录URL: ${bookUrl}`);
  
  const tocResult = await debugger_.debugToc(bookUrl);
  
  if (!tocResult.success) {
    console.error('目录获取失败:', tocResult.error);
  } else {
    console.log('目录日志:');
    tocResult.logs?.forEach(log => {
      console.log(`  [${log.category}] ${log.message}`);
    });
    
    const chapters = (tocResult.parsedItems || []) as any[];
    console.log(`\n章节数: ${chapters.length}`);
    
    if (chapters.length > 0) {
      // 显示前3章和最后1章
      console.log('前3章:');
      chapters.slice(0, 3).forEach((ch: any, i: number) => {
        console.log(`  [${i + 1}] ${ch.name} -> ${ch.url}`);
      });
      
      if (chapters.length > 3) {
        console.log(`  ...`);
        const lastCh = chapters[chapters.length - 1] as any;
        console.log(`  [${chapters.length}] ${lastCh.name} -> ${lastCh.url}`);
      }

      // 4. 正文测试
      const firstChapter = chapters[0] as any;
      const chapterUrl = firstChapter.url;
      
      console.log('\n【4. 正文测试】');
      console.log('----------------------------------------');
      console.log(`章节: ${firstChapter.name}`);
      console.log(`URL: ${chapterUrl}`);
      
      const contentResult = await debugger_.debugContent(chapterUrl);
      
      if (!contentResult.success) {
        console.error('正文获取失败:', contentResult.error);
      } else {
        console.log('正文日志:');
        contentResult.logs?.forEach(log => {
          console.log(`  [${log.category}] ${log.message}`);
        });
        
        const content = contentResult.parsedItems;
        if (content) {
          const text = typeof content === 'string' ? content : JSON.stringify(content);
          console.log(`\n正文内容 (前500字):`);
          console.log(`  ${text.substring(0, 500).replace(/\n/g, '\n  ')}...`);
          console.log(`\n正文总长度: ${text.length} 字符`);
        }
      }
    }
  }

  // 5. 单独测试指定章节正文
  console.log('\n【5. 指定章节正文测试】');
  console.log('----------------------------------------');
  console.log(`URL: ${TEST_CHAPTER_URL}`);
  
  const testContentResult = await debugger_.debugContent(TEST_CHAPTER_URL);
  
  if (!testContentResult.success) {
    console.error('正文获取失败:', testContentResult.error);
  } else {
    console.log('正文日志:');
    testContentResult.logs?.forEach(log => {
      console.log(`  [${log.category}] ${log.message}`);
    });
    
    const content = testContentResult.parsedItems;
    if (content) {
      const text = typeof content === 'string' ? content : JSON.stringify(content);
      console.log(`\n正文内容 (前1000字):`);
      console.log(`  ${text.substring(0, 1000).replace(/\n/g, '\n  ')}`);
      console.log(`\n正文总长度: ${text.length} 字符`);
      
      // 检查是否有下一页
      const nextUrl = testContentResult.logs?.find(l => l.message.includes('下一页'));
      if (nextUrl) {
        console.log(`\n检测到下一页链接`);
      }
    }
  }

  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
}

runTest().catch(console.error);
