export interface CoverPageConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  author: string;
  edition: string;
  template: "notebook" | "blueprint" | "minimal" | "vintage" | "modern";
  accentColor: string;
  imageUrl?: string;
  imagePrompt?: string;
  imagePosition?: "center" | "top" | "card";
}

export interface Book {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  description: string;
  language: string;
  themeId: string;
  coverConfig?: CoverPageConfig;
  chapters: Chapter[];
  settings: BookSettings;
  sources: Source[];
  createdAt: string;
  updatedAt: string;
}

export interface Source {
  id: string;
  name: string;
  type: "PDF" | "Markdown" | "PlainText" | "AIResponse" | "DOCX" | string;
  size: number;
  pages?: number;
  extractionStatus: "Pending" | "Uploading" | "Extracting" | "Completed" | "Failed";
  uploadProgress?: number;
  content: string;
  createdAt: string;
  wordCount: number;
}

export interface Chapter {
  id: string;
  title: string;
  sections: Section[];
}

export interface Section {
  id: string;
  title: string;
  content: string; // Markdown content
  description?: string;
  purpose?: string;
  sourceIds?: string[];
  conflicts?: { description: string; sourceNames: string[] }[];
}

export interface BookSettings {
  includeToc: boolean;
  includeSources: boolean;
  includeGlossary: boolean;
  includeIndex: boolean;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  typography: {
    bodyFont: string;
    headingFont: string;
    codeFont: string;
  };
  colors: {
    primary: string;
    accent: string;
    codeBg: string;
    text: string;
    bg: string;
  };
}
