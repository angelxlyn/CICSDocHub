import React, { useState, useEffect } from "react";
import { 
  Timestamp
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { DocumentMetadata, UserProfile, PROGRAMS, PROGRAM_ABBREVIATIONS, DOCUMENT_CATEGORIES } from "../types";
import { 
  Search, 
  FileText, 
  Filter,
  Calendar,
  User as UserIcon,
  Loader2,
  GraduationCap,
  ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import { dataService } from "../services/dataService";
import { motion } from "motion/react";

interface Props {
  profile: UserProfile;
}

export default function StudentDashboard({ profile }: Props) {
  const [docs, setDocs] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    setLoading(true);
    const unsubscribe = dataService.subscribeToDocuments((results) => {
      setDocs(results);
      setLoading(false);
    }, profile.program);

    return () => unsubscribe();
  }, [profile.program]);

  const handleDownload = async (document: DocumentMetadata) => {
    try {
      // Log as a view since we're removing separate download tracking
      await dataService.logView(profile.uid, document.id, document.title);
      // Open in new tab which is the most reliable way for students to view/download
      window.open(document.downloadURL, '_blank');
    } catch (error) {
      console.error("View logging failed", error);
      window.open(document.downloadURL, '_blank');
    }
  };

  const handleView = async (document: DocumentMetadata) => {
    // Log the view action only for students
    if (profile.role !== 'admin') {
      try {
        await dataService.logView(profile.uid, document.id, document.title, profile.role);
      } catch (e) { console.error(e); }
    }

    // Always open in new tab for maximum compatibility and reliability
    window.open(document.downloadURL, '_blank');
  };

  const filteredDocs = docs.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (d.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || d.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Document Library</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Access and download academic resources for your program.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search documents..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <select
            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer font-medium text-slate-600 dark:text-slate-300"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All" className="dark:bg-zinc-900">All Categories</option>
            {DOCUMENT_CATEGORIES.map(cat => (
              <option key={cat} value={cat} className="dark:bg-zinc-900">{cat}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading documents...</p>
        </div>
      ) : filteredDocs.length > 0 ? (
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredDocs.map((doc) => (
            <motion.div 
              key={doc.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/10 p-6 flex flex-col hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-md uppercase tracking-wider w-fit">
                    {doc.category || "General"}
                  </span>
                </div>
              </div>
              
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">{doc.title}</h3>
              {doc.description ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 flex-1">{doc.description}</p>
              ) : (
                <div className="flex-1 mb-6" />
              )}
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                  <Calendar size={14} />
                  {doc.timestamp ? format(doc.timestamp.toDate(), "MMM d, yyyy") : "Just now"}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                  <UserIcon size={14} />
                  {doc.uploadedByName}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => handleView(doc)}
                  className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 dark:shadow-none"
                >
                  <FileText size={18} />
                  View Document
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-slate-300 dark:border-white/10">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No documents found</h3>
          <p className="text-slate-500 dark:text-slate-400">Try adjusting your search or filter.</p>
        </div>
      )}
    </div>
  );
}
