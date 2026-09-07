const fs = require('fs');
let code = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf-8');

code = code.replace(/<div className="flex h-screen bg-slate-50 font-sans overflow-hidden">/, '<div className="flex h-screen bg-slate-50 font-sans overflow-hidden">\n      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}\n');

if (!code.includes('<Settings className="w-5 h-5" />')) {
  // Let's insert the button at the top of the left sidebar.
  code = code.replace(/<div className="w-72 bg-white border-r border-slate-200 flex flex-col no-print">/, '<div className="w-72 bg-white border-r border-slate-200 flex flex-col no-print">\n        <button onClick={() => setIsSettingsOpen(true)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-full transition-colors z-10 shadow-sm border border-slate-200"><Settings className="w-5 h-5" /></button>');
}
fs.writeFileSync('src/pages/SingleNotebook.tsx', code);
