const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace("const path = require('path');", "");
code = code.replace("const os = require('os');", "");

fs.writeFileSync('server.ts', code);
