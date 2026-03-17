/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate,
  Link
} from "react-router-dom";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { auth, db, googleProvider } from "./lib/firebase";
import { UserProfile, UserRole, PROGRAM_ABBREVIATIONS } from "./types";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  BarChart3, 
  LogOut, 
  User as UserIcon,
  Loader2,
  Upload as FileUpload,
  ChevronLeft,
  Menu,
  AlertTriangle,
  Sun,
  Moon,
  Mail,
  Lock,
  LogIn,
  Key
} from "lucide-react";

// Components
import AdminDashboard from "./components/AdminDashboard";
import StudentDashboard from "./components/StudentDashboard";
import ProgramSelection from "./components/ProgramSelection";
import AdminUpload from "./components/AdminUpload";
import AdminUsers from "./components/AdminUsers";
import AdminDocuments from "./components/AdminDocuments";
import Profile from "./components/Profile";
import AuthActionHandler from "./components/AuthActionHandler";
import { dataService } from "./services/dataService";

export default function App() {
  // ... existing state ...
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isDevAdmin, setIsDevAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<UserRole | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [authError, setAuthError] = useState<{title: string, message: string} | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("dochub_theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("dochub_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("dochub_theme", "light");
    }
  }, [darkMode]);

  // Activity Tracking and Status Updates
  useEffect(() => {
    if (!user || !profile) return;

    const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours
    const IDLE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes for "online" status
    const ACTIVITY_THROTTLE_MS = 10 * 1000; // 10 seconds throttle for activity updates

    let lastActivityTime = Date.now();
    localStorage.setItem(`last_activity_${user.uid}`, lastActivityTime.toString());

    const handleActivity = () => {
      const now = Date.now();
      // Throttle updates to avoid excessive processing
      if (now - lastActivityTime > ACTIVITY_THROTTLE_MS) {
        lastActivityTime = now;
        localStorage.setItem(`last_activity_${user.uid}`, now.toString());
      }
    };

    // Initial update
    dataService.updateUserActiveStatus(user.uid);

    // Listen for various user activities
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Check activity status every 30 seconds
    const statusInterval = setInterval(() => {
      const now = Date.now();
      const storedLastActivity = parseInt(localStorage.getItem(`last_activity_${user.uid}`) || now.toString());
      
      // 1. Check for Inactivity Timeout (2 hours)
      if (now - storedLastActivity > INACTIVITY_TIMEOUT_MS) {
        console.log("Inactivity timeout reached. Signing out...");
        handleSignOut();
        return;
      }

      // 2. Update Online Status (every 1 minute if active)
      // We only update Firestore if the user was active recently (within 3 mins)
      if (now - storedLastActivity < IDLE_THRESHOLD_MS) {
        dataService.updateUserActiveStatus(user.uid);
      }
    }, 30 * 1000);

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(statusInterval);
    };
  }, [user, profile]);

  useEffect(() => {
    // Handle redirect result for mobile users
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect auth error:", error);
      if (error.code !== 'auth/cancelled-popup-request') {
        setAuthError({
          title: "Authentication Error",
          message: error.message || "Failed to complete redirect login."
        });
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log("Login attempt:", firebaseUser.email);
        if (!firebaseUser.email?.endsWith("@neu.edu.ph")) {
          await signOut(auth);
          setAuthError({
            title: "Access Restricted",
            message: "This portal is exclusive to @neu.edu.ph accounts. Please sign in with your institutional email."
          });
          setLoading(false);
          return;
        }

        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            // Ensure primary admins have the admin role
            const isAdminEmail = data.email === "angellyn.tolentino@neu.edu.ph" || data.email === "jcesperanza@neu.edu.ph";
            if (isAdminEmail && data.role !== 'admin') {
              const updatedProfile = { ...data, role: 'admin' as UserRole };
              await updateDoc(doc(db, "users", firebaseUser.uid), { role: 'admin' });
              setProfile(updatedProfile);
            } else if (data.isBlocked) {
              await signOut(auth);
              setAuthError({
                title: "Account Blocked",
                message: "Your access to the CICS DocHub has been suspended. Please contact the department administrator for more information."
              });
              setLoading(false);
              return;
            }
            
            // Sync missing info from Auth if needed
            if ((!data.displayName || data.displayName === "User") && firebaseUser.displayName) {
              const updatedProfile = { ...data, displayName: firebaseUser.displayName };
              await setDoc(doc(db, "users", firebaseUser.uid), updatedProfile, { merge: true });
              setProfile(updatedProfile);
            } else if (!data.photoURL && firebaseUser.photoURL) {
              const updatedProfile = { ...data, photoURL: firebaseUser.photoURL };
              await setDoc(doc(db, "users", firebaseUser.uid), updatedProfile, { merge: true });
              setProfile(updatedProfile);
            } else if (!data.createdAt) {
              // Migration: If createdAt is missing for an old user, set it now
              const updatedProfile = { ...data, createdAt: serverTimestamp() as any };
              await updateDoc(doc(db, "users", firebaseUser.uid), { createdAt: serverTimestamp() });
              setProfile(updatedProfile);
            } else {
              setProfile(data);
            }
            
            // Log login for existing users only once per session
            const sessionKey = `logged_in_${firebaseUser.uid}`;
            if (!sessionStorage.getItem(sessionKey)) {
              dataService.logActivity({
                userId: firebaseUser.uid,
                userEmail: firebaseUser.email!,
                action: "login",
                userRole: data.role,
                timestamp: Timestamp.now()
              });
              sessionStorage.setItem(sessionKey, 'true');
            }
          } else {
            // Truly new user or missing profile
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || "User",
              photoURL: firebaseUser.photoURL || "",
              role: (firebaseUser.email === "angellyn.tolentino@neu.edu.ph" || firebaseUser.email === "jcesperanza@neu.edu.ph") ? "admin" : "student",
              isBlocked: false,
              createdAt: serverTimestamp() as any,
              lastSeen: serverTimestamp() as any
            };
            await setDoc(doc(db, "users", firebaseUser.uid), newProfile);
            setProfile(newProfile);
            
            // Log login registration
            const sessionKey = `logged_in_${firebaseUser.uid}`;
            dataService.logActivity({
              userId: firebaseUser.uid,
              userEmail: firebaseUser.email!,
              action: "login",
              userRole: newProfile.role,
              timestamp: Timestamp.now()
            });
            sessionStorage.setItem(sessionKey, 'true');
          }
        } catch (e) {
          console.error("Firestore profile initialization failed:", e);
          // Fallback to local state so the app doesn't crash, 
          // but the user will be warned in the console
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || "User",
            photoURL: firebaseUser.photoURL || "",
            role: "student",
            isBlocked: false,
            createdAt: Timestamp.now(),
            // No program here so selection screen shows
          });
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Show splash for at least 1.5 seconds for branding
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const effectiveProfile = isDevAdmin ? { ...profile, role: 'admin' as UserRole } : profile;

  useEffect(() => {
    if (effectiveProfile && !viewMode) {
      setViewMode(effectiveProfile.role);
    }
  }, [effectiveProfile]);

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'admin' ? 'student' : 'admin');
  };

  const handleSignOut = async () => {
    if (user) {
      // Set status to offline before signing out
      try {
        await setDoc(doc(db, "users", user.uid), { lastSeen: new Date(0) }, { merge: true });
        sessionStorage.removeItem(`logged_in_${user.uid}`);
      } catch (e) { console.error(e); }
    }
    await signOut(auth);
    setIsDevAdmin(false);
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
  };

  if (loading || showSplash) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950 p-6 relative overflow-hidden transition-colors duration-500">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] bg-indigo-600/5 dark:bg-emerald-600/10" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] bg-indigo-900/5 dark:bg-emerald-900/10" />
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.075]">
            <img src="/icons/NEU.jpg" className="w-full h-full object-cover" alt="" />
          </div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center overflow-hidden mb-6">
            <img src="/icons/CICS.png" className="w-full h-full object-cover scale-[1]" alt="CICS Logo" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tighter uppercase italic mb-2">
            CICS <span className="text-indigo-600 dark:text-emerald-500">DocHub</span>
          </h1>
          <div className="flex items-center gap-2 text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-[0.2em]">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Initializing Portal</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Allow bypassing login for the "Working App" experience if Firebase Auth is blocked
  const showLogin = !user;

  return (
    <Router>
      <Routes>
        <Route path="/auth/action" element={<AuthActionHandler />} />
        <Route path="*" element={
          <>
            {showLogin ? (
              <LoginScreen 
                onAuthError={(title, message) => setAuthError({ title, message })} 
                darkMode={darkMode}
                onToggleTheme={() => setDarkMode(!darkMode)}
              />
            ) : (
              <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col relative transition-colors duration-300">
                {effectiveProfile && !effectiveProfile.program && !isDevAdmin && (
                  <ProgramSelection onComplete={(p) => setProfile(p)} />
                )}
                <LoginRedirect user={user} viewMode={viewMode} />
                {/* Global Fixed Header */}
                <header className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-white/10 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm transition-colors">
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                    <img src="/icons/CICS.png" className="w-full h-full object-cover scale-[1]" alt="CICS Logo" />
                  </div>
                  <div>
                    <h1 className="font-bold text-lg md:text-xl tracking-tight leading-none dark:text-white">DocHub</h1>
                    <p className="hidden md:block text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">CICS Document System</p>
                  </div>
                </div>
                
                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-1 mx-8 flex-1 justify-start">
                  {viewMode === "admin" ? (
                    <>
                      <TopNavLink to="/admin" icon={<BarChart3 size={18} />} label="Analytics" />
                      <TopNavLink to="/admin/documents" icon={<FileText size={18} />} label="Library" />
                      <TopNavLink to="/admin/upload" icon={<FileUpload size={18} />} label="Upload" />
                      <TopNavLink to="/admin/users" icon={<Users size={18} />} label="Users" />
                    </>
                  ) : (
                    <>
                      <TopNavLink to="/student" icon={<LayoutDashboard size={18} />} label="Library" />
                    </>
                  )}
                </nav>
                
                <div className="flex items-center gap-4">
                  {/* Theme Toggle */}
                  <button 
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                    title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                  </button>

                  {/* User Info in Header for Desktop */}
                  <div className="hidden md:flex items-center gap-3 pl-4 border-l border-slate-100 dark:border-white/5 relative">
                    <button 
                      onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                      className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/5 p-1.5 rounded-xl transition-all"
                    >
                      <img 
                        src={effectiveProfile?.photoURL || "https://picsum.photos/seed/user/100/100"} 
                        className="w-9 h-9 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm shrink-0" 
                        referrerPolicy="no-referrer"
                        alt=""
                      />
                      <div className="text-left hidden lg:block">
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-none mb-0.5">{effectiveProfile?.displayName || "User"}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none">
                          {effectiveProfile?.role === 'admin' 
                            ? 'Administrator' 
                            : (effectiveProfile?.program ? (PROGRAM_ABBREVIATIONS[effectiveProfile.program] || effectiveProfile.program) : 'Student')}
                        </p>
                      </div>
                    </button>

                    {/* Profile Dropdown */}
                    <AnimatePresence>
                      {profileMenuOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setProfileMenuOpen(false)} 
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl z-50 overflow-hidden"
                          >
                            <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{effectiveProfile?.displayName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{effectiveProfile?.email}</p>
                            </div>
                            <div className="p-2">
                              <Link 
                                to="/profile"
                                onClick={() => setProfileMenuOpen(false)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all mb-1"
                              >
                                <UserIcon size={18} className="text-indigo-600 dark:text-indigo-400" />
                                My Profile
                              </Link>

                              <div className="h-px bg-slate-100 dark:bg-white/5 my-2" />

                              <button 
                                onClick={handleSignOut}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                              >
                                <LogOut size={18} />
                                Sign Out
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <button 
                    onClick={() => setMobileMenuOpen(true)}
                    className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Menu size={24} />
                  </button>
                </div>
              </header>

              <div className="flex-1 flex flex-row overflow-hidden">
                {/* Sidebar Overlay for Mobile */}
                <AnimatePresence>
                  {mobileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setMobileMenuOpen(false)}
                      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    />
                  )}
                </AnimatePresence>

                {/* Sidebar - Mobile Only */}
                <aside className={`
                  fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-white/10 flex flex-col transition-transform duration-300 lg:hidden
                  ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                  <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                        <img src="/icons/CICS.png" className="w-full h-full object-cover scale-[1]" alt="CICS Logo" />
                      </div>
                      <h1 className="font-bold text-xl tracking-tight dark:text-white">DocHub</h1>
                    </div>
                    <button 
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  </div>

                  <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
                    {viewMode === "admin" ? (
                      <>
                        <NavLink to="/admin" icon={<BarChart3 size={20} />} label="Analytics" onMobileClick={() => setMobileMenuOpen(false)} darkMode={darkMode} />
                        <NavLink to="/admin/documents" icon={<FileText size={20} />} label="Manage Library" onMobileClick={() => setMobileMenuOpen(false)} darkMode={darkMode} />
                        <NavLink to="/admin/upload" icon={<FileUpload size={20} />} label="Upload PDFs" onMobileClick={() => setMobileMenuOpen(false)} darkMode={darkMode} />
                        <NavLink to="/admin/users" icon={<Users size={20} />} label="Manage Users" onMobileClick={() => setMobileMenuOpen(false)} darkMode={darkMode} />
                        <NavLink to="/profile" icon={<UserIcon size={20} />} label="My Profile" onMobileClick={() => setMobileMenuOpen(false)} darkMode={darkMode} />
                      </>
                    ) : (
                      <>
                        <NavLink to="/student" icon={<LayoutDashboard size={20} />} label="Library" onMobileClick={() => setMobileMenuOpen(false)} darkMode={darkMode} />
                        <NavLink to="/profile" icon={<UserIcon size={20} />} label="My Profile" onMobileClick={() => setMobileMenuOpen(false)} darkMode={darkMode} />
                      </>
                    )}
                  </nav>

                  <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900 sticky bottom-0">
                    <div className="flex items-center gap-3 mb-4">
                      <img 
                        src={effectiveProfile?.photoURL || "https://picsum.photos/seed/user/100/100"} 
                        className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 shrink-0" 
                        referrerPolicy="no-referrer"
                        alt=""
                      />
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold truncate dark:text-white">{effectiveProfile?.displayName || "Guest User"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">
                          {effectiveProfile?.role === 'admin' 
                            ? 'Administrator' 
                            : (effectiveProfile?.program ? (PROGRAM_ABBREVIATIONS[effectiveProfile.program] || effectiveProfile.program) : 'Student')}
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 py-2.5 px-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <LogOut size={18} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto relative scrollbar-hide">
                <Routes>
                  <Route path="/" element={<Navigate to={viewMode === 'admin' ? '/admin' : '/student'} replace />} />
                  <Route path="/profile" element={<Profile profile={effectiveProfile!} onUpdate={(p) => setProfile(p)} />} />
                  {viewMode === "admin" ? (
                    <>
                      <Route path="/admin" element={<AdminDashboard darkMode={darkMode} />} />
                      <Route path="/admin/documents" element={<AdminDocuments />} />
                      <Route path="/admin/upload" element={<AdminUpload />} />
                      <Route path="/admin/users" element={<AdminUsers />} />
                      <Route path="*" element={<Navigate to="/admin" />} />
                    </>
                  ) : (
                    <>
                      <Route path="/student" element={<StudentDashboard profile={effectiveProfile!} />} />
                      <Route path="*" element={<Navigate to="/student" />} />
                    </>
                  )}
                </Routes>
              </main>
              
              {(profile?.role === 'admin' || isDevAdmin) && (
                <DevToggle onToggle={toggleViewMode} active={viewMode === 'admin'} />
              )}
            </div>
          </div>
          )}

          {/* Global Access Restriction Modal */}
          <AnimatePresence>
            {authError && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setAuthError(null)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-zinc-900 border border-white/10 rounded-[2rem] p-8 max-w-sm w-full relative z-10 text-center shadow-2xl"
                >
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="text-red-500 w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{authError.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                    {authError.message}
                  </p>
                  <button 
                    onClick={() => setAuthError(null)}
                    className="w-full bg-white text-zinc-950 py-3 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors"
                  >
                    Got it
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
        } />
      </Routes>
    </Router>
  );
}

function LoginRedirect({ user, viewMode }: { user: User | null; viewMode: UserRole | null }) {
  const navigate = useNavigate();
  const [lastUser, setLastUser] = useState<string | null>(null);

  useEffect(() => {
    if (user && !lastUser && viewMode) {
      // Just logged in
      setLastUser(user.uid);
      if (viewMode === 'admin') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } else if (!user) {
      setLastUser(null);
    }
  }, [user, viewMode, lastUser, navigate]);

  return null;
}

function DevToggle({ onToggle, active }: { onToggle: () => void; active?: boolean }) {
  return (
    <button 
      onClick={onToggle}
      className={`fixed bottom-4 right-4 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg transition-all z-50 ${
        active ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 hover:text-slate-600'
      }`}
    >
      {active ? 'Viewing as Admin' : 'Viewing as Student'}
    </button>
  );
}

function NavLink({ to, icon, label, onMobileClick, darkMode }: { to: string; icon: React.ReactNode; label: string; onMobileClick?: () => void; darkMode?: boolean }) {
  const navigate = useNavigate();
  const isActive = window.location.pathname === to;

  return (
    <button
      onClick={() => {
        navigate(to);
        if (onMobileClick) onMobileClick();
      }}
      className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
        isActive 
          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm" 
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
      }`}
    >
      <div className={`shrink-0 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`}>{icon}</div>
      <span>{label}</span>
    </button>
  );
}

function TopNavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const navigate = useNavigate();
  const isActive = window.location.pathname === to;

  return (
    <button
      onClick={() => navigate(to)}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all relative group ${
        isActive 
          ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-500/10 shadow-sm shadow-indigo-100/50 dark:shadow-none" 
          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
      }`}
    >
      <div className={`shrink-0 transition-colors ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}>
        {icon}
      </div>
      <span>{label}</span>
    </button>
  );
}

function LoginScreen({ onAuthError, darkMode, onToggleTheme }: { onAuthError: (title: string, message: string) => void; darkMode: boolean; onToggleTheme: () => void }) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    return email.toLowerCase().endsWith("@neu.edu.ph");
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    
    const isAppleDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    try {
      if (isAppleDevice) {
        // Apple devices often block popups in iframes, so we use redirect for them.
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error: any) {
      console.error("Login failed", error);
      let errorMessage = "Login failed. Please try again.";
      let errorTitle = "Authentication Error";

      if (error.code === 'auth/popup-blocked') {
        errorMessage = "The login popup was blocked by your browser. Please ensure popups are allowed or try using a desktop browser.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "The login popup was closed before completion. Please try again.";
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = "This domain is not authorized for login. Please contact the administrator.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many login attempts. Please wait a few minutes before trying again.";
      } else if (error.code === 'auth/operation-not-supported-in-this-environment') {
        errorMessage = "This login method is not supported in this browser environment. Try using a standard browser like Chrome or Safari.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      onAuthError(errorTitle, errorMessage);
    } finally {
      // For redirect (Apple devices), we don't want to set loading to false immediately
      // as the page will be redirecting.
      if (!isAppleDevice) {
        setTimeout(() => setLoading(false), 1000);
      }
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!validateEmail(email)) {
      setError("Only @neu.edu.ph emails are allowed.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/too-many-requests') {
        setError("Too many attempts. Please wait a few minutes.");
      } else {
        setError(err.message || "Failed to sign in. Check your credentials.");
      }
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError("Only @neu.edu.ph emails are allowed.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError("Please enter a valid @neu.edu.ph email.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Password reset email sent! Check your inbox.");
      setTimeout(() => setMode('login'), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-zinc-950 p-6 relative overflow-hidden scrollbar-hide transition-colors duration-500">
      {/* Theme Toggle (Login Screen) */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={onToggleTheme}
          className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 shadow-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] bg-emerald-600/5" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] bg-emerald-900/5" />
        
        {/* NEU Background */}
        <div className="absolute inset-0 opacity-[0.2]">
          <img src="/icons/NEU.jpg" className="w-full h-full object-cover" alt="" />
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white dark:bg-zinc-900/30 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-2xl shadow-black/10 dark:shadow-black/40 transition-colors">
          {/* Header: Logo and Title in one row */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center overflow-hidden shrink-0">
              <img src="/icons/CICS.png" className="w-full h-full object-cover scale-[1]" alt="CICS Logo" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tighter uppercase italic">
              CICS <span className="not-italic text-emerald-600 dark:text-emerald-500">DocHub</span>
            </h1>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold">
              {error}
              {/iPhone|iPad|iPod/i.test(navigator.userAgent) && (
                <p className="mt-2 text-[10px] opacity-80 font-medium">
                  Tip: If login fails on your Apple device, try opening this link in Safari or use a desktop computer.
                </p>
              )}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs font-bold">
              {success}
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleEmailLogin : mode === 'signup' ? handleSignUp : handleResetPassword} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Institutional Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                <input
                  type="email"
                  placeholder="username@neu.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Password</label>
                  {mode === 'login' && (
                    <button 
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-500 uppercase tracking-widest transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Confirm Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-black text-sm tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  {mode === 'forgot' ? <Key className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                  <span>{mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Register' : 'Send Reset Link'}</span>
                </>
              )}
            </button>

            {mode === 'forgot' && (
              <div className="text-center mt-2">
                <button 
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs font-bold text-slate-500 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </form>

          <div className="flex items-center gap-2 my-5">
            <div className="flex-1 border-t border-slate-200 dark:border-white/5"></div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-zinc-600">or</span>
            <div className="flex-1 border-t border-slate-200 dark:border-white/5"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 py-3.5 rounded-xl font-bold text-sm text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all disabled:opacity-50 shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
            Continue with Google
          </button>

          <div className="mt-6 text-center">
            <p className="text-xs font-bold text-slate-500 dark:text-zinc-500">
              {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
              <button 
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setError(null);
                  setSuccess(null);
                }}
                className="ml-2 text-emerald-600 dark:text-emerald-500 hover:underline"
              >
                {mode === 'login' ? 'Register Now' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
