const fs = require('fs');

let content = fs.readFileSync('src/pages/SingleNotebook.tsx', 'utf-8');

// 1. Add states
content = content.replace(
  'const [isExtractingBulk, setIsExtractingBulk] = useState(false);',
  `const [isExtractingBulk, setIsExtractingBulk] = useState(false);
  const [extractProgress, setExtractProgress] = useState<number | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ current: number, total: number, percent: number } | null>(null);

  const uploadWithProgress = (url: string, formData: FormData, onProgress: (pct: number) => void): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error("Upload failed"));
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(formData);
    });
  };`
);

// 2. Update handleSinglePdfUpload
const oldSingleUpload = /const handleSinglePdfUpload = async \[\s\S\]*?  \};/m;

const newSingleUpload = `const handleSinglePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChapter) return;
    
    const formData = new FormData();
    formData.append("file", file);
    
    setIsExtracting(true);
    setExtractProgress(0);
    try {
      const data = await uploadWithProgress("/api/extract-pdf", formData, setExtractProgress);
      updateChapter(activeChapter.id, { 
        rawText: activeChapter.rawText + (activeChapter.rawText ? "\\n\\n" : "") + data.text 
      });
    } catch (error) {
      console.error(error);
      alert("Failed to parse PDF");
    } finally {
      setIsExtracting(false);
      setExtractProgress(null);
      if (e.target) e.target.value = '';
    }
  };`;

content = content.replace(/const handleSinglePdfUpload = async \([\s\S]*?finally \{\s*setIsExtracting\(false\);\s*if \(e\.target\) e\.target\.value = '';\s*\}\s*\};/m, newSingleUpload);

// 3. Update handleBulkPdfUpload
const newBulkUpload = `const handleBulkPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsExtractingBulk(true);
    setBulkProgress({ current: 1, total: files.length, percent: 0 });
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        
        try {
          const data = await uploadWithProgress("/api/extract-pdf", formData, (pct) => {
            setBulkProgress({ current: i + 1, total: files.length, percent: pct });
          });
          const chapterTitle = file.name.replace(/\\.[^/.]+$/, ""); // strip extension
          addChapterWithData(chapterTitle, data.text);
        } catch(err) {
          console.error("Failed one PDF", err);
        }
      }
    } catch (error) {
      console.error(error);
      alert("Failed to parse one or more PDFs");
    } finally {
      setIsExtractingBulk(false);
      setBulkProgress(null);
      if (e.target) e.target.value = '';
    }
  };`;

content = content.replace(/const handleBulkPdfUpload = async \([\s\S]*?finally \{\s*setIsExtractingBulk\(false\);\s*if \(e\.target\) e\.target\.value = '';\s*\}\s*\};/m, newBulkUpload);

// 4. Update Bulk Upload Button Text
content = content.replace(
  /\{isExtractingBulk \? "Extracting Files\.\.\." : <><FileUp className="w-4 h-4 mr-2" \/> Bulk Upload PDFs<\/>\}/g,
  `{isExtractingBulk ? \`Extracting... \${bulkProgress ? \`(\${bulkProgress.current}/\${bulkProgress.total}) \${bulkProgress.percent}%\` : ''}\` : <><FileUp className="w-4 h-4 mr-2" /> Bulk Upload PDFs</>}`
);

// 5. Update Single Upload Button Text
content = content.replace(
  /\{isExtracting \? "Extracting\.\.\." : <><Upload className="w-3 h-3 mr-1" \/> Append PDF<\/>\}/g,
  `{isExtracting ? (extractProgress !== null && extractProgress < 100 ? \`Uploading \${extractProgress}%\` : "Extracting...") : <><Upload className="w-3 h-3 mr-1" /> Append PDF</>}`
);

fs.writeFileSync('src/pages/SingleNotebook.tsx', content);
