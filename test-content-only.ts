/**
 * 简单测试正文解析
 */
import { parseRule, ParseContext } from './src/main/debug/rule-parser';

const jsonData = `{"code":"200","data":[{"page_id":"1","image":"http://img1.jpg"},{"page_id":"2","image":"http://img2.jpg"}]}`;

const rule = `$.data[*].image
@js:result.split("\\n").map(x=>'<img src="'+x+'">').join("\\n")`;

const ctx: ParseContext = {
  body: jsonData,
  baseUrl: 'https://comic.mkzcdn.com',
  variables: {},
};

console.log('规则:', rule);
console.log('数据:', jsonData);
console.log('---');

const result = parseRule(ctx, rule);
console.log('结果:', result);
