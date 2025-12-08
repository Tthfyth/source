/**
 * 测试应用内的调试流程
 * 模拟转换后在应用中执行搜索的完整流程
 */

import { convertSource } from './src/renderer/utils/sourceConverter';
import { BookSource, BookSourceType, SourceFormat, detectSourceFormat } from './src/renderer/types';

// 原始 Legado 书源（笔趣漫画）
const testLegadoSource: BookSource = {
  bookSourceComment: "笔趣漫画",
  bookSourceGroup: "漫画",
  bookSourceName: "笔趣漫画",
  bookSourceType: BookSourceType.Image,
  bookSourceUrl: "https://www.biqumh.com",
  customOrder: 0,
  enabled: true,
  enabledExplore: true,
  header: '{\n\t "Accept": "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01",\n  "X-Requested-With": "XMLHttpRequest",\n  "Referer": "https://www.biqumh.com/"\n}',
  lastUpdateTime: Date.now(),
  respondTime: 0,
  weight: 0,
  searchUrl: "/index.php/search?key={{key}}",
  ruleSearch: {
    bookList: ".common-comic-item",
    bookUrl: ".comic__title a@href",
    coverUrl: "img@data-original",
    intro: ".comic-feature@text",
    lastChapter: ".comic-update a@text##待浏览",
    name: ".comic__title a@text"
  },
  ruleBookInfo: {
    author: ".comic-author .name@text",
    coverUrl: ".de-info__bg@style##url\\('(.*?)'\\)##$1###",
    intro: ".intro-total@text",
    kind: ".comic-status span a@text",
    name: ".j-comic-title@text"
  },
  ruleToc: {
    chapterList: ".chapter__list-box li a",
    chapterName: "text",
    chapterUrl: "href"
  },
  ruleContent: {
    content: "@js:\nconst imgs = java.getElements(\".rd-article-wr img\")\nimgs.forEach(e => {\n  e.attr(\"src\", e.attr(\"data-original\"))\n})\nimgs"
  }
};

/**
 * 模拟异次元调试器的 preprocessRule 函数
 */
function preprocessRule(rule: string | undefined): { rule: string; headers?: Record<string, string> } {
  if (!rule) return { rule: '' };
  
  let processedRule = rule;
  let headers: Record<string, string> | undefined;
  
  // 提取 @Header:{...} 后缀
  const headerMatch = processedRule.match(/@Header:\{([^}]+)\}$/);
  if (headerMatch) {
    processedRule = processedRule.replace(/@Header:\{[^}]+\}$/, '').trim();
    try {
      const headerStr = headerMatch[1];
      headers = {};
      const pairs = headerStr.split(/[;,]/).filter(s => s.trim());
      for (const pair of pairs) {
        const colonIdx = pair.indexOf(':');
        if (colonIdx > 0) {
          let key = pair.substring(0, colonIdx).trim().replace(/^["']|["']$/g, '');
          let value = pair.substring(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (value === 'host') {
            value = '';
          }
          headers[key] = value;
        }
      }
    } catch {
      // 解析失败，忽略
    }
  }
  
  // 处理多行规则 - 如果包含 @js: 则保留完整内容
  // 否则只取第一行（非空）
  if (!processedRule.includes('@js:') && !processedRule.includes('<js>')) {
    const lines = processedRule.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length > 0) {
      processedRule = lines[0];
    }
  }
  
  return { rule: processedRule, headers };
}

console.log('========================================');
console.log('调试流程测试');
console.log('========================================\n');

// 1. 转换书源
console.log('=== 1. 转换书源 ===\n');
const convertResult = convertSource(testLegadoSource);
if (!convertResult.success) {
  console.log('转换失败:', convertResult.error);
  process.exit(1);
}

const yiciyuanSource = convertResult.result;
console.log('转换成功，格式:', detectSourceFormat(yiciyuanSource) === SourceFormat.Yiciyuan ? '异次元' : 'Legado');

// 2. 检查转换后的关键字段
console.log('\n=== 2. 转换后的关键字段 ===\n');
console.log('ruleSearchUrl:', yiciyuanSource.ruleSearchUrl);
console.log('ruleSearchList:', yiciyuanSource.ruleSearchList);
console.log('ruleSearchName:', yiciyuanSource.ruleSearchName);
console.log('ruleSearchNoteUrl:', yiciyuanSource.ruleSearchNoteUrl);
console.log('header:', yiciyuanSource.header ? '✅ 保留' : '❌ 丢失');

// 3. 模拟 preprocessRule 处理
console.log('\n=== 3. preprocessRule 处理结果 ===\n');

const fields = [
  { name: 'ruleSearchList', value: yiciyuanSource.ruleSearchList },
  { name: 'ruleSearchName', value: yiciyuanSource.ruleSearchName },
  { name: 'ruleSearchNoteUrl', value: yiciyuanSource.ruleSearchNoteUrl },
  { name: 'ruleSearchCoverUrl', value: yiciyuanSource.ruleSearchCoverUrl },
];

for (const field of fields) {
  const original = field.value || '';
  const { rule: processed, headers } = preprocessRule(field.value);
  
  console.log(`${field.name}:`);
  console.log(`  原始: "${original}"`);
  console.log(`  处理后: "${processed}"`);
  if (headers) {
    console.log(`  headers:`, headers);
  }
  
  // 检查是否有问题
  if (original && !processed) {
    console.log(`  ⚠️ 警告: 处理后为空！`);
  } else if (original !== processed && !headers) {
    console.log(`  ⚠️ 注意: 规则被修改`);
  } else {
    console.log(`  ✅ 正常`);
  }
  console.log('');
}

// 4. 检查是否有换行符问题
console.log('=== 4. 换行符检查 ===\n');
for (const field of fields) {
  const value = field.value || '';
  if (value.includes('\n')) {
    console.log(`${field.name}: ⚠️ 包含换行符`);
    console.log(`  内容: ${JSON.stringify(value)}`);
  } else {
    console.log(`${field.name}: ✅ 无换行符`);
  }
}

// 5. 检查 isYiciyuanSource 判断
console.log('\n=== 5. isYiciyuanSource 判断 ===\n');

function isYiciyuanSource(source: any): boolean {
  if (!source) return false;
  
  const yiciyuanFields = [
    'ruleSearchUrl',
    'ruleSearchList',
    'ruleSearchName',
    'ruleSearchNoteUrl',
    'ruleBookContent',
    'ruleFindUrl',
    'ruleChapterUrl',
    'ruleIntroduce',
    'bookSingleThread',
    'httpUserAgent',
  ];
  
  const legadoFields = [
    'ruleSearch',
    'ruleExplore',
    'ruleBookInfo',
    'ruleToc',
    'ruleContent',
    'searchUrl',
    'exploreUrl',
  ];
  
  let yiciyuanCount = 0;
  let legadoCount = 0;
  
  console.log('异次元字段检查:');
  for (const field of yiciyuanFields) {
    const hasField = field in source && source[field] !== undefined && source[field] !== '';
    if (hasField) {
      yiciyuanCount++;
      console.log(`  ${field}: ✅ 存在`);
    }
  }
  
  console.log('\nLegado字段检查:');
  for (const field of legadoFields) {
    const hasField = field in source && source[field] !== undefined && source[field] !== '';
    if (hasField) {
      legadoCount++;
      console.log(`  ${field}: ✅ 存在`);
    }
  }
  
  console.log(`\n异次元字段数: ${yiciyuanCount}`);
  console.log(`Legado字段数: ${legadoCount}`);
  console.log(`判断结果: ${yiciyuanCount > legadoCount ? '异次元' : 'Legado'}`);
  
  return yiciyuanCount > legadoCount;
}

const isYiciyuan = isYiciyuanSource(yiciyuanSource);
console.log(`\n最终判断: ${isYiciyuan ? '使用异次元调试器' : '使用Legado调试器'}`);

console.log('\n========================================');
console.log('测试完成');
console.log('========================================');
