/**
 * 异次元图源兼容性测试
 * 验证转换后的书源在异次元上能否正常工作
 */

import * as fs from 'fs';
import { convertSource, yiciyuanToLegado, legadoToYiciyuan } from './src/renderer/utils/sourceConverter';
import { SourceFormat, detectSourceFormat } from './src/renderer/types';

// 读取真实的异次元图源
const yiciyuanSources = JSON.parse(fs.readFileSync('1765179391.json', 'utf-8'));

console.log('========================================');
console.log('异次元图源兼容性测试');
console.log('========================================\n');

console.log(`共 ${yiciyuanSources.length} 个图源\n`);

// 分析异次元特有语法
function analyzeYiciyuanSyntax(source: any): string[] {
  const features: string[] = [];
  const allFields = JSON.stringify(source);
  
  // @Header:{} 后缀
  if (allFields.includes('@Header:')) {
    features.push('@Header:{} 后缀');
  }
  
  // searchKey/searchPage 占位符
  if (allFields.includes('searchKey') || allFields.includes('searchPage')) {
    features.push('searchKey/searchPage 占位符');
  }
  
  // <js></js> 代码块
  if (allFields.includes('<js>') || allFields.includes('</js>')) {
    features.push('<js></js> 代码块');
  }
  
  // @js: 代码
  if (allFields.includes('@js:')) {
    features.push('@js: 代码');
  }
  
  // XPath 选择器
  if (allFields.includes('//')) {
    features.push('XPath 选择器');
  }
  
  // JSON 路径
  if (allFields.includes('$.')) {
    features.push('JSON 路径 $.');
  }
  
  // 反转列表 - 前缀
  if (/-[.#\[]/.test(allFields) || allFields.includes('-//') || allFields.includes('-$.')) {
    features.push('- 反转列表');
  }
  
  // tag.xxx 选择器
  if (/tag\.\w+/.test(allFields)) {
    features.push('tag.xxx 选择器');
  }
  
  // id.xxx 选择器
  if (/id\.\w+/.test(allFields)) {
    features.push('id.xxx 选择器');
  }
  
  // || 或规则
  if (allFields.includes('||')) {
    features.push('|| 或规则');
  }
  
  // && 与规则
  if (allFields.includes('&&')) {
    features.push('&& 与规则');
  }
  
  // ## 替换规则
  if (allFields.includes('##')) {
    features.push('## 替换规则');
  }
  
  return features;
}

// 测试单个图源的转换
function testSourceConversion(source: any, index: number): { 
  name: string; 
  format: string;
  features: string[];
  convertSuccess: boolean;
  roundTripSuccess: boolean;
  keyFieldsPreserved: boolean;
  issues: string[];
} {
  const name = source.bookSourceName || `图源${index}`;
  const format = detectSourceFormat(source);
  const features = analyzeYiciyuanSyntax(source);
  const issues: string[] = [];
  
  // 1. 尝试转换
  const convertResult = convertSource(source);
  const convertSuccess = convertResult.success;
  
  if (!convertSuccess) {
    issues.push(`转换失败: ${convertResult.error}`);
    return { name, format: format === SourceFormat.Yiciyuan ? '异次元' : 'Legado', features, convertSuccess, roundTripSuccess: false, keyFieldsPreserved: false, issues };
  }
  
  // 2. 往返转换测试
  const converted = convertResult.result;
  const backResult = convertSource(converted);
  const roundTripSuccess = backResult.success;
  
  if (!roundTripSuccess) {
    issues.push(`往返转换失败: ${backResult.error}`);
  }
  
  // 3. 检查关键字段是否保留
  const back = backResult.result;
  let keyFieldsPreserved = true;
  
  // 检查搜索URL
  const originalSearchUrl = source.ruleSearchUrl || source.searchUrl || '';
  const backSearchUrl = back?.ruleSearchUrl || back?.searchUrl || '';
  
  // 标准化比较（去除格式差异）
  const normalizeUrl = (url: string) => {
    return url
      .replace(/searchKey/g, '{{key}}')
      .replace(/searchPage/g, '{{page}}')
      .replace(/\{\{key\}\}/g, 'KEY')
      .replace(/\{\{page\}\}/g, 'PAGE');
  };
  
  if (normalizeUrl(originalSearchUrl) !== normalizeUrl(backSearchUrl)) {
    keyFieldsPreserved = false;
    issues.push(`搜索URL变化: "${originalSearchUrl}" -> "${backSearchUrl}"`);
  }
  
  // 检查列表规则
  const originalList = source.ruleSearchList || source.ruleSearch?.bookList || '';
  const backList = back?.ruleSearchList || back?.ruleSearch?.bookList || '';
  if (originalList !== backList) {
    keyFieldsPreserved = false;
    issues.push(`列表规则变化: "${originalList}" -> "${backList}"`);
  }
  
  // 检查 @Header 是否保留
  if (features.includes('@Header:{} 后缀')) {
    const originalContent = source.ruleBookContent || '';
    const backContent = back?.ruleBookContent || back?.ruleContent?.content || '';
    if (originalContent.includes('@Header:') && !backContent.includes('@Header:')) {
      issues.push('@Header:{} 后缀丢失');
    }
  }
  
  return { 
    name, 
    format: format === SourceFormat.Yiciyuan ? '异次元' : 'Legado', 
    features, 
    convertSuccess, 
    roundTripSuccess, 
    keyFieldsPreserved, 
    issues 
  };
}

// 运行测试
const results = yiciyuanSources.map((source: any, index: number) => testSourceConversion(source, index));

// 输出结果
console.log('=== 图源分析 ===\n');
results.forEach((r: any, i: number) => {
  console.log(`${i + 1}. ${r.name} (${r.format})`);
  console.log(`   特性: ${r.features.length > 0 ? r.features.join(', ') : '无特殊语法'}`);
  console.log(`   转换: ${r.convertSuccess ? '✅' : '❌'} | 往返: ${r.roundTripSuccess ? '✅' : '❌'} | 字段保留: ${r.keyFieldsPreserved ? '✅' : '⚠️'}`);
  if (r.issues.length > 0) {
    r.issues.forEach((issue: string) => console.log(`   ⚠️ ${issue}`));
  }
  console.log('');
});

// 统计
console.log('=== 统计 ===\n');
const totalCount = results.length;
const convertSuccessCount = results.filter((r: any) => r.convertSuccess).length;
const roundTripSuccessCount = results.filter((r: any) => r.roundTripSuccess).length;
const keyFieldsPreservedCount = results.filter((r: any) => r.keyFieldsPreserved).length;

console.log(`总数: ${totalCount}`);
console.log(`转换成功: ${convertSuccessCount}/${totalCount} (${(convertSuccessCount/totalCount*100).toFixed(1)}%)`);
console.log(`往返成功: ${roundTripSuccessCount}/${totalCount} (${(roundTripSuccessCount/totalCount*100).toFixed(1)}%)`);
console.log(`字段保留: ${keyFieldsPreservedCount}/${totalCount} (${(keyFieldsPreservedCount/totalCount*100).toFixed(1)}%)`);

// 特性统计
console.log('\n=== 特性使用统计 ===\n');
const featureCount: Record<string, number> = {};
results.forEach((r: any) => {
  r.features.forEach((f: string) => {
    featureCount[f] = (featureCount[f] || 0) + 1;
  });
});
Object.entries(featureCount)
  .sort((a, b) => b[1] - a[1])
  .forEach(([feature, count]) => {
    console.log(`  ${feature}: ${count}个图源使用`);
  });

// 问题汇总
const allIssues = results.flatMap((r: any) => r.issues);
if (allIssues.length > 0) {
  console.log('\n=== 问题汇总 ===\n');
  const issueCount: Record<string, number> = {};
  allIssues.forEach((issue: string) => {
    const key = issue.split(':')[0];
    issueCount[key] = (issueCount[key] || 0) + 1;
  });
  Object.entries(issueCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([issue, count]) => {
      console.log(`  ${issue}: ${count}次`);
    });
}

console.log('\n========================================');
console.log('测试完成');
console.log('========================================');
