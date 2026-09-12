const fs = require('fs');
let store = fs.readFileSync('src/store/useSettingsStore.ts', 'utf8');

store = store.replace(
  'const savedModel = localStorage.getItem("geminiModel") || "gemini-3.5-flash";',
  `let savedModel = localStorage.getItem("geminiModel") || "gemini-3.5-flash";\nif (savedModel.includes("1.5") || savedModel.includes("2.0")) {\n  savedModel = "gemini-3.5-flash";\n  localStorage.setItem("geminiModel", savedModel);\n}`
);

fs.writeFileSync('src/store/useSettingsStore.ts', store);
