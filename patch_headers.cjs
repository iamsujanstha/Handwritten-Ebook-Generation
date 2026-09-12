const fs = require('fs');

const files = [
  'src/pages/Architect.tsx',
  'src/pages/Editor.tsx',
  'src/pages/SingleNotebook.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Extract apiBaseUrl from the store
  if (!content.includes('const { geminiModel, userApiKey, apiBaseUrl }')) {
    content = content.replace(
      'const { geminiModel, userApiKey } = useSettingsStore();',
      'const { geminiModel, userApiKey, apiBaseUrl } = useSettingsStore();'
    );
  }
  
  // Replace headers in fetch calls
  content = content.replace(
    /"x-gemini-model": geminiModel, "x-gemini-api-key": userApiKey/g,
    '"x-gemini-model": geminiModel, "x-gemini-api-key": userApiKey, "x-api-base-url": apiBaseUrl'
  );
  
  fs.writeFileSync(file, content);
}
