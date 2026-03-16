import React, { useState, useEffect } from "react";
import { auth } from "../lib/firebase";
import { PROGRAMS, PROGRAM_ABBREVIATIONS, DOCUMENT_CATEGORIES } from "../types";
import { 
  Upload as FileUpload, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  ChevronDown,
  Link as LinkIcon,
  Database
} from "lucide-react";

import { motion } from "motion/react";
import { dataService } from "../services/dataService";

export default function AdminUpload() {
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'link' | 'file'>('file');
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [checkingDrive, setCheckingDrive] = useState(true);

  useEffect(() => {
    checkDriveStatus();
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsDriveConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkDriveStatus = async () => {
    try {
      const res = await fetch('/api/auth/google/status');
      const data = await res.json();
      setIsDriveConnected(data.connected);
    } catch (err) {
      console.error("Failed to check drive status:", err);
    } finally {
      setCheckingDrive(false);
    }
  };

  const connectGoogleDrive = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      window.open(url, 'google_auth', 'width=600,height=700');
    } catch (err) {
      setError("Failed to get connection URL");
    }
  };

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
    if (uploadMode === 'link' && !externalUrl) return;
    if (uploadMode === 'file' && !selectedFile) return;
    if (!title || selectedPrograms.length === 0 || uploading) return;

    const user = auth.currentUser;
    if (!user) {
      setError("You must be logged in as an administrator to upload documents.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError("");

    try {
      let finalUrl = externalUrl;
      let fileName = "External Link";
      let fileSize = 0;
      let fileType = "Link";
      let driveFileId: string | undefined = undefined;

      if (uploadMode === 'file' && selectedFile) {
        if (!isDriveConnected) {
          setError("Please connect your Google Drive first.");
          setUploading(false);
          return;
        }

        setUploadProgress(10);
        
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const uploadRes = await fetch('/api/upload/drive', {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || "Failed to upload to Google Drive");
        }

        const driveData = await uploadRes.json();
        finalUrl = driveData.webViewLink;
        driveFileId = driveData.id;
        fileName = selectedFile.name;
        fileSize = selectedFile.size;
        fileType = selectedFile.type || "Document";
        setUploadProgress(60);
      }
      
      // Save metadata to Firestore
      await dataService.uploadDocument({
        title,
        description,
        category,
        categories: selectedPrograms,
        downloadURL: finalUrl,
        fileName,
        fileSize,
        fileType,
        driveFileId,
        uploadedBy: user.uid,
        uploadedByName: user.displayName || user.email || "Admin User",
      });

      setUploadProgress(100);
      setSuccess(true);
      
      // Reset form
      setExternalUrl("");
      setSelectedFile(null);
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
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Publish Documents</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Add new Google Drive resources to the department library.</p>
        </div>
        
        {!checkingDrive && (
          <button
            type="button"
            onClick={connectGoogleDrive}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              isDriveConnected 
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
            }`}
          >
            <Database size={16} />
            {isDriveConnected ? 'Drive Connected' : 'Connect Google Drive'}
          </button>
        )}
      </header>

      <form onSubmit={handleUpload} className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 p-4 md:p-8 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4 p-1 bg-slate-100 dark:bg-white/5 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${uploadMode === 'file' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('link')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${uploadMode === 'link' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                External Link
              </button>
            </div>

            {uploadMode === 'file' ? (
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Select Document (PDF, DOCX, etc.)
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        if (!title) setTitle(file.name.split('.')[0]);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={uploading}
                  />
                  <div className={`
                    w-full py-10 px-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all
                    ${selectedFile ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/5' : 'border-slate-200 dark:border-white/10 group-hover:border-indigo-400 dark:group-hover:border-indigo-500/50'}
                  `}>
                    <div className={`p-3 rounded-full ${selectedFile ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                      <FileUpload size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {selectedFile ? selectedFile.name : 'Click or drag to upload'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Max file size: 25MB'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Document Link (Google Drive)
                </label>
                <input
                  type="url"
                  required
                  placeholder="Paste Google Drive link here..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                  value={externalUrl}
                  onChange={(e) => {
                    let val = e.target.value;
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
            )}
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
          disabled={uploading || (uploadMode === 'link' ? !externalUrl : !selectedFile) || !title || selectedPrograms.length === 0}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
            <FileUpload size={22} />
              Publish Document
            </>
          )}
        </button>
      </form>
    </div>
  );
}
