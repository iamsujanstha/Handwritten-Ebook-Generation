const fs = require('fs');
let content = fs.readFileSync('src/pages/Editor.tsx', 'utf8');

// 1. Add state for generateProgress
content = content.replace(
  /const \[isGenerating, setIsGenerating\] = useState\(false\);/,
  `const [isGenerating, setIsGenerating] = useState(false);\n  const [generateProgress, setGenerateProgress] = useState<number | null>(null);`
);

// 2. Add progress logic to handleGenerate
const handleGenerateMatch = `    setIsGenerating(true);
    try {
      const payload = {`;

const handleGenerateReplacement = `    setIsGenerating(true);
    setGenerateProgress(0);

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += (95 - currentProgress) * 0.08; 
      setGenerateProgress(Math.floor(currentProgress));
    }, 400);

    try {
      const payload = {`;

content = content.replace(handleGenerateMatch, handleGenerateReplacement);

const cachedMatch = `      if (cached) {
        updateSectionContent(id, activeChapter.id, activeSection.id, cached.content);
        setRawInput("");
        setIsEditing(false);
        setIsGenerating(false);
        return;
      }`;
const cachedReplacement = `      if (cached) {
        clearInterval(progressInterval);
        setGenerateProgress(100);
        updateSectionContent(id, activeChapter.id, activeSection.id, cached.content);
        setRawInput("");
        setIsEditing(false);
        setTimeout(() => {
          setIsGenerating(false);
          setGenerateProgress(null);
        }, 600);
        return;
      }`;
content = content.replace(cachedMatch, cachedReplacement);

const fetchSuccessMatch = `      setCachedNote(cacheKey, { content: data.content });
      updateSectionContent(id, activeChapter.id, activeSection.id, data.content);`;
const fetchSuccessReplacement = `      clearInterval(progressInterval);
      setGenerateProgress(100);
      setCachedNote(cacheKey, { content: data.content });
      updateSectionContent(id, activeChapter.id, activeSection.id, data.content);`;
content = content.replace(fetchSuccessMatch, fetchSuccessReplacement);

const tryCatchMatch = `    } catch (error: any) {
      console.error(error);
      if (error?.message?.includes("QUOTA_EXCEEDED") || error?.message?.includes("Quota exceeded") || error?.message?.includes("429")) {
        alert("AI Quota Exceeded for this model! Please click the Settings gear icon in the top right to change the AI model or provide your own API key.");
      } else {
        alert("Generation failed: " + error.message);
      }
    } finally {
      setIsGenerating(false);
    }`;

const tryCatchReplacement = `    } catch (error: any) {
      clearInterval(progressInterval);
      console.error(error);
      if (error?.message?.includes("QUOTA_EXCEEDED") || error?.message?.includes("Quota exceeded") || error?.message?.includes("429")) {
        alert("AI Quota Exceeded for this model! Please click the Settings gear icon in the top right to change the AI model or provide your own API key.");
      } else {
        alert("Generation failed: " + error.message);
      }
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenerateProgress(null);
      }, 600);
    }`;
content = content.replace(tryCatchMatch, tryCatchReplacement);


// 3. Add visual progress bar below the button
const buttonMatch = `                        {isGenerating ? "Formatting to Notebook Style..." : "Generate Styled Chapter"}
                      </button>`;
const buttonReplacement = `                        {isGenerating ? (generateProgress !== null ? \`Formatting Chapter \${generateProgress}%\` : "Formatting to Notebook Style...") : "Generate Styled Chapter"}
                      </button>
                      
                      {isGenerating && generateProgress !== null && (
                        <div className="mt-4 w-full">
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                            <div 
                              className="bg-orange-500 h-2 rounded-full transition-all duration-300 ease-out" 
                              style={{ width: \`\${generateProgress}%\` }}
                            ></div>
                          </div>
                          <p className="text-center text-xs text-slate-500 mt-2 font-medium tracking-wide animate-pulse">
                            {generateProgress < 100 ? "AI is processing your content..." : "Finalizing..."}
                          </p>
                        </div>
                      )}`;
content = content.replace(buttonMatch, buttonReplacement);

fs.writeFileSync('src/pages/Editor.tsx', content);
