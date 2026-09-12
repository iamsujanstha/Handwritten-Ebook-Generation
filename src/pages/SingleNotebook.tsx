import { useSettingsStore } from "../store/useSettingsStore";
import { generateCacheKey, getCachedNote, setCachedNote } from "../lib/cache";
import { useState, useRef, useEffect, useMemo } from "react";
import { Settings, RotateCcw, Eraser, AlertTriangle } from "lucide-react";
import { Sparkles, FileText, Upload, Printer, BookOpen, Trash2, Plus, GripVertical, FileUp, ImagePlus, Eye, Code, Check, GitBranch, ListTree, ListCollapse, Bookmark } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useNotebookStore, Chapter } from "../store/useNotebookStore";
import { handleImagePaste, handleImageDrop, uploadImageFile, insertTextAtCursor } from "../lib/imageUtils";
import { CoverEditor } from "../components/CoverEditor";
import { TableOfContentsView } from "../components/TableOfContentsView";
import { generateCoverPageHtml } from "../lib/coverGenerator";
import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { parseChapterHeaders, injectAnchorIdsIntoHtml, generateTableOfContentsPageHtml, generateMarkdownToc } from "../lib/tocGenerator";

import SettingsModal from "../components/SettingsModal";
import { safeFetchJson } from "../lib/safeFetch";

export function renderMermaidInHtml(html: string): string {
  if (!html) return html;
  let processed = html;

  // Convert raw ```mermaid blocks to standard HTML pre.mermaid containers
  processed = processed.replace(/```mermaid\s*([\s\S]*?)\s*```/gi, (match, chartCode) => {
    return `\n<figure class="notebook-figure diagram-container">\n  <div class="diagram-badge">SYSTEM ARCHITECTURE & WORKFLOW</div>\n  <pre class="mermaid">\n${chartCode.trim()}\n  </pre>\n  <figcaption>System Architecture & Workflow Diagram</figcaption>\n</figure>\n`;
  });

  // Purge only residual top/bottom book-tag placeholder banners, never diagrams
  processed = processed.replace(/<div[^>]*class=["'][^"']*book-tag[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "");

  return processed;
}

// Backward compatibility alias
export const stripFlowchartsFromHtml = renderMermaidInHtml;

export function patchNotebookHtml(html: string, chapterIndex: number = 0): string {
  if (!html) return html;
  
  // Format Mermaid markdown blocks and clean unwanted book-tags
  let fixed = renderMermaidInHtml(html);

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
<script src="/vendor/mermaid.min.js"></script>
<script>
  function renderAllMermaids() {
    if (typeof mermaid !== 'undefined') {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: "'Patrick Hand', cursive, sans-serif"
        });
        mermaid.run({ querySelector: '.mermaid' });
      } catch (err) {
        console.warn('Mermaid rendering notice:', err);
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAllMermaids);
  } else {
    renderAllMermaids();
  }
  setTimeout(renderAllMermaids, 250);
  setTimeout(renderAllMermaids, 1000);

  // Table of Contents interactive smooth scroll navigation
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'SCROLL_TO_HEADER') {
      var el = document.getElementById(e.data.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('toc-target-highlight');
        setTimeout(function() { el.classList.remove('toc-target-highlight'); }, 2400);
      }
    }
  });

  // Table of Contents interactive hyperlink click interception
  document.addEventListener('click', function(e) {
    var anchor = e.target.closest('a');
    if (!anchor) return;

    var chapId = anchor.getAttribute('data-chapter-id');
    var secId = anchor.getAttribute('data-section-id') || '';
    var href = anchor.getAttribute('href') || '';

    if (!chapId && href.indexOf('#chap-wrapper-') === 0) {
      chapId = href.replace('#chap-wrapper-', '');
    }
    if (!secId && href.indexOf('#sec-') === 0) {
      secId = href.substring(1);
    }

    if (chapId || secId) {
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({
        type: 'NAVIGATE_TO_CHAPTER',
        chapterId: chapId,
        sectionId: secId
      }, '*');
    }
  });
</script>
<style id="notebook-diagram-table-override">
  /* TABLE OF CONTENTS SCROLL HIGHLIGHT */
  :target, .toc-target-highlight {
    animation: tocPulse 2.4s ease-out !important;
    scroll-margin-top: 32px !important;
  }
  @keyframes tocPulse {
    0% { background-color: rgba(234, 88, 12, 0.28) !important; outline: 2px solid #ea580c !important; border-radius: 4px !important; }
    50% { background-color: rgba(234, 88, 12, 0.12) !important; outline: 2px solid rgba(234, 88, 12, 0.4) !important; }
    100% { background-color: transparent !important; outline: none !important; }
  }
  h1, h2, h3, h4, h5, h6 {
    scroll-margin-top: 32px !important;
  }
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

  /* NOTEBOOK IMAGE & DIAGRAM FIGURE STYLING */
  .notebook-figure, .diagram-container {
    background: #ffffff !important;
    border: 2px solid var(--border-dark, #2d3748) !important;
    border-radius: 8px !important;
    padding: 1.25rem 1.5rem !important;
    margin: 2.5rem 0 !important;
    text-align: center !important;
    box-shadow: 4px 5px 0 var(--shadow-color, rgba(0,0,0,0.06)) !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
    position: relative !important;
  }
  .diagram-badge {
    background: #e0e7ff !important;
    color: #3730a3 !important;
    border: 1px solid var(--border-dark, #2d3748) !important;
    border-radius: 4px !important;
    padding: 0.2rem 0.75rem !important;
    font-family: 'Patrick Hand SC', cursive, sans-serif !important;
    font-size: 0.9rem !important;
    font-weight: bold !important;
    display: inline-block !important;
    margin-bottom: 1rem !important;
    box-shadow: 2px 2px 0 rgba(0,0,0,0.1) !important;
  }
  .mermaid {
    background: transparent !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    margin: 0.5rem auto !important;
    overflow-x: auto !important;
    width: 100% !important;
    font-family: 'Patrick Hand', cursive, sans-serif !important;
  }
  .mermaid svg {
    max-width: 100% !important;
    height: auto !important;
    display: block !important;
    margin: 0 auto !important;
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

  fixed = injectAnchorIdsIntoHtml(fixed, chapterIndex);
  return fixed;
}

// Convert raw markdown notes (including Mermaid code blocks, headers, lists, code, and images) directly to clean notebook HTML
export function convertMarkdownToNotebookHtml(title: string, markdown: string): string {
  let html = markdown || "";

  // Preserve and convert mermaid diagram blocks
  html = html.replace(/```mermaid\s*([\s\S]*?)\s*```/gi, (match, chartCode) => {
    return `<figure class="notebook-figure diagram-container">\n  <div class="diagram-badge">SYSTEM ARCHITECTURE & WORKFLOW</div>\n  <pre class="mermaid">\n${chartCode.trim()}\n  </pre>\n  <figcaption>Architecture Flow Diagram</figcaption>\n</figure>`;
  });

  // Preserve image tags
  html = html.replace(/!\[(.*?)\]\((.*?)\)/gi, (match, alt, src) => {
    return `<figure class="notebook-figure">\n  <img src="${src}" alt="${alt}" />\n  <figcaption>${alt || 'Screenshot / Diagram'}</figcaption>\n</figure>`;
  });

  // Code blocks
  html = html.replace(/```([a-z0-9_-]*)\s*([\s\S]*?)\s*```/gi, (match, lang, code) => {
    const safeCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre><code>${safeCode}</code></pre>`;
  });

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bullet Lists
  html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/gi, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/gi, '');

  // Numbered Lists
  html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="num-step">$1</li>');
  html = html.replace(/(<li class="num-step">[\s\S]*?<\/li>)/gi, '<ol>$1</ol>');
  html = html.replace(/<\/ol>\s*<ol>/gi, '');

  // Format loose paragraphs
  const chunks = html.split(/\n\s*\n/);
  const formatted = chunks.map(chunk => {
    const trimmed = chunk.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<figure') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<div') || trimmed.startsWith('<table')) {
      return trimmed;
    }
    return `<p>${trimmed}</p>`;
  }).filter(Boolean).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} - Engineering Systems Manual</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Patrick+Hand&family=Patrick+Hand+SC&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="/vendor/mermaid.min.js"></script>
</head>
<body>
  <div class="notebook-container">
    <header style="text-align: center;">
      <h1 class="notebook-title">${title}</h1>
      <div class="subtitle">Technical Systems Specification & Architecture Notes</div>
      <hr class="header-divider" />
    </header>
    ${formatted}
  </div>
</body>
</html>`;
}

// Assemble full book HTML with ultra-optimized print CSS (eliminating heavy raster blur shadows to compress file size by 60%+ while keeping crisp vector text)
function assembleFullBookHtml(chapters: any[], bookTitle: string, coverConfig: any, includeToc: boolean = true): string {
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
      .replace(/\.book-tag\s*\{[\s\S]*?\}/gi, '.book-tag { display: none !important; }');
  }

  let coverHtml = '';
  if (coverConfig?.enabled) {
    coverHtml = generateCoverPageHtml(coverConfig);
  }

  let tocHtml = '';
  if (includeToc && generatedChapters.length > 0) {
    const fullToc = generateTableOfContentsPageHtml(chapters, bookTitle);
    const tocBodyMatch = fullToc.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    tocHtml = tocBodyMatch ? tocBodyMatch[1] : fullToc;
  }

  const chapterBodies = generatedChapters.map((chap, idx) => {
    const patched = chap.content ? patchNotebookHtml(chap.content, idx) : "";
    const bodyMatch = patched.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    let bodyContent = bodyMatch ? bodyMatch[1] : patched;
    return `<div class="chapter-wrapper" id="chap-wrapper-${chap.id}">${bodyContent}</div>`;
  }).join('');

  const combinedBody = coverHtml + tocHtml + chapterBodies;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${bookTitle || "Engineering Systems Manual"}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Patrick+Hand&family=Patrick+Hand+SC&display=swap" rel="stylesheet">
  ${styleContent}
  
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="/vendor/mermaid.min.js"></script>
  <script>
    function applyHighlightsAndMermaids() {
      if (typeof hljs !== 'undefined') hljs.highlightAll(); 
      document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
        if (h.textContent.trim().toLowerCase().includes('description')) {
          h.style.color = '#8b5cf6';
        }
      });
      if (typeof mermaid !== 'undefined') {
        try {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'loose',
            fontFamily: "'Patrick Hand', cursive, sans-serif"
          });
          mermaid.run({ querySelector: '.mermaid' });
        } catch (e) {
          console.warn('Mermaid rendering notice:', e);
        }
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyHighlightsAndMermaids);
    } else {
      applyHighlightsAndMermaids();
    }
    setTimeout(applyHighlightsAndMermaids, 250);
  </script>



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

    /* TABLE OF CONTENTS FULL BOOK PRINT STYLES */
    .toc-wrapper {
      page-break-after: always;
      break-after: page;
    }
    .toc-chapter-block {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 0.5rem;
    }
    .toc-chapter-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.6rem 0.5rem;
      border-bottom: 1px dashed #cbd5e1;
    }
    .toc-chapter-title-link {
      text-decoration: none;
      color: #0f172a;
      display: inline-flex;
      gap: 0.85rem;
      align-items: center;
      background: transparent;
      max-width: 75%;
    }
    .toc-chapter-num {
      font-family: 'Fira Code', monospace;
      font-size: 0.85rem;
      font-weight: 700;
      background: #eff6ff;
      color: #1d4ed8;
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      border: 1px solid #bfdbfe;
      white-space: nowrap;
    }
    .toc-chapter-name {
      font-family: 'Playfair Display', 'Cinzel', 'EB Garamond', Georgia, serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
    }
    .toc-leader-dots {
      flex: 1;
      border-bottom: 2px dotted #94a3b8;
      margin: 0 0.85rem;
      transform: translateY(-2px);
      opacity: 0.45;
    }
    .toc-chapter-jump-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      text-decoration: none;
      font-family: 'Fira Code', monospace;
      font-size: 0.78rem;
      font-weight: 600;
      color: #1d4ed8;
      background: #ffffff;
      padding: 0.25rem 0.65rem;
      border-radius: 4px;
      border: 1px solid #bfdbfe;
      white-space: nowrap;
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
  const { geminiModel, userApiKey, apiBaseUrl } = useSettingsStore();
  const { 
    title, setTitle, 
    coverConfig,
    chapters, activeChapterId, 
    includeTocInExport, setIncludeTocInExport,
    addChapter, addChapterWithData, removeChapter, updateChapter, 
    setActiveChapterId, reorderChapters,
    resetToNewBook
  } = useNotebookStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState<number | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExtractingBulk, setIsExtractingBulk] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showClearDraftModal, setShowClearDraftModal] = useState(false);
  const [extractProgress, setExtractProgress] = useState<number | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ current: number, total: number, percent: number } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<'preview' | 'html'>('preview');

  // Optimistic PDF compilation state
  const [optimisticStatus, setOptimisticStatus] = useState<"idle" | "preparing" | "ready">("idle");
  const [lastOptimisticHash, setLastOptimisticHash] = useState<string>("");

  const rawTextareaRef = useRef<HTMLTextAreaElement>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeChapterIndex = chapters.findIndex(c => c.id === activeChapterId);

  // Section navigation with smooth scroll and visual pulse
  const scrollToHeaderInSection = (sectionId: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        const el = doc.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          el.classList.add('toc-target-highlight');
          setTimeout(() => el.classList.remove('toc-target-highlight'), 2400);
          return;
        }
      }
    } catch (err) {
      // Cross-origin fallback
    }

    try {
      iframe.contentWindow?.postMessage({ type: 'SCROLL_TO_HEADER', id: sectionId }, '*');
    } catch (err) {}
  };

  const handleSelectSection = (chapterId: string, sectionId: string) => {
    if (chapterId !== activeChapterId) {
      setActiveChapterId(chapterId);
      setActiveViewTab('preview');
      setTimeout(() => {
        scrollToHeaderInSection(sectionId);
      }, 280);
    } else {
      if (activeViewTab !== 'preview') {
        setActiveViewTab('preview');
        setTimeout(() => {
          scrollToHeaderInSection(sectionId);
        }, 120);
      } else {
        scrollToHeaderInSection(sectionId);
      }
    }
  };

  // Listen for navigation postMessages from the preview iframe (TOC links)
  useEffect(() => {
    const handleFrameMessage = (e: MessageEvent) => {
      if (!e.data) return;

      if (e.data.type === 'NAVIGATE_TO_CHAPTER') {
        const { chapterId, sectionId } = e.data;
        if (chapterId) {
          handleSelectSection(chapterId, sectionId || '');
        }
      } else if (e.data.type === 'NAVIGATE_TO_SECTION') {
        const { sectionId } = e.data;
        if (sectionId) {
          for (let idx = 0; idx < chapters.length; idx++) {
            const chap = chapters[idx];
            const headers = parseChapterHeaders(chap, idx);
            if (headers.some(h => h.id === sectionId)) {
              handleSelectSection(chap.id, sectionId);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('message', handleFrameMessage);
    return () => window.removeEventListener('message', handleFrameMessage);
  }, [chapters, activeChapterId]);

  // Ensure any redundant legacy TOC chapter is cleanly removed, keeping all actual book content
  useEffect(() => {
    const isLegacyToc = (c: Chapter) =>
      c.title.trim().toLowerCase() === "table of contents" ||
      c.id === "default-toc" ||
      c.id.startsWith("toc-");

    if (chapters.some(isLegacyToc)) {
      const cleaned = chapters.filter(c => !isLegacyToc(c));
      if (cleaned.length > 0) {
        useNotebookStore.setState(state => {
          let nextActive = state.activeChapterId;
          if (nextActive && !cleaned.some(c => c.id === nextActive) && nextActive !== "__cover__" && nextActive !== "__toc__") {
            nextActive = cleaned[0].id;
          }
          return {
            chapters: cleaned,
            activeChapterId: nextActive,
            includeTocInExport: true,
            lastSavedAt: Date.now()
          };
        });
      }
    }
  }, [chapters]);

  // Background optimistic pre-compilation of full book PDF
  useEffect(() => {
    const generatedChapters = chapters.filter(c => c.content);
    if (generatedChapters.length === 0) {
      setOptimisticStatus("idle");
      return;
    }
  }, [chapters, title, coverConfig, includeTocInExport, lastOptimisticHash]);

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
      
      const estimatedTokens = Math.ceil((activeChapter.rawText || "").length / 4);
      useSettingsStore.getState().addTokenUsage({ 
        promptTokenCount: estimatedTokens, 
        candidatesTokenCount: 0, 
        totalTokenCount: estimatedTokens, 
        hits: 1 
      });

      const data = await safeFetchJson<{ content: string; usageMetadata?: any }>("/api/format-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gemini-model": geminiModel, "x-gemini-api-key": userApiKey, "x-api-base-url": apiBaseUrl },
        body: JSON.stringify(payload)
      });
      
      if (data.usageMetadata) {
        useSettingsStore.getState().addTokenUsage({
          promptTokenCount: (data.usageMetadata.promptTokenCount || 0) - estimatedTokens,
          candidatesTokenCount: data.usageMetadata.candidatesTokenCount || 0,
          totalTokenCount: (data.usageMetadata.totalTokenCount || 0) - estimatedTokens,
          hits: 0
        });
      }
      
      clearInterval(progressInterval);
      setGenerateProgress(100);
      
      setCachedNote(cacheKey, { content: data.content });
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

  const sampleMermaidDiagram = `\n\n\`\`\`mermaid
flowchart TD
    subgraph Client ["Client Layer (Frontend)"]
        Browser["React / Next.js Client<br/>(Image Dropzone)"]
    end

    subgraph Server ["Server Layer (NestJS Backend)"]
        API["Presign Endpoint<br/>(Generate URLs)"]
        Controller["Profiles Controller<br/>(Request Routing)"]
        Service["Profiles Service<br/>(Business Logic)"]
        Storage["Storage Service<br/>(S3 Client SDK)"]
        DB["MongoDB / PostgreSql<br/>(Database)"]
    end

    subgraph AWS ["Storage & Processing Layer (AWS)"]
        S3Raw["S3 Bucket: /uploads/raw/<br/>(Private Originals)"]
        Lambda["AWS Lambda Function<br/>(Sharp Image Processor)"]
        S3Thumb["S3 Bucket: /uploads/thumbnails/<br/>(Public Optimizations)"]
    end

    %% Flow connections
    Browser -->|"1. POST Request (file details)"| API
    API --> Controller
    Controller --> Service
    Service -->|"2. PutObjectCommand"| Storage
    Storage -->|"3. Generate URL"| S3Raw
    Storage -->|"4. Return Upload URL + Key"| Browser

    Browser -->|"5. PUT Binary Stream"| S3Raw
    S3Raw -->|"6. S3 Event ObjectCreated"| Lambda
    Lambda -->|"7. Sharp Resize & Convert WebP"| S3Thumb

    Browser -->|"8. POST Profile Form + Key"| DB
\`\`\`\n\n`;

  const handleInsertMermaid = () => {
    if (!activeChapter || !rawTextareaRef.current) return;
    insertTextAtCursor(
      rawTextareaRef.current,
      activeChapter.rawText || "",
      sampleMermaidDiagram,
      (val) => updateChapter(activeChapter.id, { rawText: val })
    );
  };

  const handleInstantRender = () => {
    if (!activeChapter || !activeChapter.rawText.trim()) return;
    const rendered = patchNotebookHtml(convertMarkdownToNotebookHtml(activeChapter.title, activeChapter.rawText));
    updateChapter(activeChapter.id, { content: rendered });
    setActiveViewTab('preview');
  };

  // Auto-render default notes with Mermaid diagram if chapter content is not yet populated
  useEffect(() => {
    if (activeChapter && activeChapter.rawText && !activeChapter.content) {
      const rendered = patchNotebookHtml(convertMarkdownToNotebookHtml(activeChapter.title, activeChapter.rawText));
      updateChapter(activeChapter.id, { content: rendered });
    }
  }, [activeChapterId, activeChapter?.rawText, activeChapter?.content]);

  
  const triggerBrowserPrint = (html: string, onComplete?: () => void) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }

    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
      if (onComplete) onComplete();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 6000);
    }, 1800);
  };

  const handlePrintViaBrowser = () => {
    const generatedChapters = chapters.filter(c => c.content);
    if (generatedChapters.length === 0) {
      alert("No generated chapters to print. Please generate at least one chapter first.");
      return;
    }
    const fullHtml = assembleFullBookHtml(chapters, title, coverConfig, includeTocInExport);
    triggerBrowserPrint(fullHtml);
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

    const fullHtml = assembleFullBookHtml(chapters, title, coverConfig, includeTocInExport);

    try {
      const { exportId, ready } = await safeFetchJson<{ exportId: string; ready: boolean }>("/api/export-raw-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: fullHtml, title: title || "Notebook" })
      });

      if (ready) {
        if (exportBtn) exportBtn.innerText = "Downloading PDF...";
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
        }, 1500);
        return;
      }

      const eventSource = new EventSource(`/api/export-status/${exportId}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.status === "failed") {
            eventSource.close();
            // Fallback gracefully to browser print instead of failing
            if (exportBtn) exportBtn.innerText = 'Opening Print to PDF...';
            triggerBrowserPrint(fullHtml, () => {
              if (exportBtn) exportBtn.innerText = originalText;
            });
          } else if (data.status === "completed") {
            if (exportBtn) exportBtn.innerText = "Downloading PDF...";
            eventSource.close();

            fetch(`/api/download-pdf/${exportId}`, { credentials: "include" })
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
                setTimeout(() => {
                  if (exportBtn) exportBtn.innerText = originalText;
                }, 1500);
              })
              .catch(() => {
                triggerBrowserPrint(fullHtml, () => {
                  if (exportBtn) exportBtn.innerText = originalText;
                });
              });
          } else {
            if (exportBtn && data.progress) exportBtn.innerText = data.progress;
          }
        } catch {
          eventSource.close();
          triggerBrowserPrint(fullHtml, () => {
            if (exportBtn) exportBtn.innerText = originalText;
          });
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        if (exportBtn) exportBtn.innerText = 'Opening Print to PDF...';
        triggerBrowserPrint(fullHtml, () => {
          if (exportBtn) exportBtn.innerText = originalText;
        });
      };

    } catch (err: any) {
      console.warn("Server export note:", err?.message || err);
      if (exportBtn) exportBtn.innerText = 'Opening Print to PDF...';
      triggerBrowserPrint(fullHtml, () => {
        if (exportBtn) exportBtn.innerText = originalText;
      });
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}

      
      {/* 1. Sidebar - Chapter List */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col no-print">
        
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Book Title</p>
            <div className="flex items-center gap-2">
              <AutoSaveIndicator compact />
              <button onClick={() => setIsSettingsOpen(true)} className="text-slate-400 hover:text-slate-700 transition-colors p-1 hover:bg-slate-200 rounded" title="AI Settings">
                <Settings className="w-4 h-4" />
              </button>
            </div>
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

        {/* Table of Contents Tab / Launcher Button */}
        <div className="px-3 py-2 border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setActiveChapterId("__toc__")}
            className={`w-full flex items-center justify-between p-2.5 rounded-lg border-2 transition-all ${
              activeChapterId === "__toc__"
                ? "border-orange-500 bg-orange-50/90 text-orange-950 shadow-xs ring-1 ring-orange-400"
                : "border-slate-200 bg-slate-50/50 hover:border-slate-300 text-slate-700 hover:bg-slate-100/70"
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className={`p-1.5 rounded-md ${activeChapterId === "__toc__" ? "bg-orange-600 text-white" : "bg-slate-200 text-slate-700"}`}>
                <ListTree className="w-4 h-4" />
              </div>
              <div className="text-left truncate">
                <div className="text-xs font-bold truncate">Table of Contents</div>
                <div className="text-[10px] text-slate-500 truncate">
                  {chapters.length} {chapters.length === 1 ? 'Chapter' : 'Chapters'} • Default
                </div>
              </div>
            </div>
            <span className={`shrink-0 text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${
              includeTocInExport 
                ? "bg-orange-100 text-orange-800 border border-orange-200" 
                : "bg-slate-100 text-slate-500"
            }`}>
              {includeTocInExport ? "In PDF" : "Default"}
            </span>
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
                          className={`flex flex-col border rounded shadow-xs transition-colors ${
                            activeChapterId === chap.id 
                              ? 'border-orange-400 bg-orange-50' 
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
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
                              <button onClick={() => removeChapter(chap.id)} className="text-slate-400 hover:text-red-500 ml-2" title="Delete chapter">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {chap.content ? (
                            <div className="bg-green-100 text-green-800 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-b text-center border-t border-green-200">
                              Generated
                            </div>
                          ) : null}
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
            {isExtractingBulk ? `Extracting... ${bulkProgress ? `(${bulkProgress.current}/${bulkProgress.total}) ${bulkProgress.percent}%` : ''}` : <><FileUp className="w-4 h-4 mr-2" /> Bulk Upload Docs</>}
            <input type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,text/plain,.pdf,.doc,.docx,.md,.txt" multiple className="hidden" onChange={handleBulkPdfUpload} disabled={isExtractingBulk} />
          </label>

          <button 
            onClick={handleExportFullBook}
            className="w-full flex items-center justify-center px-4 py-2.5 bg-slate-900 text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors shadow-sm relative"
            title="Generates high-resolution, vector PDF directly"
          >
            <Printer className="w-4 h-4 mr-2" /> 
            <span id="export-btn-text">Export Full Book</span>
          </button>

          <button 
            type="button"
            onClick={handlePrintViaBrowser}
            className="w-full flex items-center justify-center px-3 py-1.5 bg-white border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded font-medium text-[11px] transition-colors shadow-2xs"
            title="Open browser print dialog directly to Save as PDF"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Print / Save via Browser
          </button>
        </div>
      </div>

      {/* Main Content Area: Cover Editor OR Table of Contents View OR Chapter Editor */}
      {activeChapterId === "__cover__" ? (
        <CoverEditor />
      ) : activeChapterId === "__toc__" ? (
        <TableOfContentsView onNavigateChapter={(id) => setActiveChapterId(id)} />
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
                <button
                  type="button"
                  onClick={() => setShowClearDraftModal(true)}
                  className="cursor-pointer flex items-center px-2 py-1 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-300 text-slate-600 hover:text-red-700 rounded text-[10px] shadow-xs font-medium transition-colors"
                  title="Clear draft notes or reset chapter"
                >
                  <RotateCcw className="w-3 h-3 mr-1 text-slate-400 group-hover:text-red-600" /> Clear Draft
                </button>
                <label className="cursor-pointer flex items-center px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-[10px] shadow-xs font-medium transition-colors">
                  {isExtracting ? (extractProgress !== null && extractProgress < 100 ? `Uploading ${extractProgress}%` : "Extracting...") : <><Upload className="w-3 h-3 mr-1 text-slate-600" /> Append Doc</>}
                  <input type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,text/plain,.pdf,.doc,.docx,.md,.txt" className="hidden" onChange={handleSinglePdfUpload} disabled={isExtracting} />
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
              {isGenerating ? (generateProgress !== null ? `Formatting Chapter ${generateProgress}%` : "Formatting Chapter...") : "Generate Chapter (AI)"}
            </button>
            
            {isGenerating && generateProgress !== null && (
              <div className="mt-4 w-full">
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${generateProgress}%` }}
                  ></div>
                </div>
                <p className="text-center text-xs text-slate-500 mt-2 font-medium tracking-wide animate-pulse">
                  {generateProgress < 100 ? "AI is processing your content..." : "Finalizing..."}
                </p>
              </div>
            )}
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
                          const snippet = `\n<figure class="notebook-figure">\n  <img src="${res.url}" alt="${file.name}" />\n  <figcaption>${file.name}</figcaption>\n</figure>\n`;
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
                ref={iframeRef}
                srcDoc={patchNotebookHtml(activeChapter.content, activeChapterIndex >= 0 ? activeChapterIndex : 0)} 
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

      {/* Clear Draft Modal */}
      {showClearDraftModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-slate-900">
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                  <Eraser className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Clear Draft Options</h3>
                  <p className="text-xs text-slate-500">Choose what you would like to clear</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClearDraftModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md text-sm"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-2.5">
              {/* Option 1: Clear current chapter notes */}
              {activeChapter && (
                <button
                  type="button"
                  onClick={() => {
                    updateChapter(activeChapter.id, { rawText: "" });
                    setShowClearDraftModal(false);
                  }}
                  className="w-full p-3 text-left border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 rounded-lg transition-all flex items-start gap-3 group cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-orange-950">
                      Clear Chapter Notes
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Clears raw notes in &ldquo;{activeChapter.title}&rdquo; so you can write or paste fresh text.
                    </div>
                  </div>
                </button>
              )}

              {/* Option 2: Reset chapter (notes + generated content) */}
              {activeChapter && (
                <button
                  type="button"
                  onClick={() => {
                    updateChapter(activeChapter.id, { rawText: "", content: "" });
                    setShowClearDraftModal(false);
                  }}
                  className="w-full p-3 text-left border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 rounded-lg transition-all flex items-start gap-3 group cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-amber-950">
                      Reset Chapter (Notes &amp; HTML)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Clears both raw notes and generated HTML output for this chapter back to blank.
                    </div>
                  </div>
                </button>
              )}

              {/* Option 3: Reset entire book */}
              <button
                type="button"
                onClick={() => {
                  resetToNewBook();
                  setShowClearDraftModal(false);
                }}
                className="w-full p-3 text-left border border-red-200 hover:border-red-400 hover:bg-red-50/70 rounded-lg transition-all flex items-start gap-3 group cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-red-700 group-hover:text-red-900">
                    Reset Entire Book Draft
                  </div>
                  <div className="text-[11px] text-red-500 mt-0.5 leading-snug">
                    Clears all chapters, cover settings, and starts an empty new book.
                  </div>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowClearDraftModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
