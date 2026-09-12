import { Outlet, useParams, NavLink, useNavigate } from "react-router";
import { useBookStore } from "../store/useBookStore";
import { useEffect } from "react";
import { Book, FileText, PenTool, LayoutTemplate, Settings, Play, ArrowLeft } from "lucide-react";

export default function BookLayout() {
  const { id } = useParams<{ id: string }>();
  const { books, setCurrentBook } = useBookStore();
  const navigate = useNavigate();

  const book = books.find((b) => b.id === id);

  useEffect(() => {
    if (id) {
      setCurrentBook(id);
    }
  }, [id, setCurrentBook]);

  if (!book) {
    return <div className="p-8 text-center w-full">Book not found</div>;
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-orange-600 flex items-center justify-center text-white font-bold text-xs">H</div>
            <h2 className="text-lg font-bold tracking-tight text-slate-800 uppercase truncate" title={book.title}>{book.title}</h2>
          </div>
          <p className="text-xs text-slate-500 truncate mt-1 uppercase tracking-widest font-bold">Handwritten eBook</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <NavLink 
            to={`/book/${id}/editor`}
            className={({isActive}) => `flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <PenTool className="w-4 h-4 mr-3" />
            Write & Build
          </NavLink>
          <NavLink 
            to={`/book/${id}/architect`}
            className={({isActive}) => `flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutTemplate className="w-4 h-4 mr-3" />
            Auto-Architect
          </NavLink>
          <NavLink 
            to={`/book/${id}/sources`}
            className={({isActive}) => `flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <FileText className="w-4 h-4 mr-3" />
            Bulk Source Library
          </NavLink>
          <NavLink 
            to={`/book/${id}/preview`}
            className={({isActive}) => `flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Play className="w-4 h-4 mr-3" />
            Preview & Export
          </NavLink>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
