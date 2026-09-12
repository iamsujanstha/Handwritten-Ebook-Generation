import { useNavigate } from "react-router";
import { useBookStore } from "../store/useBookStore";
import { Book as BookIcon, Plus, BookOpen, Clock } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { books } = useBookStore();

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 overflow-y-auto">
      <header className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center uppercase">
              <div className="h-8 w-8 rounded bg-orange-600 flex items-center justify-center text-white font-bold text-sm mr-3">H</div>
              Handwritten eBook
            </h1>
            <p className="text-slate-500 mt-1 uppercase font-bold tracking-widest text-xs">Your Knowledge → Your Books</p>
          </div>
          <button
            onClick={() => navigate("/create")}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-xs tracking-widest uppercase font-bold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Book
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-8">
        <h2 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-widest text-sm">Recent Books</h2>
        
        {books.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded border-dashed">
            <BookIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-1 uppercase tracking-widest">No books yet</h3>
            <p className="text-slate-500 mb-6 font-bold uppercase tracking-widest text-xs">Start by creating your first AI-generated ebook.</p>
            <button
              onClick={() => navigate("/create")}
              className="inline-flex items-center px-4 py-2 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 transition-colors text-xs font-bold uppercase tracking-widest"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Book
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => (
              <div 
                key={book.id} 
                className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer flex flex-col"
                onClick={() => navigate(`/book/${book.id}`)}
              >
                <div className="p-6 flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1 uppercase tracking-widest">{book.title}</h3>
                  <p className="text-sm font-medium text-slate-500 line-clamp-2 min-h-[40px] mb-4">
                    {book.description || "No description provided."}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-slate-500 mt-4 font-bold uppercase tracking-widest">
                    <span className="flex items-center">
                      <BookOpen className="w-3.5 h-3.5 mr-1 text-orange-600" />
                      {book.chapters?.length || 0} chapters
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-orange-600" />
                      {new Date(book.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded">
                    {book.sources?.length || 0} SOURCES
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-orange-600 group-hover:text-orange-700 flex items-center">
                    Open Book
                    <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-5px] group-hover:translate-x-0" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ArrowRight(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </svg>
  )
}
