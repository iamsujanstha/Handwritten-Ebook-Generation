const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/return if \(error\?/g, 'if (error?');
fs.writeFileSync('server.ts', code);
