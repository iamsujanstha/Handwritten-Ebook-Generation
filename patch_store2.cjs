const fs = require('fs');

let store = fs.readFileSync('src/store/useSettingsStore.ts', 'utf8');
store = store.replace(
  `let savedModel = localStorage.getItem("geminiModel") || "gemini-3.5-flash";\nif (savedModel.includes("3.5") || savedModel.includes("3.8") || savedModel.includes("2.5")) {\n  savedModel = "gemini-3.5-flash";\n  localStorage.setItem("geminiModel", savedModel);\n}`,
  'const savedModel = localStorage.getItem("geminiModel") || "gemini-3.5-flash";'
);
fs.writeFileSync('src/store/useSettingsStore.ts', store);
