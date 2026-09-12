const fs = require('fs');
let content = fs.readFileSync('src/store/useSettingsStore.ts', 'utf8');

// Add apiBaseUrl to interface
content = content.replace(
  'userApiKey: string;',
  'userApiKey: string;\n  apiBaseUrl: string;'
);

// Add setApiBaseUrl to interface
content = content.replace(
  'setUserApiKey: (key: string) => void;',
  'setUserApiKey: (key: string) => void;\n  setApiBaseUrl: (url: string) => void;'
);

// Read from localStorage
content = content.replace(
  'const savedKey = localStorage.getItem("userApiKey") || "";',
  'const savedKey = localStorage.getItem("userApiKey") || "";\nconst savedBaseUrl = localStorage.getItem("apiBaseUrl") || "";'
);

// Set default in store
content = content.replace(
  'userApiKey: savedKey,',
  'userApiKey: savedKey,\n  apiBaseUrl: savedBaseUrl,'
);

// Add setter function
content = content.replace(
  'setUserApiKey: (key) => {',
  'setApiBaseUrl: (url) => {\n    localStorage.setItem("apiBaseUrl", url);\n    set({ apiBaseUrl: url });\n  },\n  setUserApiKey: (key) => {'
);

fs.writeFileSync('src/store/useSettingsStore.ts', content);
