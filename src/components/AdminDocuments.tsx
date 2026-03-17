import React, { useState, useEffect } from "react";
import { dataService } from "../services/dataService";
import { DocumentMetadata, PROGRAMS, PROGRAM_ABBREVIATIONS, DOCUMENT_CATEGORIES } from "../types";
import { 
  Search, 
  Trash2, 
  ExternalLink, 
  Filter,
  Loader2,
  AlertCircle,
  Edit2,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  ArrowUpDown
} from "lucide-react";
import { format } from "date-fns";

export default function AdminDocuments() {
  const [docs, setDocs] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProgram, setFilterProgram] = useState("All Programs");
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [sortConfig, setSortConfig] = useState<{
    key: 'title' | 'category' | 'categories' | 'timestamp';
    direction: 'asc' | 'desc';
  } | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentMetadata | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    category: "",
    categories: [] as string[]
  });
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleEditClick = (doc: DocumentMetadata) => {
    setEditingDoc(doc);
    setEditForm({
      title: doc.title,
      category: doc.category || "",
      categories: doc.categories || []
    });
  };

  const handleUpdate = async () => {
    if (!editingDoc) return;
    if (!editForm.title.trim()) {
      alert("Title is required");
      return;
    }
    if (editForm.categories.length === 0) {
      alert("Please select at least one program");
      return;
    }

    setIsUpdating(true);
    try {
      await dataService.updateDocument(editingDoc.id, {
        title: editForm.title,
        category: editForm.category,
        categories: editForm.categories
      });
      setEditingDoc(null);
    } catch (error) {
      console.error("Update failed", error);
      alert("Failed to update document. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleProgram = (program: string) => {
    setEditForm(prev => ({
      ...prev,
      categories: prev.categories.includes(program)
        ? prev.categories.filter(p => p !== program)
        : [...prev.categories, program]
    }));
  };

  const handleSort = (key: 'title' | 'category' | 'categories' | 'timestamp') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ column }: { column: 'title' | 'category' | 'categories' | 'timestamp' }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const filteredDocs = docs
    .filter(d => {
      const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (d.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesProgram = filterProgram === "All Programs" || d.categories.includes(filterProgram);
      const matchesCategory = filterCategory === "All Categories" || d.category === filterCategory;
      return matchesSearch && matchesProgram && matchesCategory;
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;
      
      const { key, direction } = sortConfig;
      let aValue: any = a[key];
      let bValue: any = b[key];

      if (key === 'timestamp') {
        aValue = aValue?.seconds || 0;
        bValue = bValue?.seconds || 0;
      } else if (key === 'categories') {
        aValue = aValue.length;
        bValue = bValue.length;
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
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
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th 
                  className="px-4 py-4 w-full text-center border-r border-slate-100 dark:border-white/5 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Document <SortIcon column="title" />
                  </div>
                </th>
                <th 
                  className="px-4 py-4 whitespace-nowrap text-center border-r border-slate-100 dark:border-white/5 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Category <SortIcon column="category" />
                  </div>
                </th>
                <th 
                  className="px-4 py-4 whitespace-nowrap text-center w-px border-r border-slate-100 dark:border-white/5 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('categories')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Program <SortIcon column="categories" />
                  </div>
                </th>
                <th 
                  className="px-4 py-4 whitespace-nowrap text-center w-px border-r border-slate-100 dark:border-white/5 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('timestamp')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Uploaded <SortIcon column="timestamp" />
                  </div>
                </th>
                <th className="px-4 py-4 text-center whitespace-nowrap w-px">Actions</th>
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
                    <td className="px-4 py-5 border-r border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="max-w-md">
                          <p className="text-base font-medium text-slate-900 dark:text-white truncate" title={doc.title}>{doc.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap text-center border-r border-slate-100 dark:border-white/5">
                      <span className="text-sm font-semibold px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-md">
                        {doc.category || "General"}
                      </span>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap text-center border-r border-slate-100 dark:border-white/5">
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
                    <td className="px-4 py-5 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap text-center border-r border-slate-100 dark:border-white/5">
                      {doc.timestamp ? format(doc.timestamp.toDate(), "MMM d, yyyy") : "Just now"}
                    </td>
                    <td className="px-4 py-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditClick(doc)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-all"
                          title="Edit Document"
                        >
                          <Edit2 size={16} />
                        </button>
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

      {/* Edit Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-bottom border-slate-100 dark:border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Document</h2>
              <button 
                onClick={() => setEditingDoc(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Document Title
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Category
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                >
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="dark:bg-zinc-900">{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Assign to Programs
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PROGRAMS.map(program => (
                    <button
                      key={program}
                      onClick={() => toggleProgram(program)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        editForm.categories.includes(program)
                          ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400"
                          : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                        editForm.categories.includes(program)
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-white dark:bg-zinc-900 border-slate-300 dark:border-white/20"
                      }`}>
                        {editForm.categories.includes(program) && <Check className="w-3 h-3" />}
                      </div>
                      {PROGRAM_ABBREVIATIONS[program] || program}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-white/5 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
