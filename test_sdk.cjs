const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    console.log("Calling 3.6...");
    const res = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: "Hello"
    });
    console.log(res.text);
  } catch (e) {
    console.log("Error 3.6:", e.message);
  }
}
test();
