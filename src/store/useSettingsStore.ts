import { create } from "zustand";

export interface TokenUsage {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  hits: number;
}

export interface QuotaEntry {
  timestamp: number;
  tokens: number;
}

interface SettingsState {
  geminiModel: string;
  userApiKey: string;
  apiBaseUrl: string;
  tokenUsage: TokenUsage;
  quotaHistory: QuotaEntry[];
  setGeminiModel: (model: string) => void;
  setUserApiKey: (key: string) => void;
  setApiBaseUrl: (url: string) => void;
  addTokenUsage: (usage: Partial<TokenUsage>) => void;
  recordQuotaUsage: (tokens: number) => void;
}

let savedModel = localStorage.getItem("geminiModel") || "gemini-2.5-flash";
if (
  !savedModel ||
  savedModel.includes("hermes") ||
  savedModel.includes("nousresearch") ||
  savedModel.includes("openrouter") ||
  savedModel.includes("1.5") ||
  savedModel.includes("3.5-pro") ||
  savedModel.includes("2.0")
) {
  savedModel = "gemini-2.5-flash";
  localStorage.setItem("geminiModel", savedModel);
}

// Clean up any stale gimmicky third-party base URLs or custom keys
localStorage.removeItem("apiBaseUrl");
localStorage.removeItem("userApiKey");
const savedKey = "";
const savedBaseUrl = "";

// Load token usage if available
const savedTokenUsage = localStorage.getItem("tokenUsage");
const initialTokenUsage: TokenUsage = savedTokenUsage 
  ? JSON.parse(savedTokenUsage) 
  : { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0, hits: 0 };

export const useSettingsStore = create<SettingsState>((set) => ({
  geminiModel: savedModel,
  userApiKey: savedKey,
  apiBaseUrl: savedBaseUrl,
  tokenUsage: initialTokenUsage,
  quotaHistory: [],
  setGeminiModel: (model) => {
    localStorage.setItem("geminiModel", model);
    set({ geminiModel: model });
  },
  setApiBaseUrl: (url) => {
    localStorage.setItem("apiBaseUrl", url);
    set({ apiBaseUrl: url });
  },
  setUserApiKey: (key) => {
    localStorage.setItem("userApiKey", key);
    set({ userApiKey: key });
  },
  recordQuotaUsage: (tokens) => {
    set((state) => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      const recentHistory = state.quotaHistory.filter(h => h.timestamp > oneMinuteAgo);
      recentHistory.push({ timestamp: now, tokens });
      return { quotaHistory: recentHistory };
    });
  },
  addTokenUsage: (usage) => {
    set((state) => {
      const newTokenUsage = {
        promptTokenCount: state.tokenUsage.promptTokenCount + (usage.promptTokenCount || 0),
        candidatesTokenCount: state.tokenUsage.candidatesTokenCount + (usage.candidatesTokenCount || 0),
        totalTokenCount: state.tokenUsage.totalTokenCount + (usage.totalTokenCount || 0),
        hits: state.tokenUsage.hits + (usage.hits || 0),
      };
      
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      const recentHistory = state.quotaHistory.filter(h => h.timestamp > oneMinuteAgo);
      
      // If it's a new hit, add a new entry.
      // If it's a token correction (hits: 0), find the latest hit and add tokens to it.
      if (usage.hits && usage.hits > 0) {
        recentHistory.push({ timestamp: now, tokens: usage.totalTokenCount || 0 });
      } else if (usage.totalTokenCount && recentHistory.length > 0) {
        recentHistory[recentHistory.length - 1].tokens += usage.totalTokenCount;
      }

      localStorage.setItem("tokenUsage", JSON.stringify(newTokenUsage));
      return { tokenUsage: newTokenUsage, quotaHistory: recentHistory };
    });
  }
}));
