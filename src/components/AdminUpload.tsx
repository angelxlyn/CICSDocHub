import React, { useState } from "react";
import { auth } from "../lib/firebase";
import { PROGRAMS, PROGRAM_ABBREVIATIONS, DOCUMENT_CATEGORIES } from "../types";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  ChevronDown
} from "lucide-react";

import { motion } from "motion/react";
import { dataService } from "../services/dataService";

export default function AdminUpload() {
  const [externalUrl, setExternalUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const toggleProgram = (p: string) => {
    setSelectedPrograms(prev => 
      prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
    );
  };

  const selectAllPrograms = () => {
    if (selectedPrograms.length === PROGRAMS.length) {
      setSelectedPrograms([]);
    } else {
      setSelectedPrograms([...PROGRAMS]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalUrl || !title || selectedPrograms.length === 0 || uploading) return;

    const user = auth.currentUser;
    if (!user) {
      setError("You must be logged in as an administrator to upload documents.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError("");

    try {
      setUploadProgress(30);
      
      // Save metadata to Firestore
      await dataService.uploadDocument({
        title,
        description,
        category,
        categories: selectedPrograms,
        downloadURL: externalUrl,
        fileName: "External Link",
        fileSize: 0,
        fileType: "Link",
        uploadedBy: user.uid,
        uploadedByName: user.displayName || user.email || "Admin User",
      });

      setUploadProgress(100);
      setSuccess(true);
      
      // Reset form
      setExternalUrl("");
      setTitle("");
      setDescription("");
      setCategory(DOCUMENT_CATEGORIES[0]);
      setSelectedPrograms([]);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err.message || "Failed to publish document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Publish Documents</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Add new Google Drive resources to the department library.</p>
      </header>

      <form onSubmit={handleUpload} className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 p-4 md:p-8 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors">
          <div className="mb-8">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Document Link (Google Drive)
            </label>
            
            <div className="space-y-2">
              <input
                type="url"
                required
                placeholder="Paste Google Drive link here..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                value={externalUrl}
                onChange={(e) => {
                  let val = e.target.value;
                  // Auto-convert Google Drive export links to view links for better compatibility
                  if (val.includes('drive.google.com') && val.includes('export=download')) {
                    val = val.replace('export=download', 'view');
                  }
                  setExternalUrl(val);
                }}
                disabled={uploading}
              />
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider">Important for G-Drive:</p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                    1. Set sharing to <span className="font-bold">"Anyone with the link"</span>.<br />
                    2. Documents will open in a <span className="font-bold">new tab</span> for students.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Document Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Department Policy 2024"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Document Category</label>
              <div className="relative">
                <select
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer dark:text-white"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={uploading}
                >
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="dark:bg-zinc-900">{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Assign to Programs</label>
                <button 
                  type="button"
                  onClick={selectAllPrograms}
                  disabled={uploading}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50"
                >
                  {selectedPrograms.length === PROGRAMS.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto scrollbar-hide p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                {PROGRAMS.map(p => (
                  <label key={p} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 border-slate-300 dark:border-white/10 rounded focus:ring-indigo-500"
                      checked={selectedPrograms.includes(p)}
                      onChange={() => toggleProgram(p)}
                      disabled={uploading}
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {p} <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 ml-1">({PROGRAM_ABBREVIATIONS[p]})</span>
                    </span>
                  </label>
                ))}
              </div>
              {selectedPrograms.length === 0 && (
                <p className="text-[10px] text-red-500 mt-1 font-medium">Please select at least one program.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span></label>
              <textarea
                rows={4}
                placeholder="Briefly describe the contents of this document..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none dark:text-white"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={uploading}
              />
            </div>
          </div>
        </div>

        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>Publishing to Library...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                className="h-full bg-indigo-600 rounded-full"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-xl text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm">
            <CheckCircle2 size={18} />
            Document published successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || !externalUrl || !title || selectedPrograms.length === 0}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Upload size={22} />
              Publish Document
            </>
          )}
        </button>
      </form>
    </div>
  );
}
