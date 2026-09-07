const fs = require('fs');

let content = fs.readFileSync('src/pages/Architect.tsx', 'utf-8');

const regex = /<div className="bg-white border border-slate-200 rounded shadow-sm p-6 space-y-4">[\s\S]*?<\/div>\n\s*\}\)\}\n\s*<\/div>\n\s*<\/div>\n\s*\)\}/;

const renderDnd = `
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="bg-white border border-slate-200 rounded shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 text-lg flex items-center uppercase tracking-widest">
                  <span className="text-orange-600 mr-2">■</span> {book.title}
                </h3>
                <button onClick={addChapter} className="text-xs font-bold uppercase tracking-widest text-orange-600 hover:text-orange-700 flex items-center">
                  <Plus className="w-4 h-4 mr-1" /> Add Chapter
                </button>
              </div>
              
              <Droppable droppableId="book" type="chapter">
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className="space-y-4 pl-4 border-l-2 border-slate-100"
                  >
                    {localChapters.map((chapter, index) => (
                      <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={\`space-y-2 \${snapshot.isDragging ? 'bg-slate-50 opacity-90 rounded p-2' : ''}\`}
                          >
                            <div className="flex items-center group">
                              <div {...provided.dragHandleProps} className="p-1">
                                <GripVertical className="w-4 h-4 text-slate-300 mr-1" />
                              </div>
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
                                <button onClick={() => addSection(chapter.id)} className="text-xs text-slate-500 hover:text-orange-600" title="Add Section">
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button onClick={() => startEditing(chapter.id, chapter.title)} className="text-xs text-slate-500 hover:text-orange-600" title="Rename Chapter">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => deleteChapter(chapter.id)} className="text-xs text-slate-500 hover:text-red-600" title="Delete Chapter">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            
                            {/* Sections */}
                            <Droppable droppableId={chapter.id} type="section">
                              {(provided) => (
                                <div 
                                  {...provided.droppableProps} 
                                  ref={provided.innerRef}
                                  className="pl-6 space-y-1 min-h-[10px]"
                                >
                                  {chapter.sections.map((section, sIndex) => (
                                    <Draggable key={section.id} draggableId={section.id} index={sIndex}>
                                      {(provided, snapshot) => (
                                        <div 
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className={\`group border-b border-slate-50 last:border-0 pb-1 mb-1 \${snapshot.isDragging ? 'bg-white shadow rounded p-1 z-50' : ''}\`}
                                        >
                                          <div className="flex items-center py-1">
                                            <div {...provided.dragHandleProps} className="p-1">
                                              <GripVertical className="w-3.5 h-3.5 text-slate-200 mr-1" />
                                            </div>
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
                                              <button onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)} className="text-xs text-slate-400 hover:text-orange-600" title="Details">
                                                <ChevronDown className={\`w-4 h-4 transform transition-transform \${expandedSection === section.id ? 'rotate-180' : ''}\`} />
                                              </button>
                                              
                                              {sIndex < chapter.sections.length - 1 && (
                                                <button onClick={() => mergeSection(chapter.id, sIndex)} className="text-xs text-slate-400 hover:text-orange-600" title="Merge with next section">
                                                  <Combine className="w-3.5 h-3.5" />
                                                </button>
                                              )}
                                              <button onClick={() => splitSection(chapter.id, sIndex)} className="text-xs text-slate-400 hover:text-orange-600" title="Split section">
                                                <SplitSquareHorizontal className="w-3.5 h-3.5" />
                                              </button>
                                              <button onClick={() => startEditing(section.id, section.title)} className="text-xs text-slate-400 hover:text-orange-600" title="Rename section">
                                                <Edit2 className="w-3.5 h-3.5" />
                                              </button>
                                              <button onClick={() => deleteSection(chapter.id, section.id)} className="text-xs text-slate-400 hover:text-red-600" title="Delete section">
                                                <Trash2 className="w-3.5 h-3.5" />
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
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                  {chapter.sections.length === 0 && (
                                    <div className="pl-12 text-xs font-bold uppercase tracking-widest text-slate-400">No sections</div>
                                  )}
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
            </div>
          </DragDropContext>
        )}
`;

content = content.replace(regex, renderDnd.trim());

fs.writeFileSync('src/pages/Architect.tsx', content);
