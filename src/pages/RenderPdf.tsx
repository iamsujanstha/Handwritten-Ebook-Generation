import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { BOOK_THEMES, BookTheme } from "../lib/themes";
import MermaidDiagram from "../components/MermaidDiagram";

export default function RenderPdf() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<any>(null);
  const [theme, setTheme] = useState<BookTheme | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the book data from the server's in-memory store
    fetch(`/api/export-data/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setBook(data.book);
          setTheme(BOOK_THEMES[data.themeId] || BOOK_THEMES.technical);
        }
      })
      .catch(err => {
        setError(err.message);
      });
  }, [id]);

  useEffect(() => {
    if (book && theme) {
      // Signal to Puppeteer that rendering is complete
      // We use a small timeout to let React render the DOM completely, including images
      setTimeout(() => {
        (window as any).__PDF_READY__ = true;
      }, 1000);
    }
  }, [book, theme]);

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  if (!book || !theme) {
    return <div className="p-8">Loading PDF data...</div>;
  }

  const markdownComponents = {
    h1: ({node, ...props}: any) => <h1 className={theme.classes.heading1} style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid' }} {...props} />,
    h2: ({node, ...props}: any) => <h2 className={theme.classes.heading2} style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid' }} {...props} />,
    h3: ({node, ...props}: any) => <h3 className={theme.classes.heading3} style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid' }} {...props} />,
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
      <figure className="my-6 p-3 bg-white border border-slate-300 rounded-lg text-center" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <img style={{ maxWidth: '100%', height: 'auto', margin: '0 auto', display: 'block', borderRadius: '4px' }} {...props} alt={props.alt || "Figure"} />
        {props.alt && <figcaption className="text-xs text-slate-500 italic mt-2">Figure: {props.alt}</figcaption>}
      </figure>
    )
  };

  return (
    <div className="bg-white">
      <div 
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
            <p className="mt-4 text-sm opacity-50 uppercase tracking-widest font-mono">Published by BookForge AI</p>
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
              {book.chapters.map((chapter: any, i: number) => (
                <div key={chapter.id} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className={theme.classes.tocChapter}>
                    <a href={`#chapter-${chapter.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%' }}>
                      <span>{i + 1}. {chapter.title}</span>
                    </a>
                  </div>
                  <div className="space-y-1">
                    {chapter.sections.map((section: any) => (
                        <div key={section.id} className={theme.classes.tocSection}>
                        <a href={`#section-${section.id}`} className="pr-4 bg-inherit z-10" style={{ textDecoration: 'none', color: 'inherit' }}>
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
          {book.chapters.map((chapter: any, i: number) => (
            <div key={chapter.id} id={`chapter-${chapter.id}`} style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
              <div className={theme.classes.chapterContainer}>
                <h1 className={theme.classes.chapterTitle}>
                  <span className={theme.classes.chapterNumber}>Chapter {i + 1}</span>
                  {chapter.title}
                </h1>
                
                {chapter.sections.map((section: any) => (
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
                            rehypePlugins={[rehypeRaw]}
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
  );
}
