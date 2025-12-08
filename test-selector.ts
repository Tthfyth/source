/**
 * 测试选择器
 */
import * as cheerio from 'cheerio';
import { httpRequest } from './src/main/debug/http-client';

async function test() {
  const result = await httpRequest({
    url: 'https://m.ac.qq.com/search/result?word=斗破苍穹',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Android 9; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0'
    }
  });
  
  const $ = cheerio.load(result.body || '');
  
  console.log('测试选择器:');
  console.log('$.root().find(".comic-item"):', $.root().find('.comic-item').length);
  console.log('$(".comic-item"):', $('.comic-item').length);
  console.log('$("body").find(".comic-item"):', $('body').find('.comic-item').length);
  
  // 模拟 selectWithLegadoSyntax 的行为
  const selector = 'class.comic-item';
  const afterClass = selector.substring(6); // 'comic-item'
  const classSelector = afterClass.split(/\s+/).map(c => `.${c}`).join(''); // '.comic-item'
  
  console.log('\n模拟 selectWithLegadoSyntax:');
  console.log('afterClass:', afterClass);
  console.log('classSelector:', classSelector);
  console.log('$.root().find(classSelector):', $.root().find(classSelector).length);
  
  // 检查 $.root() 的内容
  console.log('\n$.root() 信息:');
  console.log('$.root().html() 长度:', $.root().html()?.length);
  console.log('$.root().children() 数量:', $.root().children().length);
  console.log('$.root().children() 第一个标签:', $.root().children().first().prop('tagName'));
}

test().catch(console.error);
