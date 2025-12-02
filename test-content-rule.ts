/**
 * 测试正文规则解析
 */
import { parseRule, ParseContext } from './src/main/debug/rule-parser';

// 模拟 API 返回的数据
const jsonData = `{"code":"200","data":[{"page_id":"1","image":"http://img1.jpg"},{"page_id":"2","image":"http://img2.jpg"},{"page_id":"3","image":"http://img3.jpg"}]}`;

// 原始 JSON 中的规则（\n 是换行符，\\n 是字面量）
const rule1 = '$.data[*].image\n@js:\nresult.split("\\n").map(x=>\'<img src="\'+x+\'">\').join("\\n")';

// 简化规则
const rule2 = `$.data[*].image
@js:result.split("\\n").map(x=>'<img src="'+x+'">').join("\\n")`;

// 更简化
const rule3 = '$.data[*].image';

const ctx: ParseContext = {
  body: jsonData,
  baseUrl: 'https://comic.mkzcdn.com',
  variables: {},
};

console.log('=== 测试规则1 (原始JSON格式) ===');
console.log('规则:', JSON.stringify(rule1));
const result1 = parseRule(ctx, rule1);
console.log('结果:', result1);

console.log('\n=== 测试规则2 (模板字符串) ===');
console.log('规则:', JSON.stringify(rule2));
const result2 = parseRule(ctx, rule2);
console.log('结果:', result2);

console.log('\n=== 测试规则3 (仅JSONPath) ===');
console.log('规则:', JSON.stringify(rule3));
const result3 = parseRule(ctx, rule3);
console.log('结果:', result3);
