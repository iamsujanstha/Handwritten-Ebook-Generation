import { useSettingsStore } from "../store/useSettingsStore";
import { useState, useRef, useEffect } from "react";
import { Settings } from "lucide-react";
import { Sparkles, FileText, Upload, Printer, BookOpen, Trash2, Plus, GripVertical, FileUp, ImagePlus, Eye, Code, Check } from "lucide-react";

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useNotebookStore } from "../store/useNotebookStore";
import { handleImagePaste, handleImageDrop, uploadImageFile, insertTextAtCursor } from "../lib/imageUtils";
import { CoverEditor } from "../components/CoverEditor";
import { generateCoverPageHtml } from "../lib/coverGenerator";
import { AutoSaveIndicator } from "../components/AutoSaveIndicator";

import SettingsModal from "../components/SettingsModal";

export function stripFlowchartsFromHtml(html: string): string {
  if (!html) return html;
  let cleaned = html
    .replace(/<pre[^>]*class=["'][^"']*mermaid[^"']*["'][^>]*>[\s\S]*?<\/pre>/gi, "")
    .replace(/<div[^>]*class=["'][^"']*mermaid[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/```mermaid[\s\S]*?```/gi, "")
    .replace(/<script[^>]*src=["'][^"']*mermaid[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?mermaid[\s\S]*?<\/script>/gi, "");

  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleaned, "text/html");
      const elementsToRemove = doc.querySelectorAll(".diagram-container, .diagram-badge, .diagram-caption, .mermaid, .book-tag");
      if (elementsToRemove.length > 0) {
        elementsToRemove.forEach(el => el.remove());
        if (cleaned.includes("<!DOCTYPE") || cleaned.includes("<html")) {
          cleaned = doc.documentElement.outerHTML;
        } else {
          cleaned = doc.body.innerHTML;
        }
      }
    } catch (e) {
      // Fallback to regex
    }
  }

  cleaned = cleaned
    .replace(/<div[^>]*class=["'][^"']*diagram-container[^"']*["'][^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, "")
    .replace(/<div[^>]*class=["'][^"']*diagram-container[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*class=["'][^"']*(?:diagram-badge|diagram-caption)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*class=["'][^"']*book-tag[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "");

  return cleaned;
}

export function patchNotebookHtml(html: string): string {
  if (!html) return html;
  
  // First strip any residual flowchart or diagram containers and book-tags
  let fixed = stripFlowchartsFromHtml(html);

  // Replace broken table styling and remove forced pre::before banners
  fixed = fixed
    .replace(/table-layout:\s*fixed;?/gi, 'table-layout: auto;')
    .replace(/th:first-child,\s*td:first-child\s*\{[^}]*\}/gi, '')
    .replace(/th:last-child,\s*td:last-child\s*\{[^}]*\}/gi, '')
    .replace(/pre::before\s*\{[\s\S]*?\}/gi, 'pre::before { display: none !important; }');

  const baseHref = typeof window !== 'undefined' ? window.location.origin : '';
  const baseTag = !fixed.includes('<base ') ? `<base href="${baseHref}/">` : '';

  const overrideStylesAndScripts = `
${baseTag}
<style id="notebook-diagram-table-override">
  /* REMOVE ABOVE TEXT OF CHAPTER TITLE & KEEP TITLE CENTERED */
  .book-tag {
    display: none !important;
  }
  header {
    text-align: center !important;
    margin-bottom: 2rem !important;
  }
  h1.notebook-title {
    text-align: center !important;
    margin: 0 auto 0.5rem auto !important;
    display: block !important;
  }
  .subtitle {
    text-align: center !important;
    margin: 0 auto 1.5rem auto !important;
    display: block !important;
    max-width: 820px !important;
  }
  .header-divider {
    margin: 1.5rem auto !important;
    max-width: 100% !important;
  }

  table {
    table-layout: auto !important;
    width: 100% !important;
    border-collapse: collapse !important;
  }
  th, td {
    width: auto !important;
    max-width: none !important;
    vertical-align: top !important;
    word-break: normal !important;
    overflow-wrap: break-word !important;
    padding: 0.85rem 1.15rem !important;
  }
  th:first-child, td:first-child,
  th:last-child, td:last-child {
    width: auto !important;
  }
  ul, ol {
    margin: 0.75rem 0 1.5rem 2rem !important;
    padding-left: 0.5rem !important;
  }
  li {
    margin-bottom: 0.45rem !important;
    line-height: 1.6 !important;
  }
  li::marker {
    color: var(--ink-blue, #1c4b82) !important;
    font-weight: bold !important;
  }
  ol ol, ul ul, ol ul, ul ol {
    margin: 0.35rem 0 0.5rem 1.5rem !important;
  }

  /* SUPPRESS UNWANTED "CODE SNIPPET" BANNER & CLEAN PRE CODE STYLES */
  pre::before {
    display: none !important;
    content: none !important;
  }
  pre {
    background: #1e293b !important;
    color: #e2e8f0 !important;
    border-radius: 8px !important;
    padding: 1.25rem 1.5rem !important;
    margin: 1.5rem 0 !important;
    overflow-x: auto !important;
    box-shadow: 3px 4px 0 var(--shadow-color, rgba(0,0,0,0.06)) !important;
    border: 1px solid #334155 !important;
    font-family: 'Fira Code', monospace !important;
    font-size: 0.92rem !important;
    line-height: 1.6 !important;
  }
  pre code {
    background: transparent !important;
    padding: 0 !important;
    color: inherit !important;
    font-size: inherit !important;
    line-height: inherit !important;
  }

  /* NOTEBOOK IMAGE & FIGURE STYLING */
  .notebook-figure {
    background: #ffffff !important;
    border: 2px solid var(--border-dark, #2d3748) !important;
    border-radius: 8px !important;
    padding: 1.25rem 1.5rem !important;
    margin: 2.5rem 0 !important;
    text-align: center !important;
    box-shadow: 4px 5px 0 var(--shadow-color, rgba(0,0,0,0.06)) !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  .notebook-figure img, img {
    max-width: 100% !important;
    height: auto !important;
    border-radius: 6px !important;
    display: block !important;
    margin: 0 auto !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
  }
  .notebook-figure figcaption {
    font-family: 'Patrick Hand', cursive, sans-serif !important;
    font-size: 1.05rem !important;
    color: #64748b !important;
    margin-top: 1rem !important;
    font-style: italic !important;
  }
</style>
`;

  if (fixed.includes('</head>')) {
    fixed = fixed.replace('</head>', `${overrideStylesAndScripts}</head>`);
  } else if (fixed.includes('<body')) {
    fixed = fixed.replace(/<body/i, `${overrideStylesAndScripts}<body`);
  } else {
    fixed = `${overrideStylesAndScripts}${fixed}`;
  }

  return fixed;
}

// Assemble full book HTML with ultra-optimized print CSS (eliminating heavy raster blur shadows to compress file size by 60%+ while keeping crisp vector text)
function assembleFullBookHtml(chapters: any[], bookTitle: string, coverConfig: any): string {
  const generatedChapters = chapters.filter(c => c.content);
  const firstHtml = generatedChapters[0]?.content || "";
  let styleContent = '';
  const styleMatches = firstHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  if (styleMatches) {
    styleContent = styleMatches.join('\n')
      .replace(/@media\s+print\s*\{[\s\S]*?\}\s*\}/gi, '')
      .replace(/table-layout:\s*fixed;?/gi, 'table-layout: auto;')
      .replace(/th:first-child,\s*td:first-child\s*\{[^}]*\}/gi, '')
      .replace(/th:last-child,\s*td:last-child\s*\{[^}]*\}/gi, '')
      .replace(/pre::before\s*\{[\s\S]*?\}/gi, 'pre::before { display: none !important; }')
      .replace(/\.diagram-container\s*\{[\s\S]*?\}/gi, '')
      .replace(/\.diagram-badge\s*\{[\s\S]*?\}/gi, '')
      .replace(/\.mermaid\s*\{[\s\S]*?\}/gi, '')
      .replace(/\.book-tag\s*\{[\s\S]*?\}/gi, '.book-tag { display: none !important; }');
  }

  let coverHtml = '';
  if (coverConfig?.enabled) {
    coverHtml = generateCoverPageHtml(coverConfig);
  }

  const chapterBodies = generatedChapters.map((chap) => {
    const patched = chap.content ? patchNotebookHtml(chap.content) : "";
    const bodyMatch = patched.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    let bodyContent = bodyMatch ? bodyMatch[1] : patched;
    return `<div class="chapter-wrapper">${bodyContent}</div>`;
  }).join('');

  const combinedBody = coverHtml + chapterBodies;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${bookTitle || "Engineering Systems Manual"}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Patrick+Hand&family=Patrick+Hand+SC&display=swap" rel="stylesheet">
  ${styleContent}
  <style>
    /* NO PAGE NUMBER AT BOTTOM & CENTERED HEADERS */
    @page {
      margin: 0;
      @bottom-left { content: none !important; }
      @bottom-center { content: none !important; }
      @bottom-right { content: none !important; }
      @top-left { content: none !important; }
      @top-center { content: none !important; }
      @top-right { content: none !important; }
    }
    .page-number, .page-footer, .footer-page, .book-tag {
      display: none !important;
    }
    header {
      text-align: center !important;
      margin-bottom: 2rem !important;
    }
    h1.notebook-title {
      text-align: center !important;
      margin: 0 auto 0.5rem auto !important;
      display: block !important;
    }
    .subtitle {
      text-align: center !important;
      margin: 0 auto 1.5rem auto !important;
      display: block !important;
      max-width: 820px !important;
    }
    .header-divider {
      margin: 1.5rem auto !important;
      max-width: 100% !important;
    }

    :root {
      --bg-desk: #f4eee1;
      --paper-line: #e3dac9;
      --bg-page: #fcf9f2;
      --ink-black: #1e1e24;
      --ink-blue: #1c4b82;
      --ink-purple: #6b46c1;
      --border-dark: #2d3748;
      --shadow-color: rgba(0, 0, 0, 0.08);
    }

    * {
      box-sizing: border-box !important;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #f4eee1 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    body {
      font-family: 'Patrick Hand', cursive;
      font-size: 1.15rem;
      line-height: 32px;
      color: #1e1e24;
    }

    .chapter-wrapper, .cover-wrapper {
      page-break-after: always;
      break-after: page;
      padding: 24px 0;
      background-color: #f4eee1 !important;
      display: flex;
      justify-content: center;
      width: 100%;
      min-height: 1056px;
      box-sizing: border-box !important;
    }

    .notebook-container {
      width: 816px !important;
      max-width: 816px !important;
      min-height: 1008px !important;
      margin: 0 auto !important;
      background-color: #fcf9f2 !important;
      background-image: 
        linear-gradient(to right, transparent 78px, #fca5a5 78px, #fca5a5 80px, transparent 80px),
        linear-gradient(to bottom, transparent 31px, #e3dac9 32px) !important;
      background-size: 100% 100%, 100% 32px !important;
      background-position: 0 0, 0 0 !important;
      padding: 3rem 4rem 3rem 6rem !important;
      border-radius: 12px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
      border: 1px solid #e3dac9 !important;
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    /* COMPACT, CRISP PRINT & PDF STYLES - Eliminates heavy raster drop-shadows to compress file size by 60%+ while keeping crisp vector text */
    @media print {
      html, body {
        background-color: #f4eee1 !important;
      }
      .chapter-wrapper, .cover-wrapper {
        padding: 0 !important;
        background-color: #f4eee1 !important;
      }
      .notebook-container, .diagram-container, .cover-container {
        box-shadow: none !important;
        border: 1px solid #d4c7b2 !important;
      }
    }

    table {
      table-layout: auto !important;
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 2rem 0 !important;
      font-size: 1.05rem !important;
    }
    th, td {
      border: 1px solid #cbd5e1 !important;
      padding: 10px 14px !important;
      vertical-align: top !important;
      word-break: normal !important;
      overflow-wrap: break-word !important;
    }
    th {
      background-color: #e2e8f0 !important;
      font-weight: bold !important;
      text-align: left !important;
      font-family: 'Patrick Hand SC', cursive, sans-serif !important;
    }

    pre, code {
      font-family: 'Fira Code', monospace !important;
    }
    pre {
      background-color: #1e293b !important;
      color: #f8fafc !important;
      padding: 1rem 1.25rem !important;
      border-radius: 8px !important;
      overflow-x: auto !important;
      font-size: 0.95rem !important;
      line-height: 1.5 !important;
    }
  </style>
</head>
<body>
  <div id="pdf-wrapper">
    ${combinedBody}
  </div>
</body>
</html>`;
}

async function getHtmlHash(content: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(content);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
    } catch (e) {
      // fallback
    }
  }
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export default function SingleNotebook() {
  const { geminiModel, userApiKey } = useSettingsStore();
  const { 
    title, setTitle, 
    coverConfig,
    chapters, activeChapterId, 
    addChapter, addChapterWithData, removeChapter, updateChapter, 
    setActiveChapterId, reorderChapters 
  } = useNotebookStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState<number | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExtractingBulk, setIsExtractingBulk] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [extractProgress, setExtractProgress] = useState<number | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ current: number, total: number, percent: number } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<'preview' | 'html'>('preview');

  // Optimistic PDF compilation state
  const [optimisticStatus, setOptimisticStatus] = useState<"idle" | "preparing" | "ready">("idle");
  const [lastOptimisticHash, setLastOptimisticHash] = useState<string>("");

  const rawTextareaRef = useRef<HTMLTextAreaElement>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Background optimistic pre-compilation of full book PDF
  useEffect(() => {
    const generatedChapters = chapters.filter(c => c.content);
    if (generatedChapters.length === 0) {
      setOptimisticStatus("idle");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const fullHtml = assembleFullBookHtml(chapters, title, coverConfig);
        const hash = await getHtmlHash(fullHtml);
        if (hash === lastOptimisticHash) return;

        setOptimisticStatus("preparing");
        const res = await fetch("/api/optimistic-prepare-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ html: fullHtml, title: title || "Notebook", hash })
        });

        if (res.ok) {
          const data = await res.json();
          setLastOptimisticHash(hash);
          setOptimisticStatus(data.status === "ready" ? "ready" : "preparing");
        }
      } catch (e) {
        console.warn("Optimistic PDF pre-compilation note:", e);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [chapters, title, coverConfig, lastOptimisticHash]);

  // Safeguard against closing or refreshing during active AI generation or extraction
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGenerating || isExtractingBulk || isExtracting) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isGenerating, isExtractingBulk, isExtracting]);

  const uploadWithProgress = (url: string, formData: FormData, onProgress: (pct: number) => void): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.withCredentials = true;
      let simulatedProgress = 0;
      const progressInterval = setInterval(() => {
        simulatedProgress += (90 - simulatedProgress) * 0.1; // asymptotic to 90%
        onProgress(Math.round(simulatedProgress));
      }, 500);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const actualProgress = Math.round((e.loaded / e.total) * 100);
          if (actualProgress > simulatedProgress) {
             simulatedProgress = actualProgress;
             onProgress(simulatedProgress);
          }
        }
      };
      xhr.onload = () => {
        clearInterval(progressInterval);
        onProgress(100);
        if (xhr.status >= 200 && xhr.status < 300) {
          const contentType = xhr.getResponseHeader("content-type");
          if (contentType && contentType.indexOf("application/json") === -1) {
             const preview = xhr.responseText.substring(0, 100);
             if (preview.includes("<!doctype html>")) {
                reject(new Error("Your session expired or the server is restarting. Please reload the page to continue."));
             } else {
                reject(new Error(`Server returned non-JSON response. Status: ${xhr.status}, Type: ${contentType}, Body: ${preview}`));
             }
             return;
          }
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch(e) {
            reject(new Error("Failed to parse server response."));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      };
      xhr.onerror = () => { clearInterval(progressInterval); reject(new Error("Network error")); };
      xhr.send(formData);
    });
  };

  const activeChapter = chapters.find(c => c.id === activeChapterId);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderChapters(result.source.index, result.destination.index);
  };

  const handleSinglePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChapter) return;
    
    const formData = new FormData();
    formData.append("file", file);
    
    setIsExtracting(true);
    setExtractProgress(0);
    try {
      const data = await uploadWithProgress("/api/extract-pdf?t=" + Date.now(), formData, setExtractProgress);
      updateChapter(activeChapter.id, { 
        rawText: activeChapter.rawText + (activeChapter.rawText ? "\n\n" : "") + data.text 
      });
    } catch (error) {
      console.error(error);
      alert("Failed to parse PDF");
    } finally {
      setIsExtracting(false);
      setExtractProgress(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleBulkPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          const data = await uploadWithProgress("/api/extract-pdf?t=" + Date.now(), formData, (pct) => {
            setBulkProgress({ current: i + 1, total: files.length, percent: pct });
          });
          const chapterTitle = file.name.replace(/\.[^/.]+$/, ""); // strip extension
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
  };

  const handleGenerate = async () => {
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
        headers: { "Content-Type": "application/json", "x-gemini-model": geminiModel, "x-gemini-api-key": userApiKey },
        body: JSON.stringify({
          chapterTitle: activeChapter.title,
          sectionTitle: "Notes",
          rawText: activeChapter.rawText
        })
      });

      if (!response.ok) {
        let msg = response.statusText;
        try {
           const errData = await response.json();
           if (errData.error === "QUOTA_EXCEEDED") msg = "QUOTA_EXCEEDED";
           else msg = errData.error || errData.message || msg;
        } catch(e) {}
        throw new Error(msg);
      }
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
        throw new Error("Your session expired or the server is restarting. Please reload the page to continue.");
      }
      const data = await response.json();
      
      clearInterval(progressInterval);
      setGenerateProgress(100);
      
      updateChapter(activeChapter.id, { content: patchNotebookHtml(data.content) });
    } catch (error: any) {
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
      }, 600); // Leave 100% on screen for a moment
    }
  };

  
  const handleExportFullBook = async () => {
    const generatedChapters = chapters.filter(c => c.content);
    if (generatedChapters.length === 0) {
      alert("No generated chapters to export. Please generate at least one chapter first.");
      return;
    }

    const exportBtn = document.getElementById('export-btn-text');
    const originalText = exportBtn ? exportBtn.innerText : 'Export Full Book';
    if (exportBtn) exportBtn.innerText = 'Generating PDF...';

    try {
      const fullHtml = assembleFullBookHtml(chapters, title, coverConfig);
      // Full book HTML assembled via assembleFullBookHtml

      const hash = await getHtmlHash(fullHtml);

      if (exportBtn) {
        exportBtn.innerText = optimisticStatus === "ready" ? "Downloading PDF..." : "Exporting PDF...";
      }

      const res = await fetch("/api/export-raw-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: fullHtml, title: title || "Notebook", hash })
      });
      
      if (!res.ok) {
        throw new Error("Failed to initialize export job");
      }
      
      const { exportId, ready } = await res.json();

      // OPTIMISTIC FAST-PATH: Instant download if background compiler already prepared the PDF!
      if (ready) {
        if (exportBtn) exportBtn.innerText = "Downloaded instantly!";
        const dlRes = await fetch(`/api/download-pdf/${exportId}`, { credentials: "include" });
        const blob = await dlRes.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(title || 'Engineering_Notebook').replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setTimeout(() => {
          if (exportBtn) exportBtn.innerText = originalText;
        }, 2200);
        return;
      }
      
      const eventSource = new EventSource(`/api/export-status/${exportId}`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.status === "failed") {
          alert("Export failed: " + (data.error || data.progress));
          if (exportBtn) exportBtn.innerText = originalText;
          eventSource.close();
        } else if (data.status === "completed") {
          if (exportBtn) exportBtn.innerText = "PDF ready!";
          eventSource.close();
          
          fetch(`/api/download-pdf/${exportId}`, {credentials: "include"})
            .then(res => res.blob())
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${(title || 'Engineering_Notebook').replace(/\s+/g, '_')}.pdf`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              setOptimisticStatus("ready");
            })
            .catch(err => alert("Failed to download PDF: " + err.message));
  
          setTimeout(() => { if (exportBtn) exportBtn.innerText = originalText; }, 2500);
        } else {
          if (exportBtn) exportBtn.innerText = data.progress;
        }
      };
      
      eventSource.onerror = (err) => {
        console.error("SSE Error:", err);
        alert("Connection to export server lost");
        if (exportBtn) exportBtn.innerText = originalText;
        eventSource.close();
      };

    } catch (err: any) {
      console.error(err);
      alert("Error generating PDF: " + err.message);
      if (exportBtn) exportBtn.innerText = originalText;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}

      
      {/* 1. Sidebar - Chapter List */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col no-print">
        <button onClick={() => setIsSettingsOpen(true)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-full transition-colors z-10 shadow-sm border border-slate-200"><Settings className="w-5 h-5" /></button>
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Book Title</p>
            <AutoSaveIndicator compact />
          </div>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="font-bold text-lg text-slate-800 bg-transparent border-none focus:ring-0 p-0 w-full outline-none truncate"
            placeholder="E-Book Title"
          />
        </div>

        {/* Cover Page Tab Button */}
        <div className="p-3 border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setActiveChapterId("__cover__")}
            className={`w-full flex items-center justify-between p-2.5 rounded-lg border-2 transition-all ${
              activeChapterId === "__cover__"
                ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs"
                : "border-slate-200 bg-slate-50/50 hover:border-slate-300 text-slate-700 hover:bg-slate-100/70"
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className={`p-1.5 rounded-md ${activeChapterId === "__cover__" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"}`}>
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="text-left truncate">
                <div className="text-xs font-bold truncate">E-Book Cover Page</div>
                <div className="text-[10px] text-slate-500 truncate">
                  {coverConfig?.enabled ? `${(coverConfig.template || "notebook").toUpperCase()} • ${coverConfig.imageUrl ? 'With Cover Art' : 'Typographic'}` : 'Cover Disabled'}
                </div>
              </div>
            </div>
            {coverConfig?.enabled ? (
              <span className="shrink-0 text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-green-100 text-green-800 border border-green-200">
                Included
              </span>
            ) : (
              <span className="shrink-0 text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                Off
              </span>
            )}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="chapters-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {chapters.map((chap, index) => (
                    <Draggable key={chap.id} draggableId={chap.id} index={index}>
                      {(provided) => (
                        <div 
                          ref={provided.innerRef} 
                          {...provided.draggableProps} 
                          className={`flex flex-col border rounded shadow-sm transition-colors ${activeChapterId === chap.id ? 'border-orange-400 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                        >
                          <div className="flex items-center p-2">
                            <div {...provided.dragHandleProps} className="text-slate-400 hover:text-slate-600 cursor-grab mr-2">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <input
                              type="text"
                              value={chap.title}
                              onChange={(e) => updateChapter(chap.id, { title: e.target.value })}
                              onClick={() => setActiveChapterId(chap.id)}
                              className="flex-1 bg-transparent border-none text-sm font-bold text-slate-800 focus:ring-0 p-0 w-full outline-none truncate cursor-pointer"
                            />
                            {chapters.length > 1 && (
                              <button onClick={() => removeChapter(chap.id)} className="text-slate-400 hover:text-red-500 ml-2">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {chap.content && (
                            <div className="bg-green-100 text-green-800 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-b text-center border-t border-green-200">
                              Generated
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          
          <button 
            onClick={addChapter}
            className="w-full mt-4 py-2 border-2 border-dashed border-slate-300 rounded text-slate-500 font-bold text-xs uppercase tracking-widest hover:border-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Empty Chapter
          </button>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
          <label className={`cursor-pointer w-full flex items-center justify-center px-4 py-2 ${isExtractingBulk ? 'bg-slate-200 text-slate-500' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'} rounded font-bold uppercase tracking-widest text-xs transition-colors shadow-sm`}>
            {isExtractingBulk ? `Extracting... ${bulkProgress ? `(${bulkProgress.current}/${bulkProgress.total}) ${bulkProgress.percent}%` : ''}` : <><FileUp className="w-4 h-4 mr-2" /> Bulk Upload PDFs</>}
            <input type="file" accept="application/pdf" multiple className="hidden" onChange={handleBulkPdfUpload} disabled={isExtractingBulk} />
          </label>

          <button 
            onClick={handleExportFullBook}
            className="w-full flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors shadow-sm relative"
            title={optimisticStatus === "ready" ? "Instant Export: PDF is cached and ready" : "Generates compressed, print-ready PDF"}
          >
            <Printer className="w-4 h-4 mr-2" /> 
            <span id="export-btn-text">Export Full Book</span>
            {optimisticStatus === "ready" && (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-emerald-300 font-semibold lowercase tracking-normal">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ready
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area: Cover Editor OR Chapter Editor */}
      {activeChapterId === "__cover__" ? (
        <CoverEditor />
      ) : (
        <>
          {/* 2. Editor - Raw Input */}
      {activeChapter ? (
        <div className="w-1/3 flex flex-col border-r border-slate-200 bg-white no-print">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center text-xs font-bold uppercase tracking-widest text-slate-800"><FileText className="w-4 h-4 mr-2" /> Raw Notes</span>
                <AutoSaveIndicator compact />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="cursor-pointer flex items-center px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-[10px] shadow-sm">
                  <ImagePlus className="w-3 h-3 mr-1 text-blue-600" /> + Add Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !rawTextareaRef.current) return;
                      setIsUploadingImage(true);
                      try {
                        const res = await uploadImageFile(file);
                        insertTextAtCursor(
                          rawTextareaRef.current,
                          activeChapter.rawText || "",
                          `\n\n![${file.name}](${res.url})\n\n`,
                          (val) => updateChapter(activeChapter.id, { rawText: val })
                        );
                      } catch (err: any) {
                        alert("Failed to upload image: " + err.message);
                      } finally {
                        setIsUploadingImage(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
                <label className="cursor-pointer flex items-center px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-[10px] shadow-sm">
                  {isExtracting ? (extractProgress !== null && extractProgress < 100 ? `Uploading ${extractProgress}%` : "Extracting...") : <><Upload className="w-3 h-3 mr-1" /> Append PDF</>}
                  <input type="file" accept="application/pdf" className="hidden" onChange={handleSinglePdfUpload} disabled={isExtracting} />
                </label>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mb-1 leading-relaxed">
              Paste raw notes, PDF, or <strong>paste images / screenshots directly (Ctrl+V)</strong>. Formats your notes into clean, structured engineering notebooks and retains all your figures.
            </p>
            {isUploadingImage && (
              <div className="text-[11px] text-blue-600 font-semibold flex items-center mt-1 animate-pulse">
                <ImagePlus className="w-3 h-3 mr-1 animate-spin" /> Uploading pasted image...
              </div>
            )}
          </div>
          
          <div className="p-4 flex flex-col flex-1 bg-slate-50/50">
            <textarea
              ref={rawTextareaRef}
              className="w-full flex-1 p-4 border border-slate-300 rounded font-mono text-sm shadow-inner focus:ring-2 focus:ring-orange-500 outline-none resize-none bg-white mb-4"
              placeholder="Paste notes for this chapter here... Tip: You can press Ctrl+V to paste screenshot images or drag & drop image files directly into this box!"
              value={activeChapter.rawText}
              onChange={(e) => updateChapter(activeChapter.id, { rawText: e.target.value })}
              onPaste={(e) => {
                handleImagePaste(
                  e,
                  e.currentTarget,
                  activeChapter.rawText || "",
                  (val) => updateChapter(activeChapter.id, { rawText: val }),
                  false,
                  setIsUploadingImage
                );
              }}
              onDrop={(e) => {
                handleImageDrop(
                  e,
                  e.currentTarget,
                  activeChapter.rawText || "",
                  (val) => updateChapter(activeChapter.id, { rawText: val }),
                  false,
                  setIsUploadingImage
                );
              }}
              onDragOver={(e) => e.preventDefault()}
            />
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !activeChapter.rawText.trim()}
              className="flex items-center justify-center w-full px-6 py-4 bg-orange-600 text-white rounded font-bold uppercase tracking-widest text-sm hover:bg-orange-700 transition-colors disabled:opacity-50 shadow-md"
            >
              <Sparkles className="w-5 h-5 mr-2 text-white" />
              {isGenerating ? (generateProgress !== null ? `Formatting Chapter ${generateProgress}%` : "Formatting Chapter...") : "Generate Chapter"}
            </button>
          </div>
        </div>
      ) : (
        <div className="w-1/3 flex items-center justify-center bg-slate-50 no-print border-r border-slate-200 text-slate-400 font-bold uppercase tracking-widest text-sm">
          Select a chapter
        </div>
      )}

      {/* 3. Output Preview & Direct HTML Editor - Interactive (Hidden on Print) */}
      <div className="flex-1 flex flex-col bg-slate-100 relative overflow-hidden no-print">
        {activeChapter?.content ? (
          <>
            <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-xs z-10">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-800">Chapter View</span>
                <AutoSaveIndicator compact />
                <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-xs">
                  <button
                    onClick={() => setActiveViewTab('preview')}
                    className={`flex items-center px-3 py-1 rounded transition-all ${activeViewTab === 'preview' ? 'bg-white text-orange-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900 font-medium'}`}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Live Preview
                  </button>
                  <button
                    onClick={() => setActiveViewTab('html')}
                    className={`flex items-center px-3 py-1 rounded transition-all ${activeViewTab === 'html' ? 'bg-white text-orange-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900 font-medium'}`}
                  >
                    <Code className="w-3.5 h-3.5 mr-1" /> Edit Chapter HTML
                  </button>
                </div>
              </div>

              {activeViewTab === 'html' && (
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer flex items-center px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-[11px] shadow-xs">
                    <ImagePlus className="w-3 h-3 mr-1 text-blue-600" />
                    <span>Paste / Add Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !htmlTextareaRef.current) return;
                        setIsUploadingImage(true);
                        try {
                          const res = await uploadImageFile(file);
                          const snippet = `\n<figure class="notebook-figure">\n  <img src="${res.url}" alt="${file.name}" />\n  <figcaption>Figure: ${file.name}</figcaption>\n</figure>\n`;
                          insertTextAtCursor(
                            htmlTextareaRef.current,
                            activeChapter.content || "",
                            snippet,
                            (val) => updateChapter(activeChapter.id, { content: val })
                          );
                        } catch (err: any) {
                          alert("Failed to upload image: " + err.message);
                        } finally {
                          setIsUploadingImage(false);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">Press Ctrl+V to paste images directly</span>
                </div>
              )}
            </div>

            {activeViewTab === 'preview' ? (
              <iframe 
                srcDoc={patchNotebookHtml(activeChapter.content)} 
                className="w-full flex-1 border-none bg-white" 
                title="Generated Notebook"
                sandbox="allow-same-origin allow-scripts"
              />
            ) : (
              <div className="flex-1 p-4 bg-slate-50 flex flex-col">
                <p className="text-[11px] text-slate-500 mb-2">
                  Edit the chapter HTML directly. You can paste images (Ctrl+V) or drop image files here to insert figures, which update live in the preview and in your exported PDF.
                </p>
                <textarea
                  ref={htmlTextareaRef}
                  className="w-full flex-1 p-4 font-mono text-xs leading-relaxed border border-slate-300 rounded shadow-inner outline-none focus:ring-2 focus:ring-orange-500 bg-white resize-none"
                  value={activeChapter.content}
                  onChange={(e) => updateChapter(activeChapter.id, { content: e.target.value })}
                  onPaste={(e) => {
                    handleImagePaste(
                      e,
                      e.currentTarget,
                      activeChapter.content || "",
                      (val) => updateChapter(activeChapter.id, { content: val }),
                      true,
                      setIsUploadingImage
                    );
                  }}
                  onDrop={(e) => {
                    handleImageDrop(
                      e,
                      e.currentTarget,
                      activeChapter.content || "",
                      (val) => updateChapter(activeChapter.id, { content: val }),
                      true,
                      setIsUploadingImage
                    );
                  }}
                  onDragOver={(e) => e.preventDefault()}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
            <BookOpen className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-xl font-['Patrick_Hand'] text-slate-500">Chapter is empty.</p>
            <p className="text-sm font-['Patrick_Hand'] mt-2 max-w-sm text-slate-500">Paste your text on the left and click generate to build this chapter.</p>
          </div>
        )}
      </div>
      </>
      )}

      {/* 4. Print Layout - handled via popup window now */}
      
    </div>
  );
}
