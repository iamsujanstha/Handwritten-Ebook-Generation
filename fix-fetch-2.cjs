const fs = require('fs');

function fixFile(file) {
  let code = fs.readFileSync(file, 'utf-8');
  
  code = code.replace(/headers: \{\s*"Content-Type": "application\/json",\s*"x-gemini-model": geminiModel,\s*"x-gemini-api-key": userApiKey\s*\},/g, '');
  code = code.replace(/headers: \{ "Content-Type": "application\/json" \}/g, 'headers: { "Content-Type": "application/json", "x-gemini-model": geminiModel, "x-gemini-api-key": userApiKey }');
  
  fs.writeFileSync(file, code);
}

['src/pages/SingleNotebook.tsx', 'src/pages/Architect.tsx', 'src/pages/Editor.tsx'].forEach(fixFile);
