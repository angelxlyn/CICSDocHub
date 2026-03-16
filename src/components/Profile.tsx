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
  Loader2,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { auth } from "../lib/firebase";
import { 
  updatePassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  linkWithCredential
} from "firebase/auth";

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
  const [error, setError] = useState<string | null>(null);

  // Password Management State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Force re-render when auth state changes to update provider info
  const [, setUpdateTrigger] = useState(0);

  const isGoogleUser = auth.currentUser?.providerData.some(p => p.providerId === 'google.com');
  const hasPassword = auth.currentUser?.providerData.some(p => p.providerId === 'password');

  const copyToClipboard = async () => {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let retVal = "";
    for (let i = 0, n = charset.length; i < 12; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    setNewPassword(retVal);
    setConfirmNewPassword(retVal);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    if (hasPassword && !currentPassword) {
      setPasswordError("Please enter your current password.");
      setPasswordLoading(false);
      return;
    }
    if (!newPassword) {
      setPasswordError("Please enter a new password.");
      setPasswordLoading(false);
      return;
    }
    if (!confirmNewPassword) {
      setPasswordError("Please confirm your new password.");
      setPasswordLoading(false);
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user found");

      if (hasPassword) {
        // Re-authenticate first
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
      } else {
        // Link email/password credential for Google users
        const credential = EmailAuthProvider.credential(user.email!, newPassword);
        await linkWithCredential(user, credential);
      }

      // Force refresh user data
      await user.reload();
      setUpdateTrigger(prev => prev + 1);

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordSection(false);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setPasswordError(err.message || "Failed to update password. If you just logged in with Google, you might need to re-authenticate.");
    } finally {
      setPasswordLoading(false);
    }
  };
  
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

          {/* Security Section */}
          <div className="mt-8 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm p-6 md:p-8 transition-colors">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-full">
                  <ShieldCheck className="text-amber-600 dark:text-amber-500 w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Security & Password</h3>
              </div>
              <button 
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {showPasswordSection ? "Cancel" : (hasPassword ? "Change Password" : "Set a Password")}
              </button>
            </div>

            <AnimatePresence>
              {showPasswordSection ? (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleUpdatePassword}
                  className="space-y-6 overflow-hidden p-1 -m-1"
                >
                  {hasPassword && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Current Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                          type={showCurrentPassword ? "text" : "password"}
                          className="w-full pl-10 pr-12 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                          type={showNewPassword ? "text" : "password"}
                          className="w-full pl-10 pr-12 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                          type={showConfirmPassword ? "text" : "password"}
                          className="w-full pl-10 pr-12 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={generatePassword}
                      className="flex-auto whitespace-nowrap flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-2xl transition-all"
                    >
                      <RefreshCw size={18} />
                      Auto-generate
                    </button>
                    
                    {newPassword && (
                      <button 
                        type="button"
                        onClick={copyToClipboard}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-2xl transition-all ${
                          copied 
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" 
                            : "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10"
                        }`}
                      >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    )}
                    
                    <button 
                      type="submit"
                      disabled={passwordLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50"
                    >
                      {passwordLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                      Update
                    </button>
                  </div>

                  {passwordError && (
                    <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2 text-xs font-bold">
                      <AlertCircle size={14} />
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center gap-2 text-xs font-bold">
                      <CheckCircle2 size={14} />
                      Password updated successfully!
                    </div>
                  )}
                </motion.form>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                  <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-sm border border-slate-100 dark:border-white/10">
                    <Lock className="text-slate-400 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {hasPassword ? "Password is set" : "No password set"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isGoogleUser 
                        ? (hasPassword 
                            ? "You have set a password for your Google account. You can now sign in using either method."
                            : "You are currently using Google Sign-In. You can set a password to enable email login.")
                        : "Your account uses email and password authentication."}
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
