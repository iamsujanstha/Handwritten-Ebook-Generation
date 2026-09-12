import { Chapter } from "../store/useNotebookStore";

export interface TocItem {
  id: string;
  title: string;
  level: number; // 1 = H1, 2 = H2, 3 = H3, 4 = H4
  chapterId: string;
  chapterIndex: number;
  chapterTitle: string;
}

export interface ChapterTocGroup {
  chapterId: string;
  chapterIndex: number;
  chapterTitle: string;
  items: TocItem[];
}

export interface ChapterTocEntry {
  chapterId: string;
  chapterIndex: number;
  chapterNumber: number;
  title: string;
  numberLabel: string;
  cleanTitle: string;
  wordCount: number;
  hasContent: boolean;
}

/**
 * Extracts clean chapter number label and title from raw chapter names
 */
export function extractChapterDisplayInfo(title: string, index: number): { numberLabel: string; cleanTitle: string } {
  const trimmed = (title || '').trim();
  const match = trimmed.match(/^(?:chapter|ch\.?)\s*(\d+)[\s:.-]+(.*)$/i);
  if (match) {
    const num = match[1];
    const rest = match[2].trim();
    return {
      numberLabel: `CHAPTER ${num}`,
      cleanTitle: rest || trimmed
    };
  }

  // Check for common non-numbered sections (Preface, Introduction, Epilogue, etc.)
  const specialMatch = trimmed.match(/^(appendix|forward|foreword|preface|afterword|epilogue|prologue|introduction)[\s:.-]*(.*)$/i);
  if (specialMatch) {
    return {
      numberLabel: specialMatch[1].toUpperCase(),
      cleanTitle: specialMatch[2].trim() || specialMatch[1].toUpperCase()
    };
  }

  return {
    numberLabel: `CHAPTER ${index + 1}`,
    cleanTitle: trimmed || `Chapter ${index + 1}`
  };
}

/**
 * Creates a clean, URL-safe slug from any heading text
 */
export function slugifyHeader(text: string): string {
  const clean = text
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/&[a-z0-9#]+;/gi, '') // remove HTML entities
    .replace(/[`*_[\]()#]/g, '') // remove markdown syntax
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
  return clean || 'section';
}

/**
 * Strips HTML tags and entities to return pure plain text
 */
function cleanHeadingText(htmlOrMd: string): string {
  return htmlOrMd
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[`*_]/g, '')
    .trim();
}

/**
 * Parses all chapters into high-level TOC entries based on total chapters added
 */
export function parseEbookChaptersToc(chapters: Chapter[]): {
  entries: ChapterTocEntry[];
  totalChapters: number;
} {
  const entries: ChapterTocEntry[] = [];
  let contentCounter = 0;

  chapters.forEach((chap, idx) => {
    // Exclude the Table of Contents page itself from its own listing
    if (chap.title.toLowerCase().includes('table of contents')) return;

    contentCounter++;
    const { numberLabel, cleanTitle } = extractChapterDisplayInfo(chap.title, contentCounter - 1);

    const raw = chap.rawText || chap.content || '';
    const clean = raw.replace(/<[^>]*>/g, ' ').replace(/[#*_`]/g, ' ').trim();
    const wordCount = clean ? clean.split(/\s+/).filter(Boolean).length : 0;

    entries.push({
      chapterId: chap.id,
      chapterIndex: idx,
      chapterNumber: contentCounter,
      title: chap.title || `Chapter ${contentCounter}`,
      numberLabel,
      cleanTitle,
      wordCount,
      hasContent: Boolean(chap.content && chap.content.trim().length > 0)
    });
  });

  return {
    entries,
    totalChapters: entries.length
  };
}

/**
 * Parses all section headers from either HTML or Markdown content of a chapter
 */
export function parseChapterHeaders(chap: Chapter, chapterIndex: number): TocItem[] {
  const items: TocItem[] = [];
  const seenIds = new Set<string>();

  const getUniqueId = (baseSlug: string): string => {
    let id = `sec-c${chapterIndex + 1}-${baseSlug}`;
    let counter = 1;
    while (seenIds.has(id)) {
      id = `sec-c${chapterIndex + 1}-${baseSlug}-${counter}`;
      counter++;
    }
    seenIds.add(id);
    return id;
  };

  const html = chap.content || '';
  const markdown = chap.rawText || '';

  // If chapter content has HTML with headings, parse HTML headings first
  const htmlHeadingRegex = /<h([1-4])([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  let hasHtmlHeadings = false;

  if (html.includes('<h1') || html.includes('<h2') || html.includes('<h3') || html.includes('<h4')) {
    while ((match = htmlHeadingRegex.exec(html)) !== null) {
      const level = parseInt(match[1], 10);
      const attrs = match[2] || '';
      const innerHtml = match[3] || '';
      const title = cleanHeadingText(innerHtml);
      if (!title) continue;

      const idAttrMatch = attrs.match(/id=["']([^"']+)["']/i);
      const baseSlug = slugifyHeader(title);
      const id = idAttrMatch ? idAttrMatch[1] : getUniqueId(baseSlug);

      items.push({
        id,
        title,
        level,
        chapterId: chap.id,
        chapterIndex,
        chapterTitle: chap.title || `Chapter ${chapterIndex + 1}`
      });
      hasHtmlHeadings = true;
    }
  }

  // Fallback to markdown parsing if no HTML headings were discovered
  if (!hasHtmlHeadings && markdown) {
    const mdLines = markdown.split('\n');
    let inCodeBlock = false;

    for (const line of mdLines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = cleanHeadingText(headingMatch[2]);
        if (!title) continue;

        const baseSlug = slugifyHeader(title);
        const id = getUniqueId(baseSlug);

        items.push({
          id,
          title,
          level,
          chapterId: chap.id,
          chapterIndex,
          chapterTitle: chap.title || `Chapter ${chapterIndex + 1}`
        });
      }
    }
  }

  return items;
}

/**
 * Parses the complete ebook content into hierarchical chapter groups
 */
export function parseEbookToc(chapters: Chapter[]): {
  groups: ChapterTocGroup[];
  allItems: TocItem[];
  totalSections: number;
  totalChapters: number;
  entries: ChapterTocEntry[];
} {
  const groups: ChapterTocGroup[] = [];
  const allItems: TocItem[] = [];
  const { entries, totalChapters } = parseEbookChaptersToc(chapters);

  chapters.forEach((chap, idx) => {
    // Skip dedicated TOC chapter if it already exists to prevent recursion
    if (chap.title.toLowerCase().includes('table of contents')) return;

    const items = parseChapterHeaders(chap, idx);
    groups.push({
      chapterId: chap.id,
      chapterIndex: idx,
      chapterTitle: chap.title || `Chapter ${idx + 1}`,
      items
    });
    allItems.push(...items);
  });

  return {
    groups,
    allItems,
    totalSections: allItems.length,
    totalChapters,
    entries
  };
}

/**
 * Ensures all headings (<h1..4>) in HTML have deterministic, matching anchor IDs
 */
export function injectAnchorIdsIntoHtml(html: string, chapterIndex: number): string {
  if (!html) return html;

  const seenIds = new Set<string>();

  return html.replace(/<h([1-4])([^>]*)>([\s\S]*?)<\/h\1>/gi, (fullMatch, level, attrs, inner) => {
    const title = cleanHeadingText(inner);
    const baseSlug = slugifyHeader(title);

    const idAttrMatch = (attrs || '').match(/id=["']([^"']+)["']/i);
    let id = idAttrMatch ? idAttrMatch[1] : '';

    if (!id) {
      let candidate = `sec-c${chapterIndex + 1}-${baseSlug}`;
      let counter = 1;
      while (seenIds.has(candidate)) {
        candidate = `sec-c${chapterIndex + 1}-${baseSlug}-${counter}`;
        counter++;
      }
      id = candidate;
      seenIds.add(id);

      return `<h${level} id="${id}" ${attrs}>${inner}</h${level}>`;
    } else {
      seenIds.add(id);
      return fullMatch;
    }
  });
}

/**
 * Generates a formal, print-ready Table of Contents page HTML based strictly on the total
 * chapters added to the book, with clickable hyperlinks directly redirecting to each chapter.
 */
export function generateTableOfContentsPageHtml(
  chapters: Chapter[],
  bookTitle: string = "Engineering Systems Manual"
): string {
  const { entries, totalChapters } = parseEbookChaptersToc(chapters);

  const chapterRowsHtml = entries.map((entry) => {
    const chapAnchor = `chap-anchor-${entry.chapterId}`;

    return `
      <div class="toc-chapter-block" id="${chapAnchor}">
        <div class="toc-chapter-row">
          <a href="#chap-wrapper-${entry.chapterId}" 
             class="toc-chapter-title-link" 
             data-chapter-id="${entry.chapterId}"
             title="Redirect to ${entry.title}">
            <span class="toc-chapter-num">${entry.numberLabel}</span>
            <span class="toc-chapter-name">${entry.cleanTitle}</span>
          </a>
          <span class="toc-leader-dots"></span>
          <a href="#chap-wrapper-${entry.chapterId}" 
             class="toc-chapter-jump-btn" 
             data-chapter-id="${entry.chapterId}"
             title="Jump to ${entry.numberLabel}">
            <span class="toc-jump-text">Go to Chapter</span>
            <span class="toc-jump-arrow">➔</span>
          </a>
        </div>
      </div>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Table of Contents - ${bookTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Fira+Code:wght@400;600&family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-desk: #f4eee1;
      --paper-line: #e2d9c8;
      --bg-page: #fdfbf7;
      --ink-black: #0f172a;
      --ink-blue: #1d4ed8;
      --ink-blue-hover: #1e40af;
      --border-dark: #334155;
      --shadow-color: rgba(0, 0, 0, 0.08);
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #f4eee1;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .chapter-wrapper.toc-wrapper {
      padding: 24px 0;
      display: flex;
      justify-content: center;
      width: 100%;
      min-height: 1056px;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
    }
    .notebook-container {
      width: 816px;
      min-height: 1008px;
      background-color: #fdfbf7;
      background-image: linear-gradient(#e8e0d0 1px, transparent 1px);
      background-size: 100% 32px;
      border: 2px solid #334155;
      border-radius: 8px;
      padding: 3.5rem 4rem;
      box-shadow: 6px 8px 0 rgba(0,0,0,0.08);
      box-sizing: border-box;
      position: relative;
    }
    header.toc-header {
      text-align: center;
      margin-bottom: 2.25rem;
    }
    .notebook-title {
      font-family: 'Fira Code', monospace;
      font-size: 3.5rem;
      font-weight: 700;
      color: #1d4ed8;
      margin: 0 0 0.5rem 0;
      letter-spacing: -0.01em;
      line-height: 1.15;
    }
    .subtitle {
      font-family: 'Patrick Hand', cursive;
      font-size: 1.5rem;
      font-style: italic;
      color: #475569;
      margin: 0 0 1.25rem 0;
      letter-spacing: 0.01em;
    }
    .header-divider-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      max-width: 85%;
      margin: 0 auto 1.5rem auto;
    }
    .header-line {
      flex: 1;
      border-top: 1.5px solid #1d4ed8;
      opacity: 0.35;
    }
    .header-ornament {
      color: #1d4ed8;
      font-size: 1.1rem;
    }
    .toc-helper-banner {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 0.45rem 1.25rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #1e40af;
      box-shadow: 0 1px 2px rgba(30, 64, 175, 0.05);
    }
    .toc-helper-banner span.cursor-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #2563eb;
      display: inline-block;
      animation: pulseDot 2s infinite ease-in-out;
    }
    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .toc-content {
      margin-top: 2.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .toc-chapter-block {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .toc-chapter-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0.85rem;
      border-radius: 6px;
      transition: all 0.15s ease;
      background: transparent;
      border-bottom: 1px dashed #cbd5e1;
    }
    .toc-chapter-row:hover {
      background: rgba(29, 78, 216, 0.04);
      border-bottom-color: #93c5fd;
    }
    .toc-chapter-title-link {
      text-decoration: none;
      color: #0f172a;
      display: inline-flex;
      gap: 0.85rem;
      align-items: center;
      transition: all 0.15s ease;
      cursor: pointer;
      max-width: 76%;
      min-width: 0;
    }
    .toc-chapter-title-link:hover {
      color: #1d4ed8;
    }
    .toc-chapter-title-link:hover .toc-chapter-name {
      color: #1d4ed8;
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    .toc-chapter-num {
      font-family: 'Fira Code', monospace;
      font-size: 0.82rem;
      font-weight: 700;
      background: #eff6ff;
      color: #1d4ed8;
      padding: 0.25rem 0.65rem;
      border-radius: 4px;
      border: 1px solid #bfdbfe;
      letter-spacing: 0.06em;
      white-space: nowrap;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
      flex-shrink: 0;
    }
    .toc-chapter-name {
      font-family: 'Fira Code', monospace;
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.015em;
      line-height: 1.3;
      white-space: normal;
      word-break: break-word;
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
      gap: 0.45rem;
      text-decoration: none;
      font-family: 'Fira Code', monospace;
      font-size: 0.78rem;
      font-weight: 600;
      color: #1d4ed8;
      background: #ffffff;
      padding: 0.3rem 0.75rem;
      border-radius: 6px;
      border: 1.5px solid #bfdbfe;
      transition: all 0.15s ease;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      flex-shrink: 0;
    }
    .toc-chapter-jump-btn:hover {
      background: #1d4ed8;
      color: #ffffff;
      border-color: #1d4ed8;
      box-shadow: 0 2px 4px rgba(29, 78, 216, 0.2);
    }
    .toc-chapter-jump-btn:hover .toc-jump-arrow {
      transform: translateX(3px);
    }
    .toc-jump-arrow {
      font-size: 0.85rem;
      transition: transform 0.15s ease;
    }

    @media print {
      body { background: white !important; }
      .chapter-wrapper.toc-wrapper { padding: 0 !important; }
      .notebook-container {
        border: none !important;
        box-shadow: none !important;
        padding: 2rem 2.5rem !important;
        background: transparent !important;
      }
      .toc-helper-banner { display: none !important; }
      .toc-leader-dots { border-bottom-style: dotted !important; }
    }
  </style>
</head>
<body>
  <div class="chapter-wrapper toc-wrapper">
    <div class="notebook-container">
      <header class="toc-header">
        <h1 class="notebook-title">Table of Contents</h1>
        <div class="subtitle">${bookTitle}</div>
        <div class="header-divider-wrap">
          <span class="header-line"></span>
          <span class="header-ornament">✦</span>
          <span class="header-line"></span>
        </div>
      </header>
      <div class="toc-content">
        ${chapterRowsHtml || '<p style="text-align: center; color: #94a3b8; font-style: italic; padding: 2rem 0;">No chapters have been added yet. Click &ldquo;Add Chapter&rdquo; to automatically build your Table of Contents.</p>'}
      </div>
    </div>
  </div>

  <script>
    (function() {
      function setupInteractiveLinks() {
        var links = document.querySelectorAll('a[data-chapter-id], a[href^="#chap-wrapper-"]');
        for (var i = 0; i < links.length; i++) {
          links[i].addEventListener('click', function(e) {
            var chapId = this.getAttribute('data-chapter-id');
            var href = this.getAttribute('href') || '';
            
            if (!chapId && href.indexOf('#chap-wrapper-') === 0) {
              chapId = href.replace('#chap-wrapper-', '');
            }

            // Always notify parent window to switch active chapter in the editor
            if (chapId && window.parent && window.parent !== window) {
              e.preventDefault();
              e.stopPropagation();
              window.parent.postMessage({
                type: 'NAVIGATE_TO_CHAPTER',
                chapterId: chapId
              }, '*');
            }
          });
        }
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupInteractiveLinks);
      } else {
        setupInteractiveLinks();
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * Generates an inline Markdown Table of Contents block based on total chapters added
 */
export function generateMarkdownToc(
  chapters: Chapter[],
  _chapterIndex?: number
): string {
  const { entries, totalChapters } = parseEbookChaptersToc(chapters);

  let md = `## Table of Contents\n\n*Total Chapters Added: ${totalChapters}*\n\n`;

  if (entries.length === 0) {
    md += `*No chapters added yet*\n\n`;
    return md;
  }

  entries.forEach((entry) => {
    md += `${entry.chapterNumber}. [${entry.title}](#chap-wrapper-${entry.chapterId})\n`;
  });
  md += `\n`;

  return md;
}
