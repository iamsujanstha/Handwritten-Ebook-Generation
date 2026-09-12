const fs = require('fs');
let content = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf8');

const linkToAdd = `
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script>document.addEventListener('DOMContentLoaded', (event) => { hljs.highlightAll(); });</script>
`;

if (!content.includes('highlight.js/11.9.0')) {
  content = content.replace('<style>', linkToAdd + '\n  <style>');
}

fs.writeFileSync('src/pages/SingleNotebook.tsx', content);
