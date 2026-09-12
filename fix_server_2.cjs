const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  /res\.status\(500\)\.json\(\{ error: error\.message \}\);\n  \}\s*\}\, req\.headers\["x-gemini-api-key"\] as string, req\.headers\["x-api-base-url"\] as string\);/g,
  'res.status(500).json({ error: error.message });\n  }\n});'
);

fs.writeFileSync('server.ts', content);
