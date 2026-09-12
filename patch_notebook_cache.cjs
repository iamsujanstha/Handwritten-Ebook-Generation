const fs = require('fs');
const path = './src/pages/SingleNotebook.tsx';
let content = fs.readFileSync(path, 'utf8');

const importTarget = `import { useSettingsStore } from "../store/useSettingsStore";`;
const importReplacement = `import { useSettingsStore } from "../store/useSettingsStore";\nimport { generateCacheKey, getCachedNote, setCachedNote } from "../lib/cache";`;
content = content.replace(importTarget, importReplacement);

const target = `    try {
      const estimatedTokens = Math.ceil((activeChapter.rawText || "").length / 4);`;

const replacement = `    try {
      const payload = {
        chapterTitle: activeChapter.title,
        sectionTitle: "Notes",
        rawText: activeChapter.rawText
      };
      
      const cacheKey = await generateCacheKey(payload);
      const cached = getCachedNote(cacheKey);
      
      if (cached) {
        clearInterval(progressInterval);
        setGenerateProgress(100);
        updateChapter(activeChapter.id, { content: patchNotebookHtml(cached.content) });
        setIsGenerating(false);
        return;
      }
      
      const estimatedTokens = Math.ceil((activeChapter.rawText || "").length / 4);`;

content = content.replace(target, replacement);

const target2 = `        body: JSON.stringify({
          chapterTitle: activeChapter.title,
          sectionTitle: "Notes",
          rawText: activeChapter.rawText
        })
      });`;

const replacement2 = `        body: JSON.stringify(payload)
      });`;

content = content.replace(target2, replacement2);

const target3 = `      updateChapter(activeChapter.id, { content: patchNotebookHtml(data.content) });`;
const replacement3 = `      setCachedNote(cacheKey, { content: data.content });
      updateChapter(activeChapter.id, { content: patchNotebookHtml(data.content) });`;

content = content.replace(target3, replacement3);

fs.writeFileSync(path, content);
