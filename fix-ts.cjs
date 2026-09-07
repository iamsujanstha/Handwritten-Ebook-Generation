const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  /defaultViewport: chromium\.defaultViewport,\n\s*executablePath: executablePath,\n\s*headless: chromium\.headless,/g,
  `// @ts-ignore\n      defaultViewport: chromium.defaultViewport,\n      executablePath: executablePath,\n      // @ts-ignore\n      headless: chromium.headless,`
);

code = code.replace(
  /waitUntil: \['load', 'networkidle0'\], timeout: 60000/g,
  `waitUntil: 'networkidle0' as any, timeout: 60000`
);

fs.writeFileSync('server.ts', code);
