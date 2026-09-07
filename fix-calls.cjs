const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Replace model: "gemini-3.5-flash" with model: req.headers["x-gemini-model"] || "gemini-3.5-flash"
code = code.replace(/model:\s*"gemini-3.5-flash"/g, 'model: (req.headers["x-gemini-model"] as string) || "gemini-3.5-flash"');

// Replace generateContentWithRetry({ with generateContentWithRetry({..., req.headers["x-gemini-api-key"] as string)
code = code.replace(/await generateContentWithRetry\(\{([\s\S]*?)\}\);/g, 'await generateContentWithRetry({$1}, req.headers["x-gemini-api-key"] as string);');

fs.writeFileSync('server.ts', code);
