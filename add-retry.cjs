const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

const retryLogic = `
// Retry logic for Gemini API
const MAX_RETRIES = 5;
const BASE_DELAY = 2000;

async function generateContentWithRetry(params: any, retries = MAX_RETRIES): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const isRetryable = error?.status === 429 || error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("429") || error?.message?.includes("high demand") || error?.message?.includes("Spikes in demand") || error?.message?.includes("UNAVAILABLE");
      if (isRetryable && i < retries - 1) {
        const delayMs = BASE_DELAY * Math.pow(2, i) + Math.random() * 1000;
        console.warn(\`Gemini API error (retry \${i + 1}/\${retries} in \${Math.round(delayMs)}ms): \${error.message}\`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
}
`;

// Insert the retryLogic just after the `ai` initialization
content = content.replace(
  'const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });',
  'const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });\n' + retryLogic
);

// Replace ai.models.generateContent with generateContentWithRetry
content = content.replace(/await ai\.models\.generateContent\(/g, 'await generateContentWithRetry(');

fs.writeFileSync('server.ts', content);
