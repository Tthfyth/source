const fs = require('fs');
const data = JSON.parse(fs.readFileSync('shareBookSource(1).json', 'utf8'));
const idx = parseInt(process.argv[2] || '22');
console.log(`书源 ${idx}:`, data[idx].bookSourceName);
console.log('ruleBookInfo:', JSON.stringify(data[idx].ruleBookInfo, null, 2));
console.log('ruleToc:', JSON.stringify(data[idx].ruleToc, null, 2));
