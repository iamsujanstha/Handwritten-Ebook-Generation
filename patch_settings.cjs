const fs = require('fs');
let settingsModal = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

settingsModal = settingsModal.replace(
  '  const models = [\n    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Default, Fast)" },\n    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },\n    { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash-8B" },\n    { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash Exp" },\n    { id: "gemini-pro-latest", name: "Gemini Pro Latest" }\n  ];',
  '  const models = [\n    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Default, Fast)" },\n    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },\n    { id: "gemini-pro-latest", name: "Gemini Pro Latest" }\n  ];'
);

fs.writeFileSync('src/components/SettingsModal.tsx', settingsModal);
