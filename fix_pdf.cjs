const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

// Replace imports
content = content.replace(
  'import { createRequire } from "module";\nconst require = createRequire(import.meta.url);\nconst pdf = require("pdf-parse");',
  'import { PDFParse } from "pdf-parse";'
);

// Replace extract logic
const oldLogic = `    const data = await pdf(req.file.buffer);\n    res.json({ text: data.text, numpages: data.numpages });`;
const newLogic = `    const parser = new PDFParse({ data: req.file.buffer });\n    const data = await parser.getText();\n    await parser.destroy();\n    res.json({ text: data.text, numpages: data.total });`;

content = content.replace(oldLogic, newLogic);

fs.writeFileSync('server.ts', content);
