/**
 * 调试书源搜索URL构建
 */
import * as fs from 'fs';
import { buildSearchUrl } from './src/main/debug/analyze-url';

const sourcesJson = fs.readFileSync('shareBookSource(1).json', 'utf8');
const allSources = JSON.parse(sourcesJson);

const keyword = '斗破苍穹';

console.log('调试书源搜索URL构建\n');

for (let i = 0; i < allSources.length; i++) {
  const source = allSources[i];
  const name = source.bookSourceName.substring(0, 20).padEnd(20);
  
  try {
    const analyzeUrl = buildSearchUrl(source, keyword, 1, {});
    
    if (!analyzeUrl) {
      console.log(`[${i + 1}] ${name} ❌ 无搜索URL`);
      continue;
    }
    
    const url = analyzeUrl.getUrl();
    const method = analyzeUrl.getMethod();
    
    if (!url || url === 'null' || url === 'undefined') {
      console.log(`[${i + 1}] ${name} ❌ URL为空`);
    } else if (url.startsWith('<js>') || url.includes('@js:')) {
      console.log(`[${i + 1}] ${name} ⚠️ JS未执行: ${url.substring(0, 50)}...`);
    } else {
      console.log(`[${i + 1}] ${name} ✅ ${method} ${url.substring(0, 60)}...`);
    }
  } catch (error: any) {
    console.log(`[${i + 1}] ${name} ❌ 异常: ${error.message?.substring(0, 40)}`);
  }
}
