const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

const oldImport = `import { useSettingsStore } from "../store/useSettingsStore";
import { useQuotaMetadata } from "../lib/quotaService";`;
const newImport = `import { useSettingsStore } from "../store/useSettingsStore";
import { useQuotaMetadata, API_LIMITS } from "../lib/quotaService";`;
content = content.replace(oldImport, newImport);

const replacement = `<div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
              <h5 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
                Current Quota Health 
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">Rolling 60s Window</span>
              </h5>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-600">Requests Per Minute (RPM)</span>
                    <span className={quota.rpmRemaining === 0 ? "text-red-500 font-bold" : "text-green-600 font-bold"}>
                      {Math.floor(quota.rpmRemaining)} remaining
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className={\`h-2 rounded-full \${quota.rpmUsed >= API_LIMITS.RPM ? 'bg-red-500' : 'bg-blue-500'}\`} 
                      style={{ width: \`\${Math.min(100, (quota.rpmUsed / API_LIMITS.RPM) * 100)}%\`, transition: 'width 0.3s ease' }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 text-right">{quota.rpmUsed} / {API_LIMITS.RPM} used</div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-600">Tokens Per Minute (TPM)</span>
                    <span className={quota.tpmRemaining === 0 ? "text-red-500 font-bold" : "text-green-600 font-bold"}>
                      {Math.floor(quota.tpmRemaining).toLocaleString()} remaining
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className={\`h-2 rounded-full \${quota.tpmUsed >= API_LIMITS.TPM ? 'bg-red-500' : 'bg-emerald-500'}\`} 
                      style={{ width: \`\${Math.min(100, (quota.tpmUsed / API_LIMITS.TPM) * 100)}%\`, transition: 'width 0.3s ease' }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 text-right">{quota.tpmUsed.toLocaleString()} / {API_LIMITS.TPM.toLocaleString()} used</div>
                </div>
              </div>

              {!userApiKey && (
                 <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 leading-tight">
                   <strong>Shared Key Active:</strong> Your local tracking above estimates your personal usage, but you share the backend key limits with others. Add your own key below for dedicated tracking.
                 </div>
              )}
            </div>`;

const target = `<div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
              <h5 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
                Current Quota Health 
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">Rolling 60s Window</span>
              </h5>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-600">Requests Per Minute (RPM)</span>
                    <span className={quota.rpmRemaining === 0 ? "text-red-500 font-bold" : "text-green-600 font-bold"}>
                      {quota.rpmRemaining} remaining
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className={\`h-2 rounded-full \${quota.rpmUsed >= quota.limits.RPM ? 'bg-red-500' : 'bg-blue-500'}\`} 
                      style={{ width: \`\${Math.min(100, (quota.rpmUsed / quota.limits.RPM) * 100)}%\` }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 text-right">{quota.rpmUsed} / {quota.limits.RPM} used</div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-600">Tokens Per Minute (TPM)</span>
                    <span className={quota.tpmRemaining === 0 ? "text-red-500 font-bold" : "text-green-600 font-bold"}>
                      {quota.tpmRemaining.toLocaleString()} remaining
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className={\`h-2 rounded-full \${quota.tpmUsed >= quota.limits.TPM ? 'bg-red-500' : 'bg-emerald-500'}\`} 
                      style={{ width: \`\${Math.min(100, (quota.tpmUsed / quota.limits.TPM) * 100)}%\` }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 text-right">{quota.tpmUsed.toLocaleString()} / {quota.limits.TPM.toLocaleString()} used</div>
                </div>
              </div>

              {!userApiKey && (
                 <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                   <strong>Shared Key Active:</strong> Your local tracking above estimates your personal usage, but you share the backend key limits with others. Add your own key below for dedicated tracking.
                 </div>
              )}
            </div>`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/SettingsModal.tsx', content);
