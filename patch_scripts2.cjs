const fs = require('fs');

const replacementScript = `
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script>
    function applyHighlights() {
      if (typeof hljs !== 'undefined') hljs.highlightAll(); 
      document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
        if (h.textContent.trim().toLowerCase().includes('description')) {
          h.style.color = '#8b5cf6';
        }
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyHighlights);
    } else {
      applyHighlights();
    }
  </script>
`;

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Clean up previous patches
  content = content.replace(/<link rel="stylesheet" href="https:\/\/cdnjs.cloudflare.com\/ajax\/libs\/highlight\.js\/11\.9\.0\/styles\/atom-one-dark\.min\.css">\s*<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/highlight\.js\/11\.9\.0\/highlight\.min\.js"><\/script>\s*<script>\s*document\.addEventListener\('DOMContentLoaded', \(\) => \{\s*if \(typeof hljs !== 'undefined'\) hljs\.highlightAll\(\);\s*document\.querySelectorAll\('h1, h2, h3, h4, h5, h6'\)\.forEach\(h => \{\s*if \(h\.textContent\.trim\(\)\.toLowerCase\(\)\.includes\('description'\)\) \{\s*h\.style\.color = '#8b5cf6';\s*\}\s*\}\);\s*\}\);\s*<\/script>/, replacementScript);
  
  fs.writeFileSync(filePath, content);
}

patchFile('server.ts');
patchFile('src/pages/SingleNotebook.tsx');
