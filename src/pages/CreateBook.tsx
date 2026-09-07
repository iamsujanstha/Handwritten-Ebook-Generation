import { useState } from "react";
import { useNavigate } from "react-router";
import { useBookStore } from "../store/useBookStore";
import { ArrowLeft } from "lucide-react";

export default function CreateBook() {
  const navigate = useNavigate();
  const { createBook } = useBookStore();
  
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    author: "",
    description: "",
    language: "English"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    // createBook sets currentBookId, but we can't easily get the returned ID from the store without an intermediate step,
    // so let's let the store handle creation and navigate via the latest book
    // A better approach is to have createBook return the id, or generate it here.
    // Given the store structure, let's just generate the ID, or use getCurrentBook after creation.
    
    // For simplicity, I'll update the store temporarily if needed, but the current store generates ID inside.
    // Let's modify handleSubmit to just find the new book, or change store to return ID.
    // Actually, useBookStore.getState().currentBookId will be the new ID.
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    createBook(formData);
    const state = useBookStore.getState();
    if (state.currentBookId) {
      navigate(`/book/${state.currentBookId}/sources`);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 overflow-y-auto">
      <header className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="max-w-2xl mx-auto flex items-center">
          <button onClick={() => navigate("/")} className="mr-4 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">Create New Book</h1>
            <p className="text-slate-500 mt-1 uppercase tracking-widest text-xs font-bold">Step 1: Book Information</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-8">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-widest">Book Title *</label>
              <input
                type="text"
                id="title"
                required
                className="w-full px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                placeholder="e.g. Node.js Backend Mastery"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
            
            <div>
              <label htmlFor="subtitle" className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-widest">Subtitle</label>
              <input
                type="text"
                id="subtitle"
                className="w-full px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                placeholder="e.g. Production Backend Engineering"
                value={formData.subtitle}
                onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
              />
            </div>
            
            <div>
              <label htmlFor="author" className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-widest">Author Name</label>
              <input
                type="text"
                id="author"
                className="w-full px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                placeholder="e.g. Sujan Shrestha"
                value={formData.author}
                onChange={(e) => setFormData({...formData, author: e.target.value})}
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-widest">Description</label>
              <textarea
                id="description"
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none"
                placeholder="Briefly describe what this book is about..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            
            <div>
              <label htmlFor="language" className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-widest">Language</label>
              <select
                id="language"
                className="w-full px-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                value={formData.language}
                onChange={(e) => setFormData({...formData, language: e.target.value})}
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
              </select>
            </div>
            
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={!formData.title.trim()}
                className="px-6 py-2.5 bg-orange-600 text-white rounded font-bold uppercase tracking-widest text-sm hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Add Sources
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
