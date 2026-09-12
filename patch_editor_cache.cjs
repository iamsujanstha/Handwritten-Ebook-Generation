const fs = require('fs');
const path = './src/pages/Editor.tsx';
let content = fs.readFileSync(path, 'utf8');

const importTarget = `import { useSettingsStore } from "../store/useSettingsStore";`;
const importReplacement = `import { useSettingsStore } from "../store/useSettingsStore";\nimport { generateCacheKey, getCachedNote, setCachedNote } from "../lib/cache";`;
content = content.replace(importTarget, importReplacement);

const target = `    setIsGenerating(true);
    try {
      const estimatedTokens = Math.ceil(rawInput.length / 4);`;

const replacement = `    setIsGenerating(true);
    try {
      const payload = {
        chapterTitle: activeChapter.title,
        sectionTitle: activeSection.title,
        rawText: rawInput
      };
      
      const cacheKey = await generateCacheKey(payload);
      const cached = getCachedNote(cacheKey);
      
      if (cached) {
        updateSectionContent(id, activeChapter.id, activeSection.id, cached.content);
        setRawInput("");
        setIsEditing(false);
        setIsGenerating(false);
        return;
      }
      
      const estimatedTokens = Math.ceil(rawInput.length / 4);`;

content = content.replace(target, replacement);

const target2 = `        body: JSON.stringify({
          chapterTitle: activeChapter.title,
          sectionTitle: activeSection.title,
          rawText: rawInput
        })
      });`;

const replacement2 = `        body: JSON.stringify(payload)
      });`;

content = content.replace(target2, replacement2);

const target3 = `      updateSectionContent(id, activeChapter.id, activeSection.id, data.content);`;
const replacement3 = `      setCachedNote(cacheKey, { content: data.content });
      updateSectionContent(id, activeChapter.id, activeSection.id, data.content);`;

content = content.replace(target3, replacement3);

fs.writeFileSync(path, content);
