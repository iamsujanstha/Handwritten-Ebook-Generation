const fs = require('fs');
const path = './src/pages/Architect.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `    try {
      const response = await fetch("/api/architect-stream", {`;

const replacement = `    try {
      const textToEstimate = book.sources.filter(s => s.extractionStatus === "Completed").map(s => s.content).join(" ");
      const estimatedTokens = Math.ceil(textToEstimate.length / 4);
      useSettingsStore.getState().addTokenUsage({ 
        promptTokenCount: estimatedTokens, 
        candidatesTokenCount: 0, 
        totalTokenCount: estimatedTokens, 
        hits: 1 
      });

      const response = await fetch("/api/architect-stream", {`;

content = content.replace(target, replacement);

const target2 = `               if (parsedData.usageMetadata) {
                 useSettingsStore.getState().addTokenUsage(parsedData.usageMetadata);
               }`;

const replacement2 = `               if (parsedData.usageMetadata) {
                 useSettingsStore.getState().addTokenUsage({
                   promptTokenCount: (parsedData.usageMetadata.promptTokenCount || 0) - estimatedTokens,
                   candidatesTokenCount: parsedData.usageMetadata.candidatesTokenCount || 0,
                   totalTokenCount: (parsedData.usageMetadata.totalTokenCount || 0) - estimatedTokens,
                   hits: 0
                 });
               }`;

content = content.replace(target2, replacement2);
fs.writeFileSync(path, content);
