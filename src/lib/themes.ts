export type BookTheme = {
  id: string;
  name: string;
  classes: {
    container: string;
    coverPage: string;
    coverTitle: string;
    coverSubtitle: string;
    coverAuthor: string;
    tocContainer: string;
    tocTitle: string;
    tocChapter: string;
    tocSection: string;
    chapterContainer: string;
    chapterTitle: string;
    chapterNumber: string;
    sectionTitle: string;
    prose: string; // Tailwind typography class
    heading1: string;
    heading2: string;
    heading3: string;
    paragraph: string;
    list: string;
    blockquote: string;
    codeBlock: string;
    inlineCode: string;
    table: string;
    th: string;
    td: string;
  }
};

export const BOOK_THEMES: Record<string, BookTheme> = {
  notebook: {
    id: "notebook",
    name: "Notebook (Patrick Hand)",
    classes: {
      container: "notebook-theme-root",
      coverPage: "notebook-container text-center flex flex-col justify-center items-center min-h-[80vh]",
      coverTitle: "notebook-title !text-5xl !mb-8",
      coverSubtitle: "subtitle !text-2xl !mb-16",
      coverAuthor: "book-tag !text-xl",
      tocContainer: "notebook-container p-12",
      tocTitle: "notebook-title !text-4xl !border-b-2 !border-[var(--notebook-ink-blue)] !pb-4 !mb-8",
      tocChapter: "text-2xl font-bold text-[var(--notebook-ink-blue)] mt-8 mb-4 border-b-2 border-dashed border-[var(--notebook-ink-blue)] pb-2 flex justify-between font-['Patrick_Hand_SC']",
      tocSection: "text-lg text-[var(--notebook-ink-purple)] flex justify-between py-2 ml-8 font-['Patrick_Hand']",
      chapterContainer: "notebook-container p-12",
      chapterTitle: "notebook-title !text-5xl !mb-12 border-b-4 border-double border-[var(--notebook-ink-blue)] pb-4",
      chapterNumber: "book-tag !text-xl block mb-2",
      sectionTitle: "text-3xl font-bold text-[var(--notebook-ink-blue)] mb-8 mt-16 font-['Patrick_Hand_SC']",
      prose: "",
      heading1: "text-3xl font-bold text-[var(--notebook-ink-blue)] mt-12 mb-6 font-['Patrick_Hand_SC'] border-b-2 border-[var(--notebook-ink-blue)] pb-2",
      heading2: "text-2xl font-bold text-[var(--notebook-ink-purple)] mt-10 mb-4 font-['Patrick_Hand_SC']",
      heading3: "text-xl font-bold text-[var(--notebook-ink-red)] mt-8 mb-4 font-['Patrick_Hand_SC']",
      paragraph: "text-lg text-[var(--notebook-ink-black)] leading-relaxed mb-6 font-['Patrick_Hand']",
      list: "my-6 pl-8 list-disc space-y-2 marker:text-[var(--notebook-ink-blue)] text-lg font-['Patrick_Hand']",
      blockquote: "callout-simple",
      codeBlock: "bg-[var(--notebook-code-bg)] text-[var(--notebook-code-text)] p-6 rounded my-8 font-['Fira_Code'] text-sm border border-[var(--notebook-blueprint-border)] shadow-md overflow-x-auto",
      inlineCode: "bg-black/10 text-[var(--notebook-ink-red)] px-2 py-0.5 rounded font-['Fira_Code'] text-sm",
      table: "w-full my-8 border-collapse text-left text-lg font-['Patrick_Hand'] border-2 border-[var(--notebook-card-border)] bg-[var(--notebook-card-bg)] shadow-md",
      th: "border-b-2 border-[var(--notebook-card-border)] bg-[var(--notebook-blueprint-bg)] text-[#38bdf8] p-4 font-['Patrick_Hand_SC'] text-xl",
      td: "border border-[var(--notebook-paper-line)] p-4 text-[var(--notebook-ink-black)]"
    }
  },

  technical: {
    id: "technical",
    name: "Technical (Default)",
    classes: {
      container: "bg-white text-slate-900 font-sans",
      coverPage: "flex flex-col justify-center items-center text-center p-20 border-b-8 border-orange-600 bg-slate-50",
      coverTitle: "text-6xl font-bold text-slate-900 mb-6 tracking-tight uppercase",
      coverSubtitle: "text-2xl font-medium text-orange-600 mb-20 uppercase tracking-widest",
      coverAuthor: "text-xl font-bold text-slate-800 uppercase tracking-widest",
      tocContainer: "p-20",
      tocTitle: "text-3xl font-bold text-slate-900 mb-12 uppercase tracking-widest border-b-2 border-slate-200 pb-4",
      tocChapter: "text-lg font-bold text-slate-800 uppercase tracking-widest mt-6 mb-2 flex justify-between",
      tocSection: "text-slate-600 text-sm font-medium flex justify-between py-1 border-b border-slate-100 border-dotted ml-4",
      chapterContainer: "p-20",
      chapterTitle: "text-5xl font-bold text-slate-900 mb-16 uppercase tracking-tight border-b-4 border-orange-600 pb-8",
      chapterNumber: "text-orange-600 block text-xl tracking-widest uppercase mb-4",
      sectionTitle: "text-3xl font-bold text-slate-800 mb-8 mt-12 uppercase tracking-wide",
      prose: "prose prose-slate max-w-none prose-headings:uppercase prose-a:text-orange-600",
      heading1: "text-3xl font-bold text-slate-900 mt-12 mb-6 uppercase tracking-wide",
      heading2: "text-2xl font-bold text-slate-800 mt-10 mb-4 uppercase tracking-wide",
      heading3: "text-xl font-bold text-slate-800 mt-8 mb-4 uppercase",
      paragraph: "text-slate-800 leading-relaxed mb-6 text-justify",
      list: "my-6 pl-8 list-disc space-y-2 marker:text-orange-600",
      blockquote: "border-l-4 border-orange-600 bg-orange-50 p-6 my-8 text-slate-800 italic font-medium rounded-r-lg",
      codeBlock: "bg-slate-900 text-slate-50 p-6 rounded-lg my-8 overflow-x-auto font-mono text-sm shadow-inner",
      inlineCode: "bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono text-sm border border-slate-200",
      table: "w-full my-8 border-collapse text-left text-sm",
      th: "border-b-2 border-slate-300 pb-3 font-bold text-slate-900 uppercase tracking-widest",
      td: "border-b border-slate-200 py-3 text-slate-700"
    }
  },
  minimal: {
    id: "minimal",
    name: "Minimal",
    classes: {
      container: "bg-white text-gray-900 font-sans",
      coverPage: "flex flex-col justify-center items-start p-24",
      coverTitle: "text-5xl font-light text-black mb-4 tracking-tight",
      coverSubtitle: "text-xl font-normal text-gray-500 mb-24",
      coverAuthor: "text-lg text-gray-900",
      tocContainer: "p-24",
      tocTitle: "text-2xl font-light text-black mb-12",
      tocChapter: "text-base font-normal text-black mt-4 flex justify-between",
      tocSection: "text-gray-500 text-sm flex justify-between py-1 ml-4",
      chapterContainer: "p-24",
      chapterTitle: "text-4xl font-light text-black mb-16",
      chapterNumber: "text-gray-400 block text-sm tracking-widest uppercase mb-4",
      sectionTitle: "text-2xl font-light text-black mb-6 mt-16",
      prose: "prose prose-gray max-w-none font-light",
      heading1: "text-2xl font-normal text-black mt-16 mb-6",
      heading2: "text-xl font-normal text-black mt-12 mb-4",
      heading3: "text-lg font-normal text-black mt-8 mb-4",
      paragraph: "text-gray-800 leading-loose mb-6",
      list: "my-6 pl-8 list-circle space-y-2",
      blockquote: "pl-6 my-8 text-gray-600 italic border-l text-lg",
      codeBlock: "bg-gray-50 text-gray-800 p-6 my-8 font-mono text-sm border border-gray-100",
      inlineCode: "bg-gray-50 text-gray-800 px-1 rounded font-mono text-sm",
      table: "w-full my-8 border-collapse text-left",
      th: "border-b border-black pb-2 font-normal text-black",
      td: "border-b border-gray-100 py-3 text-gray-700"
    }
  },
  academic: {
    id: "academic",
    name: "Academic",
    classes: {
      container: "bg-[#fdfdfc] text-stone-900 font-serif",
      coverPage: "flex flex-col justify-center items-center text-center p-20 border-8 border-double border-stone-800 m-8",
      coverTitle: "text-5xl font-bold text-stone-900 mb-8 font-serif leading-tight",
      coverSubtitle: "text-2xl font-italic text-stone-700 mb-24 font-serif italic",
      coverAuthor: "text-xl text-stone-900 font-serif uppercase tracking-widest",
      tocContainer: "p-20",
      tocTitle: "text-3xl font-bold text-stone-900 mb-12 text-center border-b border-stone-300 pb-8",
      tocChapter: "text-lg font-bold text-stone-900 mt-6 mb-2 flex justify-between",
      tocSection: "text-stone-700 text-base flex justify-between py-1 border-b border-stone-200 border-dotted ml-6",
      chapterContainer: "p-20",
      chapterTitle: "text-4xl font-bold text-stone-900 mb-16 text-center border-b border-stone-300 pb-8",
      chapterNumber: "text-stone-500 block text-lg font-normal italic mb-6",
      sectionTitle: "text-2xl font-bold text-stone-900 mb-6 mt-12",
      prose: "prose prose-stone max-w-none prose-p:text-justify font-serif",
      heading1: "text-2xl font-bold text-stone-900 mt-12 mb-6",
      heading2: "text-xl font-bold text-stone-900 mt-8 mb-4",
      heading3: "text-lg font-bold text-stone-900 mt-8 mb-4 italic",
      paragraph: "text-stone-900 leading-relaxed mb-6 text-justify indent-8",
      list: "my-6 pl-12 list-disc space-y-2",
      blockquote: "mx-12 my-8 text-stone-700 italic",
      codeBlock: "bg-stone-100 text-stone-800 p-6 my-8 font-mono text-sm border-t border-b border-stone-300",
      inlineCode: "bg-stone-100 text-stone-800 px-1 rounded font-mono text-sm",
      table: "w-full my-8 border-collapse text-left text-sm",
      th: "border-b-2 border-stone-800 pb-2 font-bold text-stone-900",
      td: "border-b border-stone-300 py-2 text-stone-800"
    }
  },
  elegant: {
    id: "elegant",
    name: "Elegant",
    classes: {
      container: "bg-[#FAFAFA] text-zinc-900 font-serif",
      coverPage: "flex flex-col justify-center items-center text-center p-20",
      coverTitle: "text-6xl font-normal text-zinc-900 mb-6 tracking-wide",
      coverSubtitle: "text-2xl text-emerald-700 mb-24 italic",
      coverAuthor: "text-lg font-semibold text-zinc-800 tracking-widest uppercase",
      tocContainer: "p-20 max-w-3xl mx-auto",
      tocTitle: "text-3xl font-normal text-zinc-900 mb-16 text-center italic",
      tocChapter: "text-lg text-zinc-900 mt-8 mb-2 flex justify-between font-medium",
      tocSection: "text-zinc-500 text-sm flex justify-between py-1.5 ml-6",
      chapterContainer: "p-20 max-w-4xl mx-auto",
      chapterTitle: "text-5xl font-normal text-zinc-900 mb-20 text-center leading-tight",
      chapterNumber: "text-emerald-700 block text-sm tracking-widest uppercase mb-8",
      sectionTitle: "text-2xl font-normal text-zinc-900 mb-8 mt-16 italic",
      prose: "prose prose-zinc max-w-none font-serif prose-headings:font-normal prose-a:text-emerald-600",
      heading1: "text-3xl font-normal text-zinc-900 mt-16 mb-8",
      heading2: "text-2xl font-normal text-zinc-900 mt-12 mb-6 italic",
      heading3: "text-xl font-normal text-zinc-800 mt-8 mb-4",
      paragraph: "text-zinc-800 leading-loose mb-8 text-lg",
      list: "my-8 pl-8 list-disc space-y-3",
      blockquote: "border-l text-emerald-800 pl-8 py-2 my-10 text-xl italic font-light",
      codeBlock: "bg-zinc-900 text-zinc-50 p-8 rounded-xl my-10 font-mono text-sm shadow-xl",
      inlineCode: "text-emerald-700 px-1 rounded font-mono text-sm bg-emerald-50",
      table: "w-full my-10 border-collapse text-left",
      th: "border-b border-zinc-300 pb-3 font-medium text-zinc-500 uppercase tracking-widest text-xs",
      td: "border-b border-zinc-100 py-4 text-zinc-800"
    }
  },
  darkCode: {
    id: "darkCode",
    name: "Dark Code",
    classes: {
      container: "bg-slate-950 text-slate-300 font-sans",
      coverPage: "flex flex-col justify-center items-start p-20 border-l-4 border-emerald-500",
      coverTitle: "text-6xl font-bold text-white mb-4 tracking-tighter",
      coverSubtitle: "text-2xl font-medium text-emerald-400 mb-24 font-mono",
      coverAuthor: "text-lg text-slate-400 font-mono",
      tocContainer: "p-20",
      tocTitle: "text-2xl font-bold text-white mb-12 font-mono border-b border-slate-800 pb-4",
      tocChapter: "text-base font-bold text-white mt-6 mb-2 flex justify-between font-mono",
      tocSection: "text-slate-400 text-sm flex justify-between py-1 border-b border-slate-900 ml-4 font-mono",
      chapterContainer: "p-20",
      chapterTitle: "text-4xl font-bold text-white mb-16 tracking-tight",
      chapterNumber: "text-emerald-500 block text-sm font-mono uppercase mb-4",
      sectionTitle: "text-2xl font-bold text-white mb-6 mt-12",
      prose: "prose prose-invert max-w-none prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-a:text-emerald-400",
      heading1: "text-2xl font-bold text-white mt-12 mb-6",
      heading2: "text-xl font-bold text-white mt-10 mb-4",
      heading3: "text-lg font-bold text-white mt-8 mb-4",
      paragraph: "text-slate-300 leading-relaxed mb-6",
      list: "my-6 pl-8 list-disc space-y-2 marker:text-emerald-500",
      blockquote: "border-l-2 border-emerald-500 bg-slate-900 p-6 my-8 text-slate-300",
      codeBlock: "bg-[#0d1117] text-slate-300 p-6 rounded my-8 font-mono text-sm border border-slate-800 shadow-2xl",
      inlineCode: "bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded font-mono text-sm",
      table: "w-full my-8 border-collapse text-left text-sm",
      th: "border-b border-slate-800 pb-2 font-mono text-slate-400 uppercase",
      td: "border-b border-slate-900 py-3 text-slate-300"
    }
  }
};
