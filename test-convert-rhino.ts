/**
 * 测试 convertRhinoToES6
 */

function convertRhinoToES6(code: string): string {
  let result = code;
  
  // 1. 转换 let 表达式: let (x = value) expr -> ((x) => expr)(value)
  result = result.replace(
    /let\s*\(\s*(\w+)\s*=\s*([^)]+)\)\s*([^;{\n)]+)/g,
    (match, varName, value, expr) => {
      const cleanExpr = expr.trim();
      return `((${varName}) => ${cleanExpr})(${value})`;
    }
  );
  
  // 2. 转换 for each 语法: for each (x in arr) -> for (let x of arr)
  result = result.replace(
    /for\s+each\s*\(\s*((?:var|let|const)?\s*\w+)\s+in\s+/g,
    'for ($1 of '
  );
  
  // 3. 转换 Java 风格的数组声明
  result = result.replace(/new\s+[\w.]+\[\]/g, '[]');
  
  // 4. 转换 with 语句中的 JavaImporter
  result = result.replace(/with\s*\(\s*\w+\s*\)\s*\{/g, '{');
  
  // 5. 处理 Java 类型转换
  result = result.replace(/\(java\.lang\.String\)\s*(\w+)/g, 'String($1)');
  result = result.replace(/\(java\.lang\.Integer\)\s*(\w+)/g, 'parseInt($1)');
  
  return result;
}

const code = `
var mid=src.match(/data\\-mid\\="(\\d+)"/)[1];
java.put("mid",mid)
var r=\`https://api-get-v2.mgsearcher.com/api/manga/get?mid=\${mid}&mode=all\`
r;
`;

console.log('原始代码:', code);
const converted = convertRhinoToES6(code);
console.log('转换后:', converted);
console.log('是否相同:', code === converted);
