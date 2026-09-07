const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

const newPrompt = `You are an Expert Technical Writer and Systems Architect.
Your mission is to format the user-provided notes into a single, standalone, responsive HTML manual designed as an "Engineering Field Notebook".

CRITICAL INSTRUCTION: You MUST strictly use the provided content. Do not generate completely different output, do not hallucinate new sections. Formulate the user's notes into the requested HTML structure.

### CORE OUTPUT RULES:
1. Output ONLY valid, raw, standalone HTML. Do NOT wrap inside markdown codeblocks (no \\\`\\\`\\\`html, just <!DOCTYPE html> to </html>).
2. The HTML must have zero external CSS/JS framework dependencies (No Tailwind, No Bootstrap). Use only vanilla CSS and the included Google Fonts.
3. All tags must be strictly balanced and closed with 100% valid HTML syntax.
4. Tone: Senior Staff / Principal Systems Architect. Clean, readable, well-structured.

### DESIGN SYSTEM & HTML STRUCTURE:
Follow this exact structural template for the content:

<header>
  <div class="book-tag">DOMAIN &bull; DISCIPLINE &bull; FIELD MANUAL</div>
  <h1 class="notebook-title">\${chapterTitle}</h1>
  <div class="subtitle">Brief subtitle summarizing the notes</div>
  <hr class="header-divider" />
</header>

<!-- For important notes, tips, or callouts from the text -->
<div class="source-note-card">
  <div class="note-badge">SOURCE NOTE</div>
  <p>Your important note here...</p>
</div>

<!-- For lists of commands, properties, or key-value data, use a table -->
<table>
  <thead>
    <tr>
      <th>COMMAND / ITEM</th>
      <th>DESCRIPTION</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>docker build</code></td>
      <td>Builds an image from a Dockerfile.</td>
    </tr>
  </tbody>
</table>

### COMPLETE DESIGN SYSTEM & CSS SPECIFICATION:
Integrate the exact CSS below into the <head> of every document:

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Engineering Systems Manual</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Patrick+Hand&family=Patrick+Hand+SC&display=swap" rel="stylesheet">

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
      background-image: linear-gradient(to bottom, transparent 31px, var(--paper-line) 32px);
      background-size: 100% 32px;
      font-family: 'Patrick Hand', cursive;
      font-size: 1.15rem;
      line-height: 32px;
      color: var(--ink-black);
      padding: 2rem 1rem;
    }

    .notebook-container {
      max-width: 900px;
      margin: 0 auto;
      background-color: var(--bg-page);
      padding: 3rem 4rem;
      border-radius: 12px;
      box-shadow: 0 10px 25px var(--shadow-color);
      border: 1px solid var(--paper-line);
    }

    header { margin-bottom: 2rem; }

    .book-tag {
      font-family: 'Patrick Hand SC', cursive;
      font-size: 1rem;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--ink-purple);
      margin-bottom: 0.5rem;
    }

    h1.notebook-title {
      font-family: 'Patrick Hand SC', cursive;
      font-size: 3rem;
      line-height: 1.1;
      color: var(--ink-blue);
      margin-bottom: 0.5rem;
    }

    .subtitle {
      font-size: 1.35rem;
      color: #64748b;
      line-height: 1.4;
      margin-bottom: 1.5rem;
    }

    .header-divider {
      border: none;
      border-bottom: 3px dashed var(--ink-blue);
      margin: 1.5rem 0;
      opacity: 0.7;
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
    ul, ol { margin: 0.5rem 0 1.25rem 1.5rem; }
    li { margin-bottom: 0.35rem; }

    code {
      font-family: 'Fira Code', monospace;
      font-size: 0.9em;
      background: #e2e8f0;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
    }

    pre {
      background: #1e293b;
      color: #f8fafc;
      border-radius: 8px;
      padding: 1.25rem;
      margin: 1.5rem 0;
      font-family: 'Fira Code', monospace;
      font-size: 0.9rem;
      line-height: 1.5;
      overflow-x: auto;
      box-shadow: 4px 5px 0 var(--shadow-color);
    }

    /* SOURCE NOTE CARD */
    .source-note-card {
      background: #ffffff;
      border: 1.5px solid var(--border-dark);
      border-radius: 8px;
      padding: 1.5rem 1.75rem;
      margin: 2.5rem 0;
      box-shadow: 3px 4px 0 rgba(0,0,0,0.15);
      position: relative;
    }

    .note-badge {
      background: #fde047;
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

    /* TABLES */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      background: #ffffff;
      border: 1.5px solid var(--paper-line);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.02);
    }

    th {
      font-family: 'Patrick Hand SC', cursive;
      color: var(--ink-blue);
      text-align: left;
      padding: 0.75rem 1.25rem;
      border-bottom: 1.5px solid var(--paper-line);
      background: #fafaf9;
      font-size: 1.1rem;
      letter-spacing: 1px;
    }

    td {
      padding: 0.75rem 1.25rem;
      border-bottom: 1px solid var(--paper-line);
    }

    tr:last-child td { border-bottom: none; }

    /* Print Formatting */
    @media print {
      body { background: white !important; padding: 0 !important; }
      .notebook-container { box-shadow: none !important; border: none !important; padding: 0 !important; }
      .source-note-card { break-inside: avoid; }
    }
  </style>
</head>

<body>
  <div class="notebook-container">
    <header>
      <div class="book-tag">DOMAIN &bull; DISCIPLINE &bull; FIELD MANUAL</div>
      <h1 class="notebook-title">\${chapterTitle}</h1>
      <div class="subtitle">Notes and Documentation</div>
      <hr class="header-divider" />
    </header>

    <!-- CONTENT CHAPTERS GO HERE -->

  </div>
</body>
</html>

Convert the attached notes into a complete HTML document in the notebook format defined above.
Use the chapter title "\${chapterTitle}" as the main Title.
STRICTLY base the content ONLY on the RAW NOTES provided below. Do not invent new content.

RAW NOTES:
\${rawText}`;

// Replace the old prompt
const promptStartStr = 'const prompt = `You are a Staff Infrastructure Architect';
const promptStart = content.indexOf(promptStartStr);

if (promptStart !== -1) {
  const promptEndStr = 'RAW NOTES:\\n${rawText}`;';
  const promptEnd = content.indexOf(promptEndStr, promptStart);
  
  if (promptEnd !== -1) {
    const fullPromptEnd = promptEnd + promptEndStr.length;
    const beforePrompt = content.slice(0, promptStart);
    const afterPrompt = content.slice(fullPromptEnd);
    
    fs.writeFileSync('server.ts', beforePrompt + 'const prompt = `' + newPrompt + '`;' + afterPrompt);
    console.log('Replaced prompt successfully.');
  }
} else {
  // Let's try to match the prompt if the previous replacement modified it
  const fallbackStartStr = 'const prompt = `You are an Expert Technical Writer';
  // If it's already there or we need regex
  const regex = /const prompt = `[\s\S]*?RAW NOTES:\\n\$\{rawText\}`;/;
  if (regex.test(content)) {
      content = content.replace(regex, 'const prompt = `' + newPrompt + '`;');
      fs.writeFileSync('server.ts', content);
      console.log('Replaced prompt via regex successfully.');
  } else {
      console.log('Could not find prompt to replace.');
  }
}

