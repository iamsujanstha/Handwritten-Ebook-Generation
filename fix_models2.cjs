const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

content = content.replace(/gemini-3\.1-pro-preview/g, 'gemini-3.8-flash');

fs.writeFileSync('server.ts', content);
