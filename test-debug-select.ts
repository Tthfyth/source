/**
 * 深入调试 selectWithLegadoSyntax
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
const $root = $.root();

console.log('=== 基础测试 ===');
console.log('$root.find("ul"):', $root.find('ul').length);
console.log('$root.find("ul.book-list"):', $root.find('ul.book-list').length);
console.log('$root.find(".book-list"):', $root.find('.book-list').length);

// 检查 root 的内容
console.log('\n=== root 内容 ===');
console.log('$root.html():', $root.html()?.substring(0, 200));

// 检查 children
console.log('\n=== children ===');
console.log('$root.children():', $root.children().length);
$root.children().each((i, el) => {
  console.log(`  [${i}] ${el.type} ${(el as any).name || ''}`);
});

// 直接在 body 上查找
console.log('\n=== 在 body 上查找 ===');
const $body = $('body');
console.log('$body.length:', $body.length);
console.log('$body.find("ul.book-list"):', $body.find('ul.book-list').length);

// 在 html 上查找
const $html = $('html');
console.log('\n=== 在 html 上查找 ===');
console.log('$html.length:', $html.length);
console.log('$html.find("ul.book-list"):', $html.find('ul.book-list').length);

// 直接使用 $ 查找
console.log('\n=== 直接 $ 查找 ===');
console.log('$("ul.book-list"):', $('ul.book-list').length);
