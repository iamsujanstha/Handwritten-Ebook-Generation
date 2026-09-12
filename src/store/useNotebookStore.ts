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
  includeTocInExport: boolean;
  setIncludeTocInExport: (val: boolean) => void;
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

const defaultArchitectureMarkdown = `# Cloud Storage & Image Pipeline Architecture

This specification details the direct-to-S3 image upload workflow with asynchronous thumbnail optimization.

### Architectural Overview
The architecture eliminates backend file-buffering bottlenecks by generating short-lived presigned PUT URLs, allowing the browser to stream media directly to AWS S3, and dispatching an asynchronous Sharp Lambda processor.

\`\`\`mermaid
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
\`\`\`

### Execution Flow & Protocol
1. **Presigned URL Request:** The browser dispatches a POST request with metadata (filename, byte size, MIME type) to \`/api/uploads/presign\`.
2. **Authorization & S3 Command:** The controller routes the request to \`StorageService\`, generating a presigned PUT URL with a strict 5-minute TTL.
3. **Direct Binary Transfer:** The client performs a streaming PUT directly to \`s3://uploads/raw/\`, bypassing application server CPU/memory constraints.
4. **Asynchronous Notification:** S3 emits an \`ObjectCreated\` notification event that invokes the Sharp Lambda worker.
5. **Optimization Pipeline:** Lambda resizes images to responsive breakpoints, converts to progressive WebP format, and writes to \`s3://uploads/thumbnails/\`.
6. **Persistence:** Client submits the profile form with the verified S3 asset key to persist in the database.
`;

const defaultTocMarkdown = `## Table of Contents

*Click any chapter link below to jump directly to it:*

### [Chapter 1: Storage Architecture](#chap-wrapper-default-1)

- [Architectural Overview](#sec-c1-architectural-overview)
- [Execution Flow & Protocol](#sec-c1-execution-flow--protocol)
`;

const initialChapters: Chapter[] = [];

// Helper to filter out legacy duplicate TOC chapters while preserving real book content
export function filterLegacyTocChapters(chapters: Chapter[]): Chapter[] {
  if (!Array.isArray(chapters)) return [];
  const isToc = (c: Chapter) => 
    c.title.trim().toLowerCase() === "table of contents" || 
    c.id === "default-toc" || 
    c.id.startsWith("toc-");

  const valid = chapters.filter(c => !isToc(c));
  if (valid.length > 0) return valid;
  
  // If the book had ONLY a TOC chapter, convert it to Chapter 1 so user notes are preserved
  if (chapters.length > 0) {
    const first = chapters[0];
    return [{
      id: first.id || "default-1",
      title: first.title.toLowerCase().includes("table of contents") ? "Chapter 1: Notes" : first.title,
      rawText: first.rawText || "",
      content: first.content || ""
    }];
  }

  return [];
}

// Resilient storage wrapper with error handling and automatic legacy TOC deduplication
const safeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      
      if (name === "bookforge_notebook_autosave_v1") {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.state?.chapters && Array.isArray(parsed.state.chapters)) {
            const originalChaps: Chapter[] = parsed.state.chapters;
            const isToc = (c: Chapter) => 
              c.title.trim().toLowerCase() === "table of contents" || 
              c.id === "default-toc" || 
              c.id.startsWith("toc-");

            if (originalChaps.some(isToc)) {
              const cleaned = filterLegacyTocChapters(originalChaps);
              parsed.state.chapters = cleaned;
              
              if (!cleaned.some(c => c.id === parsed.state.activeChapterId)) {
                parsed.state.activeChapterId = cleaned[0]?.id || "__toc__";
              }
              parsed.state.includeTocInExport = true;
              return JSON.stringify(parsed);
            }
          }
        } catch (e) {
          console.warn("Storage migration parse error:", e);
        }
      }
      return raw;
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
      activeChapterId: "__cover__",
      lastSavedAt: Date.now(),
      includeTocInExport: true,
      setIncludeTocInExport: (val) => set({ includeTocInExport: val, lastSavedAt: Date.now() }),
      
      addChapter: () => set((state) => {
        const newId = uuidv4();
        const contentChapters = state.chapters.filter(c => !c.title.toLowerCase().includes("table of contents"));
        const nextNum = contentChapters.length + 1;
        return {
          chapters: [...state.chapters, { id: newId, title: `Chapter ${nextNum}`, rawText: "", content: "" }],
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
          activeChapterId: state.activeChapterId === id ? (newChapters[0]?.id || "__cover__") : state.activeChapterId,
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
        set({
          title: "New E-Book Project",
          coverConfig: {
            ...defaultCoverConfig,
            title: "New E-Book Project",
            subtitle: "Subtitle or Topic Overview",
            author: "Author Name"
          },
          chapters: [],
          activeChapterId: "__cover__",
          includeTocInExport: true,
          lastSavedAt: Date.now()
        });
      },

      loadBookFromJson: (backup) => {
        const newTitle = backup.title || "Restored E-Book";
        const rawChapters = (backup.chapters && backup.chapters.length > 0)
          ? backup.chapters
          : [{ id: uuidv4(), title: "Chapter 1", rawText: "", content: "" }];
        
        const newChapters = filterLegacyTocChapters(rawChapters);
        
        set({
          title: newTitle,
          coverConfig: {
            ...defaultCoverConfig,
            ...backup.coverConfig,
            title: backup.coverConfig?.title || newTitle
          },
          chapters: newChapters,
          activeChapterId: newChapters[0]?.id || "__toc__",
          includeTocInExport: true,
          lastSavedAt: Date.now()
        });
      }
    }),
    {
      name: "bookforge_notebook_autosave_v1",
      storage: createJSONStorage(() => safeStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const cleaned = filterLegacyTocChapters(state.chapters);
        if (cleaned.length > 0 && cleaned.length !== state.chapters.length) {
          let nextActive = state.activeChapterId;
          if (nextActive && !cleaned.some(c => c.id === nextActive) && nextActive !== "__cover__" && nextActive !== "__toc__") {
            nextActive = cleaned[0].id;
          }
          useNotebookStore.setState({
            chapters: cleaned,
            activeChapterId: nextActive,
            includeTocInExport: true
          });
        }
      },
      partialize: (state) => ({
        title: state.title,
        coverConfig: state.coverConfig,
        chapters: state.chapters,
        activeChapterId: state.activeChapterId,
        includeTocInExport: state.includeTocInExport,
        lastSavedAt: state.lastSavedAt
      })
    }
  )
);

