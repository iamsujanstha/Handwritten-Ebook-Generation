const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(/gemini-3\.5-flash/g, 'gemini-2.5-flash');

fs.writeFileSync('server.ts', server);
