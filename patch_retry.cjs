const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

const regex = /async function generateContentWithRetry\([\s\S]*?throw new Error\("Failed after MAX_RETRIES"\);\n\}/;

const newImpl = `async function generateContentWithRetry(params: any, customApiKey?: string, retries = MAX_RETRIES): Promise<any> {
  const client = customApiKey ? new GoogleGenAI({ apiKey: customApiKey }) : ai;
  const fallbacks = ["gemini-2.5-flash", "gemini-3.8-flash", "gemini-pro-latest"];
  let fallbackIndex = 0;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await client.models.generateContent(params);
    } catch (error: any) {
      const isRetryable = error?.status === 429 || error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("429") || error?.message?.includes("high demand") || error?.message?.includes("Spikes in demand") || error?.message?.includes("UNAVAILABLE") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("Quota exceeded");
      
      if (isRetryable && i < retries - 1) {
        let delayMs = BASE_DELAY * Math.pow(2, i) + Math.random() * 1000;
        
        // Handle aggressive rate limits (429) specifically for the 5 RPM free tier
        if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Quota exceeded") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
          // If it's a daily limit error, fallback to another model
          if (error?.message?.includes("GenerateRequestsPerDayPerProjectPerModel") || error?.message?.includes("limit: 20")) {
             if (fallbackIndex < fallbacks.length) {
               console.warn(\`Hard quota hit for \${params.model}. Falling back to \${fallbacks[fallbackIndex]}\`);
               params.model = fallbacks[fallbackIndex++];
               delayMs = 1000; // Fast retry with new model
             } else {
               const e = new Error(error.message);
               (e as any).status = 429;
               (e as any).isQuotaError = true;
               throw e;
             }
          } else {
            const retryMatch = error?.message?.match(/retry in (\\d+(?:\\.\\d+)?)s/);
            if (retryMatch && retryMatch[1]) {
              delayMs = parseFloat(retryMatch[1]) * 1000 + 3000; // Exact wait time + 3s buffer
            } else {
              delayMs = Math.max(delayMs, 30000); // Default to at least 30s for generic 429
            }
          }
        }
        
        console.warn(\`Gemini API error (retry \${i + 1}/\${retries} in \${Math.round(delayMs)}ms): \${error.message}\`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        // If it's the last retry or unretryable and it's a quota error, throw it so we can return a specific response to the client
        if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Quota exceeded") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
           const e = new Error(error.message);
           (e as any).status = 429;
           (e as any).isQuotaError = true;
           throw e;
        }
        throw error;
      }
    }
  }
  throw new Error("Failed after MAX_RETRIES");
}`;

server = server.replace(regex, newImpl);
fs.writeFileSync('server.ts', server);
