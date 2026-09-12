const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function generateContentWithRetry(params, customApiKey, retries = 10) {
  const client = customApiKey ? new GoogleGenAI({ apiKey: customApiKey }) : ai;
  const fallbacks = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.8-flash", "gemini-pro-latest"];
  let fallbackIndex = 0;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await client.models.generateContent(params);
    } catch (error) {
      const isRetryable = error?.status === 404 || error?.message?.includes("NOT_FOUND") || error?.message?.includes("no longer available") || error?.status === 429 || error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("429") || error?.message?.includes("high demand") || error?.message?.includes("Spikes in demand") || error?.message?.includes("UNAVAILABLE") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("Quota exceeded");
      
      if (isRetryable && i < retries - 1) {
        let delayMs = 2000 * Math.pow(2, i) + Math.random() * 1000;
        
        if (error?.status === 404 || error?.message?.includes("NOT_FOUND") || error?.message?.includes("no longer available")) {
          if (fallbackIndex < fallbacks.length) {
             console.warn(`Model ${params.model} not found. Falling back to ${fallbacks[fallbackIndex]}`);
             params.model = fallbacks[fallbackIndex++];
             delayMs = 1000;
          } else {
             throw error;
          }
        } else if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Quota exceeded") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
          if (error?.message?.includes("GenerateRequestsPerDayPerProjectPerModel") || error?.message?.includes("limit: 20")) {
             if (fallbackIndex < fallbacks.length) {
               console.warn(`Hard quota hit for ${params.model}. Falling back to ${fallbacks[fallbackIndex]}`);
               params.model = fallbacks[fallbackIndex++];
               delayMs = 1000; 
             } else {
               const e = new Error(error.message);
               e.status = 429;
               e.isQuotaError = true;
               throw e;
             }
          } else {
            delayMs = Math.max(delayMs, 3000);
          }
        }
        
        console.warn(`Gemini API error (retry ${i + 1}/${retries} in ${Math.round(delayMs)}ms): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
}

async function test() {
  try {
    const res = await generateContentWithRetry({ model: "gemini-3.5-flash", contents: "Hi" });
    console.log("Success:", res.text);
  } catch(e) {
    console.log("Final error:", e.message);
  }
}
test();
