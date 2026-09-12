import React, { useMemo } from "react";
import { 
  ListTree, 
  Check, 
  BookOpen, 
  ArrowRight, 
  FileText, 
  Layers, 
  Sparkles,
  Info
} from "lucide-react";
import { useNotebookStore } from "../store/useNotebookStore";
import { generateTableOfContentsPageHtml, parseEbookChaptersToc } from "../lib/tocGenerator";

interface TableOfContentsViewProps {
  onNavigateChapter: (chapterId: string) => void;
}

export const TableOfContentsView: React.FC<TableOfContentsViewProps> = ({ onNavigateChapter }) => {
  const { chapters, title, includeTocInExport, setIncludeTocInExport } = useNotebookStore();

  const { entries, totalChapters } = useMemo(() => {
    return parseEbookChaptersToc(chapters);
  }, [chapters]);

  const tocHtml = useMemo(() => {
    return generateTableOfContentsPageHtml(chapters, title || "Engineering Systems Manual");
  }, [chapters, title]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden font-sans">
      {/* 1. Header Toolbar */}
      <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 bg-orange-100 text-orange-700 rounded-lg shadow-xs shrink-0">
            <ListTree className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-800 tracking-tight">Table of Contents</h1>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                Default Document Section
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">
              {totalChapters} {totalChapters === 1 ? 'Chapter' : 'Chapters'} cataloged • Automatically synced with your book
            </p>
          </div>
        </div>

        {/* Export & Visibility Controls */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors select-none">
            <input
              type="checkbox"
              checked={includeTocInExport}
              onChange={(e) => setIncludeTocInExport(e.target.checked)}
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-700">
              Include in PDF Export
            </span>
          </label>
        </div>
      </div>

      {/* 2. Notice Banner */}
      <div className="px-6 py-2 bg-orange-50/70 border-b border-orange-200/60 flex items-center justify-between text-xs text-orange-900">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-orange-600 shrink-0" />
          <span>
            <strong>Automatic Default Table of Contents:</strong> This section updates automatically whenever chapters are added, renamed, or reordered. No manual note formatting required.
          </span>
        </div>
        <div className="text-[11px] text-orange-700/80 font-medium shrink-0 ml-4">
          Click any chapter row to jump directly to its editor
        </div>
      </div>

      {/* 3. Main Stage - Live Rendered Book Page Preview */}
      <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
        <div className="w-full max-w-[860px] flex flex-col items-center">
          {/* Quick Chapter Jump Bar */}
          {entries.length > 0 && (
            <div className="w-full mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>Quick Chapter Navigation ({entries.length})</span>
                <span className="text-[10px] text-slate-400 font-normal">Click to edit notes</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {entries.map((entry) => (
                  <button
                    key={entry.chapterId}
                    type="button"
                    onClick={() => onNavigateChapter(entry.chapterId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 rounded-lg text-xs text-slate-700 hover:text-orange-900 transition-all font-medium group"
                  >
                    <span className="text-[10px] font-mono font-bold text-orange-700 bg-orange-100/70 px-1.5 py-0.5 rounded">
                      {entry.numberLabel}
                    </span>
                    <span className="truncate max-w-[180px]">{entry.cleanTitle}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rendered Table of Contents Page Frame */}
          <div className="w-full bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
                <span className="font-semibold text-slate-700">Print Preview • Default Table of Contents</span>
              </div>
              <span>A4 / Letter • Notebook Edition</span>
            </div>
            
            <div className="p-4 bg-stone-100 flex justify-center">
              <iframe
                title="Table of Contents Preview"
                srcDoc={tocHtml}
                className="w-full border-none shadow-sm rounded-lg"
                style={{ 
                  minHeight: "1056px",
                  height: "100%",
                  maxWidth: "816px"
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
