const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

// I need to replace the grid block which might not match exactly due to formatting
content = content.replace(/<div className="grid grid-cols-2 gap-4 text-sm">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">/, '<div className="mt-2 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">');

fs.writeFileSync('src/components/SettingsModal.tsx', content);
