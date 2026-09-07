const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// The remaining calls might look like: 
// const outlineResponse = await generateContentWithRetry({ ... });
// But there could be nested brackets. The easiest way is to find the function call ends.
code = code.replace(/await generateContentWithRetry\(\{\n\s*model: \(req\.headers\["x-gemini-model"\] as string\) \|\| "gemini-3.5-flash",([\s\S]*?)(\s*\}\)(\s*;|))/g, (match, p1, p2) => {
    // Check if it already has the second param
    if (match.includes(', req.headers["x-gemini-api-key"]')) {
       return match;
    }
    // Replace the closing } or }); with }, req.headers...)
    return `await generateContentWithRetry({\n       model: (req.headers["x-gemini-model"] as string) || "gemini-3.5-flash",${p1}${p2.replace(/\}(\s*;|)$/, '}, req.headers["x-gemini-api-key"] as string)$1')}`;
});

fs.writeFileSync('server.ts', code);
