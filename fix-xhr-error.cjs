const fs = require('fs');
let code = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf-8');

code = code.replace(/reject\(new Error\(\`Server returned non-JSON response\. Status: \$\{xhr\.status\}, Type: \$\{contentType\}, Body: \$\{preview\}\`\)\);/, 
`if (preview.includes("<!doctype html>")) {
                reject(new Error("Your session expired or the server is restarting. Please reload the page to continue."));
             } else {
                reject(new Error(\`Server returned non-JSON response. Status: \$\{xhr\.status\}, Type: \$\{contentType\}, Body: \$\{preview\}\`));
             }`);
fs.writeFileSync('src/pages/SingleNotebook.tsx', code);
