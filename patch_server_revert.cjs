const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

// Replace all gemini-1.5-flash back to gemini-3.5-flash
server = server.replace(/gemini-1\.5-flash/g, 'gemini-3.5-flash');

// Remove the middleware
const regex = /app\.use\(\(req, res, next\) => \{[\s\S]*?const modelHeader = req\.headers\['x-gemini-model'\];[\s\S]*?next\(\);\n\}\);\n/;
server = server.replace(regex, '');

fs.writeFileSync('server.ts', server);
