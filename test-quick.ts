/**
 * 快速测试多个书源
 */
import * as fs from 'fs';
import { SourceDebugger } from './src/main/debug/source-debugger';

interface TestResult {
  index: number;
  name: string;
  search: boolean;
  detail: boolean;
  toc: boolean;
  content: boolean;
  error?: string;
}

async function testSource(source: any, index: number, keyword: string): Promise<TestResult> {
  const result: TestResult = {
    index: index + 1,
    name: source.bookSourceName || `书源${index}`,
    search: false,
    detail: false,
    toc: false,
    content: false,
  };

  const debugger_ = new SourceDebugger(source);
  const timeout = 15000; // 15秒超时

  try {
    // 搜索测试
    const searchPromise = debugger_.debugSearch(keyword);
    const searchResult = await Promise.race([
      searchPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('搜索超时')), timeout))
    ]) as any;

    if (!searchResult.success || !searchResult.parsedItems?.length) {
      result.error = searchResult.error || '无搜索结果';
      return result;
    }
    result.search = true;

    // 详情测试
    const bookUrl = searchResult.parsedItems[0].bookUrl;
    const detailPromise = debugger_.debugBookInfo(bookUrl);
    const detailResult = await Promise.race([
      detailPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('详情超时')), timeout))
    ]) as any;

    if (!detailResult.success) {
      result.error = detailResult.error || '详情失败';
      return result;
    }
    result.detail = true;

    // 目录测试
    const tocUrl = detailResult.parsedItems?.[0]?.tocUrl || bookUrl;
    const tocPromise = debugger_.debugToc(tocUrl);
    const tocResult = await Promise.race([
      tocPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('目录超时')), timeout))
    ]) as any;

    if (!tocResult.success || !tocResult.parsedItems?.length) {
      result.error = tocResult.error || '无章节';
      return result;
    }
    result.toc = true;

    // 正文测试
    const chapterUrl = tocResult.parsedItems[0]?.url;  // 属性名是 url 不是 chapterUrl
    if (!chapterUrl) {
      result.error = '章节URL为空';
      return result;
    }
    const contentPromise = debugger_.debugContent(chapterUrl);
    const contentResult = await Promise.race([
      contentPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('正文超时')), timeout))
    ]) as any;

    if (!contentResult.success) {
      result.error = contentResult.error || '正文失败';
      return result;
    }

    // 检查是否有内容（图片或文本）
    const hasContent = contentResult.parsedItems?.some((item: any) => {
      const content = item.content || item;
      if (typeof content === 'string') {
        return content.includes('<img') || 
               content.match(/\.(jpg|jpeg|png|gif|webp)/i) ||
               content.length > 50;
      }
      return false;
    });
    
    if (!hasContent && !contentResult.parsedItems?.length) {
      result.error = '无图片';
      return result;
    }
    result.content = true;

  } catch (e: any) {
    result.error = e.message;
  }

  return result;
}

async function main() {
  const sourcesFile = 'shareBookSource(1).json';
  const sources = JSON.parse(fs.readFileSync(sourcesFile, 'utf8'));
  
  // 测试指定的书源索引
  const testIndices = [0, 4, 19, 22, 28, 33]; // 笔趣漫画, 名著阅读, 漫画吧网(WebView), 好看漫画, 酸奶漫画, 酸奶漫画2
  const keyword = '斗破';
  
  console.log(`\n测试 ${testIndices.length} 个书源，关键词: ${keyword}\n`);
  
  const results: TestResult[] = [];
  
  for (const idx of testIndices) {
    const source = sources[idx];
    console.log(`[${idx + 1}] ${source.bookSourceName}...`);
    const result = await testSource(source, idx, keyword);
    results.push(result);
    
    const status = result.content ? '✅' : result.toc ? '📖' : result.detail ? '📋' : result.search ? '🔍' : '❌';
    console.log(`    ${status} ${result.error || '全部通过'}`);
  }
  
  // 统计
  const passed = results.filter(r => r.content).length;
  const searchOk = results.filter(r => r.search).length;
  const detailOk = results.filter(r => r.detail).length;
  const tocOk = results.filter(r => r.toc).length;
  
  console.log(`\n========== 测试结果 ==========`);
  console.log(`搜索成功: ${searchOk}/${results.length}`);
  console.log(`详情成功: ${detailOk}/${results.length}`);
  console.log(`目录成功: ${tocOk}/${results.length}`);
  console.log(`完整通过: ${passed}/${results.length} (${(passed/results.length*100).toFixed(1)}%)`);
}

main().catch(console.error);
