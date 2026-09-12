const fs = require('fs');
const path = './src/pages/Editor.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `    setIsGenerating(true);
    try {
      const response = await fetch("/api/format-direct", {`;

const replacement = `    setIsGenerating(true);
    try {
      const estimatedTokens = Math.ceil(rawInput.length / 4);
      useSettingsStore.getState().addTokenUsage({ 
        promptTokenCount: estimatedTokens, 
        candidatesTokenCount: 0, 
        totalTokenCount: estimatedTokens, 
        hits: 1 
      });

      const response = await fetch("/api/format-direct", {`;

content = content.replace(target, replacement);

const target2 = `      const data = await response.json();
      
      if (data.usageMetadata) {
        useSettingsStore.getState().addTokenUsage(data.usageMetadata);
      }`;

const replacement2 = `      const data = await response.json();
      
      if (data.usageMetadata) {
        useSettingsStore.getState().addTokenUsage({
          promptTokenCount: (data.usageMetadata.promptTokenCount || 0) - estimatedTokens,
          candidatesTokenCount: data.usageMetadata.candidatesTokenCount || 0,
          totalTokenCount: (data.usageMetadata.totalTokenCount || 0) - estimatedTokens,
          hits: 0
        });
      }`;

content = content.replace(target2, replacement2);
fs.writeFileSync(path, content);
