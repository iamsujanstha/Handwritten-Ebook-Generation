import React, { useState, useEffect, useRef } from "react";
import { CheckCircle2, Cloud, HardDrive, Download, Upload, RotateCcw, AlertTriangle, ChevronDown, Check } from "lucide-react";
import { useNotebookStore } from "../store/useNotebookStore";

interface AutoSaveIndicatorProps {
  compact?: boolean;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({ compact = false }) => {
  const { 
    lastSavedAt, 
    title, 
    coverConfig, 
    chapters, 
    resetToNewBook, 
    loadBookFromJson 
  } = useNotebookStore();

  const [timeAgoText, setTimeAgoText] = useState<string>("Saved");
  const [isSavingPulse, setIsSavingPulse] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const prevSavedAtRef = useRef<number | null>(lastSavedAt);

  // Trigger brief saving animation on save timestamp update
  useEffect(() => {
    if (lastSavedAt && lastSavedAt !== prevSavedAtRef.current) {
      prevSavedAtRef.current = lastSavedAt;
      setIsSavingPulse(true);
      const timer = setTimeout(() => setIsSavingPulse(false), 800);
      return () => clearTimeout(timer);
    }
  }, [lastSavedAt]);

  // Update relative time string every 10 seconds
  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastSavedAt) {
        setTimeAgoText("Saved");
        return;
      }
      const elapsedSeconds = Math.floor((Date.now() - lastSavedAt) / 1000);
      if (elapsedSeconds < 5) {
        setTimeAgoText("Saved just now");
      } else if (elapsedSeconds < 60) {
        setTimeAgoText(`Saved ${elapsedSeconds}s ago`);
      } else {
        const date = new Date(lastSavedAt);
        const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setTimeAgoText(`Saved at ${timeStr}`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 5000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  // Close dropdown menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isMenuOpen]);

  // Listen for storage quota warnings
  useEffect(() => {
    const handleStorageError = (e: any) => {
      setStorageWarning(e.detail || "Local storage quota limit approaching.");
    };
    window.addEventListener("bookforge-storage-error", handleStorageError);
    return () => window.removeEventListener("bookforge-storage-error", handleStorageError);
  }, []);

  // Calculate approximate storage footprint
  const calculateStorageSize = () => {
    try {
      const data = localStorage.getItem("bookforge_notebook_autosave_v1");
      if (!data) return "0 KB";
      const bytes = new Blob([data]).size;
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } catch {
      return "Local";
    }
  };

  // Export JSON backup
  const handleExportBackup = () => {
    const backupData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      title,
      coverConfig,
      chapters
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "book").replace(/[^a-zA-Z0-9_-]/g, "_")}_backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsMenuOpen(false);
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.chapters && Array.isArray(parsed.chapters)) {
          loadBookFromJson(parsed);
          setCopiedNotification(true);
          setTimeout(() => setCopiedNotification(false), 3000);
          setIsMenuOpen(false);
        } else {
          alert("Invalid backup file: Missing chapters array.");
        }
      } catch (err: any) {
        alert("Failed to parse backup JSON: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* Indicator Pill */}
      <button
        type="button"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        title="Your changes are automatically saved to local storage. Click to manage drafts and backups."
        className={`flex items-center gap-1.5 transition-all rounded-md px-2 py-1 text-xs font-medium cursor-pointer ${
          storageWarning
            ? "bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
            : isSavingPulse
            ? "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
            : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100/80"
        }`}
      >
        {storageWarning ? (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        ) : isSavingPulse ? (
          <Cloud className="w-3.5 h-3.5 text-blue-600 animate-bounce shrink-0" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        )}
        
        <span className="font-semibold tracking-tight truncate max-w-[120px] sm:max-w-[150px]">
          {isSavingPulse ? "Auto-saving..." : timeAgoText}
        </span>

        {!compact && (
          <ChevronDown className="w-3 h-3 text-slate-400 opacity-70 group-hover:opacity-100 shrink-0 ml-0.5" />
        )}
      </button>

      {/* Hidden File Input for JSON Backup Import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportBackup}
      />

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                Local Storage Active
              </span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-mono">
                {calculateStorageSize()}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 leading-snug">
              Every keystroke, chapter, and cover edit is automatically persisted to your browser storage. Accidental refreshes won't lose your work!
            </p>
          </div>

          {storageWarning && (
            <div className="mx-2 my-1.5 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 leading-tight">
              <strong>Storage Warning:</strong> {storageWarning}
            </div>
          )}

          {copiedNotification && (
            <div className="mx-2 my-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-800 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Draft restored successfully!
            </div>
          )}

          <div className="py-1">
            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <div>
                <div className="font-semibold">Export JSON Backup</div>
                <div className="text-[10px] text-slate-400">Save current draft to your computer</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <div>
                <div className="font-semibold">Import JSON Backup</div>
                <div className="text-[10px] text-slate-400">Restore book draft from a .json file</div>
              </div>
            </button>
          </div>

          <div className="border-t border-slate-100 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowConfirmReset(true);
                setIsMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-500" />
              <div>
                <div className="font-semibold">Start New Book / Clear Draft</div>
                <div className="text-[10px] text-red-400">Reset store to an empty book</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Resetting Draft */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <RotateCcw className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Start New Book?</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              This will clear your currently auto-saved chapters and cover setup from browser storage and start a fresh book draft.
              <br /><br />
              <strong>Tip:</strong> You can download a backup copy first if you want to keep this book.
            </p>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download Backup
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(false)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetToNewBook();
                    setShowConfirmReset(false);
                  }}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold shadow-xs transition-colors"
                >
                  Reset & Start Fresh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
