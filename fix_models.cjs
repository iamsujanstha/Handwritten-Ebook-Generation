const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

content = content.replace(/gemini-2\.5-flash/g, 'gemini-3.8-flash');
content = content.replace(/gemini-2\.5-pro/g, 'gemini-3.1-pro-preview');

fs.writeFileSync('server.ts', content);
