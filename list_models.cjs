const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    let response = await ai.models.list();
    let data = response.models || response.items || response.data || Object.values(response).find(Array.isArray) || [];
    for (const m of data) {
       console.log(m.name);
    }
  } catch (e) {
    console.error(e);
  }
}
run();
