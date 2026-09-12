import { useState, useRef } from "react";
import { useParams } from "react-router";
import { useBookStore } from "../store/useBookStore";
import { UploadCloud, FileText, AlignLeft, Trash2, CheckCircle, Clock } from "lucide-react";

export default function SourceLibrary() {
  const { id } = useParams<{ id: string }>();
  const book = useBookStore((state) => state.books.find(b => b.id === id));
  const addSource = useBookStore((state) => state.addSource);
  const removeSource = useBookStore((state) => state.removeSource);
  const updateSource = useBookStore((state) => state.updateSource);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [pasteContent, setPasteContent] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  if (!book || !id) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Temporary source to show loading
      const tempId = crypto.randomUUID();
      addSource(id, {
        name: file.name,
        type: "PDF",
        size: file.size,
        content: ""
      });
      
      const addedSource = useBookStore.getState().books.find(b => b.id === id)?.sources.find(s => s.name === file.name && s.extractionStatus === "Pending");
      
      if (!addedSource) continue;
      
      try {
        updateSource(id, addedSource.id, { extractionStatus: "Uploading", uploadProgress: 0 });
        const formData = new FormData();
        formData.append("file", file);
        
        const data = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/extract-pdf");
          xhr.withCredentials = true;
          
          let simulatedProgress = 0;
          const progressInterval = setInterval(() => {
            simulatedProgress += (90 - simulatedProgress) * 0.1;
            updateSource(id, addedSource.id, { uploadProgress: Math.round(simulatedProgress) });
          }, 500);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const actualProgress = Math.round((event.loaded / event.total) * 100);
              if (actualProgress > simulatedProgress) {
                 simulatedProgress = actualProgress;
                 updateSource(id, addedSource.id, { uploadProgress: simulatedProgress });
                 if (simulatedProgress >= 100) {
                    updateSource(id, addedSource.id, { extractionStatus: "Extracting" });
                 }
              }
            }
          };
          
          xhr.onload = () => {
            clearInterval(progressInterval);
            updateSource(id, addedSource.id, { uploadProgress: 100, extractionStatus: "Extracting" });
            
            const contentType = xhr.getResponseHeader("content-type");
            if (contentType && contentType.indexOf("application/json") === -1) {
                const preview = xhr.responseText.substring(0, 100);
                if (preview.includes("<!doctype html>")) {
                    reject(new Error("Your session expired or the server is restarting. Please reload the page to continue."));
                } else {
                    reject(new Error(`Server returned non-JSON response. Status: ${xhr.status}, Type: ${contentType}, Body: ${preview}`));
                }
                return;
            }
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (e) {
                reject(new Error("Invalid JSON response"));
              }
            } else {
              reject(new Error("Failed to extract PDF"));
            }
          };
          
          xhr.onerror = () => { clearInterval(progressInterval); reject(new Error("Network Error")); };
          xhr.send(formData);
        });
        
        updateSource(id, addedSource.id, {
          content: data.text,
          pages: data.numpages,
          wordCount: data.text.split(/\s+/).length,
          extractionStatus: "Completed"
        });
      } catch (err) {
        console.error(err);
        updateSource(id, addedSource.id, { extractionStatus: "Failed" });
      }
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploading(false);
  };

  const handlePasteSubmit = () => {
    if (!pasteContent.trim()) return;
    
    addSource(id, {
      name: pasteTitle || `Pasted text ${new Date().toLocaleTimeString()}`,
      type: "AIResponse",
      size: pasteContent.length,
      content: pasteContent
    });
    
    // We immediately mark it as completed since we already have the text
    const addedSource = useBookStore.getState().books.find(b => b.id === id)?.sources.find(s => s.content === pasteContent && s.extractionStatus === "Pending");
    if (addedSource) {
      updateSource(id, addedSource.id, {
        wordCount: pasteContent.split(/\s+/).length,
        extractionStatus: "Completed"
      });
    }
    
    setPasteContent("");
    setPasteTitle("");
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-8 py-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 uppercase">Source Library</h2>
        <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-bold">Upload PDFs or paste text to be used as context for your book.</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Col: Add Sources */}
        <div className="w-full lg:w-1/2 space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded overflow-hidden shadow-sm">
            <div className="flex border-b border-slate-200">
              <button 
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'upload' ? 'bg-white text-orange-600 border-b-2 border-orange-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                onClick={() => setActiveTab('upload')}
              >
                Upload PDFs
              </button>
              <button 
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'paste' ? 'bg-white text-orange-600 border-b-2 border-orange-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                onClick={() => setActiveTab('paste')}
              >
                Paste Text
              </button>
            </div>
            
            <div className="p-6">
              {activeTab === 'upload' ? (
                <div 
                  className="border-2 border-dashed border-slate-300 rounded p-10 text-center hover:border-orange-400 hover:bg-orange-50 transition-colors cursor-pointer bg-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-900 mb-1 uppercase tracking-widest">Click to upload or drag and drop</p>
                  <p className="text-xs text-slate-500 mb-4 font-bold uppercase tracking-widest">PDF, DOCX, MD, TXT up to 50MB</p>
                  <button className="px-4 py-2 bg-white border border-slate-300 rounded text-sm font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50">
                    Select Files
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,text/plain,.pdf,.doc,.docx,.md,.txt" 
                    multiple 
                    onChange={handleFileUpload} 
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Source Title (optional)"
                    className="w-full px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm font-bold bg-white"
                    value={pasteTitle}
                    onChange={(e) => setPasteTitle(e.target.value)}
                  />
                  <textarea
                    rows={8}
                    className="w-full px-4 py-3 border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none text-sm font-mono bg-white"
                    placeholder="Paste ChatGPT/Gemini/Claude response, Markdown, or plain text here..."
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={handlePasteSubmit}
                      disabled={!pasteContent.trim()}
                      className="px-4 py-2 bg-orange-600 text-white rounded font-bold uppercase tracking-widest text-sm hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                      Add to Library
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Col: Source List */}
        <div className="w-full lg:w-1/2">
          <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest">Your Sources ({book.sources.length})</h3>
          
          {book.sources.length === 0 ? (
            <div className="text-center py-12 border border-slate-200 border-dashed rounded bg-slate-50">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No sources added yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {book.sources.map(source => (
                <div key={source.id} className="flex items-center justify-between p-4 border border-slate-200 rounded hover:shadow-sm transition-shadow bg-white">
                  <div className="flex items-start">
                    <div className="p-2 bg-orange-50 rounded mr-4">
                      {source.type === 'PDF' ? <FileText className="w-5 h-5 text-orange-600" /> : <AlignLeft className="w-5 h-5 text-orange-600" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{source.name}</h4>
                      <div className="flex items-center mt-1 space-x-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                        <span>{(source.size / 1024).toFixed(1)} KB</span>
                        {source.pages && <span>{source.pages} pages</span>}
                        {source.wordCount > 0 && <span>~{source.wordCount} words</span>}
                        
                        <span className="flex items-center">
                          {source.extractionStatus === 'Completed' && <CheckCircle className="w-3 h-3 text-green-500 mr-1" />}
                          {(source.extractionStatus === 'Pending' || source.extractionStatus === 'Uploading' || source.extractionStatus === 'Extracting') && <Clock className="w-3 h-3 text-yellow-500 mr-1" />}
                          {source.extractionStatus === 'Failed' && <span className="w-2 h-2 rounded-full bg-red-500 mr-1" />}
                          {source.extractionStatus === 'Uploading' ? `Uploading ${source.uploadProgress || 0}%` : source.extractionStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeSource(id, source.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
