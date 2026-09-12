const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

const target = `className="text-xs text-slate-500 mt-3 italic"`;
const replacement = `className="text-xs text-slate-500 italic"`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/SettingsModal.tsx', content);
