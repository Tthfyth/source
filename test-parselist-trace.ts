/**
 * 追踪 parseList 执行过程
 */
import * as cheerio from 'cheerio';

const html = `
<ul class="book-list">
  <li class="item">
    <a href="/manhua/1234/">
      <img src="cover.jpg" />
      <h3>斗破苍穹</h3>
    </a>
  </li>
</ul>
`;

// 复制 parseList 的逻辑并添加调试
function parseListDebug(body: string, rule: string) {
  console.log(`\n=== parseList("${rule}") ===`);
  
  if (!rule || !rule.trim()) {
    console.log('  -> 规则为空');
    return [];
  }

  let shouldReverse = false;
  let actualRule = rule.trim();

  // 检查是否需要倒置列表
  if (actualRule.startsWith('-')) {
    shouldReverse = true;
    actualRule = actualRule.substring(1).trim();
    console.log('  -> 需要倒置');
  }

  let results: any[] = [];

  // 正则 AllInOne 模式
  if (actualRule.startsWith(':')) {
    console.log('  -> 正则 AllInOne 模式');
    return [];
  }

  // 先处理 || 分隔符
  if (actualRule.includes('||') && !actualRule.includes('@js:')) {
    console.log('  -> || 分隔符模式');
    return [];
  }

  // JSON 列表检测
  const legadoPrefixes = ['class.', 'id.', 'tag.', 'text.'];
  const isLegadoSyntax = legadoPrefixes.some(prefix => actualRule.startsWith(prefix));
  const isJsonPath = actualRule.startsWith('@json:') || actualRule.startsWith('$.') || 
    (!isLegadoSyntax && /^[a-zA-Z_]\w*\./.test(actualRule));
  
  console.log(`  -> isLegadoSyntax: ${isLegadoSyntax}`);
  console.log(`  -> isJsonPath: ${isJsonPath}`);

  if (isJsonPath) {
    console.log('  -> JSON 路径模式');
    return [];
  }

  // CSS 列表
  console.log('  -> CSS 列表模式');
  const $ = cheerio.load(body);

  // splitRule
  let splitRules = [actualRule];
  let operator = 'or';
  if (actualRule.includes('||')) {
    splitRules = actualRule.split('||');
    operator = 'or';
  } else if (actualRule.includes('&&')) {
    splitRules = actualRule.split('&&');
    operator = 'and';
  }
  console.log(`  -> splitRules: ${JSON.stringify(splitRules)}, operator: ${operator}`);

  for (const r of splitRules) {
    const ruleElements: cheerio.Cheerio<any>[] = [];

    // 使用 @ 分割
    const parts = r.split('@');
    console.log(`  -> parts: ${JSON.stringify(parts)}`);
    
    let $current: cheerio.Cheerio<any> = $.root();
    console.log(`  -> 初始 $current.length: ${$current.length}`);

    for (const part of parts) {
      if (!part) continue;
      console.log(`  -> 处理 part: "${part}"`);
      
      // 模拟 selectWithLegadoSyntax
      if (part.startsWith('class.')) {
        const afterClass = part.substring(6);
        const classSelector = afterClass.split(/\s+/).map(c => `.${c}`).join('');
        $current = $current.find(classSelector);
        console.log(`    -> class.xxx: find("${classSelector}"): ${$current.length}`);
      } else if (part.startsWith('tag.')) {
        const tag = part.substring(4).split('.')[0];
        $current = $current.find(tag);
        console.log(`    -> tag.xxx: find("${tag}"): ${$current.length}`);
      } else {
        $current = $current.find(part);
        console.log(`    -> CSS: find("${part}"): ${$current.length}`);
      }
    }

    $current.each((_, el) => {
      ruleElements.push($(el));
    });
    
    console.log(`  -> ruleElements.length: ${ruleElements.length}`);
    results = ruleElements;
  }

  return results;
}

// 测试
parseListDebug(html, 'ul.book-list');
parseListDebug(html, 'ul.book-list@tag.li');
parseListDebug(html, '.book-list@tag.li');
parseListDebug(html, 'class.book-list@tag.li');
