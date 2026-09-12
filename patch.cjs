const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /### COMPLETE DESIGN SYSTEM & CSS SPECIFICATION:[\s\S]*?Integrate the exact CSS below into the <head> of every document:[\s\S]*?(<!DOCTYPE html>[\s\S]*?)Convert the attached notes into a complete HTML document in the notebook format defined above\./;

const match = code.match(regex);
if (match) {
  const htmlTemplate = match[1];
  
  // Split htmlTemplate into top and bottom around <!-- CONTENT CHAPTERS GO HERE -->
  const parts = htmlTemplate.split('<!-- CONTENT CHAPTERS GO HERE -->');
  const boilerplateTop = parts[0];
  const boilerplateBottom = parts[1];

  const newPromptSection = `### HTML STRUCTURE:
Follow this exact structural template for the output content:

<header style="text-align: center;">
  <h1 class="notebook-title">\${chapterTitle}</h1>
  <div class="subtitle">Notes and Documentation</div>
  <hr class="header-divider" />
</header>
<!-- CONTENT CHAPTERS GO HERE -->

Convert the attached notes into raw HTML content following the notebook styles.
DO NOT OUTPUT ANY CSS. DO NOT OUTPUT <head> or <body> tags or <!DOCTYPE html>. Output ONLY the raw inner HTML content starting with the <header> tag, nothing else.`;

  code = code.replace(regex, newPromptSection);
  
  // Find where we generate and patch the content
  const oldGen = `let content = response.text;
    if (content.startsWith("\`\`\`html")) {
      content = content.replace(/^\`\`\`html\\n/, "").replace(/\\n\`\`\`$/, "");
    } else if (content.startsWith("\`\`\`")) {
      content = content.replace(/^\`\`\`\\n/, "").replace(/\\n\`\`\`$/, "");
    }`;
    
  const newGen = `let content = response.text;
    if (content.startsWith("\`\`\`html")) {
      content = content.replace(/^\`\`\`html\\n/, "").replace(/\\n\`\`\`$/, "");
    } else if (content.startsWith("\`\`\`")) {
      content = content.replace(/^\`\`\`\\n/, "").replace(/\\n\`\`\`$/, "");
    }
    
    // Inject the boilerplate CSS and HTML structure around the generated content to save LLM tokens and make generation fast
    const boilerplateTop = \`${boilerplateTop.replace(/\\/g, '\\\\').replace(/\`/g, '\\`').replace(/\$/g, '\\$')}\`;
    const boilerplateBottom = \`${boilerplateBottom.replace(/\\/g, '\\\\').replace(/\`/g, '\\`').replace(/\$/g, '\\$')}\`;
    
    // Only wrap if the LLM didn't mistakenly output it anyway
    if (!content.includes("<body")) {
      content = boilerplateTop + content + boilerplateBottom;
    }`;
    
  code = code.replace(oldGen, newGen);
  
  fs.writeFileSync('server.ts', code);
  console.log("Patched server.ts successfully");
} else {
  console.log("Could not find regex match");
}
