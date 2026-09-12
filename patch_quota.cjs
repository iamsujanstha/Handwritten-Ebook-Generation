const fs = require('fs');
let quota = fs.readFileSync('src/lib/quotaService.ts', 'utf8');

quota = quota.replace(/gemini-2\.5-flash/g, 'gemini-1.5-flash');

fs.writeFileSync('src/lib/quotaService.ts', quota);
