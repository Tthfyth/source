/**
 * 逐个测试书源
 */
import * as fs from 'fs';
import { SourceDebugger } from './src/main/debug/source-debugger';
import { buildSearchUrl } from './src/main/debug/analyze-url';
import { httpRequest } from './src/main/debug/http-client';

const sourcesJson = fs.readFileSync('shareBookSource(1).json', 'utf8');
const allSources = JSON.parse(sourcesJson);

// 测试指定索引的书源
const testIndex = parseInt(process.argv[2] || '0');
const keyword = process.argv[3] || '斗破苍穹';

async function testSource(index: number, keyword: string) {
  const source = allSources[index];
  if (!source) {
    console.log(`书源 ${index} 不存在`);
    return;
  }

  console.log('═'.repeat(70));
  console.log(`📚 [${index + 1}] ${source.bookSourceName}`);
  console.log(`🔗 ${source.bookSourceUrl}`);
  console.log(`🔍 关键词: ${keyword}`);
  console.log('═'.repeat(70));

  // 1. 检查搜索URL
  console.log('\n【1. 搜索URL构建】');
  console.log(`原始 searchUrl: ${source.searchUrl?.substring(0, 100)}...`);
  
  try {
    const analyzeUrl = buildSearchUrl(source, keyword, 1, {});
    if (analyzeUrl) {
      const url = analyzeUrl.getUrl();
      const method = analyzeUrl.getMethod();
      console.log(`构建后 URL: ${url?.substring(0, 100)}...`);
      console.log(`方法: ${method}`);
      
      if (!url || url === 'null' || url === 'undefined') {
        console.log('❌ URL 构建失败');
        return;
      }
    } else {
      console.log('❌ 无法构建搜索URL');
      return;
    }
  } catch (e: any) {
    console.log(`❌ URL构建异常: ${e.message}`);
    return;
  }

  // 2. 执行搜索
  console.log('\n【2. 搜索测试】');
  const debugger_ = new SourceDebugger(source);
  
  try {
    const searchResult = await debugger_.debugSearch(keyword);
    
    if (!searchResult.success) {
      console.log(`❌ 搜索失败: ${searchResult.error}`);
      // 打印日志
      searchResult.logs?.slice(-5).forEach(log => {
        console.log(`   [${log.level}] ${log.message}`);
      });
      return;
    }
    
    const books = searchResult.parsedItems || [];
    if (books.length === 0) {
      console.log('❌ 无搜索结果');
      // 打印日志
      searchResult.logs?.slice(-10).forEach(log => {
        console.log(`   [${log.level}] ${log.message}`);
      });
      return;
    }
    
    console.log(`✅ 找到 ${books.length} 本书`);
    const firstBook: any = books[0];
    console.log(`   第一本: ${firstBook.name || '(无名)'}`);
    console.log(`   URL: ${firstBook.bookUrl?.substring(0, 60) || '(无URL)'}`);

    if (!firstBook.bookUrl) {
      console.log('❌ 无法获取书籍URL');
      return;
    }

    // 3. 详情测试
    console.log('\n【3. 详情测试】');
    const detailResult = await debugger_.debugBookInfo(firstBook.bookUrl);
    
    if (!detailResult.success) {
      console.log(`❌ 详情失败: ${detailResult.error}`);
      detailResult.logs?.slice(-5).forEach(log => {
        console.log(`   [${log.level}] ${log.message}`);
      });
      return;
    }
    
    const bookInfo: any = Array.isArray(detailResult.parsedItems) 
      ? detailResult.parsedItems[0] 
      : detailResult.parsedItems;
    console.log(`✅ 详情获取成功`);
    console.log(`   书名: ${bookInfo?.name || '(未获取)'}`);
    console.log(`   作者: ${bookInfo?.author || '(未获取)'}`);

    const tocUrl = bookInfo?.tocUrl || firstBook.bookUrl;
    if (bookInfo?.tocUrl) {
      console.log(`   目录URL: ${bookInfo.tocUrl.substring(0, 60)}...`);
    }

    // 4. 目录测试
    console.log('\n【4. 目录测试】');
    const tocResult = await debugger_.debugToc(tocUrl);
    
    if (!tocResult.success) {
      console.log(`❌ 目录失败: ${tocResult.error}`);
      tocResult.logs?.slice(-5).forEach(log => {
        console.log(`   [${log.level}] ${log.message}`);
      });
      return;
    }
    
    const chapters = tocResult.parsedItems || [];
    if (chapters.length === 0) {
      console.log('❌ 无章节');
      tocResult.logs?.slice(-10).forEach(log => {
        console.log(`   [${log.level}] ${log.message}`);
      });
      return;
    }
    
    console.log(`✅ 共 ${chapters.length} 章`);
    const firstChapter: any = chapters[0];
    console.log(`   第一章: ${firstChapter.name || '(无名)'}`);
    // 显示完整 URL 以便调试 webView 配置
    console.log(`   URL: ${firstChapter.url || '(无URL)'}`);

    if (!firstChapter.url) {
      console.log('❌ 无法获取章节URL');
      return;
    }

    // 5. 正文测试
    console.log('\n【5. 正文测试】');
    const contentResult = await debugger_.debugContent(firstChapter.url);
    
    if (!contentResult.success) {
      console.log(`❌ 正文失败: ${contentResult.error}`);
      contentResult.logs?.slice(-5).forEach(log => {
        console.log(`   [${log.level}] ${log.message}`);
      });
      return;
    }
    
    const content = contentResult.parsedItems;
    const images = Array.isArray(content) ? content : (content ? [content] : []);
    
    if (images.length === 0) {
      console.log('❌ 无图片');
      contentResult.logs?.slice(-10).forEach(log => {
        console.log(`   [${log.level}] ${log.message}`);
      });
      return;
    }
    
    console.log(`✅ ${images.length} 张图片`);
    console.log(`   第一张: ${String(images[0]).substring(0, 80)}...`);

    console.log('\n' + '═'.repeat(70));
    console.log('🎉 全部测试通过！');
    console.log('═'.repeat(70));

  } catch (e: any) {
    console.log(`❌ 异常: ${e.message}`);
    console.log(e.stack);
  }
}

testSource(testIndex, keyword);
