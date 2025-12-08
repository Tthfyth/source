/**
 * 调试 parseList 函数
 */
import * as cheerio from 'cheerio';
import { httpRequest } from './src/main/debug/http-client';

// 复制 splitRule 函数
function splitRule(rule: string): { rules: string[]; operator: 'and' | 'or' | 'none' } {
  // 检查是否有 || 或 && 分隔符
  if (rule.includes('||')) {
    return { rules: rule.split('||').map(r => r.trim()), operator: 'or' };
  }
  if (rule.includes('&&')) {
    return { rules: rule.split('&&').map(r => r.trim()), operator: 'and' };
  }
  return { rules: [rule], operator: 'none' };
}

// 复制 selectWithLegadoSyntax 的 class. 部分
function selectClass($: cheerio.CheerioAPI, $el: cheerio.Cheerio<any>, selector: string): cheerio.Cheerio<any> {
  const afterClass = selector.substring(6);
  
  let className = afterClass;
  let indexPart: string | null = null;
  
  const indexMatch = afterClass.match(/\.(-?\d+|\[.+\])$/);
  if (indexMatch) {
    className = afterClass.substring(0, afterClass.length - indexMatch[0].length);
    indexPart = indexMatch[1];
  }
  
  const classSelector = className.split(/\s+/).map(c => `.${c}`).join('');
  console.log('  selectClass - className:', className, 'classSelector:', classSelector);
  
  const found = $el.find(classSelector);
  console.log('  selectClass - found:', found.length);
  
  return found;
}

async function test() {
  const result = await httpRequest({
    url: 'https://m.ac.qq.com/search/result?word=斗破苍穹',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Android 9; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0'
    }
  });
  
  const body = result.body || '';
  const actualRule = 'class.comic-item';
  
  console.log('=== 模拟 parseList 执行 ===\n');
  console.log('规则:', actualRule);
  
  const $ = cheerio.load(body);
  
  const { rules, operator } = splitRule(actualRule);
  console.log('splitRule 结果:', { rules, operator });
  
  for (const r of rules) {
    console.log('\n处理规则:', r);
    
    const parts = r.split('@');
    console.log('parts:', parts);
    
    let $current: cheerio.Cheerio<any> = $.root();
    console.log('初始 $current 长度:', $current.length);
    
    for (const part of parts) {
      if (!part) continue;
      console.log('\n处理 part:', part);
      
      if (part.startsWith('class.')) {
        $current = selectClass($, $current, part);
      } else {
        $current = $current.find(part);
      }
      
      console.log('处理后 $current 长度:', $current.length);
    }
    
    console.log('\n最终结果数量:', $current.length);
  }
}

test().catch(console.error);
