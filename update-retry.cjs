const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const oldFunc = `async function generateContentWithRetry(params: any, retries = MAX_RETRIES): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);`;

const newFunc = `async function generateContentWithRetry(params: any, customApiKey?: string, retries = MAX_RETRIES): Promise<any> {
  const client = customApiKey ? new GoogleGenAI({ apiKey: customApiKey }) : ai;
  for (let i = 0; i < retries; i++) {
    try {
      return await client.models.generateContent(params);`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('server.ts', code);
