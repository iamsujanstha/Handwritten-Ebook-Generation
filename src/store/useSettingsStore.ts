import { create } from "zustand";

interface SettingsState {
  geminiModel: string;
  userApiKey: string;
  setGeminiModel: (model: string) => void;
  setUserApiKey: (key: string) => void;
}

const savedModel = localStorage.getItem("geminiModel") || "gemini-3.5-flash";
const savedKey = localStorage.getItem("userApiKey") || "";

export const useSettingsStore = create<SettingsState>((set) => ({
  geminiModel: savedModel,
  userApiKey: savedKey,
  setGeminiModel: (model) => {
    localStorage.setItem("geminiModel", model);
    set({ geminiModel: model });
  },
  setUserApiKey: (key) => {
    localStorage.setItem("userApiKey", key);
    set({ userApiKey: key });
  }
}));
