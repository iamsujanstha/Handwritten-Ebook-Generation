const fs = require('fs');
let code = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf-8');

code = code.replace(/xhr\.open\("POST", url\);/, 'xhr.open("POST", url);\n      xhr.withCredentials = true;');
fs.writeFileSync('src/pages/SingleNotebook.tsx', code);
