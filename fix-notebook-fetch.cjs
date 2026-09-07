const fs = require('fs');
let code = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf-8');

code = code.replace(/if \(!response\.ok\) \{\n\s*throw new Error\(\`Failed to format content: \$\{response\.statusText\}\`\);\n\s*\}/, `if (!response.ok) {
        let msg = response.statusText;
        try {
           const errData = await response.json();
           if (errData.error === "QUOTA_EXCEEDED") msg = "QUOTA_EXCEEDED";
           else msg = errData.error || errData.message || msg;
        } catch(e) {}
        throw new Error(msg);
      }`);

fs.writeFileSync('src/pages/SingleNotebook.tsx', code);
