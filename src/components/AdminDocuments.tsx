import React, { useState, useEffect } from "react";
import { dataService } from "../services/dataService";
import { DocumentMetadata, PROGRAMS, PROGRAM_ABBREVIATIONS, DOCUMENT_CATEGORIES } from "../types";
import { 
  Search, 
  Trash2, 
  ExternalLink, 
  Filter,
  Loader2,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

export default function AdminDocuments() {
  const [docs, setDocs] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProgram, setFilterProgram] = useState("All Programs");
  const [filterCategory, setFilterCategory] = useState("All Categories");

  useEffect(() => {
    setLoading(true);
    const unsubscribe = dataService.subscribeToDocuments((results) => {
      setDocs(results);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (docId: string, docTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${docTitle}"? This action cannot be undone.`)) return;
    
    try {
      await dataService.deleteDocument(docId, docTitle);
      setDocs(docs.filter(d => d.id !== docId));
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const filteredDocs = docs.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (d.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesProgram = filterProgram === "All Programs" || d.categories.includes(filterProgram);
    const matchesCategory = filterCategory === "All Categories" || d.category === filterCategory;
    return matchesSearch && matchesProgram && matchesCategory;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Manage Library</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">View, monitor, and remove documents from the system.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by title or description..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex-1 flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 px-3 py-2.5 rounded-xl">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select 
            className="w-full bg-transparent text-sm font-medium outline-none cursor-pointer dark:text-white"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="All Categories" className="dark:bg-zinc-900">All Categories</option>
            {DOCUMENT_CATEGORIES.map(cat => (
              <option key={cat} value={cat} className="dark:bg-zinc-900">{cat}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 px-3 py-2.5 rounded-xl">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select 
            className="w-full bg-transparent text-sm font-medium outline-none cursor-pointer dark:text-white"
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
          >
            <option value="All Programs" className="dark:bg-zinc-900">All Programs</option>
            {PROGRAMS.map(p => (
              <option key={p} value={p} className="dark:bg-zinc-900">{PROGRAM_ABBREVIATIONS[p] || p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="px-4 py-4 w-full">Document</th>
                <th className="px-4 py-4 whitespace-nowrap">Category</th>
                <th className="px-4 py-4 whitespace-nowrap text-center w-px">Program</th>
                <th className="px-4 py-4 whitespace-nowrap text-center w-px">Uploaded</th>
                <th className="px-4 py-4 text-right whitespace-nowrap w-px">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-slate-400">Loading library...</p>
                  </td>
                </tr>
              ) : filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-3">
                        <div className="max-w-md">
                          <p className="text-base font-bold text-slate-900 dark:text-white truncate" title={doc.title}>{doc.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">
                      <span className="text-sm font-semibold px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-md">
                        {doc.category || "General"}
                      </span>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap text-center">
                      <div className="flex justify-center gap-1.5">
                        {doc.categories.length === PROGRAMS.length ? (
                          <span className="text-sm font-bold px-3 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded uppercase">
                            All
                          </span>
                        ) : (
                          doc.categories.slice(0, 3).map(cat => (
                            <span key={cat} className="text-sm font-medium px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded" title={cat}>
                              {PROGRAM_ABBREVIATIONS[cat] || cat}
                            </span>
                          ))
                        )}
                        {doc.categories.length > 3 && doc.categories.length !== PROGRAMS.length ? (
                          <span className="text-sm font-medium px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 rounded">
                            +{doc.categories.length - 3}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">
                      {doc.timestamp ? format(doc.timestamp.toDate(), "MMM d, yyyy") : "Just now"}
                    </td>
                    <td className="px-4 py-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => window.open(doc.downloadURL, '_blank')}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all"
                          title="View File"
                        >
                          <ExternalLink size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.title)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete Document"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-slate-400">No documents found matching your criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
