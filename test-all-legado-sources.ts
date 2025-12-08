/**
 * 测试全部 Legado 书源完整流程
 * 搜索 -> 详情 -> 目录 -> 正文
 */
import * as fs from 'fs';
import { SourceDebugger } from './src/main/debug/source-debugger';

// 读取书源文件
const sourcesJson = fs.readFileSync('shareBookSource(1).json', 'utf8');
const allSources = JSON.parse(sourcesJson);

interface TestResult {
  index: number;
  name: string;
  url: string;
  search: boolean;
  searchError?: string;
  searchCount?: number;
  detail: boolean;
  detailError?: string;
  toc: boolean;
  tocError?: string;
  tocCount?: number;
  content: boolean;
  contentError?: string;
  contentCount?: number;
  elapsed?: number;
}

async function testSource(source: any, index: number): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    index,
    name: source.bookSourceName,
    url: source.bookSourceUrl,
    search: false,
    detail: false,
    toc: false,
    content: false,
  };

  const debugger_ = new SourceDebugger(source);
  // 根据书源选择合适的关键词
  const keywords: Record<string, string> = {
    '好看漫画': '一人之下',
    '快看漫画': '一人之下',
    '知音漫客': '斗罗',
    '名著阅读（优）': '封神',
  };
  const keyword = keywords[source.bookSourceName] || '斗破苍穹';

  try {
    // 1. 搜索测试
    const searchResult = await debugger_.debugSearch(keyword);
    
    if (!searchResult.success) {
      result.searchError = (searchResult.error || '搜索失败').substring(0, 30);
      result.elapsed = Date.now() - startTime;
      return result;
    }
    
    const books = searchResult.parsedItems || [];
    if (books.length === 0) {
      result.searchError = '无搜索结果';
      result.elapsed = Date.now() - startTime;
      return result;
    }
    
    result.search = true;
    result.searchCount = books.length;

    // 获取第一本书的URL
    const firstBook: any = books[0];
    const bookUrl = firstBook.bookUrl || firstBook.noteUrl;
    if (!bookUrl) {
      result.detailError = '无书籍URL';
      result.elapsed = Date.now() - startTime;
      return result;
    }

    // 2. 详情测试
    const detailResult = await debugger_.debugBookInfo(bookUrl);
    
    if (!detailResult.success) {
      result.detailError = (detailResult.error || '详情失败').substring(0, 30);
      result.elapsed = Date.now() - startTime;
      return result;
    }
    
    result.detail = true;
    const bookInfo: any = detailResult.parsedItems;

    // 获取目录URL
    const tocUrl = bookInfo?.tocUrl || bookUrl;

    // 3. 目录测试
    const tocResult = await debugger_.debugToc(tocUrl);
    
    if (!tocResult.success) {
      result.tocError = (tocResult.error || '目录失败').substring(0, 30);
      result.elapsed = Date.now() - startTime;
      return result;
    }
    
    const chapters = tocResult.parsedItems || [];
    if (chapters.length === 0) {
      result.tocError = '无章节';
      result.elapsed = Date.now() - startTime;
      return result;
    }
    
    result.toc = true;
    result.tocCount = chapters.length;

    // 获取第一章URL
    const firstChapter: any = chapters[0];
    const chapterUrl = firstChapter.url || firstChapter.chapterUrl;
    if (!chapterUrl) {
      result.contentError = '无章节URL';
      result.elapsed = Date.now() - startTime;
      return result;
    }

    // 4. 正文测试
    const contentResult = await debugger_.debugContent(chapterUrl);
    
    if (!contentResult.success) {
      result.contentError = (contentResult.error || '正文失败').substring(0, 30);
      result.elapsed = Date.now() - startTime;
      return result;
    }
    
    const content = contentResult.parsedItems;
    const images = Array.isArray(content) ? content : (content ? [content] : []);
    
    if (images.length === 0) {
      result.contentError = '无图片';
      result.elapsed = Date.now() - startTime;
      return result;
    }
    
    result.content = true;
    result.contentCount = images.length;

  } catch (error: any) {
    if (!result.search) result.searchError = error.message?.substring(0, 30);
    else if (!result.detail) result.detailError = error.message?.substring(0, 30);
    else if (!result.toc) result.tocError = error.message?.substring(0, 30);
    else result.contentError = error.message?.substring(0, 30);
  }

  result.elapsed = Date.now() - startTime;
  return result;
}

function getStatus(r: TestResult): string {
  if (r.search && r.detail && r.toc && r.content) return '🎉完美';
  if (r.search && r.detail && r.toc) return '⚠️正文';
  if (r.search && r.detail) return '⚠️目录';
  if (r.search) return '⚠️详情';
  return '❌搜索';
}

function getFailReason(r: TestResult): string {
  if (!r.search) return r.searchError || '搜索失败';
  if (!r.detail) return r.detailError || '详情失败';
  if (!r.toc) return r.tocError || '目录失败';
  if (!r.content) return r.contentError || '正文失败';
  return '';
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║           Legado 书源完整流程测试 (全部 ' + allSources.length + ' 个)                      ║');
  console.log('║           搜索 → 详情 → 目录 → 正文                                  ║');
  console.log('║           ' + new Date().toLocaleString() + '                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const results: TestResult[] = [];
  
  for (let i = 0; i < allSources.length; i++) {
    const source = allSources[i];
    const name = source.bookSourceName.substring(0, 14).padEnd(14);
    process.stdout.write(`[${String(i + 1).padStart(2)}/${allSources.length}] ${name} `);
    
    try {
      const result = await testSource(source, i + 1);
      results.push(result);
      
      const s = result.search ? '✅' : '❌';
      const d = result.detail ? '✅' : '❌';
      const t = result.toc ? '✅' : '❌';
      const c = result.content ? '✅' : '❌';
      const status = getStatus(result);
      const time = result.elapsed ? `${result.elapsed}ms` : '';
      
      if (result.search && result.detail && result.toc && result.content) {
        console.log(`${s}${d}${t}${c} ${status} (${time})`);
      } else {
        const reason = getFailReason(result);
        console.log(`${s}${d}${t}${c} ${status} - ${reason}`);
      }
    } catch (error: any) {
      console.log(`❌❌❌❌ 异常 - ${error.message?.substring(0, 30)}`);
      results.push({
        index: i + 1,
        name: source.bookSourceName,
        url: source.bookSourceUrl,
        search: false,
        searchError: error.message?.substring(0, 30),
        detail: false,
        toc: false,
        content: false,
      });
    }
  }

  // 统计
  const total = results.length;
  const searchOk = results.filter(r => r.search).length;
  const detailOk = results.filter(r => r.detail).length;
  const tocOk = results.filter(r => r.toc).length;
  const contentOk = results.filter(r => r.content).length;
  const fullOk = results.filter(r => r.search && r.detail && r.toc && r.content).length;

  console.log('\n' + '═'.repeat(70));
  console.log('                          测 试 结 果 汇 总');
  console.log('═'.repeat(70));
  
  console.log(`\n📊 统计:`);
  console.log(`   搜索成功: ${searchOk}/${total} (${(searchOk/total*100).toFixed(1)}%)`);
  console.log(`   详情成功: ${detailOk}/${total} (${(detailOk/total*100).toFixed(1)}%)`);
  console.log(`   目录成功: ${tocOk}/${total} (${(tocOk/total*100).toFixed(1)}%)`);
  console.log(`   正文成功: ${contentOk}/${total} (${(contentOk/total*100).toFixed(1)}%)`);
  console.log(`   完整通过: ${fullOk}/${total} (${(fullOk/total*100).toFixed(1)}%)`);

  // 成功的书源
  console.log('\n✅ 完整通过的书源:');
  results.filter(r => r.search && r.detail && r.toc && r.content).forEach(r => {
    console.log(`   [${r.index}] ${r.name} - ${r.tocCount}章 ${r.contentCount}图`);
  });

  // 失败的书源
  console.log('\n❌ 失败的书源:');
  results.filter(r => !(r.search && r.detail && r.toc && r.content)).forEach(r => {
    const reason = getFailReason(r);
    console.log(`   [${r.index}] ${r.name} - ${getStatus(r)} ${reason}`);
  });

  console.log('\n' + '═'.repeat(70));
  
  // 保存结果到文件
  fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2));
  console.log('结果已保存到 test-results.json');
}

main().catch(console.error);
