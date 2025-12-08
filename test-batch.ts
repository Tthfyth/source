/**
 * 批量快速测试所有书源
 */
import * as fs from 'fs';
import { SourceDebugger } from './src/main/debug/source-debugger';

const sourcesJson = fs.readFileSync('shareBookSource(1).json', 'utf8');
const allSources = JSON.parse(sourcesJson);

// 每个书源的测试关键词
const keywords: Record<number, string> = {
  4: '封神',      // 名著阅读
  22: '一人之下', // 好看漫画
};

interface Result {
  index: number;
  name: string;
  search: boolean;
  detail: boolean;
  toc: boolean;
  content: boolean;
  error?: string;
}

async function testSource(index: number): Promise<Result> {
  const source = allSources[index];
  const keyword = keywords[index] || '斗破苍穹';
  const result: Result = {
    index: index + 1,
    name: source.bookSourceName,
    search: false,
    detail: false,
    toc: false,
    content: false,
  };

  const debugger_ = new SourceDebugger(source);

  try {
    // 搜索
    const searchResult = await debugger_.debugSearch(keyword);
    if (!searchResult.success || !searchResult.parsedItems?.length) {
      result.error = searchResult.error || '无搜索结果';
      return result;
    }
    result.search = true;

    const firstBook: any = searchResult.parsedItems[0];
    if (!firstBook.bookUrl) {
      result.error = '无书籍URL';
      return result;
    }

    // 详情
    const detailResult = await debugger_.debugBookInfo(firstBook.bookUrl);
    if (!detailResult.success) {
      result.error = detailResult.error || '详情失败';
      return result;
    }
    result.detail = true;

    const bookInfo: any = detailResult.parsedItems;
    const tocUrl = bookInfo?.tocUrl || firstBook.bookUrl;

    // 目录
    const tocResult = await debugger_.debugToc(tocUrl);
    if (!tocResult.success || !tocResult.parsedItems?.length) {
      result.error = tocResult.error || '无章节';
      return result;
    }
    result.toc = true;

    const firstChapter: any = tocResult.parsedItems[0];
    if (!firstChapter.url) {
      result.error = '无章节URL';
      return result;
    }

    // 正文
    const contentResult = await debugger_.debugContent(firstChapter.url);
    const content = contentResult.parsedItems;
    const images = Array.isArray(content) ? content : (content ? [content] : []);
    
    if (!contentResult.success || images.length === 0) {
      result.error = contentResult.error || '无图片';
      return result;
    }
    result.content = true;

  } catch (e: any) {
    result.error = e.message?.substring(0, 50);
  }

  return result;
}

async function main() {
  console.log('开始批量测试...\n');
  
  const results: Result[] = [];
  
  for (let i = 0; i < allSources.length; i++) {
    const name = allSources[i].bookSourceName.substring(0, 16).padEnd(16);
    process.stdout.write(`[${String(i + 1).padStart(2)}] ${name} `);
    
    const result = await testSource(i);
    results.push(result);
    
    const s = result.search ? '✅' : '❌';
    const d = result.detail ? '✅' : '❌';
    const t = result.toc ? '✅' : '❌';
    const c = result.content ? '✅' : '❌';
    
    if (result.content) {
      console.log(`${s}${d}${t}${c} 🎉`);
    } else {
      console.log(`${s}${d}${t}${c} ${result.error || ''}`);
    }
  }
  
  // 统计
  const success = results.filter(r => r.content).length;
  const searchOk = results.filter(r => r.search).length;
  
  console.log('\n' + '═'.repeat(60));
  console.log(`搜索成功: ${searchOk}/${results.length}`);
  console.log(`完整通过: ${success}/${results.length} (${(success/results.length*100).toFixed(1)}%)`);
  
  // 保存结果
  fs.writeFileSync('batch-results.json', JSON.stringify(results, null, 2));
}

main().catch(console.error);
