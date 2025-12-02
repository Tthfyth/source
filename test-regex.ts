const content = `<img src="http://img1.jpg">
<img src="http://img2.jpg">
<img src="http://img3.jpg">`;

// 原来的正则
const pattern1 = /<img[^>]*\s(?:data-src|src)\s*=\s*['"]([^'"]+)['"][^>]*>/gi;

// 新的正则
const pattern2 = /<img\s+(?:[^>]*?\s)?(?:data-src|src)\s*=\s*["']([^"']+)["']/gi;

// 更简单的正则
const pattern3 = /<img\s+src\s*=\s*["']([^"']+)["']/gi;

console.log('内容:', content);
console.log('\n--- 原正则 ---');
let m;
while ((m = pattern1.exec(content)) !== null) {
  console.log('匹配:', m[1]);
}

console.log('\n--- 新正则 ---');
pattern2.lastIndex = 0;
while ((m = pattern2.exec(content)) !== null) {
  console.log('匹配:', m[1]);
}

console.log('\n--- 简单正则 ---');
pattern3.lastIndex = 0;
while ((m = pattern3.exec(content)) !== null) {
  console.log('匹配:', m[1]);
}
