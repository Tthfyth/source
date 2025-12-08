/**
 * 调试 parseList 对 ul.book-list@tag.li 的处理
 */
import * as cheerio from 'cheerio';
import { parseList, ParseContext } from './src/main/debug/rule-parser';

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

const ctx: ParseContext = {
  body: html,
  baseUrl: 'https://example.com',
  variables: {}
};

const rules = [
  'ul.book-list@tag.li',
  'ul.book-list li',
  '.book-list@tag.li',
  'class.book-list@tag.li',
];

console.log('=== parseList 测试 ===');
for (const rule of rules) {
  const items = parseList(ctx, rule);
  console.log(`规则 "${rule}": ${items.length} 个元素`);
}

// 手动测试 @ 分割
console.log('\n=== @ 分割测试 ===');
const rule = 'ul.book-list@tag.li';
const parts = rule.split('@');
console.log('parts:', parts);

const $ = cheerio.load(html);
let $current: cheerio.Cheerio<any> = $.root();

for (const part of parts) {
  console.log(`处理 part: "${part}"`);
  console.log(`  当前元素数量: ${$current.length}`);
  
  // 模拟 selectWithLegadoSyntax
  if (part.startsWith('tag.')) {
    const tag = part.substring(4);
    $current = $current.find(tag);
    console.log(`  tag.${tag} -> find("${tag}"): ${$current.length}`);
  } else {
    $current = $current.find(part);
    console.log(`  find("${part}"): ${$current.length}`);
  }
}
