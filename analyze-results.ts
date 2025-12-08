/**
 * 分析测试结果
 */
import * as fs from 'fs';

const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
const sources = JSON.parse(fs.readFileSync('shareBookSource(1).json', 'utf8'));

// 网络错误关键词
const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'certificate', 'timeout', 'ECONNREFUSED'];

// 分类
const categories = {
  success: [] as any[],
  networkError: [] as any[],
  apiEmpty: [] as any[],
  parseError: [] as any[],
  jsError: [] as any[],
};

for (const r of results) {
  if (r.search && r.detail && r.toc && r.content) {
    categories.success.push(r);
  } else {
    const error = r.searchError || r.detailError || r.tocError || r.contentError || '';
    
    if (networkErrors.some(ne => error.toLowerCase().includes(ne.toLowerCase()))) {
      categories.networkError.push(r);
    } else if (error.includes('无搜索结果') || error.includes('无章节') || error.includes('无图片')) {
      // 检查是否使用了复杂 JS 规则
      const source = sources[r.index - 1];
      const hasComplexJs = source?.searchUrl?.includes('<js>') || 
                          source?.ruleSearch?.bookList?.includes('<js>') ||
                          source?.searchUrl?.includes('@js:');
      if (hasComplexJs) {
        categories.jsError.push({ ...r, reason: '复杂JS规则' });
      } else {
        categories.apiEmpty.push(r);
      }
    } else if (error.includes('搜索失败') || error.includes('详情失败') || error.includes('正文失败')) {
      categories.jsError.push({ ...r, reason: error });
    } else {
      categories.parseError.push(r);
    }
  }
}

console.log('=== 测试结果分析 ===\n');

console.log(`✅ 完全成功: ${categories.success.length}/${results.length}`);
categories.success.forEach(r => console.log(`   [${r.index}] ${r.name}`));

console.log(`\n🌐 网络错误 (无法控制): ${categories.networkError.length}/${results.length}`);
categories.networkError.forEach(r => console.log(`   [${r.index}] ${r.name} - ${r.searchError || r.detailError}`));

console.log(`\n📭 API返回空 (网站问题): ${categories.apiEmpty.length}/${results.length}`);
categories.apiEmpty.forEach(r => console.log(`   [${r.index}] ${r.name}`));

console.log(`\n⚙️ JS规则问题 (需要完善): ${categories.jsError.length}/${results.length}`);
categories.jsError.forEach(r => console.log(`   [${r.index}] ${r.name} - ${(r as any).reason || r.searchError}`));

console.log(`\n❓ 其他解析问题: ${categories.parseError.length}/${results.length}`);
categories.parseError.forEach(r => console.log(`   [${r.index}] ${r.name} - ${r.searchError || r.detailError || r.tocError || r.contentError}`));

// 计算排除网络问题后的成功率
const nonNetworkTotal = results.length - categories.networkError.length;
const successRate = (categories.success.length / nonNetworkTotal * 100).toFixed(1);
console.log(`\n📊 排除网络问题后的成功率: ${categories.success.length}/${nonNetworkTotal} (${successRate}%)`);
