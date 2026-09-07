import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { CoverPageConfig } from "../types";

export interface Chapter {
  id: string;
  title: string;
  rawText: string;
  content: string;
}

interface NotebookState {
  title: string;
  setTitle: (title: string) => void;
  coverConfig: CoverPageConfig;
  updateCoverConfig: (data: Partial<CoverPageConfig>) => void;
  chapters: Chapter[];
  activeChapterId: string | null;
  lastSavedAt: number | null;
  addChapter: () => void;
  addChapterWithData: (title: string, rawText: string) => void;
  removeChapter: (id: string) => void;
  updateChapter: (id: string, data: Partial<Chapter>) => void;
  setActiveChapterId: (id: string) => void;
  reorderChapters: (startIndex: number, endIndex: number) => void;
  resetToNewBook: () => void;
  loadBookFromJson: (backup: { title?: string; coverConfig?: Partial<CoverPageConfig>; chapters?: Chapter[] }) => void;
}

const defaultCoverConfig: CoverPageConfig = {
  enabled: true,
  title: "Engineering Systems Manual",
  subtitle: "Architecture, Implementation Protocols & Field Reference",
  author: "Principal Systems Architecture Team",
  edition: "First Edition • 2026",
  template: "notebook",
  accentColor: "#1c4b82",
  imageUrl: "",
  imagePrompt: "",
  imagePosition: "center"
};

const initialChapters: Chapter[] = [
  { id: "default-1", title: "Chapter 1", rawText: "", content: "" }
];

// Resilient storage wrapper with error handling for quota limits
const safeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name);
    } catch (e) {
      console.warn("Could not read from localStorage:", e);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value);
    } catch (e: any) {
      console.error("Failed to save to localStorage (quota exceeded?):", e);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("bookforge-storage-error", { detail: e?.message }));
      }
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
    } catch (e) {
      console.warn("Could not remove item from localStorage:", e);
    }
  }
};

export const useNotebookStore = create<NotebookState>()(
  persist(
    (set) => ({
      title: "Engineering Systems Manual",
      setTitle: (title) => set((state) => ({ 
        title,
        lastSavedAt: Date.now(),
        // Keep cover title synced if user hasn't explicitly customized it differently
        coverConfig: {
          ...state.coverConfig,
          title: state.coverConfig.title === state.title || !state.coverConfig.title ? title : state.coverConfig.title
        }
      })),
      coverConfig: defaultCoverConfig,
      updateCoverConfig: (data) => set((state) => ({
        coverConfig: { ...state.coverConfig, ...data },
        lastSavedAt: Date.now()
      })),
      chapters: initialChapters,
      activeChapterId: "default-1",
      lastSavedAt: Date.now(),
      
      addChapter: () => set((state) => {
        const newId = uuidv4();
        return {
          chapters: [...state.chapters, { id: newId, title: "New Chapter", rawText: "", content: "" }],
          activeChapterId: newId,
          lastSavedAt: Date.now()
        };
      }),

      addChapterWithData: (title, rawText) => set((state) => {
        const newId = uuidv4();
        return {
          chapters: [...state.chapters, { id: newId, title, rawText, content: "" }],
          activeChapterId: newId,
          lastSavedAt: Date.now()
        };
      }),

      removeChapter: (id) => set((state) => {
        const newChapters = state.chapters.filter(c => c.id !== id);
        return {
          chapters: newChapters,
          activeChapterId: state.activeChapterId === id ? (newChapters[0]?.id || null) : state.activeChapterId,
          lastSavedAt: Date.now()
        };
      }),

      updateChapter: (id, data) => set((state) => ({
        chapters: state.chapters.map(c => c.id === id ? { ...c, ...data } : c),
        lastSavedAt: Date.now()
      })),

      setActiveChapterId: (id) => set({ 
        activeChapterId: id 
      }),

      reorderChapters: (startIndex, endIndex) => set((state) => {
        const result = Array.from(state.chapters);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return { 
          chapters: result,
          lastSavedAt: Date.now()
        };
      }),

      resetToNewBook: () => {
        const newId = uuidv4();
        const freshChapters = [{ id: newId, title: "Chapter 1", rawText: "", content: "" }];
        set({
          title: "New E-Book Project",
          coverConfig: {
            ...defaultCoverConfig,
            title: "New E-Book Project",
            subtitle: "Subtitle or Topic Overview",
            author: "Author Name"
          },
          chapters: freshChapters,
          activeChapterId: newId,
          lastSavedAt: Date.now()
        });
      },

      loadBookFromJson: (backup) => {
        const newTitle = backup.title || "Restored E-Book";
        const newChapters = (backup.chapters && backup.chapters.length > 0)
          ? backup.chapters
          : [{ id: uuidv4(), title: "Chapter 1", rawText: "", content: "" }];
        
        set({
          title: newTitle,
          coverConfig: {
            ...defaultCoverConfig,
            ...backup.coverConfig,
            title: backup.coverConfig?.title || newTitle
          },
          chapters: newChapters,
          activeChapterId: newChapters[0]?.id || null,
          lastSavedAt: Date.now()
        });
      }
    }),
    {
      name: "bookforge_notebook_autosave_v1",
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        title: state.title,
        coverConfig: state.coverConfig,
        chapters: state.chapters,
        activeChapterId: state.activeChapterId,
        lastSavedAt: state.lastSavedAt
      })
    }
  )
);

