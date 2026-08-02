const fs = require('fs');
let content = fs.readFileSync('src/utils/marathiReceiptHtml.ts', 'utf8');
content = content.replace(/\\\$\{/g, '${');
content = content.replace(/\\`/g, '`');
fs.writeFileSync('src/utils/marathiReceiptHtml.ts', content);
console.log('Fixed escaped characters.');
