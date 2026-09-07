const fs = require('fs');
let content = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf-8');

const oldXhr = /const contentType = xhr\.getResponseHeader\("content-type"\);\s*if \(contentType && contentType\.indexOf\("application\/json"\) === -1\) \{\s*reject\(new Error\("Server returned non-JSON response\."\)\);\s*return;\s*\}/;

const newXhr = `const contentType = xhr.getResponseHeader("content-type");
          if (contentType && contentType.indexOf("application/json") === -1) {
             const preview = xhr.responseText.substring(0, 100);
             reject(new Error(\`Server returned non-JSON response. Status: \${xhr.status}, Type: \${contentType}, Body: \${preview}\`));
             return;
          }`;

content = content.replace(oldXhr, newXhr);
fs.writeFileSync('src/pages/SingleNotebook.tsx', content);
