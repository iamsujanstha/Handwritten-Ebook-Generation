const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/res\.status\(500\)\.json\(\{ error: error\.message \}\);/g, `if (error?.status === 429 || error?.isQuotaError) {
      return res.status(429).json({ error: "QUOTA_EXCEEDED", message: error.message });
    }
    res.status(500).json({ error: error.message });`);

fs.writeFileSync('server.ts', code);
