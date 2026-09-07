import { useSettingsStore } from "../store/useSettingsStore";
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useBookStore } from "../store/useBookStore";
import { Chapter, Section } from "../types";
import { v4 as uuidv4 } from "uuid";
import { Sparkles, Save, GripVertical, Trash2, Plus, Edit2, CheckCircle2, Circle, AlertTriangle, FileText, ChevronDown, Combine, SplitSquareHorizontal } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export default function Architect() {
  const { geminiModel, userApiKey } = useSettingsStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const book = useBookStore((state) => state.books.find(b => b.id === id));
  const updateChapters = useBookStore((state) => state.updateChapters);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [localChapters, setLocalChapters] = useState<Chapter[]>(book?.chapters || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  
  // Advanced Progress States
  const [analysisProgress, setAnalysisProgress] = useState<{stage: string, message: string, progress?: number} | null>(null);
  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  if (!book || !id) return null;

  const handleAnalyze = async (options?: any) => {
    if (book.sources.length === 0) {
      alert("Please add some sources first.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress({ stage: "STARTING", message: "Initializing analysis pipeline..." });
    setCompletedStages([]);
    setShowOptions(false);

    try {
      const response = await fetch("/api/architect-stream", {
        
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gemini-model": geminiModel, "x-gemini-api-key": userApiKey },
        body: JSON.stringify({ 
          title: book.title,
          description: book.description,
          options: options || "Standard professional organization",
          sources: book.sources.filter(s => s.extractionStatus === "Completed").map(s => ({
            id: s.id,
            name: s.name,
            content: s.content.substring(0, 500000) // 500k limit to be safe on bandwidth
          }))
        })
      });

      if (!response.ok) throw new Error("Failed to start analysis");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          
          for (const part of parts) {
            const lines = part.split("\n");
            let eventType = "";
            let data = "";
            
            for (const line of lines) {
              if (line.startsWith("event: ")) eventType = line.substring(7);
              if (line.startsWith("data: ")) data = line.substring(6);
            }
            
            if (eventType === "progress") {
               const progressData = JSON.parse(data);
               setAnalysisProgress(progressData);
               
               // Mark previous stages as completed
               setCompletedStages(prev => {
                 const stages = ["NORMALIZATION", "CHUNKING", "TOPIC_ANALYSIS", "DUPLICATE_DETECTION", "RELATIONSHIP_ANALYSIS", "BOOK_OUTLINE"];
                 const currentIndex = stages.indexOf(progressData.stage);
                 if (currentIndex > 0) {
                    const newCompleted = new Set(prev);
                    for (let i = 0; i < currentIndex; i++) {
                       newCompleted.add(stages[i]);
                    }
                    return Array.from(newCompleted);
                 }
                 return prev;
               });

            } else if (eventType === "complete") {
               const outlineData = JSON.parse(data).outline;
               setCompletedStages(["NORMALIZATION", "CHUNKING", "TOPIC_ANALYSIS", "DUPLICATE_DETECTION", "RELATIONSHIP_ANALYSIS", "BOOK_OUTLINE"]);
               
               const newChapters: Chapter[] = (outlineData.chapters || []).map((c: any) => ({
                 id: uuidv4(),
                 title: c.title,
                 sections: (c.sections || []).map((s: any) => ({
                   id: uuidv4(),
                   title: s.title,
                   description: s.description,
                   purpose: s.purpose,
                   sourceIds: s.sourceIds,
                   conflicts: s.conflicts,
                   content: ""
                 }))
               }));
         
               setLocalChapters(newChapters);
               updateChapters(id, newChapters);
               setIsAnalyzing(false);
            } else if (eventType === "error") {
               console.error("Analysis error:", JSON.parse(data));
               alert("Analysis failed: " + JSON.parse(data).message);
               setIsAnalyzing(false);
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      alert("Analysis failed. See console for details.");
      setIsAnalyzing(false);
    }
  };

  const saveStructure = () => {
    updateChapters(id, localChapters);
    navigate(`/book/${id}/editor`);
  };

  const addChapter = () => {
    const newChapter: Chapter = { id: uuidv4(), title: "New Chapter", sections: [] };
    setLocalChapters([...localChapters, newChapter]);
  };

  const addSection = (chapterId: string) => {
    setLocalChapters(localChapters.map(c => {
      if (c.id === chapterId) {
        return { ...c, sections: [...c.sections, { id: uuidv4(), title: "New Section", content: "" }] };
      }
      return c;
    }));
  };

  const deleteChapter = (chapterId: string) => {
    setLocalChapters(localChapters.filter(c => c.id !== chapterId));
  };

  const deleteSection = (chapterId: string, sectionId: string) => {
    setLocalChapters(localChapters.map(c => {
      if (c.id === chapterId) {
        return { ...c, sections: c.sections.filter(s => s.id !== sectionId) };
      }
      return c;
    }));
  };

  const startEditing = (id: string, text: string) => {
    setEditingId(id);
    setEditingText(text);
  };

  const saveEditing = (chapterId: string, sectionId?: string) => {
    if (sectionId) {
      setLocalChapters(localChapters.map(c => {
        if (c.id === chapterId) {
          return { ...c, sections: c.sections.map(s => s.id === sectionId ? { ...s, title: editingText } : s) };
        }
        return c;
      }));
    } else {
      setLocalChapters(localChapters.map(c => c.id === chapterId ? { ...c, title: editingText } : c));
    }
    setEditingId(null);
  };

  const moveChapter = (chapterId: string, direction: number) => {
    const index = localChapters.findIndex(c => c.id === chapterId);
    if (index < 0) return;
    if (index === 0 && direction === -1) return;
    if (index === localChapters.length - 1 && direction === 1) return;
    
    const newChapters = [...localChapters];
    const temp = newChapters[index];
    newChapters[index] = newChapters[index + direction];
    newChapters[index + direction] = temp;
    
    setLocalChapters(newChapters);
  };

  const moveSection = (chapterId: string, sectionId: string, direction: number) => {
    setLocalChapters(localChapters.map(c => {
      if (c.id === chapterId) {
        const index = c.sections.findIndex(s => s.id === sectionId);
        if (index < 0) return c;
        if (index === 0 && direction === -1) return c;
        if (index === c.sections.length - 1 && direction === 1) return c;
        
        const newSections = [...c.sections];
        const temp = newSections[index];
        newSections[index] = newSections[index + direction];
        newSections[index + direction] = temp;
        
        return { ...c, sections: newSections };
      }
      return c;
    }));
  };

  const mergeSection = (chapterId: string, sectionIndex: number) => {
    setLocalChapters(localChapters.map(c => {
      if (c.id === chapterId) {
        if (sectionIndex >= c.sections.length - 1) return c;
        const newSections = [...c.sections];
        const current = newSections[sectionIndex];
        const next = newSections[sectionIndex + 1];
        
        const merged: Section = {
          ...current,
          title: `${current.title} & ${next.title}`,
          description: [current.description, next.description].filter(Boolean).join("\\n\\n"),
          purpose: [current.purpose, next.purpose].filter(Boolean).join("\\n\\n"),
          sourceIds: Array.from(new Set([...(current.sourceIds || []), ...(next.sourceIds || [])])),
          conflicts: [...(current.conflicts || []), ...(next.conflicts || [])]
        };
        
        newSections.splice(sectionIndex, 2, merged);
        return { ...c, sections: newSections };
      }
      return c;
    }));
  };

  const splitSection = (chapterId: string, sectionIndex: number) => {
    setLocalChapters(localChapters.map(c => {
      if (c.id === chapterId) {
        const newSections = [...c.sections];
        const current = newSections[sectionIndex];
        
        const split1: Section = { ...current, id: uuidv4(), title: `${current.title} (Part 1)` };
        const split2: Section = { ...current, id: uuidv4(), title: `${current.title} (Part 2)` };
        
        newSections.splice(sectionIndex, 1, split1, split2);
        return { ...c, sections: newSections };
      }
      return c;
    }));
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === "chapter") {
      const newChapters = Array.from(localChapters);
      const [reordered] = newChapters.splice(source.index, 1);
      newChapters.splice(destination.index, 0, reordered);
      setLocalChapters(newChapters);
    } else if (type === "section") {
      const sourceChapterId = source.droppableId;
      const destChapterId = destination.droppableId;
      
      const newChapters = Array.from(localChapters);
      const sourceChapterIndex = newChapters.findIndex(c => c.id === sourceChapterId);
      const destChapterIndex = newChapters.findIndex(c => c.id === destChapterId);
      
      const sourceChapter = newChapters[sourceChapterIndex];
      const destChapter = newChapters[destChapterIndex];
      
      const sourceSections = Array.from(sourceChapter.sections);
      const destSections = sourceChapterId === destChapterId ? sourceSections : Array.from(destChapter.sections);
      
      const [reordered] = sourceSections.splice(source.index, 1);
      destSections.splice(destination.index, 0, reordered);
      
      newChapters[sourceChapterIndex] = { ...sourceChapter, sections: sourceSections };
      if (sourceChapterId !== destChapterId) {
        newChapters[destChapterIndex] = { ...destChapter, sections: destSections };
      }
      
      setLocalChapters(newChapters);
    }
  };

  const ProgressItem = ({ label, stage, currentStage }: { label: string, stage: string, currentStage: string | undefined }) => {
    const isCompleted = completedStages.includes(stage) || (stage === "NORMALIZATION" && completedStages.includes("CHUNKING"));
    const isActive = currentStage === stage || (currentStage === "CHUNKING" && stage === "NORMALIZATION");
    
    return (
      <div className={`flex items-center space-x-3 p-2 rounded ${isActive ? 'bg-orange-50' : ''}`}>
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
        ) : isActive ? (
          <div className="w-5 h-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin flex-shrink-0" />
        ) : (
          <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
        )}
        <span className={`text-sm font-bold uppercase tracking-widest ${isActive ? 'text-orange-700' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 uppercase">AI Book Architect</h2>
          <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-bold">Review and modify the AI-proposed book structure.</p>
        </div>
        <div className="flex space-x-4">
          <div className="relative">
            <button 
              onClick={() => setShowOptions(!showOptions)}
              disabled={isAnalyzing}
              className="flex items-center px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded font-bold uppercase tracking-widest text-xs hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 mr-2 text-orange-600" />
              {isAnalyzing ? "Analyzing Sources..." : (localChapters.length > 0 ? "Regenerate Outline" : "Analyze Sources")}
            </button>
            
            {showOptions && !isAnalyzing && (
              <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-slate-200 shadow-lg rounded z-50">
                <div className="p-2 flex flex-col">
                  <button onClick={() => handleAnalyze("Standard professional organization")} className="text-left px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50">Regenerate Standard</button>
                  <button onClick={() => handleAnalyze("Make it very concise and direct")} className="text-left px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50">Make More Concise</button>
                  <button onClick={() => handleAnalyze("Make it highly comprehensive and detailed")} className="text-left px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50">Make More Comprehensive</button>
                  <button onClick={() => handleAnalyze("Organize for Beginners (step-by-step, simple concepts first)")} className="text-left px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50">Organize for Beginners</button>
                  <button onClick={() => handleAnalyze("Organize for Senior Engineers (advanced patterns, skip basics)")} className="text-left px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50">Organize for Senior Engineers</button>
                  <button onClick={() => handleAnalyze("Organize as Interview Preparation (Q&A style, fast review)")} className="text-left px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50">Organize as Interview Prep</button>
                  <button onClick={() => handleAnalyze("Organize as Reference Book (alphabetical or strictly categorical)")} className="text-left px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50">Organize as Reference Book</button>
                </div>
              </div>
            )}
          </div>
          
          {localChapters.length > 0 && (
            <button 
              onClick={saveStructure}
              className="flex items-center px-4 py-2 bg-orange-600 text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-orange-700 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              Save & Edit Content
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
        {isAnalyzing ? (
          <div className="py-20 max-w-lg mx-auto">
            <h3 className="text-slate-900 font-bold uppercase tracking-widest mb-6 text-center text-lg">AI Analysis in Progress</h3>
            
            <div className="space-y-2 bg-white p-8 rounded shadow-sm border border-slate-200">
              <ProgressItem label="Sources processed" stage="NORMALIZATION" currentStage={analysisProgress?.stage} />
              <ProgressItem label="Topics identified" stage="TOPIC_ANALYSIS" currentStage={analysisProgress?.stage} />
              <ProgressItem label="Duplicate content detected" stage="DUPLICATE_DETECTION" currentStage={analysisProgress?.stage} />
              <ProgressItem label="Relationships identified" stage="RELATIONSHIP_ANALYSIS" currentStage={analysisProgress?.stage} />
              <ProgressItem label="Building outline" stage="BOOK_OUTLINE" currentStage={analysisProgress?.stage} />
              
              <div className="mt-6 p-4 bg-slate-50 rounded border border-slate-100 text-center">
                <p className="text-slate-600 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  {analysisProgress?.message || "Analyzing..."}
                  {analysisProgress?.progress ? ` (${analysisProgress.progress}%)` : ""}
                </p>
              </div>
            </div>
          </div>
        ) : localChapters.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded bg-slate-50">
            <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-1 uppercase tracking-widest">No structure yet</h3>
            <p className="text-slate-500 mb-6 font-bold uppercase tracking-widest text-xs">Click Analyze Sources to have AI propose a structure based on your library.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-lg flex items-center uppercase tracking-widest">
                <span className="text-orange-600 mr-2">■</span> {book.title}
              </h3>
              <button onClick={addChapter} className="text-xs font-bold uppercase tracking-widest text-orange-600 hover:text-orange-700 flex items-center">
                <Plus className="w-4 h-4 mr-1" /> Add Chapter
              </button>
            </div>
            
            <div className="space-y-4 pl-4 border-l-2 border-slate-100">
              {localChapters.map((chapter) => (
                <div key={chapter.id} className="space-y-2">
                  <div className="flex items-center group">
                    <GripVertical className="w-4 h-4 text-slate-300 mr-2" />
                    {editingId === chapter.id ? (
                      <input 
                        type="text"
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={() => saveEditing(chapter.id)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEditing(chapter.id)}
                        className="px-2 py-1 text-sm font-bold uppercase tracking-widest border-b border-orange-500 outline-none w-64 bg-slate-50"
                      />
                    ) : (
                      <span className="font-bold text-slate-900 text-sm uppercase tracking-widest">{chapter.title}</span>
                    )}
                    
                    <div className="ml-auto flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => moveChapter(chapter.id, -1)} className="text-xs text-slate-500 hover:text-orange-600">↑</button>
                      <button onClick={() => moveChapter(chapter.id, 1)} className="text-xs text-slate-500 hover:text-orange-600">↓</button>
                      <button onClick={() => addSection(chapter.id)} className="text-xs text-slate-500 hover:text-orange-600">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button onClick={() => startEditing(chapter.id, chapter.title)} className="text-xs text-slate-500 hover:text-orange-600">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteChapter(chapter.id)} className="text-xs text-slate-500 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Sections */}
                  <div className="pl-6 space-y-1">
                    {chapter.sections.map((section) => (
                      <div key={section.id} className="group border-b border-slate-50 last:border-0 pb-1 mb-1">
                        <div className="flex items-center py-1">
                          <GripVertical className="w-3.5 h-3.5 text-slate-200 mr-2" />
                          <div className="w-4 h-px bg-slate-300 mr-2"></div>
                          {editingId === section.id ? (
                            <input 
                              type="text"
                              autoFocus
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onBlur={() => saveEditing(chapter.id, section.id)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEditing(chapter.id, section.id)}
                              className="px-2 py-0.5 text-sm font-bold border-b border-orange-500 outline-none w-64 bg-slate-50"
                            />
                          ) : (
                            <span className="text-sm font-bold text-slate-700">{section.title}</span>
                          )}
                          
                          {section.conflicts && section.conflicts.length > 0 && (
                            <div className="ml-3 flex items-center px-2 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold uppercase tracking-widest cursor-pointer" onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}>
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Conflict Detected
                            </div>
                          )}
                          
                          <div className="ml-auto flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)} className="text-xs text-slate-400 hover:text-orange-600">
                              <ChevronDown className={`w-4 h-4 transform transition-transform ${expandedSection === section.id ? 'rotate-180' : ''}`} />
                            </button>
                            <button onClick={() => moveSection(chapter.id, section.id, -1)} className="text-xs text-slate-400 hover:text-orange-600">↑</button>
                            <button onClick={() => moveSection(chapter.id, section.id, 1)} className="text-xs text-slate-400 hover:text-orange-600">↓</button>
                            <button onClick={() => startEditing(section.id, section.title)} className="text-xs text-slate-400 hover:text-orange-600">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => deleteSection(chapter.id, section.id)} className="text-xs text-slate-400 hover:text-red-600">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Expanded details (purpose, sources, conflicts) */}
                        {expandedSection === section.id && (
                          <div className="pl-10 pr-4 py-3 bg-slate-50 mt-1 rounded text-xs">
                            {section.purpose && (
                              <div className="mb-3">
                                <span className="font-bold text-slate-500 uppercase tracking-widest block mb-1">Purpose:</span>
                                <span className="text-slate-700 leading-relaxed">{section.purpose}</span>
                              </div>
                            )}
                            
                            {section.conflicts && section.conflicts.length > 0 && (
                              <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded">
                                <span className="font-bold text-red-700 uppercase tracking-widest block mb-2 flex items-center">
                                  <AlertTriangle className="w-4 h-4 mr-1" /> Potential Contradictions Detected
                                </span>
                                {section.conflicts.map((conflict, i) => (
                                  <div key={i} className="mb-2 last:mb-0 text-red-600">
                                    <p className="font-medium">{conflict.description}</p>
                                    <p className="mt-1 text-[10px] uppercase tracking-widest opacity-80">Sources: {conflict.sourceNames?.join(", ")}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {section.sourceIds && section.sourceIds.length > 0 && (
                              <div>
                                <span className="font-bold text-slate-500 uppercase tracking-widest block mb-1">Generated from sources:</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {section.sourceIds.map((sid, i) => {
                                    const sname = book.sources.find(s => s.id === sid)?.name || sid;
                                    return (
                                      <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-600 flex items-center shadow-sm">
                                        <FileText className="w-3 h-3 mr-1" /> {sname}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {chapter.sections.length === 0 && (
                      <div className="pl-12 text-xs font-bold uppercase tracking-widest text-slate-400">No sections</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LayoutTemplate(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
      <line x1="3" x2="21" y1="9" y2="9"/>
      <line x1="9" x2="9" y1="21" y2="9"/>
    </svg>
  )
}

