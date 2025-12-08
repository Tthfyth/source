/**
 * 书源转换测试
 * 测试 Legado <-> 异次元 转换的正确性和幂等性
 */

import { legadoToYiciyuan, yiciyuanToLegado, convertSource } from './sourceConverter';
import { BookSource, BookSourceType, SourceFormat, detectSourceFormat } from '../types';

// 测试用的 Legado 书源（笔趣漫画）
const testLegadoSource: BookSource = {
  "bookSourceComment": "// Error: 1233发现失效\n\n部分漫画封面无法显示，有兴趣的大佬帮忙完善一下\n[✅已验证]",
  "bookSourceGroup": "漫画,发现失效",
  "bookSourceName": "笔趣漫画",
  "bookSourceType": BookSourceType.Image,
  "bookSourceUrl": "https://www.biqumh.com",
  "bookUrlPattern": "https://www.biqumh.com/index.php/comic/.*",
  "customOrder": 0,
  "enabled": true,
  "enabledCookieJar": false,
  "enabledExplore": true,
  "header": "{\n\t \"Accept\": \"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01\",\n  \"X-Requested-With\": \"XMLHttpRequest\",\n  \"Referer\": \"https://www.biqumh.com/\"\n}",
  "lastUpdateTime": 1765176029555,
  "respondTime": 183379,
  "weight": 0,
  "searchUrl": "/index.php/search?key={{key}}",
  "ruleSearch": {
    "bookList": ".common-comic-item",
    "bookUrl": ".comic__title a@href",
    "coverUrl": "img@data-original",
    "intro": ".comic-feature@text",
    "lastChapter": ".comic-update a@text##待浏览",
    "name": ".comic__title a@text"
  },
  "ruleBookInfo": {
    "author": ".comic-author .name@text",
    "coverUrl": ".de-info__bg@style##url\\('(.*?)'\\)##$1###",
    "intro": ".intro-total@text",
    "kind": ".comic-status span a@text",
    "name": ".j-comic-title@text"
  },
  "ruleToc": {
    "chapterList": ".chapter__list-box li a",
    "chapterName": "text",
    "chapterUrl": "href"
  },
  "ruleContent": {
    "content": "@js:\nconst imgs = java.getElements(\".rd-article-wr img\")\nimgs.forEach(e => {\n  e.attr(\"src\", e.attr(\"data-original\"))\n})\nimgs"
  },
  "ruleExplore": {
    "author": "$.author",
    "bookList": "$.data",
    "bookUrl": "$.url",
    "coverUrl": "$.pic",
    "intro": "$.content",
    "kind": "$.serialize&&$.tags&&$.addtime",
    "lastChapter": "$.chapter_name",
    "name": "$.name"
  }
};

/**
 * 测试单次转换
 */
function testSingleConversion() {
  console.log('=== 测试单次转换 ===\n');
  
  // Legado -> 异次元
  const yiciyuanResult = legadoToYiciyuan(testLegadoSource);
  console.log('1. Legado -> 异次元:');
  console.log('   searchUrl:', testLegadoSource.searchUrl);
  console.log('   -> ruleSearchUrl:', yiciyuanResult.ruleSearchUrl);
  console.log('   ruleSearch.bookList:', testLegadoSource.ruleSearch?.bookList);
  console.log('   -> ruleSearchList:', yiciyuanResult.ruleSearchList);
  console.log('   ruleContent.content:', testLegadoSource.ruleContent?.content?.substring(0, 50) + '...');
  console.log('   -> ruleBookContent:', yiciyuanResult.ruleBookContent?.substring(0, 50) + '...');
  
  // 检测格式
  const format1 = detectSourceFormat(yiciyuanResult);
  console.log('   转换后格式检测:', format1);
  console.log('   期望: yiciyuan, 实际:', format1 === SourceFormat.Yiciyuan ? '✅ 正确' : '❌ 错误');
  
  // 异次元 -> Legado
  const legadoResult = yiciyuanToLegado(yiciyuanResult);
  console.log('\n2. 异次元 -> Legado:');
  console.log('   ruleSearchUrl:', yiciyuanResult.ruleSearchUrl);
  console.log('   -> searchUrl:', legadoResult.searchUrl);
  console.log('   ruleSearchList:', yiciyuanResult.ruleSearchList);
  console.log('   -> ruleSearch.bookList:', legadoResult.ruleSearch?.bookList);
  
  // 检测格式
  const format2 = detectSourceFormat(legadoResult);
  console.log('   转换后格式检测:', format2);
  console.log('   期望: legado, 实际:', format2 === SourceFormat.Legado ? '✅ 正确' : '❌ 错误');
  
  return { yiciyuanResult, legadoResult };
}

/**
 * 测试多次转换的幂等性
 */
function testIdempotency() {
  console.log('\n=== 测试多次转换幂等性 ===\n');
  
  let current: any = testLegadoSource;
  const conversions: string[] = ['Legado'];
  
  // 进行 6 次转换
  for (let i = 0; i < 6; i++) {
    const { result, fromFormat, toFormat } = convertSource(current);
    current = result;
    conversions.push(toFormat === SourceFormat.Yiciyuan ? '异次元' : 'Legado');
  }
  
  console.log('转换链:', conversions.join(' -> '));
  
  // 检查关键字段
  console.log('\n关键字段对比:');
  
  // 搜索URL
  const originalSearchUrl = testLegadoSource.searchUrl;
  const finalSearchUrl = current.searchUrl || current.ruleSearchUrl;
  console.log('1. 搜索URL:');
  console.log('   原始:', originalSearchUrl);
  console.log('   最终:', finalSearchUrl);
  
  // 检查占位符是否正确
  const hasCorrectPlaceholder = 
    (finalSearchUrl?.includes('{{key}}') && conversions[conversions.length - 1] === 'Legado') ||
    (finalSearchUrl?.includes('searchKey') && conversions[conversions.length - 1] === '异次元');
  console.log('   占位符:', hasCorrectPlaceholder ? '✅ 正确' : '❌ 错误');
  
  // 搜索列表规则
  const originalBookList = testLegadoSource.ruleSearch?.bookList;
  const finalBookList = current.ruleSearch?.bookList || current.ruleSearchList;
  console.log('\n2. 搜索列表规则:');
  console.log('   原始:', originalBookList);
  console.log('   最终:', finalBookList);
  console.log('   一致性:', originalBookList === finalBookList ? '✅ 一致' : '⚠️ 有变化');
  
  // 正文规则
  const originalContent = testLegadoSource.ruleContent?.content;
  const finalContent = current.ruleContent?.content || current.ruleBookContent;
  console.log('\n3. 正文规则:');
  console.log('   原始:', originalContent?.substring(0, 60) + '...');
  console.log('   最终:', finalContent?.substring(0, 60) + '...');
  // 比较去除前缀后的内容
  const normalizedOriginal = originalContent?.replace(/^@js:/i, '').trim();
  const normalizedFinal = finalContent?.replace(/^@js:/i, '').trim();
  console.log('   一致性:', normalizedOriginal === normalizedFinal ? '✅ 一致' : '⚠️ 有变化');
  
  return current;
}

/**
 * 测试转换后能否正常解析
 */
function testConversionValidity() {
  console.log('\n=== 测试转换有效性 ===\n');
  
  const yiciyuanResult = legadoToYiciyuan(testLegadoSource) as any;
  
  console.log('转换后的异次元图源关键字段:');
  console.log('  bookSourceUrl:', yiciyuanResult.bookSourceUrl);
  console.log('  bookSourceName:', yiciyuanResult.bookSourceName);
  console.log('  ruleSearchUrl:', yiciyuanResult.ruleSearchUrl);
  console.log('  ruleSearchList:', yiciyuanResult.ruleSearchList);
  console.log('  ruleSearchName:', yiciyuanResult.ruleSearchName);
  console.log('  ruleSearchNoteUrl:', yiciyuanResult.ruleSearchNoteUrl);
  console.log('  ruleSearchCoverUrl:', yiciyuanResult.ruleSearchCoverUrl);
  console.log('  ruleChapterList:', yiciyuanResult.ruleChapterList);
  console.log('  ruleChapterName:', yiciyuanResult.ruleChapterName);
  console.log('  ruleContentUrl:', yiciyuanResult.ruleContentUrl);
  console.log('  ruleBookContent:', yiciyuanResult.ruleBookContent?.substring(0, 80) + '...');
  
  // 验证 header 是否保留
  console.log('\n请求头保留检查:');
  console.log('  原始 header:', testLegadoSource.header?.substring(0, 60) + '...');
  console.log('  转换后 header:', yiciyuanResult.header ? yiciyuanResult.header.substring(0, 60) + '...' : '(空)');
  const headerPreserved = yiciyuanResult.header === testLegadoSource.header;
  console.log('  header 保留:', headerPreserved ? '✅ 正确' : '❌ 丢失');
  
  // 验证必要字段
  const requiredFields = [
    'bookSourceUrl',
    'bookSourceName', 
    'ruleSearchUrl',
    'ruleSearchList',
    'ruleSearchName',
    'ruleSearchNoteUrl'
  ];
  
  console.log('\n必要字段检查:');
  let allValid = true;
  for (const field of requiredFields) {
    const value = (yiciyuanResult as any)[field];
    const valid = value && value.length > 0;
    console.log(`  ${field}: ${valid ? '✅' : '❌'} ${value || '(空)'}`);
    if (!valid) allValid = false;
  }
  
  return allValid && headerPreserved;
}

/**
 * 测试非图片类型书源的转换限制
 */
function testNonImageSourceRestriction() {
  console.log('\n=== 测试非图片类型限制 ===\n');
  
  // 创建一个文字类型书源
  const textSource: BookSource = {
    ...testLegadoSource,
    bookSourceType: BookSourceType.Text, // 0 = 文字
    bookSourceName: '测试文字书源',
  };
  
  const result = convertSource(textSource);
  console.log('文字类型书源转换:');
  console.log('  success:', result.success);
  console.log('  error:', result.error);
  console.log('  结果:', !result.success ? '✅ 正确拒绝' : '❌ 应该拒绝');
  
  // 创建一个音频类型书源
  const audioSource: BookSource = {
    ...testLegadoSource,
    bookSourceType: BookSourceType.Audio, // 1 = 音频
    bookSourceName: '测试音频书源',
  };
  
  const audioResult = convertSource(audioSource);
  console.log('\n音频类型书源转换:');
  console.log('  success:', audioResult.success);
  console.log('  error:', audioResult.error);
  console.log('  结果:', !audioResult.success ? '✅ 正确拒绝' : '❌ 应该拒绝');
  
  // 图片类型应该允许
  const imageSource: BookSource = {
    ...testLegadoSource,
    bookSourceType: BookSourceType.Image, // 2 = 图片
  };
  
  const imageResult = convertSource(imageSource);
  console.log('\n图片类型书源转换:');
  console.log('  success:', imageResult.success);
  console.log('  结果:', imageResult.success ? '✅ 正确允许' : '❌ 应该允许');
  
  return !result.success && !audioResult.success && imageResult.success;
}

// 运行测试
console.log('========================================');
console.log('书源转换测试');
console.log('========================================\n');

testSingleConversion();
testIdempotency();
const isValid = testConversionValidity();
const isRestrictionValid = testNonImageSourceRestriction();

console.log('\n========================================');
console.log('测试结果:');
console.log('  转换功能:', isValid ? '✅ 通过' : '❌ 失败');
console.log('  类型限制:', isRestrictionValid ? '✅ 通过' : '❌ 失败');
console.log('  总体:', (isValid && isRestrictionValid) ? '✅ 全部通过' : '❌ 有失败');
console.log('========================================');
