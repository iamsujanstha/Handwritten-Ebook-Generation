const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

content = content.replace(
  'const { geminiModel, userApiKey, tokenUsage, setGeminiModel, setUserApiKey } = useSettingsStore();',
  'const { geminiModel, userApiKey, apiBaseUrl, tokenUsage, setGeminiModel, setUserApiKey, setApiBaseUrl } = useSettingsStore();'
);

content = content.replace(
  '{ id: "gemini-pro-latest", name: "Gemini Pro Latest" }',
  '{ id: "gemini-pro-latest", name: "Gemini Pro Latest" },\n    { id: "nousresearch/nous-hermes-2-mixtral-8x7b-dpo", name: "Hermes 2 Mixtral 8x7B (OpenRouter)" },\n    { id: "nousresearch/hermes-3-llama-3.1-405b", name: "Hermes 3 LLaMA 3.1 405B (OpenRouter)" }'
);

// Add the custom base URL input
const customEndpointJSX = `
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Custom API Base URL (For Hermes / OpenRouter)
            </label>
            <input
              type="text"
              placeholder="https://openrouter.ai/api/v1 (Optional)"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-xs text-slate-500 mt-2">
              Provide an OpenAI-compatible endpoint to use Hermes or other models. If empty, defaults to Gemini API.
            </p>
          </div>
`;

content = content.replace(
  '<div>\n            <label className="block text-sm font-bold text-slate-700 mb-2">\n              Custom API Key (Optional)\n            </label>',
  customEndpointJSX + '\n          <div>\n            <label className="block text-sm font-bold text-slate-700 mb-2">\n              Custom API Key (Optional)\n            </label>'
);

fs.writeFileSync('src/components/SettingsModal.tsx', content);
