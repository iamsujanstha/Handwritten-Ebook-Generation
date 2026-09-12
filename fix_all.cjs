const fs = require('fs');

// 1. Fix server.ts
let server = fs.readFileSync('server.ts', 'utf8');
const mwRegex = /app\.use\(\(req, res, next\) => \{[\s\S]*?const modelHeader = req\.headers\['x-gemini-model'\];[\s\S]*?next\(\);\n\}\);\n/g;
server = server.replace(mwRegex, '');
const goodMw = `
app.use((req, res, next) => {
  const modelHeader = req.headers['x-gemini-model'];
  if (modelHeader && typeof modelHeader === 'string') {
    if (modelHeader.includes('1.5') || modelHeader.includes('3.5-pro') || modelHeader.includes('2.0-flash')) {
      req.headers['x-gemini-model'] = 'gemini-3.5-flash';
    }
  }
  next();
});
`;
server = server.replace('app.use(express.json({ limit: "50mb" }));', 'app.use(express.json({ limit: "50mb" }));\n' + goodMw);
server = server.replace(/gemini-1\.5-flash/g, 'gemini-3.5-flash');
fs.writeFileSync('server.ts', server);

// 2. Fix SettingsModal.tsx
let modal = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');
const modelsRegex = /const models = \[\s*\{[\s\S]*?\}\s*\];/;
const newModels = `const models = [
    { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash (Default, Fast)" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "gemini-pro-latest", name: "Gemini Pro Latest" }
  ];`;
modal = modal.replace(modelsRegex, newModels);
fs.writeFileSync('src/components/SettingsModal.tsx', modal);

// 3. Fix useSettingsStore.ts
let store = fs.readFileSync('src/store/useSettingsStore.ts', 'utf8');
const storeRegex = /let savedModel = localStorage\.getItem\("geminiModel"\) \|\| "gemini-1\.5-flash";[\s\S]*?localStorage\.setItem\("geminiModel", savedModel\);\n\}/;
const newStoreLogic = `let savedModel = localStorage.getItem("geminiModel") || "gemini-3.5-flash";\nif (savedModel.includes("1.5") || savedModel.includes("3.5-pro") || savedModel.includes("2.0")) {\n  savedModel = "gemini-3.5-flash";\n  localStorage.setItem("geminiModel", savedModel);\n}`;
store = store.replace(storeRegex, newStoreLogic);
store = store.replace(/gemini-1\.5-flash/g, 'gemini-3.5-flash');
fs.writeFileSync('src/store/useSettingsStore.ts', store);

// 4. Fix quotaService.ts
let quota = fs.readFileSync('src/lib/quotaService.ts', 'utf8');
quota = quota.replace(/gemini-1\.5-flash/g, 'gemini-3.5-flash');
fs.writeFileSync('src/lib/quotaService.ts', quota);
