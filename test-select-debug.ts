/**
 * 调试 selectWithLegadoSyntax
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

const $ = cheerio.load(html);

// 模拟 selectWithLegadoSyntax 的完整逻辑
function selectWithLegadoSyntax(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<any>,
  selector: string
): cheerio.Cheerio<any> {
  console.log(`  selectWithLegadoSyntax: selector="${selector}"`);
  
  // class.xxx 格式
  if (selector.startsWith('class.')) {
    console.log('    -> class.xxx 格式');
    const afterClass = selector.substring(6);
    const classSelector = afterClass.split(/\s+/).map(c => `.${c}`).join('');
    const found = $el.find(classSelector);
    console.log(`    -> find("${classSelector}"): ${found.length}`);
    return found;
  }

  // id.xxx 格式
  if (selector.startsWith('id.')) {
    console.log('    -> id.xxx 格式');
    const id = selector.substring(3);
    return $el.find(`#${id}`);
  }

  // tag.xxx 格式
  if (selector.startsWith('tag.')) {
    console.log('    -> tag.xxx 格式');
    const tag = selector.substring(4).split('.')[0];
    const found = $el.find(tag);
    console.log(`    -> find("${tag}"): ${found.length}`);
    return found;
  }

  // 纯标签名.index 格式，如 a.0, p.1, div.-1
  if (/^[a-z]+\.-?\d+$/i.test(selector)) {
    console.log('    -> 纯标签名.index 格式');
    const match = selector.match(/^([a-z]+)\.(-?\d+)$/i);
    if (match) {
      const tag = match[1];
      const index = parseInt(match[2]);
      const allTags = $el.find(tag);
      return index < 0 ? allTags.eq(allTags.length + index) : allTags.eq(index);
    }
  }

  // 普通 CSS 选择器
  console.log('    -> 普通 CSS 选择器');
  const found = $el.find(selector);
  console.log(`    -> find("${selector}"): ${found.length}`);
  return found;
}

// 测试
console.log('=== 测试 ul.book-list@tag.li ===');
const rule = 'ul.book-list@tag.li';
const parts = rule.split('@');
console.log('parts:', parts);

let $current: cheerio.Cheerio<any> = $.root();
for (const part of parts) {
  if (!part) continue;
  console.log(`\n处理 part: "${part}"`);
  $current = selectWithLegadoSyntax($, $current, part);
  console.log(`  结果数量: ${$current.length}`);
}

console.log('\n最终结果:', $current.length);
