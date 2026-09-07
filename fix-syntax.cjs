const fs = require('fs');
let code = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf-8');

code = code.replace(/xhr\.onerror = \(\) => \{ clearInterval\(progressInterval\); reject\(new Error\("Network error"\)\);/g, 'xhr.onerror = () => { clearInterval(progressInterval); reject(new Error("Network error")); };');

fs.writeFileSync('src/pages/SingleNotebook.tsx', code);
