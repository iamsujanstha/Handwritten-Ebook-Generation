const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(`      if (error?.status === 429 || error?.isQuotaError) {
        return res.status(429).json({ error: "QUOTA_EXCEEDED", message: error.message });
      }`, '');

fs.writeFileSync('server.ts', code);
