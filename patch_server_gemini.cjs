const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Update generateContentWithRetry signature
content = content.replace(
  'async function generateContentWithRetry(params: any, customApiKey?: string, retries = MAX_RETRIES): Promise<any> {',
  'async function generateContentWithRetry(params: any, customApiKey?: string, apiBaseUrl?: string, retries = 3): Promise<any> {\n  if (apiBaseUrl) {\n    const messages = [];\n    let promptContent = "";\n    if (typeof params.contents === "string") promptContent = params.contents;\n    else if (Array.isArray(params.contents)) promptContent = params.contents.map(c => c.text ? c.text : JSON.stringify(c)).join("\\n");\n    else promptContent = JSON.stringify(params.contents);\n\n    messages.push({ role: "user", content: promptContent });\n\n    let responseFormat;\n    if (params.config?.responseMimeType === "application/json") {\n      responseFormat = { type: "json_object" };\n      messages[0].content += "\\n\\nYou MUST respond with valid JSON only. Do not wrap with ```json markdown.";\n    }\n\n    for (let i = 0; i < retries; i++) {\n      try {\n        const fetchParams = {\n          method: "POST",\n          headers: {\n            "Content-Type": "application/json",\n            "Authorization": `Bearer ${customApiKey || ""}`,\n            "HTTP-Referer": "https://aistudio.google.com",\n            "X-Title": "AI Studio Applet"\n          },\n          body: JSON.stringify({\n            model: params.model,\n            messages: messages,\n            response_format: responseFormat\n          })\n        };\n        const res = await fetch(`${apiBaseUrl.replace(/\\/$/, "")}/chat/completions`, fetchParams);\n        if (!res.ok) {\n          const text = await res.text();\n          throw new Error(`Custom API error: ${res.status} ${text}`);\n        }\n        const data = await res.json();\n        return {\n          text: data.choices?.[0]?.message?.content || "",\n          usageMetadata: {\n            promptTokenCount: data.usage?.prompt_tokens || 0,\n            candidatesTokenCount: data.usage?.completion_tokens || 0,\n            totalTokenCount: data.usage?.total_tokens || 0\n          }\n        };\n      } catch (error) {\n        const delayMs = 2000 * Math.pow(2, i);\n        console.warn(`Custom API error (retry ${i + 1}/${retries}): ${error.message}`);\n        if (i < retries - 1) {\n          await new Promise(r => setTimeout(r, delayMs));\n        } else {\n          throw error;\n        }\n      }\n    }\n  }'
);

// Update calls to generateContentWithRetry
content = content.replace(
  /generateContentWithRetry\(\s*\{([^]*?)\}\s*,\s*req\.headers\["x-gemini-api-key"\]\s*as\s*string\s*\)/g,
  'generateContentWithRetry({$1}, req.headers["x-gemini-api-key"] as string, req.headers["x-api-base-url"] as string)'
);

// Sometimes it's called without the api key or config inline:
content = content.replace(
  /generateContentWithRetry\(\{\s*model:\s*\(req\.headers\["x-gemini-model"\]\s*as\s*string\)\s*\|\|\s*"gemini-3\.5-flash",\s*contents:\s*(.*?),\s*config:\s*\{(.*?)\}\s*\}\)/gs,
  'generateContentWithRetry({ model: (req.headers["x-gemini-model"] as string) || "gemini-3.5-flash", contents: $1, config: {$2} }, req.headers["x-gemini-api-key"] as string, req.headers["x-api-base-url"] as string)'
);

fs.writeFileSync('server.ts', content);
