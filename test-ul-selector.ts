/**
 * 测试 ul.book-list 选择器
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

console.log('=== Cheerio 选择器测试 ===');
console.log('ul.book-list:', $('ul.book-list').length);
console.log('ul.book-list li:', $('ul.book-list li').length);
console.log('.book-list:', $('.book-list').length);
console.log('.book-list li:', $('.book-list li').length);

// 模拟 selectWithLegadoSyntax 的行为
const selector = 'ul.book-list';
console.log('\n=== 选择器分析 ===');
console.log('selector:', selector);
console.log('startsWith("class."):', selector.startsWith('class.'));
console.log('startsWith("tag."):', selector.startsWith('tag.'));
console.log('startsWith("id."):', selector.startsWith('id.'));

// 直接使用 find
const root = $.root();
console.log('\n=== find 测试 ===');
console.log('root.find("ul.book-list"):', root.find('ul.book-list').length);
console.log('root.find("ul.book-list").find("li"):', root.find('ul.book-list').find('li').length);
