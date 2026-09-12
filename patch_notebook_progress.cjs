const fs = require('fs');
let content = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf8');

const buttonMatch = `              {isGenerating ? (generateProgress !== null ? \`Formatting Chapter \${generateProgress}%\` : "Formatting Chapter...") : "Generate Chapter"}
            </button>`;

const buttonReplacement = `              {isGenerating ? (generateProgress !== null ? \`Formatting Chapter \${generateProgress}%\` : "Formatting Chapter...") : "Generate Chapter"}
            </button>
            
            {isGenerating && generateProgress !== null && (
              <div className="mt-4 w-full">
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: \`\${generateProgress}%\` }}
                  ></div>
                </div>
                <p className="text-center text-xs text-slate-500 mt-2 font-medium tracking-wide animate-pulse">
                  {generateProgress < 100 ? "AI is processing your content..." : "Finalizing..."}
                </p>
              </div>
            )}`;
            
content = content.replace(buttonMatch, buttonReplacement);
fs.writeFileSync('src/pages/SingleNotebook.tsx', content);
