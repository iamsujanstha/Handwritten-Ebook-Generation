const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

const linkToAdd = `
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script>document.addEventListener('DOMContentLoaded', (event) => { hljs.highlightAll(); });</script>
`;

if (!server.includes('highlight.js')) {
  server = server.replace('<style>', linkToAdd + '\n  <style>');
}

fs.writeFileSync('server.ts', server);
