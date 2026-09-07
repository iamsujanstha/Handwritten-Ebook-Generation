const fs = require('fs');

let content = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf-8');

// 1. Add generateProgress state
content = content.replace(
  'const [isGenerating, setIsGenerating] = useState(false);',
  'const [isGenerating, setIsGenerating] = useState(false);\n  const [generateProgress, setGenerateProgress] = useState<number | null>(null);'
);

// 2. Rewrite handleGenerate
const oldHandleGenerateRegex = /const handleGenerate = async \(\) => \{[\s\S]*?finally \{\s*setIsGenerating\(false\);\s*\}\s*\};/;

const newHandleGenerate = `const handleGenerate = async () => {
    if (!activeChapter || !activeChapter.rawText.trim()) {
      alert("Please enter some raw text or notes first.");
      return;
    }
    
    setIsGenerating(true);
    setGenerateProgress(0);

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      // Asymptotically approach 95% while waiting for the LLM
      currentProgress += (95 - currentProgress) * 0.08; 
      setGenerateProgress(Math.floor(currentProgress));
    }, 400);

    try {
      const response = await fetch("/api/format-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterTitle: activeChapter.title,
          sectionTitle: "Notes",
          rawText: activeChapter.rawText
        })
      });

      if (!response.ok) throw new Error("Failed to format content");
      const data = await response.json();
      
      clearInterval(progressInterval);
      setGenerateProgress(100);
      
      updateChapter(activeChapter.id, { content: data.content });
    } catch (error) {
      clearInterval(progressInterval);
      console.error(error);
      alert("Generation failed");
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenerateProgress(null);
      }, 600); // Leave 100% on screen for a moment
    }
  };`;

content = content.replace(oldHandleGenerateRegex, newHandleGenerate);

// 3. Update the Generate button label
content = content.replace(
  /\{isGenerating \? "Formatting Chapter\.\.\." : "Generate Chapter"\}/g,
  `{isGenerating ? (generateProgress !== null ? \`Formatting Chapter \${generateProgress}%\` : "Formatting Chapter...") : "Generate Chapter"}`
);

fs.writeFileSync('src/pages/SingleNotebook.tsx', content);
