const fs = require('fs');

let content = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf-8');

// Replace imports (remove ReactMarkdown)
content = content.replace(
  /import ReactMarkdown from "react-markdown";\s*import remarkGfm from "remark-gfm";\s*import rehypeRaw from "rehype-raw";/g,
  ""
);

// Add handleExportFullBook function inside the component, right before return
const handleExportCode = `
  const handleExportFullBook = () => {
    const generatedChapters = chapters.filter(c => c.content);
    if (generatedChapters.length === 0) {
      alert("No generated chapters to export. Please generate at least one chapter first.");
      return;
    }

    const firstHtml = generatedChapters[0].content || "";
    const styleMatch = firstHtml.match(/<style>[\\s\\S]*?<\\/style>/i);
    const styleContent = styleMatch ? styleMatch[0] : '';

    const combinedBody = generatedChapters.map((chap, idx) => {
      const bodyMatch = chap.content ? chap.content.match(/<body[^>]*>([\\s\\S]*)<\\/body>/i) : null;
      let bodyContent = bodyMatch ? bodyMatch[1] : (chap.content || "");
      return \`<div style="page-break-after: always;">\${bodyContent}</div>\`;
    }).join('\\n');

    const fullHtml = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>\${title || "Engineering Systems Manual"}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Patrick+Hand&family=Patrick+Hand+SC&display=swap" rel="stylesheet">
  \${styleContent}
  <style>
    @media print {
      body { background: white !important; }
      .notebook-container { box-shadow: none !important; border: none !important; margin: 0 !important; }
    }
  </style>
</head>
<body>
  \${combinedBody}
  <script>
    window.onload = () => {
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>\`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(fullHtml);
      printWindow.document.close();
    } else {
      alert("Please allow popups to export the book.");
    }
  };
`;

content = content.replace(/return \(\s*<div className="flex h-screen/, handleExportCode + '\n  return (\n    <div className="flex h-screen');

// Replace the export button onClick handler
content = content.replace(/onClick=\{\(\) => window\.print\(\)\}/, "onClick={handleExportFullBook}");

// Replace the preview section
const oldPreviewSection = /\{\/\* 3\. Output Preview - Interactive \(Hidden on Print\) \*\/\}[\s\S]*?\{\/\* 4\. Print Layout - Hidden normally, shows ALL chapters on print \*\/\}/;
const newPreviewSection = `{/* 3. Output Preview - Interactive (Hidden on Print) */}
      <div className="flex-1 flex flex-col bg-slate-100 relative overflow-hidden no-print">
        {activeChapter?.content ? (
          <iframe 
            srcDoc={activeChapter.content} 
            className="w-full h-full border-none bg-white" 
            title="Generated Notebook"
            sandbox="allow-same-origin allow-scripts"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
            <BookOpen className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-xl font-['Patrick_Hand'] text-slate-500">Chapter is empty.</p>
            <p className="text-sm font-['Patrick_Hand'] mt-2 max-w-sm text-slate-500">Paste your text on the left and click generate to build this chapter.</p>
          </div>
        )}
      </div>

      {/* 4. Print Layout - Hidden normally, shows ALL chapters on print */}`;

content = content.replace(oldPreviewSection, newPreviewSection);

// Remove the old print layout content (since we do popup print now)
const oldPrintLayout = /\{\/\* 4\. Print Layout - Hidden normally, shows ALL chapters on print \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*\);\s*\}/;
const newPrintLayout = `{/* 4. Print Layout - handled via popup window now */}
      
    </div>
  );
}`;

content = content.replace(oldPrintLayout, newPrintLayout);

// Remove print:h-auto class from main div
content = content.replace(/className="flex h-screen bg-slate-50 font-sans overflow-hidden print:h-auto"/, 'className="flex h-screen bg-slate-50 font-sans overflow-hidden"');

fs.writeFileSync('src/pages/SingleNotebook.tsx', content);
