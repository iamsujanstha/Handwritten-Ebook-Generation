const fs = require('fs');

let settingsModal = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');
settingsModal = settingsModal.replace(/gemini-3\.5-flash/g, 'gemini-1.5-flash');
settingsModal = settingsModal.replace(/gemini-3\.5-pro/g, 'gemini-1.5-pro');
settingsModal = settingsModal.replace(/Gemini 3\.5 Flash/g, 'Gemini 1.5 Flash');
settingsModal = settingsModal.replace(/Gemini 3\.5 Pro/g, 'Gemini 1.5 Pro');
settingsModal = settingsModal.replace(/gemini-3\.8-flash/g, 'gemini-1.5-flash-8b');
settingsModal = settingsModal.replace(/Gemini 3\.8 Flash/g, 'Gemini 1.5 Flash-8B');
settingsModal = settingsModal.replace(/gemini-2\.5-flash/g, 'gemini-2.0-flash-exp');
settingsModal = settingsModal.replace(/Gemini 2\.5 Flash/g, 'Gemini 2.0 Flash Exp');

fs.writeFileSync('src/components/SettingsModal.tsx', settingsModal);

let store = fs.readFileSync('src/store/useSettingsStore.ts', 'utf8');
store = store.replace(/gemini-3\.5-flash/g, 'gemini-1.5-flash');
fs.writeFileSync('src/store/useSettingsStore.ts', store);

let quota = fs.readFileSync('src/lib/quotaService.ts', 'utf8');
quota = quota.replace(/gemini-3\.5-flash/g, 'gemini-1.5-flash');
fs.writeFileSync('src/lib/quotaService.ts', quota);
