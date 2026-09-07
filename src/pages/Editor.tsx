import { useSettingsStore } from "../store/useSettingsStore";
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router";
import { useBookStore } from "../store/useBookStore";
import { Sparkles, Save, BookOpen, Plus, GripVertical, FileText, Upload, ImagePlus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { v4 as uuidv4 } from "uuid";
import MermaidDiagram from "../components/MermaidDiagram";
import { handleImagePaste, handleImageDrop, uploadImageFile, insertTextAtCursor } from "../lib/imageUtils";

export default function Editor() {
  const { geminiModel, userApiKey } = useSettingsStore();
  const { id } = useParams<{ id: string }>();
  const book = useBookStore((state) => state.books.find(b => b.id === id));
  const updateChapters = useBookStore((state) => state.updateChapters);
  const updateSectionContent = useBookStore((state) => state.updateSectionContent);
  
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  
  const [rawInput, setRawInput] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const rawInputRef = useRef<HTMLTextAreaElement>(null);
  const editContentRef = useRef<HTMLTextAreaElement>(null);

  const [isExtracting, setIsExtracting] = useState(false);
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);
    
    setIsExtracting(true);
    try {
      const response = await fetch("/api/extract-pdf", {
        
        method: "POST",
        body: formData
      });
      if (!response.ok) throw new Error("Failed to extract PDF");
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
        throw new Error("Your session expired or the server is restarting. Please reload the page to continue.");
      }
      const data = await response.json();
      setRawInput(prev => prev + "\n\n" + data.text);
    } catch (error) {
      console.error(error);
      alert("Failed to parse PDF");
    } finally {
      setIsExtracting(false);
    }
  };


  useEffect(() => {
    if (book && !activeChapterId && book.chapters.length > 0) {
      setActiveChapterId(book.chapters[0].id);
      if (book.chapters[0].sections.length > 0) {
        setActiveSectionId(book.chapters[0].sections[0].id);
      }
    }
  }, [book, activeChapterId]);

  if (!book || !id) return null;

  const activeChapter = book.chapters.find(c => c.id === activeChapterId);
  const activeSection = activeChapter?.sections.find(s => s.id === activeSectionId);

  const handleGenerate = async () => {
    if (!activeSection || !activeChapter || !rawInput.trim()) {
      alert("Please enter some raw text or notes first.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await fetch("/api/format-direct", {
        
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gemini-model": geminiModel, "x-gemini-api-key": userApiKey },
        body: JSON.stringify({
          chapterTitle: activeChapter.title,
          sectionTitle: activeSection.title,
          rawText: rawInput
        })
      });

      if (!response.ok) throw new Error("Failed to format content");
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
        throw new Error("Your session expired or the server is restarting. Please reload the page to continue.");
      }
      const data = await response.json();
      
      updateSectionContent(id, activeChapter.id, activeSection.id, data.content);
      setRawInput(""); // clear after generation
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      alert("Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination, type } = result;
    
    if (type === "chapter") {
      const newChapters = Array.from(book.chapters);
      const [removed] = newChapters.splice(source.index, 1);
      newChapters.splice(destination.index, 0, removed);
      updateChapters(id, newChapters);
    } else if (type === "section") {
      const chapterId = source.droppableId;
      if (chapterId !== destination.droppableId) return; // Disallow cross-chapter for now to keep it simple
      
      const chapterIndex = book.chapters.findIndex(c => c.id === chapterId);
      if (chapterIndex === -1) return;
      
      const newChapters = JSON.parse(JSON.stringify(book.chapters));
      const chapter = newChapters[chapterIndex];
      const [removed] = chapter.sections.splice(source.index, 1);
      chapter.sections.splice(destination.index, 0, removed);
      
      updateChapters(id, newChapters);
    }
  };

  const addNewChapter = () => {
    const newChapterId = uuidv4();
    const newSectionId = uuidv4();
    const newChapters = [...book.chapters, {
      id: newChapterId,
      title: "New Chapter",
      description: "",
      sections: [{
        id: newSectionId,
        title: "Introduction",
        purpose: "",
        conflicts: [],
        sourceIds: [],
        content: ""
      }]
    }];
    updateChapters(id, newChapters);
    setActiveChapterId(newChapterId);
    setActiveSectionId(newSectionId);
  };

  const addNewSection = (chapterId: string) => {
    const newSectionId = uuidv4();
    const newChapters = book.chapters.map(c => {
      if (c.id === chapterId) {
        return {
          ...c,
          sections: [...c.sections, {
             id: newSectionId,
             title: "New Section",
             purpose: "",
             conflicts: [],
             sourceIds: [],
             content: ""
          }]
        };
      }
      return c;
    });
    updateChapters(id, newChapters);
    setActiveChapterId(chapterId);
    setActiveSectionId(newSectionId);
  };

  const updateChapterTitle = (chapterId: string, title: string) => {
    const newChapters = book.chapters.map(c => c.id === chapterId ? { ...c, title } : c);
    updateChapters(id, newChapters);
  };

  const updateSectionTitle = (chapterId: string, sectionId: string, title: string) => {
    const newChapters = book.chapters.map(c => {
      if (c.id === chapterId) {
        return {
          ...c,
          sections: c.sections.map(s => s.id === sectionId ? { ...s, title } : s)
        };
      }
      return c;
    });
    updateChapters(id, newChapters);
  };

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar with Drag & Drop */}
      <div className="w-80 border-r border-slate-200 bg-slate-50 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-slate-200 font-bold uppercase tracking-widest text-xs text-slate-900 sticky top-0 bg-slate-50 flex justify-between items-center">
          <span>Book Chapters</span>
          <button onClick={addNewChapter} className="text-orange-600 hover:text-orange-700">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="book" type="chapter">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                  {book.chapters.map((chapter, index) => (
                    <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} className="bg-white border border-slate-200 rounded shadow-sm">
                          <div className="flex items-center bg-slate-100 p-2 rounded-t border-b border-slate-200">
                            <div {...provided.dragHandleProps} className="p-1 text-slate-400 hover:text-slate-600 cursor-grab">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <input
                              type="text"
                              value={chapter.title}
                              onChange={(e) => updateChapterTitle(chapter.id, e.target.value)}
                              className="flex-1 bg-transparent border-none text-sm font-bold text-slate-800 focus:ring-0 px-2"
                              placeholder="Chapter Title"
                            />
                            <button onClick={() => addNewSection(chapter.id)} className="p-1 text-slate-400 hover:text-slate-600">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <Droppable droppableId={chapter.id} type="section">
                            {(provided) => (
                              <div {...provided.droppableProps} ref={provided.innerRef} className="p-1 space-y-1">
                                {chapter.sections.map((section, sIndex) => (
                                  <Draggable key={section.id} draggableId={section.id} index={sIndex}>
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`flex items-center px-2 py-1.5 rounded transition-colors ${
                                          activeSectionId === section.id 
                                            ? 'bg-orange-100 ring-1 ring-orange-300' 
                                            : 'hover:bg-slate-50'
                                        }`}
                                      >
                                        <div {...provided.dragHandleProps} className="p-1 text-slate-300 hover:text-slate-500 cursor-grab mr-1">
                                          <GripVertical className="w-3 h-3" />
                                        </div>
                                        <input
                                          type="text"
                                          value={section.title}
                                          onChange={(e) => updateSectionTitle(chapter.id, section.id, e.target.value)}
                                          onClick={() => {
                                            setActiveChapterId(chapter.id);
                                            setActiveSectionId(section.id);
                                            setIsEditing(false);
                                          }}
                                          className={`flex-1 bg-transparent border-none text-sm focus:ring-0 ${
                                            activeSectionId === section.id ? 'text-orange-800 font-bold' : 'text-slate-600'
                                          }`}
                                          placeholder="Section Title"
                                        />
                                        {section.content && <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-2"></div>}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>

      {/* Editor Main */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fbf7ee]">
        {activeSection ? (
          <>
            <div className="px-8 py-4 border-b border-slate-200 flex justify-between items-center bg-white z-10 shadow-sm">
              <div className="flex-1">
                <p className="text-xs text-orange-600 font-bold tracking-widest uppercase">{activeChapter?.title}</p>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">{activeSection.title}</h2>
              </div>
              <div className="flex space-x-3">
                {activeSection.content && (
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-colors"
                  >
                    {isEditing ? "View Rendered" : "Edit Markdown"}
                  </button>
                )}
                
                {isEditing && (
                  <button 
                    onClick={() => {
                       updateSectionContent(id, activeChapter.id, activeSection.id, editContent);
                       setIsEditing(false);
                    }}
                    className="flex items-center px-4 py-2 bg-orange-600 text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-orange-700 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Content
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto flex">
              {(!activeSection.content || isEditing) && (
                <div className={`p-6 flex flex-col border-r border-slate-200 bg-white ${isEditing ? 'w-full' : 'w-1/2'}`}>
                  
                  <h3 className="font-bold text-slate-800 mb-2 uppercase tracking-widest text-xs flex items-center justify-between">
                    <span className="flex items-center"><FileText className="w-4 h-4 mr-2" />
                    {isEditing ? "Edit Styled Content directly" : "Paste Raw Notes / Text Here"}</span>
                    <div className="flex items-center gap-1.5">
                      <label className="cursor-pointer flex items-center px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-[10px] shadow-xs">
                        <ImagePlus className="w-3 h-3 mr-1 text-blue-600" /> + Add Image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            const targetRef = isEditing ? editContentRef.current : rawInputRef.current;
                            if (!file || !targetRef) return;
                            setIsUploadingImage(true);
                            try {
                              const res = await uploadImageFile(file);
                              if (isEditing) {
                                insertTextAtCursor(targetRef, editContent, `\n\n![${file.name}](${res.url})\n\n`, setEditContent);
                              } else {
                                insertTextAtCursor(targetRef, rawInput, `\n\n![${file.name}](${res.url})\n\n`, setRawInput);
                              }
                            } catch (err: any) {
                              alert("Failed to upload image: " + err.message);
                            } finally {
                              setIsUploadingImage(false);
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                      {!isEditing && (
                        <label className="cursor-pointer flex items-center px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px]">
                          {isExtracting ? "Extracting..." : <><Upload className="w-3 h-3 mr-1" /> Upload PDF</>}
                          <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} disabled={isExtracting} />
                        </label>
                      )}
                    </div>
                  </h3>

                  {isUploadingImage && (
                    <div className="text-[11px] text-blue-600 font-semibold flex items-center mb-2 animate-pulse">
                      <ImagePlus className="w-3 h-3 mr-1 animate-spin" /> Uploading pasted image...
                    </div>
                  )}

                  {isEditing ? (
                    <textarea
                      ref={editContentRef}
                      className="w-full flex-1 p-4 border border-slate-300 rounded font-mono text-sm shadow-inner focus:ring-2 focus:ring-orange-500 outline-none resize-none bg-slate-50"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onPaste={(e) => handleImagePaste(e, e.currentTarget, editContent, setEditContent, false, setIsUploadingImage)}
                      onDrop={(e) => handleImageDrop(e, e.currentTarget, editContent, setEditContent, false, setIsUploadingImage)}
                      onDragOver={(e) => e.preventDefault()}
                      placeholder="Markdown content... You can paste screenshots (Ctrl+V) or drop image files here!"
                    />
                  ) : (
                    <>
                      <textarea
                        ref={rawInputRef}
                        className="w-full flex-1 p-4 border border-slate-300 rounded font-mono text-sm shadow-inner focus:ring-2 focus:ring-orange-500 outline-none resize-none bg-slate-50 mb-4"
                        placeholder="Paste your unstructured notes, meeting transcripts, or raw text here. You can also paste screenshots (Ctrl+V) or drop images directly into this box! AI will format them into a gorgeous Notebook chapter automatically..."
                        value={rawInput}
                        onChange={(e) => setRawInput(e.target.value)}
                        onPaste={(e) => handleImagePaste(e, e.currentTarget, rawInput, setRawInput, false, setIsUploadingImage)}
                        onDrop={(e) => handleImageDrop(e, e.currentTarget, rawInput, setRawInput, false, setIsUploadingImage)}
                        onDragOver={(e) => e.preventDefault()}
                      />
                      <button 
                        onClick={handleGenerate}
                        disabled={isGenerating || !rawInput.trim()}
                        className="flex items-center justify-center w-full px-6 py-4 bg-slate-900 text-white rounded font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        <Sparkles className="w-5 h-5 mr-2 text-orange-400" />
                        {isGenerating ? "Formatting to Notebook Style..." : "Generate Styled Chapter"}
                      </button>
                    </>
                  )}
                </div>
              )}
              
              {(!isEditing) && (
                <div className={`p-8 flex-1 overflow-y-auto notebook-theme-root`}>
                  {activeSection.content ? (
                    <div className="max-w-3xl mx-auto">
                       <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            img: ({ node, ...props }) => (
                              <figure className="notebook-figure my-6 p-4 bg-white border-2 border-slate-700 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,0.1)] text-center break-inside-avoid">
                                <img {...props} className="max-w-full h-auto mx-auto rounded shadow-xs" alt={props.alt || "Figure"} />
                                {props.alt && <figcaption className="font-['Patrick_Hand'] text-slate-500 italic mt-2 text-sm">Figure: {props.alt}</figcaption>}
                              </figure>
                            ),
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              if (!inline && match && match[1] === 'mermaid') {
                                return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
                              }
                              return (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {activeSection.content}
                        </ReactMarkdown>
                    </div>
                  ) : (
                     <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                        <BookOpen className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-xl font-['Patrick_Hand']">Nothing generated yet.</p>
                        <p className="text-sm font-['Patrick_Hand'] mt-2 max-w-sm">Paste your text on the left and click generate to instantly build this chapter in your notebook style.</p>
                     </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest bg-slate-50">
            Add or Select a section to edit
          </div>
        )}
      </div>
    </div>
  );
}
