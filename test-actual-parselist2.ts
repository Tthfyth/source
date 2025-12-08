/**
 * 直接调用实际的 parseList 并添加调试
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

// 直接测试 cheerio
const $ = cheerio.load(html);
console.log('=== 直接 Cheerio 测试 ===');
console.log('$("ul.book-list"):', $('ul.book-list').length);
console.log('$("ul.book-list").find("li"):', $('ul.book-list').find('li').length);
console.log('$.root().find("ul.book-list"):', $.root().find('ul.book-list').length);

// 测试 parseList
const ctx: ParseContext = {
  body: html,
  baseUrl: 'https://example.com',
  variables: {}
};

console.log('\n=== parseList 测试 ===');

// 测试不同的规则格式
const rules = [
  'ul.book-list',           // 只有第一部分
  'tag.li',                 // 只有 tag.li
  'ul.book-list@tag.li',    // 完整规则
  '.book-list@tag.li',      // 使用 .class 格式
  'class.book-list@tag.li', // 使用 class. 格式
  'ul li',                  // 纯 CSS
];

for (const rule of rules) {
  const items = parseList(ctx, rule);
  console.log(`规则 "${rule}": ${items.length} 个元素`);
}

// 检查 body 是否正确
console.log('\n=== ctx.body 检查 ===');
console.log('body 长度:', ctx.body.length);
console.log('body 包含 ul.book-list:', ctx.body.includes('ul'));
console.log('body 包含 book-list:', ctx.body.includes('book-list'));
