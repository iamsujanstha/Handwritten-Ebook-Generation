import React, { useState, useMemo } from "react";
import { 
  BookOpen, 
  Search, 
  X, 
  FileText, 
  Copy, 
  Check, 
  Plus, 
  Sparkles, 
  Printer, 
  ArrowRight,
  Bookmark
} from "lucide-react";
import { Chapter } from "../store/useNotebookStore";
import { parseEbookChaptersToc, ChapterTocEntry, generateMarkdownToc } from "../lib/tocGenerator";

interface TableOfContentsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  activeChapterId: string | null;
  onSelectSection: (chapterId: string, sectionId: string) => void;
  includeTocInExport: boolean;
  onToggleIncludeTocInExport: (val: boolean) => void;
}

export default function TableOfContentsMenu({
  isOpen,
  onClose,
  chapters,
  activeChapterId,
  onSelectSection,
  includeTocInExport,
  onToggleIncludeTocInExport
}: TableOfContentsMenuProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  // Parse chapter-level TOC entries based on total chapters added
  const { entries, totalChapters } = useMemo(() => {
    return parseEbookChaptersToc(chapters);
  }, [chapters]);

  // Filter chapters according to search query
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;

    return entries.filter(entry => 
      entry.cleanTitle.toLowerCase().includes(query) ||
      entry.numberLabel.toLowerCase().includes(query) ||
      entry.title.toLowerCase().includes(query)
    );
  }, [entries, searchQuery]);

  const handleCopyMarkdown = () => {
    const md = generateMarkdownToc(chapters);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-y-0 right-0 w-96 max-w-full bg-white shadow-2xl z-40 border-l border-slate-200 flex flex-col transition-transform duration-200 ease-in-out font-sans"
      role="dialog"
      aria-label="Table of Contents Navigation"
    >
      {/* 1. Header Bar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-orange-100 text-orange-700 rounded-lg shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-mono font-bold text-slate-800 text-sm leading-tight">Table of Contents</h2>
            <p className="text-[11px] font-medium text-slate-500">
              {totalChapters} {totalChapters === 1 ? 'Chapter' : 'Chapters'} added to book
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
          title="Close Table of Contents"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Controls & Search */}
      <div className="p-3 border-b border-slate-200 bg-white space-y-2.5">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search chapters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-orange-500 rounded text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Export Toggle & Copy */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
          <label className="flex items-center cursor-pointer select-none text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={includeTocInExport}
              onChange={(e) => onToggleIncludeTocInExport(e.target.checked)}
              className="mr-1.5 w-3.5 h-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
            />
            <Printer className="w-3 h-3 mr-1 text-slate-500" /> Include TOC in PDF export
          </label>

          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="flex items-center text-slate-500 hover:text-slate-800 transition-colors p-1"
            title="Copy Markdown TOC to clipboard"
          >
            {copied ? (
              <span className="flex items-center text-emerald-600 font-bold">
                <Check className="w-3 h-3 mr-1" /> Copied!
              </span>
            ) : (
              <span className="flex items-center">
                <Copy className="w-3 h-3 mr-1" /> Copy MD
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 3. Chapters List (Dependent on total chapters added) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-400">
            <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="text-xs font-semibold text-slate-600">
              {searchQuery ? "No matching chapters found" : "No chapters added yet"}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              {searchQuery ? "Try a different search term or clear the filter." : "Click '+ Add Chapter' in the top bar to expand your book directory."}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isActiveChapter = entry.chapterId === activeChapterId;

            return (
              <div 
                key={entry.chapterId}
                onClick={() => onSelectSection(entry.chapterId, "")}
                className={`group rounded-lg border p-2.5 transition-all cursor-pointer ${
                  isActiveChapter 
                    ? "border-orange-300 bg-orange-50/60 shadow-xs ring-1 ring-orange-200" 
                    : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                        isActiveChapter 
                          ? "bg-orange-200 text-orange-900 border border-orange-300" 
                          : "bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-800"
                      }`}>
                        {entry.numberLabel}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {entry.wordCount.toLocaleString()} words
                      </span>
                    </div>

                    <h4 className={`text-xs font-mono font-bold leading-snug transition-colors line-clamp-2 ${
                      isActiveChapter 
                        ? "text-orange-950 font-extrabold" 
                        : "text-slate-800 group-hover:text-blue-700"
                    }`}>
                      {entry.cleanTitle}
                    </h4>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded transition-all gap-1 ${
                      isActiveChapter 
                        ? "bg-orange-500 text-white shadow-xs" 
                        : "text-blue-600 bg-blue-50 border border-blue-200 group-hover:bg-blue-600 group-hover:text-white"
                    }`}>
                      {isActiveChapter ? 'Current' : 'Go'}
                      <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Footer Note */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="font-mono text-[10px] bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded">
          {totalChapters} Total
        </span>
      </div>
    </div>
  );
}
