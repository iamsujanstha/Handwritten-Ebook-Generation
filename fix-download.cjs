const fs = require('fs');

function replaceWindowOpen(filePath) {
  let code = fs.readFileSync(filePath, 'utf-8');
  
  const replacement = `
          fetch(\`/api/download-pdf/\${exportId}\`, {credentials: "include"})
            .then(res => res.blob())
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = \`\${title || 'Export'}.pdf\`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            })
            .catch(err => alert("Failed to download PDF: " + err.message));
  `;
  
  if (filePath.includes('Preview')) {
    code = code.replace(/window\.open\(\`\/api\/download-pdf\/\$\{exportId\}\`, '_blank'\);/g, `
          fetch(\`/api/download-pdf/\${exportId}\`, {credentials: "include"})
            .then(res => res.blob())
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = \`\${book.title || 'Export'}.pdf\`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            })
            .catch(err => setExportError("Failed to download PDF: " + err.message));
    `);
  } else {
    code = code.replace(/window\.open\(\`\/api\/download-pdf\/\$\{exportId\}\`, '_blank'\);/g, replacement);
  }

  fs.writeFileSync(filePath, code);
}

replaceWindowOpen('src/pages/SingleNotebook.tsx');
replaceWindowOpen('src/pages/Preview.tsx');

