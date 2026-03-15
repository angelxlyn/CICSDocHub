import React, { useState } from "react";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { UserProfile, PROGRAMS } from "../types";
import { GraduationCap, CheckCircle2, Loader2, ArrowRight, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";

interface Props {
  onComplete: (profile: UserProfile) => void;
}

export default function ProgramSelection({ onComplete }: Props) {
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        
        // Use setDoc with merge to be more resilient than updateDoc
        await setDoc(userRef, { 
          program: selected,
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "User",
          photoURL: user.photoURL || "",
          role: user.email === "angellyn.tolentino@neu.edu.ph" ? "admin" : "student",
          isBlocked: false
        }, { merge: true });
        
        const updatedDoc = await getDoc(userRef);
        onComplete(updatedDoc.data() as UserProfile);
      }
    } catch (error) {
      console.error("Failed to save program", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        // Set a default or just mark as "Administrator"
        await setDoc(userRef, { 
          program: "Administrator",
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "User",
          photoURL: user.photoURL || "",
          role: user.email === "angellyn.tolentino@neu.edu.ph" ? "admin" : "student",
          isBlocked: false
        }, { merge: true });
        
        const updatedDoc = await getDoc(userRef);
        onComplete(updatedDoc.data() as UserProfile);
      }
    } catch (error) {
      console.error("Failed to skip program selection", error);
    } finally {
      setLoading(false);
    }
  };

  const isUserAdmin = auth.currentUser?.email === "angellyn.tolentino@neu.edu.ph";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/40 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-black/20 border border-slate-100 dark:border-white/10 transition-colors">
          <header className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Welcome to CICS DocHub</h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Please select your undergraduate program to personalize your document library.
            </p>
          </header>

          <div className="space-y-3 mb-8 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar scroll-smooth">
            {PROGRAMS.map((program, index) => (
              <motion.button
                key={program}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelected(program)}
                className={`w-full group relative flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                  selected === program
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/10 ring-4 ring-indigo-50 dark:ring-indigo-500/5"
                    : "border-slate-100 dark:border-white/5 bg-white dark:bg-white/5 hover:border-slate-200 dark:hover:border-white/10 hover:bg-slate-50/50 dark:hover:bg-white/10"
                }`}
              >
                <span className={`font-bold text-sm ${
                  selected === program ? "text-indigo-900 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"
                }`}>
                  {program}
                </span>
                {selected === program && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={!selected || loading}
            className="w-full bg-indigo-600 py-4 px-6 rounded-xl font-bold text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-3 group"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <span className="text-lg">Enter DocHub</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        
        @media (max-width: 640px) {
          .custom-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .custom-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
            padding-right: 0;
          }
        }
      `}} />
    </div>
  );
}
