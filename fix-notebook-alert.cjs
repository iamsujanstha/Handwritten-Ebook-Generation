const fs = require('fs');
let code = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf-8');

code = code.replace(/catch \(error\) \{\n\s*clearInterval\(progressInterval\);\n\s*console\.error\(error\);\n\s*alert\("Generation failed"\);\n\s*\}/, `catch (error: any) {
      clearInterval(progressInterval);
      console.error(error);
      if (error?.message?.includes("QUOTA_EXCEEDED") || error?.message?.includes("Quota exceeded") || error?.message?.includes("429")) {
        alert("AI Quota Exceeded for this model! Please click the Settings gear icon in the top right to change the AI model or provide your own API key.");
      } else {
        alert("Generation failed: " + error.message);
      }
    }`);

fs.writeFileSync('src/pages/SingleNotebook.tsx', code);
