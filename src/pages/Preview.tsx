import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router";
import { useBookStore } from "../store/useBookStore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { Download, Layout, Palette, Settings, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { BOOK_THEMES, BookTheme } from "../lib/themes";
import MermaidDiagram from "../components/MermaidDiagram";
import { safeFetchJson } from "../lib/safeFetch";

export default function Preview() {
  const { id } = useParams<{ id: string }>();
  const book = useBookStore((state) => state.books.find(b => b.id === id));
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  
  const [selectedThemeId, setSelectedThemeId] = useState<string>("technical");
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);
  
  const theme = BOOK_THEMES[selectedThemeId];

  if (!book || !id) return null;

  const handleExportPDF = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    setExportProgress("Initializing export...");
    setExportError(null);
    
    try {
      const { exportId } = await safeFetchJson<{ exportId: string }>("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book, themeId: selectedThemeId })
      });
      
      const eventSource = new EventSource(`/api/export-status/${exportId}`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.status === "failed") {
          setExportError(data.error || "Export failed at stage: " + data.progress);
          setExportProgress("");
          setIsExporting(false);
          eventSource.close();
        } else if (data.status === "completed") {
          setExportProgress("PDF ready!");
          setIsExporting(false);
          eventSource.close();
          
          
          fetch(`/api/download-pdf/${exportId}`, {credentials: "include"})
            .then(res => res.blob())
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${book.title || 'Export'}.pdf`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            })
            .catch(err => setExportError("Failed to download PDF: " + err.message));
    
          setTimeout(() => setExportProgress(""), 3000);
        } else {
          setExportProgress(data.progress);
        }
      };
      
      eventSource.onerror = (err) => {
        console.error("SSE Error:", err);
        setExportError("Connection to export server lost");
        setExportProgress("");
        setIsExporting(false);
        eventSource.close();
      };
      
    } catch (err: any) {
      console.error(err);
      setExportError(err.message || "Failed to export PDF");
      setIsExporting(false);
      setExportProgress("");
    }
  };

  // Custom Markdown Renderers applying theme classes
  const markdownComponents = {
    h1: ({node, ...props}: any) => {
      const text = String(props.children);
      const isDesc = text.toLowerCase().includes("description");
      return <h1 className={theme.classes.heading1} style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid', color: isDesc ? "#8b5cf6" : undefined }} {...props} />;
    },
    h2: ({node, ...props}: any) => {
      const text = String(props.children);
      const isDesc = text.toLowerCase().includes("description");
      return <h2 className={theme.classes.heading2} style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid', color: isDesc ? "#8b5cf6" : undefined }} {...props} />;
    },
    h3: ({node, ...props}: any) => {
      const text = String(props.children);
      const isDesc = text.toLowerCase().includes("description");
      return <h3 className={theme.classes.heading3} style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid', color: isDesc ? "#8b5cf6" : undefined }} {...props} />;
    },
    p: ({node, ...props}: any) => <p className={theme.classes.paragraph} style={{ orphans: 3, widows: 3 }} {...props} />,
    ul: ({node, ...props}: any) => <ul className={theme.classes.list} {...props} />,
    ol: ({node, ...props}: any) => <ol className={theme.classes.list} style={{ listStyleType: 'decimal' }} {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className={theme.classes.blockquote} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }} {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
      const match = /language-(\w+)/.exec(className || '');
      if (!inline && match && match[1] === 'mermaid') {
        return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
      }
      return inline ? (
        <code className={theme.classes.inlineCode} {...props}>{children}</code>
      ) : (
        <pre className={theme.classes.codeBlock} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <code className={className} {...props}>{children}</code>
        </pre>
      );
    },
    table: ({node, ...props}: any) => <div style={{ overflowX: 'auto', pageBreakInside: 'avoid', breakInside: 'avoid' }}><table className={theme.classes.table} {...props} /></div>,
    th: ({node, ...props}: any) => <th className={theme.classes.th} {...props} />,
    td: ({node, ...props}: any) => <td className={theme.classes.td} {...props} />,
    img: ({node, ...props}: any) => (
      <figure className="my-6 p-3 bg-white/90 border border-slate-300 rounded-lg text-center" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <img style={{ maxWidth: '100%', height: 'auto', margin: '0 auto', display: 'block', borderRadius: '4px' }} {...props} alt={props.alt || "Image"} />
        {props.alt && <figcaption className="text-xs text-slate-500 italic mt-2">{props.alt}</figcaption>}
      </figure>
    )
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-200">
      <div className="px-8 py-4 border-b border-slate-300 bg-white flex justify-between items-center z-10 shadow-sm relative">
        <div>
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest">Book Preview</h2>
        </div>
        <div className="flex space-x-3">
          
          <div className="relative">
            <button 
              onClick={() => setShowThemeSelector(!showThemeSelector)}
              className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded font-bold uppercase tracking-widest text-xs hover:bg-slate-200 transition-colors shadow-sm"
            >
              <Palette className="w-4 h-4 mr-2" />
              Theme: {theme.name}
            </button>
            
            {showThemeSelector && (
              <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-slate-200 shadow-xl rounded z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-100 bg-slate-50">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Select Typography</span>
                </div>
                {Object.values(BOOK_THEMES).map((t) => (
                  <button 
                    key={t.id}
                    onClick={() => { setSelectedThemeId(t.id); setShowThemeSelector(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center justify-between transition-colors ${selectedThemeId === t.id ? 'bg-orange-50 text-orange-700' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {t.name}
                    {selectedThemeId === t.id && <div className="w-2 h-2 rounded-full bg-orange-600"></div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end">
            <div className="flex space-x-3">
              <button 
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center px-4 py-2 bg-orange-600 text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                {isExporting ? "Exporting..." : "Export to PDF"}
              </button>
            </div>
            
            {exportProgress && !exportError && (
              <div className="text-xs font-medium text-slate-500 mt-2 flex items-center bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                {exportProgress === "Download ready" ? <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> : <Loader2 className="w-3 h-3 mr-1 animate-spin text-orange-500" />}
                {exportProgress}
              </div>
            )}
            
            {exportError && (
              <div className="text-xs font-medium text-red-600 mt-2 flex items-center bg-red-50 px-2 py-1 rounded border border-red-200 shadow-sm">
                <AlertCircle className="w-3 h-3 mr-1" />
                {exportError}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-200">
        
        {/* Book Container wrapper - fixed A4 width to ensure WYSIWYG PDF export */}
        <div className="shadow-2xl print:shadow-none w-[210mm] max-w-full flex-shrink-0 bg-white">
          <div 
            ref={printRef}
            className={theme.classes.container}
            style={{ width: '100%' }}
          >
            {/* Cover Page */}
            <div 
              className={theme.classes.coverPage} 
              style={{ minHeight: '297mm', pageBreakAfter: 'always', breakAfter: 'page' }}
            >
              <h1 className={theme.classes.coverTitle}>{book.title}</h1>
              <h2 className={theme.classes.coverSubtitle}>{book.subtitle}</h2>
              <div className="mt-auto">
                <p className={theme.classes.coverAuthor}>{book.author}</p>
                <p className="mt-4 text-sm opacity-50 uppercase tracking-widest font-mono">Published by Handwritten eBook</p>
              </div>
            </div>



            {/* Table of Contents */}
            {book.settings.includeToc && (
              <div 
                className={theme.classes.tocContainer} 
                style={{ minHeight: '297mm', pageBreakAfter: 'always', breakAfter: 'page' }}
              >
                <h2 className={theme.classes.tocTitle}>Contents</h2>
                <div className="space-y-2">
                  {book.chapters.map((chapter, i) => (
                    <div key={chapter.id} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className={theme.classes.tocChapter}>
                        <a href={`#chapter-${chapter.id}`} onClick={(e) => handleLinkClick(e, `chapter-${chapter.id}`)} className="hover:underline hover:text-orange-600 transition-colors cursor-pointer text-inherit no-underline block w-full">
                          <span>{i + 1}. {chapter.title}</span>
                        </a>
                      </div>
                      <div className="space-y-1">
                        {chapter.sections.map(section => (
                           <div key={section.id} className={theme.classes.tocSection}>
                            <a href={`#section-${section.id}`} onClick={(e) => handleLinkClick(e, `section-${section.id}`)} className="pr-4 bg-inherit z-10 hover:underline hover:text-orange-600 transition-colors cursor-pointer text-inherit no-underline">
                              {section.title}
                            </a>
                            <span className="flex-1 border-b border-dotted opacity-30 relative top-[-6px]"></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chapters */}
            <div>
              {book.chapters.map((chapter, i) => (
                <div key={chapter.id} id={`chapter-${chapter.id}`} style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
                  
                  {/* Chapter Opener Page (or top of page depending on theme) */}
                  <div className={theme.classes.chapterContainer}>
                    <h1 className={theme.classes.chapterTitle}>
                      <span className={theme.classes.chapterNumber}>Chapter {i + 1}</span>
                      {chapter.title}
                    </h1>
                    
                    {chapter.sections.map(section => (
                      <div key={section.id} id={`section-${section.id}`} className="mb-12">
                        <h2 
                          className={theme.classes.sectionTitle}
                          style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid' }}
                        >
                          {section.title}
                        </h2>
                        
                        <div className={theme.classes.prose}>
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, rehypeHighlight]}
                            components={markdownComponents as any}
                          >
                            {section.content || "*No content generated yet.*"}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
