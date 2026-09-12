const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(
  'const fallbacks = ["gemini-2.5-flash", "gemini-3.8-flash", "gemini-pro-latest"];',
  'const fallbacks = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.8-flash", "gemini-pro-latest"];'
);

const errorCheck = `if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Quota exceeded") || error?.message?.includes("RESOURCE_EXHAUSTED")) {`;
const newErrorCheck = `if (error?.status === 404 || error?.message?.includes("NOT_FOUND") || error?.message?.includes("no longer available")) {
          if (fallbackIndex < fallbacks.length) {
             console.warn(\`Model \${params.model} not found. Falling back to \${fallbacks[fallbackIndex]}\`);
             params.model = fallbacks[fallbackIndex++];
             delayMs = 1000;
          } else {
             throw error;
          }
        } else if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Quota exceeded") || error?.message?.includes("RESOURCE_EXHAUSTED")) {`;

server = server.replace(errorCheck, newErrorCheck);

fs.writeFileSync('server.ts', server);
