const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const boilerplateTop = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${chapterTitle} - Engineering Systems Manual</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Patrick+Hand&family=Patrick+Hand+SC&display=swap" rel="stylesheet">
  
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="/vendor/mermaid.min.js"></script>
  <script>
    function applyHighlights() {
      if (typeof hljs !== 'undefined') hljs.highlightAll();
       document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
        if (h.textContent.trim().toLowerCase().includes('description')) {
          h.style.color = '#8b5cf6';
        }
      });
      if (typeof mermaid !== 'undefined') {
        try {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'loose',
            fontFamily: "'Patrick Hand', cursive, sans-serif"
          });
          mermaid.run({ querySelector: '.mermaid' });
        } catch(e) { console.error('Mermaid render error:', e); }
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyHighlights);
    } else {
      applyHighlights();
    }
  </script>
  <style>
    :root {
      --bg-desk: #f4eee1;
      --paper-line: #e3dac9;
      --bg-page: #fcf9f2;
      --ink-black: #1e1e24;
      --ink-blue: #1c4b82;
      --ink-purple: #6b46c1;
      --border-dark: #2d3748;
      --shadow-color: rgba(0, 0, 0, 0.08);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-desk);
      font-family: 'Patrick Hand', cursive;
      font-size: 1.15rem;
      line-height: 32px;
      color: var(--ink-black);
      padding: 2rem 1rem;
    }
    .notebook-container {
      width: 816px; /* 8.5 inches at 96 DPI */
      max-width: 100%;
      min-height: 1056px; /* 11 inches at 96 DPI */
      margin: 0 auto;
      background-color: var(--bg-page);
      background-image: 
        linear-gradient(to right, transparent 78px, #fca5a5 78px, #fca5a5 80px, transparent 80px),
        linear-gradient(to bottom, transparent 31px, var(--paper-line) 32px);
      background-size: 100% 100%, 100% 32px;
      background-position: 0 0, 0 0;
      padding: 3rem 4rem 3rem 6rem;
      border-radius: 12px;
      box-shadow: 0 10px 25px var(--shadow-color);
      border: 1px solid var(--paper-line);
    }
    header {
      margin-bottom: 2rem;
      text-align: center;
    }
    .book-tag {
      display: none !important;
    }
    h1.notebook-title {
      font-family: 'Patrick Hand SC', cursive;
      font-size: 3rem;
      line-height: 1.1;
      color: var(--ink-blue);
      margin: 0 auto 0.5rem auto;
      text-align: center;
    }
    .subtitle {
      font-size: 1.35rem;
      color: #64748b;
      line-height: 1.4;
      margin: 0 auto 1.5rem auto;
      text-align: center;
      max-width: 820px;
    }
    .header-divider {
      border: none;
      border-bottom: 3px dashed var(--ink-blue);
      margin: 1.5rem auto;
      opacity: 0.7;
      max-width: 100%;
    }
    h2 {
      font-family: 'Patrick Hand SC', cursive;
      font-size: 2rem;
      color: var(--ink-blue);
      margin: 2.5rem 0 1rem;
      border-bottom: 1.5px solid var(--paper-line);
      padding-bottom: 0.25rem;
    }
    h3 {
      font-family: 'Patrick Hand SC', cursive;
      font-size: 1.5rem;
      color: var(--ink-black);
      margin: 1.5rem 0 0.5rem;
    }
    p { margin-bottom: 1rem; }
    ul, ol {
      margin: 0.75rem 0 1.5rem 2rem;
      padding-left: 0.5rem;
    }
    li {
      margin-bottom: 0.45rem;
      line-height: 1.6;
    }
    li::marker {
      color: var(--ink-blue);
      font-weight: bold;
    }
    ol ol, ul ul, ol ul, ul ol {
      margin: 0.35rem 0 0.5rem 1.5rem;
    }
    /* SPECIFICATION & ACCEPTANCE CRITERIA CARD */
    .spec-card {
      background: transparent;
      border: 2px solid var(--border-dark);
      border-radius: 8px;
      padding: 1.5rem 1.75rem;
      margin: 2rem 0;
      position: relative;
    }
    .spec-badge {
      background: #e0e7ff;
      color: #3730a3;
      border: 1px solid var(--border-dark);
      border-radius: 4px;
      padding: 0.2rem 0.75rem;
      font-family: 'Patrick Hand SC', cursive;
      font-size: 0.9rem;
      font-weight: bold;
      display: inline-block;
      margin-bottom: 1rem;
      box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
    }
    code {
      font-family: 'Fira Code', monospace;
      font-size: 0.9em;
      background: #e0e7ff;
      color: #0f172a;
      padding: 0.3rem 0.5rem;
      border-radius: 6px;
      word-break: break-word;
    }
    pre {
      background: #1e293b;
      color: #e2e8f0;
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
      margin: 1.5rem 0;
      overflow-x: auto;
      box-shadow: 3px 4px 0 var(--shadow-color);
      border: 1px solid #334155;
      font-family: 'Fira Code', monospace;
      font-size: 0.92rem;
      line-height: 1.6;
    }
    pre code {
      background: transparent;
      padding: 0;
      color: inherit;
      border-radius: 0;
      font-size: inherit;
      line-height: inherit;
    }
    /* SOURCE NOTE CARD */
    .source-note-card {
      background: transparent;
      border: 2px solid var(--border-dark);
      border-radius: 8px;
      padding: 1.5rem 1.75rem;
      margin: 2.5rem 0;      position: relative;
    }
    .note-badge {
      background: #fde047;
      border: 1px solid var(--border-dark);
      border-radius: 4px;
      padding: 0.2rem 0.75rem;
      font-family: 'Patrick Hand SC', cursive;
      font-size: 0.9rem;      font-weight: bold;
      display: inline-block;
      margin-bottom: 1rem;      box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
    }
    /* TABLES (DYNAMIC AUTO SIZING, NO ZERO-WIDTH CRUSHING) */
    table {
      width: 100%;      border-collapse: collapse;      margin: 2rem 0;      background: transparent;
      border: 1.5px solid var(--paper-line);      border-radius: 8px;      overflow: hidden;      table-layout: auto;
    }
    th {
      font-family: 'Patrick Hand SC', cursive;      color: #3730a3;      text-align: left;
      padding: 0.85rem 1.15rem;      border-bottom: 1.5px solid var(--paper-line);      border-right: 1px solid var(--paper-line);
      background: #eef2ff;      font-size: 1.15rem;      letter-spacing: 0.5px;      vertical-align: top;
      word-break: normal;
    }
    th:last-child {
      border-right: none;
    }
    td {
      padding: 0.85rem 1.15rem;      border-bottom: 1px solid var(--paper-line);      border-right: 1px solid var(--paper-line);
      color: #1e1e24;      line-height: 1.6;      vertical-align: top;      word-break: normal;
      overflow-wrap: break-word;
    }
    td:last-child {
      border-right: none;
    }
    h2 {
      display: inline-block;
      background: linear-gradient(120deg, rgba(254, 240, 138, 0.7) 0%, rgba(254, 240, 138, 0.7) 100%);
      background-repeat: no-repeat;      background-size: 100% 35%;      background-position: 0 85%;
      padding-right: 0.5rem;      padding-left: 0.2rem;
    }
    tr:last-child td { border-bottom: none; }
    /* NOTEBOOK IMAGE, DIAGRAM & FIGURE STYLES */
    .notebook-figure, .diagram-container {
      background: #ffffff;      border: 2px solid var(--border-dark);      border-radius: 8px;
      padding: 1.25rem 1.5rem;      margin: 2.5rem 0;      text-align: center;
      box-shadow: 4px 5px 0 var(--shadow-color);      break-inside: avoid;      page-break-inside: avoid;
      position: relative;
    }
    .diagram-badge {
      background: #e0e7ff;      color: #3730a3;      border: 1px solid var(--border-dark);
      border-radius: 4px;      padding: 0.2rem 0.75rem;      font-family: 'Patrick Hand SC', cursive;
      font-size: 0.9rem;      font-weight: bold;      display: inline-block;
      margin-bottom: 1rem;      box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
    }
    .mermaid {
      background: transparent !important;      display: flex !important;      justify-content: center !important;
      align-items: center !important;      margin: 0.5rem auto !important;      overflow-x: auto !important;
      width: 100% !important;      font-family: 'Patrick Hand', cursive, sans-serif !important;
    }
    .mermaid svg {
      max-width: 100% !important;      height: auto !important;      display: block !important;
      margin: 0 auto !important;
    }
    .notebook-figure img, img {
      max-width: 100% !important;      height: auto !important;      border-radius: 6px;
      display: block;      margin: 0 auto;      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .notebook-figure figcaption {
      font-family: 'Patrick Hand', cursive;      font-size: 1.05rem;      color: #64748b;
      margin-top: 1rem;      font-style: italic;
    }
    /* Print Formatting */
    @media print {
      html, body {
        background-color: var(--bg-desk) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .notebook-container {
        padding: 3rem 4rem 3rem 6rem !important;
        background-color: var(--bg-page) !important;
        border: 1px solid var(--paper-line) !important;
        box-shadow: 0 10px 25px var(--shadow-color) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .source-note-card, pre, table, tr, .notebook-figure, img {
        break-inside: avoid;        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="notebook-container">
`;

const boilerplateBottom = `
  </div>
</body>
</html>`;

const searchStr = `    let content = response.text;
    if (content.startsWith("\`\`\`html")) {
      content = content.replace(/^\\\`\\\`\\\`html\\n/, "").replace(/\\n\\\`\\\`\\\`$/, "");
    } else if (content.startsWith("\`\`\`")) {
      content = content.replace(/^\\\`\\\`\\\`\\n/, "").replace(/\\n\\\`\\\`\\\`$/, "");
    }`;

const replaceStr = `    let content = response.text;
    if (content.startsWith("\`\`\`html")) {
      content = content.replace(/^\\\`\\\`\\\`html\\n/, "").replace(/\\n\\\`\\\`\\\`$/, "");
    } else if (content.startsWith("\`\`\`")) {
      content = content.replace(/^\\\`\\\`\\\`\\n/, "").replace(/\\n\\\`\\\`\\\`$/, "");
    }
    
    // Inject the boilerplate CSS and HTML structure around the generated content to save LLM tokens
    const boilerplateTop = \`${boilerplateTop.replace(/\\/g, '\\\\').replace(/\`/g, '\\`').replace(/\$/g, '\\$')}\`;
    const boilerplateBottom = \`${boilerplateBottom.replace(/\\/g, '\\\\').replace(/\`/g, '\\`').replace(/\$/g, '\\$')}\`;
    
    if (!content.includes("<body")) {
      content = boilerplateTop + content + boilerplateBottom;
    }`;

let found = false;
// Since whitespace might differ, use regex to find the block
const regex = /let content = response\.text;[\s\S]*?replace\(\/\\n\\`\\`\\`\$\/, ""\);\n\s*}/;
code = code.replace(regex, (match) => {
  found = true;
  return replaceStr;
});

fs.writeFileSync('server.ts', code);
if (found) console.log("Patched successfully");
else console.log("Failed to patch block");
