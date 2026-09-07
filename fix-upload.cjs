const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/res\.status\(500\)\.json\(\{ error: "Upload failed: " \+ err\.message \}\);/g, 'return res.status(500).json({ error: "Upload failed: " + err.message });');

fs.writeFileSync('server.ts', code);
