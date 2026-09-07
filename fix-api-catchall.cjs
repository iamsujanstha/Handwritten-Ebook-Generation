const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');
const replacement = `// Fallback for API routes\napp.all("/api/*", (req, res) => {\n  res.status(404).json({ error: "API Route not found: " + req.method + " " + req.path });\n});\n\nasync function startServer`;
code = code.replace("async function startServer", replacement);
fs.writeFileSync('server.ts', code);
