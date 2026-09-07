const fs = require('fs');
let code = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf-8');

code = code.replace(/const contentType = response\.headers\.get\("content-type"\);\s*if \(contentType && contentType\.indexOf\("application\/json"\) === -1\) \{\s*throw new Error\("Server returned non-JSON response\. Please try again\."\);\s*\}\s*const contentType = response\.headers\.get\("content-type"\);/g, 'const contentType = response.headers.get("content-type");');

fs.writeFileSync('src/pages/SingleNotebook.tsx', code);
