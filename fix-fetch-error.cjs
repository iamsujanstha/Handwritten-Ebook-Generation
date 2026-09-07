const fs = require('fs');
const files = ['src/pages/Editor.tsx', 'src/pages/SingleNotebook.tsx', 'src/pages/Architect.tsx'];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf-8');
  
  // Replace the .json() parsing to safely check content type
  code = code.replace(/const data = await response\.json\(\);/g, `const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
        throw new Error("Your session expired or the server is restarting. Please reload the page to continue.");
      }
      const data = await response.json();`);

  fs.writeFileSync(file, code);
}
