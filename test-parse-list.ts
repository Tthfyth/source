/**
 * 测试 parseList 函数
 */
import { parseList, ParseContext, parseFromElement } from './src/main/debug/rule-parser';
import { httpRequest } from './src/main/debug/http-client';

async function testTencentParsing() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                 测试腾讯漫画规则解析');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const url = 'https://m.ac.qq.com/search/result?word=斗破苍穹';
  
  const result = await httpRequest({
    url,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Android 9; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0'
    }
  });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  const ctx: ParseContext = {
    body: result.body || '',
    baseUrl: 'https://m.ac.qq.com',
    variables: {}
  };
  
  // 测试不同的列表规则
  const listRules = [
    'class.comic-item',
    '.comic-item',
    'tag.div@class.comic-item',
  ];
  
  for (const rule of listRules) {
    console.log(`\n--- 测试规则: "${rule}" ---`);
    const elements = parseList(ctx, rule);
    console.log(`结果数量: ${elements.length}`);
    
    if (elements.length > 0) {
      // 测试从元素中解析字段
      const firstEl = elements[0];
      console.log('第一个元素类型:', typeof firstEl);
      
      // 测试名称解析
      const nameRules = [
        'class.comic-title@text',
        '.comic-title@text',
        'tag.p@class.comic-title@text'
      ];
      
      for (const nameRule of nameRules) {
        const nameResult = parseFromElement(firstEl, nameRule, 'https://m.ac.qq.com', {});
        console.log(`  名称规则 "${nameRule}": ${nameResult.success ? nameResult.data : '失败'}`);
      }
      
      // 测试链接解析
      const urlRules = [
        'class.comic-link@href',
        '.comic-link@href',
        'tag.a@class.comic-link@href'
      ];
      
      for (const urlRule of urlRules) {
        const urlResult = parseFromElement(firstEl, urlRule, 'https://m.ac.qq.com', {});
        console.log(`  链接规则 "${urlRule}": ${urlResult.success ? urlResult.data : '失败'}`);
      }
    }
  }
}

async function testZymkParsing() {
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('                 测试知音漫客规则解析');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // 知音漫客的搜索页面需要特殊处理
  // 先获取分类页面测试
  const url = 'https://m.zymk.cn/sort/all.html';
  
  const result = await httpRequest({
    url,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
    }
  });
  
  if (!result.success) {
    console.log('请求失败:', result.error);
    return;
  }
  
  console.log('响应长度:', result.body?.length);
  
  const ctx: ParseContext = {
    body: result.body || '',
    baseUrl: 'https://m.zymk.cn',
    variables: {}
  };
  
  // 测试不同的列表规则
  const listRules = [
    'class.comic-sort@tag.li',
    '.comic-sort li',
    'ul.comic-sort li',
    'class.order-list@tag.li',
    '.order-list li',
    'tag.ul@tag.li'
  ];
  
  for (const rule of listRules) {
    console.log(`\n--- 测试规则: "${rule}" ---`);
    const elements = parseList(ctx, rule);
    console.log(`结果数量: ${elements.length}`);
  }
  
  // 打印页面中的 ul 和 li 结构
  console.log('\n--- 页面结构分析 ---');
  const cheerio = await import('cheerio');
  const $ = cheerio.load(result.body || '');
  
  $('ul').each((i, ul) => {
    const cls = $(ul).attr('class') || '(无类名)';
    const liCount = $(ul).find('li').length;
    if (liCount > 0) {
      console.log(`ul.${cls}: ${liCount} 个 li`);
    }
  });
}

async function main() {
  await testTencentParsing();
  await testZymkParsing();
}

main().catch(console.error);
