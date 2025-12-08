/**
 * 在 parseList 内部添加调试
 */
import * as cheerio from 'cheerio';
import { httpRequest } from './src/main/debug/http-client';

// 复制 splitRule
function splitRule(rule: string): { rules: string[]; operator: 'or' | 'and' | 'format' } {
  if (/<js>[\s\S]*?<\/js>/i.test(rule) || rule.includes('@js:')) {
    return { rules: [rule], operator: 'or' };
  }
  if (rule.includes('||')) {
    return { rules: rule.split('||'), operator: 'or' };
  }
  if (rule.includes('&&')) {
    return { rules: rule.split('&&'), operator: 'and' };
  }
  if (rule.includes('%%')) {
    return { rules: rule.split('%%'), operator: 'format' };
  }
  return { rules: [rule], operator: 'or' };
}

// 复制 parseIndexExpression
function parseIndexExpression(expr: string, length: number): number[] {
  const indices: number[] = [];
  const parts = expr.split(':');
  
  if (parts.length === 1) {
    const idx = parseInt(parts[0]);
    if (!isNaN(idx)) {
      indices.push(idx < 0 ? length + idx : idx);
    }
  } else {
    let start = parts[0] ? parseInt(parts[0]) : 0;
    let end = parts[1] ? parseInt(parts[1]) : length;
    const step = parts[2] ? parseInt(parts[2]) : 1;
    
    if (start < 0) start = length + start;
    if (end < 0) end = length + end;
    
    for (let i = start; step > 0 ? i < end : i > end; i += step) {
      if (i >= 0 && i < length) indices.push(i);
    }
  }
  
  return indices;
}

// 复制 selectWithLegadoSyntax
function selectWithLegadoSyntax(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<any>,
  selector: string
): cheerio.Cheerio<any> {
  console.log(`  [selectWithLegadoSyntax] selector="${selector}", $el.length=${$el.length}`);
  
  // children
  if (selector === 'children') {
    return $el.children();
  }

  // 数组索引
  if (selector.startsWith('[') && selector.endsWith(']')) {
    const expr = selector.slice(1, -1);
    if (/[=~^$*|]/.test(expr) || /^[a-zA-Z]/.test(expr)) {
      return $el.find(selector);
    }
    const children = $el.children();
    const indices = parseIndexExpression(expr, children.length);
    const result = $();
    for (const idx of indices) {
      result.add(children.eq(idx));
    }
    return result.length > 0 ? result : children.filter((i) => indices.includes(i));
  }

  // text.xxx
  if (selector.startsWith('text.')) {
    const searchText = selector.substring(5);
    return $el.find('*').filter((_, el) => {
      const text = $(el).clone().children().remove().end().text();
      return text.includes(searchText);
    });
  }

  // class.xxx
  if (selector.startsWith('class.')) {
    const afterClass = selector.substring(6);
    console.log(`  [selectWithLegadoSyntax] class. detected, afterClass="${afterClass}"`);
    
    let className = afterClass;
    let indexPart: string | null = null;
    
    const indexMatch = afterClass.match(/\.(-?\d+|\[.+\])$/);
    if (indexMatch) {
      className = afterClass.substring(0, afterClass.length - indexMatch[0].length);
      indexPart = indexMatch[1];
    }
    
    const classSelector = className.split(/\s+/).map(c => `.${c}`).join('');
    console.log(`  [selectWithLegadoSyntax] classSelector="${classSelector}"`);
    
    const found = $el.find(classSelector);
    console.log(`  [selectWithLegadoSyntax] found.length=${found.length}`);

    if (indexPart) {
      if (/^-?\d+$/.test(indexPart)) {
        const index = parseInt(indexPart);
        return index < 0 ? found.eq(found.length + index) : found.eq(index);
      }
      if (indexPart.startsWith('[')) {
        const indices = parseIndexExpression(indexPart.slice(1, -1), found.length);
        return found.filter((i) => indices.includes(i));
      }
    }

    if (found.length === 0 && $el.hasClass) {
      const allMatch = className.split(/\s+/).every(c => $el.hasClass(c));
      if (allMatch) return $el;
    }
    return found;
  }

  // id.xxx
  if (selector.startsWith('id.')) {
    const id = selector.substring(3);
    return $el.find(`#${id}`);
  }

  // tag.xxx
  if (selector.startsWith('tag.')) {
    const parts = selector.substring(4).split('.');
    const tag = parts[0];
    let allTags = $el.find(tag);
    
    if (parts.length > 1) {
      const indexPart = parts.slice(1).join('.');
      if (/^-?\d+$/.test(indexPart)) {
        const index = parseInt(indexPart);
        return index < 0 ? allTags.eq(allTags.length + index) : allTags.eq(index);
      }
    }
    return allTags;
  }

  // 默认 CSS 选择器
  console.log(`  [selectWithLegadoSyntax] 使用默认 CSS 选择器`);
  const result = $el.find(selector);
  console.log(`  [selectWithLegadoSyntax] 默认选择器结果: ${result.length}`);
  return result;
}

// 模拟 parseList
function parseList(body: string, rule: string): any[] {
  console.log(`\n[parseList] rule="${rule}"`);
  
  let shouldReverse = false;
  let actualRule = rule.trim();

  if (actualRule.startsWith('-')) {
    shouldReverse = true;
    actualRule = actualRule.substring(1).trim();
  }

  let results: any[] = [];

  // 正则
  if (actualRule.startsWith(':')) {
    console.log('[parseList] 正则模式');
    return [];
  }

  // JSON
  if (actualRule.startsWith('@json:') || actualRule.startsWith('$.') || /^[a-zA-Z_]\w*\./.test(actualRule)) {
    console.log('[parseList] JSON 模式检测');
    // 检查是否真的是 JSON 模式
    // class.xxx 不应该匹配这个条件
    console.log(`  actualRule.startsWith('@json:'): ${actualRule.startsWith('@json:')}`);
    console.log(`  actualRule.startsWith('$.'): ${actualRule.startsWith('$.')}`);
    console.log(`  /^[a-zA-Z_]\\w*\\./.test(actualRule): ${/^[a-zA-Z_]\w*\./.test(actualRule)}`);
    
    // 这里是问题！class.comic-item 匹配了 /^[a-zA-Z_]\w*\./ 正则
    // 因为 "class" 是字母开头，后面跟着 "."
    return [];
  }

  console.log('[parseList] CSS 模式');
  const $ = cheerio.load(body);
  const { rules, operator } = splitRule(actualRule);
  console.log(`[parseList] splitRule 结果: rules=${JSON.stringify(rules)}, operator=${operator}`);

  for (const r of rules) {
    const ruleElements: cheerio.Cheerio<any>[] = [];
    const parts = r.split('@');
    console.log(`[parseList] 处理规则 "${r}", parts=${JSON.stringify(parts)}`);
    
    let $current: cheerio.Cheerio<any> = $.root();

    for (const part of parts) {
      if (!part) continue;
      $current = selectWithLegadoSyntax($, $current, part);
    }

    $current.each((_, el) => {
      ruleElements.push($(el));
    });

    console.log(`[parseList] 规则 "${r}" 匹配到 ${ruleElements.length} 个元素`);

    if (operator === 'or' && ruleElements.length > 0) {
      results = ruleElements;
      break;
    } else if (operator === 'and') {
      results = results.concat(ruleElements);
    } else {
      results = ruleElements;
    }
  }

  return shouldReverse ? results.reverse() : results;
}

async function test() {
  const result = await httpRequest({
    url: 'https://m.ac.qq.com/search/result?word=斗破苍穹',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Android 9; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0'
    }
  });
  
  const body = result.body || '';
  
  console.log('=== 测试 class.comic-item ===');
  const r1 = parseList(body, 'class.comic-item');
  console.log(`结果: ${r1.length}`);
  
  console.log('\n=== 测试 .comic-item ===');
  const r2 = parseList(body, '.comic-item');
  console.log(`结果: ${r2.length}`);
}

test().catch(console.error);
