import { X, Activity } from "lucide-react";
import { useSettingsStore } from "../store/useSettingsStore";
import { useQuotaMetadata, API_LIMITS } from "../lib/quotaService";

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { geminiModel, userApiKey, tokenUsage, setGeminiModel, setUserApiKey } = useSettingsStore();
  const quota = useQuotaMetadata();

  const models = [
    { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash (Recommended, Fast & Capable)" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Deep Reasoning & Analysis)" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-800">AI Settings & Usage</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <h4 className="flex items-center text-sm font-bold text-slate-700 mb-3">
              <Activity className="w-4 h-4 mr-2 text-blue-500" />
              API Usage Tracking
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white p-3 rounded shadow-sm border border-slate-100">
                <div className="text-slate-500 text-xs mb-1">Total Hits</div>
                <div className="font-mono font-bold text-slate-800">{tokenUsage?.hits?.toLocaleString() || 0}</div>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-slate-100">
                <div className="text-slate-500 text-xs mb-1">Total Tokens</div>
                <div className="font-mono font-bold text-slate-800">{tokenUsage?.totalTokenCount?.toLocaleString() || 0}</div>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-slate-100">
                <div className="text-slate-500 text-xs mb-1">Prompt Tokens</div>
                <div className="font-mono font-semibold text-slate-600">{tokenUsage?.promptTokenCount?.toLocaleString() || 0}</div>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-slate-100">
                <div className="text-slate-500 text-xs mb-1">Output Tokens</div>
                <div className="font-mono font-semibold text-slate-600">{tokenUsage?.candidatesTokenCount?.toLocaleString() || 0}</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
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
                      className={`h-2 rounded-full ${quota.rpmUsed >= API_LIMITS.RPM ? 'bg-red-500' : 'bg-blue-500'}`} 
                      style={{ width: `${Math.min(100, (quota.rpmUsed / API_LIMITS.RPM) * 100)}%`, transition: 'width 0.3s ease' }}
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
                      className={`h-2 rounded-full ${quota.tpmUsed >= API_LIMITS.TPM ? 'bg-red-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min(100, (quota.tpmUsed / API_LIMITS.TPM) * 100)}%`, transition: 'width 0.3s ease' }}
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
            </div>
            <p className="text-xs text-slate-500 italic">
              Note: The stats above track your total local usage within this app over time.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              AI Provider / Model
            </label>
            <select
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-2">
              If a model exceeds its quota, you can switch to another model here.
            </p>
          </div>

          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Custom Gemini API Key (Optional)
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={userApiKey}
              onChange={(e) => setUserApiKey(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-xs text-slate-500 mt-2">
              If the default server quota is exhausted, you can provide your own personal Google Gemini API key to continue generating content smoothly.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded font-bold text-sm hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
