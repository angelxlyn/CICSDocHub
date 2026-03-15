import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { db } from "../lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { 
  User, 
  Mail, 
  GraduationCap, 
  Edit3, 
  Save, 
  CheckCircle2,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";

interface Props {
  profile: UserProfile;
  onUpdate: (updatedProfile: UserProfile) => void;
}

export default function Profile({ profile, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  useEffect(() => {
    setDisplayName(profile.displayName || "");
    setBio(profile.bio || "");
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, {
        displayName,
        bio
      });
      
      const updatedDoc = await getDoc(userRef);
      if (updatedDoc.exists()) {
        onUpdate(updatedDoc.data() as UserProfile);
        setSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">My Profile</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage your personal information and how others see you.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Basic Info */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden transition-colors">
            <div className="h-24 bg-indigo-600" />
            <div className="px-6 pb-8 -mt-12 text-center">
              <div className="relative inline-block mb-4">
                <img 
                  src={profile.photoURL || "https://picsum.photos/seed/user/200/200"} 
                  className="w-24 h-24 rounded-3xl border-4 border-white dark:border-zinc-900 shadow-md object-cover bg-white dark:bg-zinc-800"
                  referrerPolicy="no-referrer"
                  alt={profile.displayName}
                />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{profile.displayName}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{profile.email}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm p-6 md:p-8 transition-colors">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Personal Information</h3>
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                >
                  <Edit3 size={16} />
                  Edit Profile
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-100 dark:shadow-none disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text"
                    disabled={!isEditing}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-60 dark:text-white"
                    value={displayName || ""}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="email"
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none opacity-60 dark:text-white"
                    value={profile.email || ""}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Program</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text"
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none opacity-60 dark:text-white"
                    value={profile.program || ""}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">About Me / Bio</label>
                <textarea 
                  disabled={!isEditing}
                  rows={4}
                  placeholder="Tell us a bit about yourself..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-60 resize-none dark:text-white"
                  value={bio || ""}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
            </div>

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center gap-3"
              >
                <CheckCircle2 size={18} />
                <p className="text-sm font-bold">Profile updated successfully!</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
