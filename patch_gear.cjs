const fs = require('fs');
let content = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf8');

// 1. Remove the old absolute button
content = content.replace(/<button onClick=\{\(\) => setIsSettingsOpen\(true\)\} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-full transition-colors z-10 shadow-sm border border-slate-200"><Settings className="w-5 h-5" \/><\/button>/, '');

// 2. Insert it next to AutoSaveIndicator in the Book Title header
const target = `<div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Book Title</p>
            <AutoSaveIndicator compact />
          </div>`;

const replacement = `<div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Book Title</p>
            <div className="flex items-center gap-2">
              <AutoSaveIndicator compact />
              <button onClick={() => setIsSettingsOpen(true)} className="text-slate-400 hover:text-slate-700 transition-colors p-1 hover:bg-slate-200 rounded" title="AI Settings">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/SingleNotebook.tsx', content);
