import { create } from "zustand";
import { Book, Source, Chapter, Theme } from "../types";
import { v4 as uuidv4 } from "uuid";

interface BookState {
  books: Book[];
  currentBookId: string | null;
  themes: Theme[];
  
  createBook: (bookData: Partial<Book>) => void;
  setCurrentBook: (id: string) => void;
  getCurrentBook: () => Book | undefined;
  updateBook: (id: string, data: Partial<Book>) => void;
  
  addSource: (bookId: string, source: Omit<Source, "id" | "createdAt" | "extractionStatus" | "wordCount">) => void;
  updateSource: (bookId: string, sourceId: string, data: Partial<Source>) => void;
  removeSource: (bookId: string, sourceId: string) => void;
  
  updateChapters: (bookId: string, chapters: Chapter[]) => void;
  updateSectionContent: (bookId: string, chapterId: string, sectionId: string, content: string) => void;
}

const defaultThemes: Theme[] = [
  {
    id: "notebook",
    name: "Notebook (Patrick Hand)",
    description: "Hand-drawn style with ruled lines and custom diagrams.",
    typography: {
      bodyFont: "Patrick Hand",
      headingFont: "Patrick Hand SC",
      codeFont: "Fira Code"
    },
    colors: {
      primary: "#0b3c5d",
      accent: "#c0392b",
      codeBg: "#1e293b",
      text: "#1e1e24",
      bg: "#fbf7ee"
    }
  },
  {
    id: "technical",
    name: "Technical",
    description: "Professionally published programming book style.",
    typography: {
      bodyFont: "font-serif",
      headingFont: "font-sans",
      codeFont: "font-mono"
    },
    colors: {
      primary: "text-blue-900",
      accent: "text-blue-600",
      codeBg: "bg-gray-50",
      text: "text-gray-900",
      bg: "bg-white"
    }
  }
];

export const useBookStore = create<BookState>((set, get) => ({
  books: [],
  currentBookId: null,
  themes: defaultThemes,
  
  createBook: (bookData) => set((state) => {
    const newBook: Book = {
      id: uuidv4(),
      title: bookData.title || "Untitled Book",
      subtitle: bookData.subtitle || "",
      author: bookData.author || "Unknown Author",
      description: bookData.description || "",
      language: bookData.language || "English",
      themeId: bookData.themeId || "notebook",
      chapters: [],
      sources: [],
      settings: {
        includeToc: true,
        includeSources: true,
        includeGlossary: false,
        includeIndex: false,
        ...bookData.settings
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...bookData
    };
    return { books: [...state.books, newBook], currentBookId: newBook.id };
  }),
  
  setCurrentBook: (id) => set({ currentBookId: id }),
  
  getCurrentBook: () => {
    const { books, currentBookId } = get();
    return books.find((b) => b.id === currentBookId);
  },
  
  updateBook: (id, data) => set((state) => ({
    books: state.books.map((b) => b.id === id ? { ...b, ...data, updatedAt: new Date().toISOString() } : b)
  })),
  
  addSource: (bookId, sourceData) => set((state) => ({
    books: state.books.map((b) => {
      if (b.id !== bookId) return b;
      const newSource: Source = {
        ...sourceData,
        id: uuidv4(),
        extractionStatus: "Pending",
        createdAt: new Date().toISOString(),
        wordCount: 0
      };
      return { ...b, sources: [...b.sources, newSource], updatedAt: new Date().toISOString() };
    })
  })),
  
  updateSource: (bookId, sourceId, data) => set((state) => ({
    books: state.books.map((b) => {
      if (b.id !== bookId) return b;
      return {
        ...b,
        sources: b.sources.map((s) => s.id === sourceId ? { ...s, ...data } : s),
        updatedAt: new Date().toISOString()
      };
    })
  })),
  
  removeSource: (bookId, sourceId) => set((state) => ({
    books: state.books.map((b) => {
      if (b.id !== bookId) return b;
      return {
        ...b,
        sources: b.sources.filter((s) => s.id !== sourceId),
        updatedAt: new Date().toISOString()
      };
    })
  })),
  
  updateChapters: (bookId, chapters) => set((state) => ({
    books: state.books.map((b) => {
      if (b.id !== bookId) return b;
      return { ...b, chapters, updatedAt: new Date().toISOString() };
    })
  })),

  updateSectionContent: (bookId, chapterId, sectionId, content) => set((state) => ({
    books: state.books.map((b) => {
      if (b.id !== bookId) return b;
      return {
        ...b,
        chapters: b.chapters.map(c => {
          if (c.id !== chapterId) return c;
          return {
            ...c,
            sections: c.sections.map(s => s.id === sectionId ? { ...s, content } : s)
          }
        }),
        updatedAt: new Date().toISOString()
      };
    })
  }))
}));
