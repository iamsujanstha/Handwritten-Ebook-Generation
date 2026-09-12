const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Replace the incorrect injection at the end of the error handlers
// They look like:
//     res.end();
//   } }, req.headers["x-gemini-api-key"] as string, req.headers["x-api-base-url"] as string);

content = content.replace(
  /res\.end\(\);\n  \}\s*\}\, req\.headers\["x-gemini-api-key"\] as string, req\.headers\["x-api-base-url"\] as string\);/g,
  'res.end();\n  }\n});'
);

fs.writeFileSync('server.ts', content);
