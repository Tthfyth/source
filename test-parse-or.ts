/**
 * 测试 parseList 对 || 分隔符的处理
 */
import { parseList, ParseContext } from './src/main/debug/rule-parser';

// 好看漫画的响应
const jsonBody = `{"code":200,"msg":"success","time":1764815363,"data":{"type":2,"name":"搜索","list":[{"id":130,"title":"高术通神","author":"仟绘动漫"}]}}`;

const ctx: ParseContext = {
  body: jsonBody,
  baseUrl: 'https://www.9comic.cn',
  variables: {}
};

const rules = [
  '$..list[*]',
  '$.data[*]',
  '$..list[*]||$.data[*]',
  '@json:$..list[*]',
  '@json:$.data.list[*]',
];

console.log('=== JSON 解析测试 ===');
console.log('JSON:', jsonBody.substring(0, 100));

for (const rule of rules) {
  const items = parseList(ctx, rule);
  console.log(`\n规则 "${rule}":`);
  console.log(`  结果数量: ${items.length}`);
  if (items.length > 0) {
    console.log(`  第一项: ${JSON.stringify(items[0]).substring(0, 100)}`);
  }
}

// 酸奶漫画的 HTML
const htmlBody = `
<ul class="book-list">
  <li class="item">
    <a href="/manhua/1234/">
      <img src="cover.jpg" />
      <h3>斗破苍穹</h3>
    </a>
  </li>
</ul>
`;

const htmlCtx: ParseContext = {
  body: htmlBody,
  baseUrl: 'https://m.1kkk.com',
  variables: {}
};

const htmlRules = [
  'ul.book-list@tag.li',
  '.book-list li',
  'class.book-list@tag.li',
  '.book-list .item',
];

console.log('\n\n=== HTML 解析测试 ===');
console.log('HTML:', htmlBody.substring(0, 100));

for (const rule of htmlRules) {
  const items = parseList(htmlCtx, rule);
  console.log(`\n规则 "${rule}":`);
  console.log(`  结果数量: ${items.length}`);
}
