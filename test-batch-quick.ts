import * as fs from 'fs';
import { SourceDebugger, DebugResult, ParsedBook, ParsedChapter } from './src/main/debug/source-debugger';

const sources = JSON.parse(fs.readFileSync('shareBookSource(1).json', 'utf8'));
const keywords = ['斗破', '妖神记', '一拳'];

interface TestResult {
  index: number;
  name: string;
  url: string;
  search: 'pass' | 'fail' | 'network';
  detail: 'pass' | 'fail' | 'skip';
  toc: 'pass' | 'fail' | 'skip';
  content: 'pass' | 'fail' | 'skip';
  error?: string;
}

async function testSource(index: number): Promise<TestResult> {
  const source = sources[index];
  const result: TestResult = {
    index,
    name: source.bookSourceName,
    url: source.bookSourceUrl,
    search: 'fail',
    detail: 'skip',
    toc: 'skip',
    content: 'skip',
  };

  const debugger_ = new SourceDebugger(source);
  
  // 尝试多个关键词
  for (const keyword of keywords) {
    try {
      const searchResult = await debugger_.debugSearch(keyword);
      const books = searchResult.parsedItems as ParsedBook[];
      if (searchResult.success && books && books.length > 0) {
        result.search = 'pass';
        
        // 测试详情
        try {
          const book = books[0];
          const detailResult = await debugger_.debugBookInfo(book.bookUrl || '');
          const detail = detailResult.parsedItems as ParsedBook[];
          if (detailResult.success && detail) {
            result.detail = 'pass';
            
            // 测试目录
            try {
              const tocUrl = (detail as any).tocUrl || book.bookUrl || '';
              const tocResult = await debugger_.debugToc(tocUrl);
              const chapters = tocResult.parsedItems as ParsedChapter[];
              if (tocResult.success && chapters && chapters.length > 0) {
                result.toc = 'pass';
                
                // 测试正文
                try {
                  const chapter = chapters[0];
                  const contentResult = await debugger_.debugContent(chapter.url || '');
                  const content = contentResult.parsedItems as string;
                  if (contentResult.success && content && content.length > 50) {
                    result.content = 'pass';
                  } else if (contentResult.imageUrls && contentResult.imageUrls.length > 0) {
                    result.content = 'pass';
                  } else {
                    result.content = 'fail';
                  }
                } catch (e: any) {
                  result.content = 'fail';
                }
              } else {
                result.toc = 'fail';
              }
            } catch (e: any) {
              result.toc = 'fail';
            }
          } else {
            result.detail = 'fail';
          }
        } catch (e: any) {
          result.detail = 'fail';
        }
        break; // 搜索成功，跳出关键词循环
      }
    } catch (e: any) {
      if (e.message?.includes('ETIMEDOUT') || e.message?.includes('ECONNREFUSED') || 
          e.message?.includes('ENOTFOUND') || e.message?.includes('timeout')) {
        result.search = 'network';
        result.error = 'network';
      }
    }
  }

  return result;
}

async function main() {
  console.log('开始批量测试...\n');
  
  const results: TestResult[] = [];
  const total = sources.length;
  
  for (let i = 0; i < total; i++) {
    process.stdout.write(`\r测试进度: ${i + 1}/${total} - ${sources[i].bookSourceName.substring(0, 20)}...`);
    
    try {
      const result = await Promise.race([
        testSource(i),
        new Promise<TestResult>((_, reject) => setTimeout(() => reject(new Error('timeout')), 60000))
      ]);
      results.push(result);
    } catch (e: any) {
      results.push({
        index: i,
        name: sources[i].bookSourceName,
        url: sources[i].bookSourceUrl,
        search: 'fail',
        detail: 'skip',
        toc: 'skip',
        content: 'skip',
        error: e.message?.substring(0, 50),
      });
      // 保存中间结果
      require('fs').writeFileSync('batch-results.json', JSON.stringify(results, null, 2));
    }
  }

  console.log('\n\n========== 测试结果汇总 ==========\n');
  
  // 统计
  const passed = results.filter(r => r.content === 'pass').length;
  const searchPassed = results.filter(r => r.search === 'pass').length;
  const networkFailed = results.filter(r => r.search === 'network').length;
  const failed = results.filter(r => r.search === 'fail').length;
  
  console.log(`✅ 完全通过: ${passed}/${total}`);
  console.log(`🔍 搜索通过: ${searchPassed}/${total}`);
  console.log(`🌐 网络问题: ${networkFailed}/${total}`);
  console.log(`❌ 搜索失败: ${failed}/${total}`);
  
  console.log('\n--- 完全通过的书源 ---');
  results.filter(r => r.content === 'pass').forEach(r => {
    console.log(`  [${r.index}] ${r.name}`);
  });
  
  console.log('\n--- 搜索失败的书源 ---');
  results.filter(r => r.search === 'fail').forEach(r => {
    console.log(`  [${r.index}] ${r.name} ${r.error || ''}`);
  });
  
  // 保存结果
  fs.writeFileSync('batch-results.json', JSON.stringify(results, null, 2));
  console.log('\n结果已保存到 batch-results.json');
}

main().catch(console.error);
