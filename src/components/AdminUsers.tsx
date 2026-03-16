import React, { useState, useEffect } from "react";
import { 
  UserProfile, 
  PROGRAM_ABBREVIATIONS 
} from "../types";
import { 
  Search, 
  UserMinus, 
  UserCheck, 
  Shield, 
  Mail, 
  Loader2,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  X,
  Calendar,
  BookOpen,
  User as UserIcon
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";

import { dataService } from "../services/dataService";
import { auth } from "../lib/firebase";

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: 'displayName' | 'program' | 'isBlocked' | 'createdAt';
    direction: 'asc' | 'desc';
  } | null>(null);
  const [promotingUser, setPromotingUser] = useState<UserProfile | null>(null);
  const [revokingUser, setRevokingUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentUserEmail = auth.currentUser?.email;
  const isPrimaryAdmin = currentUserEmail === 'angellyn.tolentino@neu.edu.ph' || 
                         currentUserEmail === 'jcesperanza@neu.edu.ph' ||
                         auth.currentUser?.uid === 'aTLQW3vFP2crhY4Ge8Sy02dcOv72';

  const isUserPrimaryAdmin = (email: string | null | undefined) => {
    return email === 'angellyn.tolentino@neu.edu.ph' || email === 'jcesperanza@neu.edu.ph';
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = dataService.subscribeToUsers((results) => {
      setUsers(results);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleBlockStatus = async (user: UserProfile) => {
    try {
      await dataService.toggleUserBlock(user);
      // No need to manually update state, subscription will handle it
    } catch (error) {
      console.error("Failed to update user status", error);
    }
  };

  const handleSort = (key: 'displayName' | 'program' | 'isBlocked' | 'createdAt') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredUsers = users
    .filter(u => {
      const search = searchTerm.toLowerCase();
      const email = (u.email || "").toLowerCase();
      const name = (u.displayName || "").toLowerCase();
      const program = (u.program || "").toLowerCase();
      const programAbbr = u.program ? (PROGRAM_ABBREVIATIONS[u.program] || "").toLowerCase() : "";
      
      return email.includes(search) ||
             name.includes(search) ||
             program.includes(search) ||
             programAbbr.includes(search);
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;
      
      const { key, direction } = sortConfig;
      let aValue: any = a[key];
      let bValue: any = b[key];

      // Handle special cases
      if (key === 'createdAt') {
        aValue = aValue?.seconds || 0;
        bValue = bValue?.seconds || 0;
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ column }: { column: 'displayName' | 'program' | 'isBlocked' | 'createdAt' }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">User Management</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Manage student access and permissions.</p>
      </header>

      <div className="mb-8 relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by name, email, or program..."
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm dark:text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('displayName')}
                >
                  <div className="flex items-center gap-2">
                    User <SortIcon column="displayName" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('program')}
                >
                  <div className="flex items-center gap-2">
                    Program <SortIcon column="program" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('isBlocked')}
                >
                  <div className="flex items-center gap-2">
                    Status <SortIcon column="isBlocked" />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-2">
                    Joined <SortIcon column="createdAt" />
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-slate-400">Loading users...</p>
                  </td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr 
                  key={user.uid} 
                  className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <div className="relative shrink-0">
                        <img 
                          src={user.photoURL} 
                          className="w-10 h-10 rounded-full border border-slate-200 dark:border-white/10 object-cover" 
                          referrerPolicy="no-referrer"
                          alt=""
                        />
                        {user.lastSeen && (Date.now() - (typeof user.lastSeen.toDate === 'function' ? user.lastSeen.toDate() : new Date((user.lastSeen.seconds || 0) * 1000)).getTime()) < 5 * 60 * 1000 && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" title="Online" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{user.displayName}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Mail size={12} />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600 dark:text-slate-400 font-medium" title={user.program}>
                      {user.program ? (PROGRAM_ABBREVIATIONS[user.program] || user.program) : "Not Selected"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                      user.isBlocked ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    }`}>
                      {user.isBlocked ? 'Blocked' : 'Authorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                  {user.createdAt ? (
                    format(
                      new Date((user.createdAt.seconds || 0) * 1000), 
                      "MMM d, yyyy"
                    )
                  ) : "N/A"}
                </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      {user.role !== 'admin' ? (
                        <>
                          <button
                            onClick={() => toggleBlockStatus(user)}
                            disabled={isUserPrimaryAdmin(user.email)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              user.isBlocked 
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white'
                            } ${isUserPrimaryAdmin(user.email) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={user.isBlocked ? "Unblock User" : "Block User"}
                          >
                            {user.isBlocked ? <UserCheck size={14} /> : <UserMinus size={14} />}
                            <span className="hidden sm:inline">{user.isBlocked ? 'Unblock' : 'Block'}</span>
                          </button>
                          
                          {isPrimaryAdmin && (
                            <button
                              onClick={() => setPromotingUser(user)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all"
                              title="Promote to Admin"
                            >
                              <Shield size={14} />
                              <span className="hidden sm:inline">Make Admin</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                            <Shield size={14} /> Admin
                          </span>
                          {isPrimaryAdmin && user.uid !== auth.currentUser?.uid && !isUserPrimaryAdmin(user.email) && (
                            <button
                              onClick={() => setRevokingUser(user)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-600 hover:text-white dark:hover:bg-orange-600 dark:hover:text-white transition-all"
                              title="Revoke Admin Role"
                            >
                              <UserMinus size={14} />
                              <span className="hidden sm:inline">Revoke</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Profile Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl w-full max-w-lg relative z-10 overflow-hidden transition-colors"
            >
              {/* Header/Cover */}
              <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600 relative">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Profile Info */}
              <div className="px-8 pb-8">
                <div className="relative -mt-16 mb-6">
                  <img 
                    src={selectedUser.photoURL} 
                    className="w-32 h-32 rounded-[2rem] border-4 border-white dark:border-zinc-900 shadow-lg object-cover bg-white dark:bg-zinc-800"
                    referrerPolicy="no-referrer"
                    alt=""
                  />
                  <div className={`absolute bottom-2 left-24 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border-2 border-white dark:border-zinc-900 shadow-sm ${
                    selectedUser.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    {selectedUser.role}
                  </div>
                </div>

                <div className="mb-6">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-1">{selectedUser.displayName}</h2>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Mail size={14} />
                    <span className="text-sm font-medium">{selectedUser.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
                      <BookOpen size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Academic Program</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {selectedUser.program || "Not Selected"}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
                      <Calendar size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Member Since</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {selectedUser.createdAt ? format(new Date((selectedUser.createdAt.seconds || 0) * 1000), "MMMM d, yyyy") : "N/A"}
                    </p>
                  </div>
                </div>

                {selectedUser.bio && (
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
                      <UserIcon size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">About Me</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                      "{selectedUser.bio}"
                    </p>
                  </div>
                )}

                {selectedUser.role !== 'admin' ? (
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => toggleBlockStatus(selectedUser)}
                      disabled={isUserPrimaryAdmin(selectedUser.email)}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        selectedUser.isBlocked 
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                          : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white'
                      } ${isUserPrimaryAdmin(selectedUser.email) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {selectedUser.isBlocked ? <UserCheck size={18} /> : <UserMinus size={18} />}
                      {selectedUser.isBlocked ? 'Unblock User' : 'Block User'}
                    </button>
                    
                    {isPrimaryAdmin && (
                      <button
                        onClick={() => setPromotingUser(selectedUser)}
                        className="flex-1 py-3 rounded-xl font-bold text-sm bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Shield size={18} />
                        Make Admin
                      </button>
                    )}
                  </div>
                ) : (
                  isPrimaryAdmin && selectedUser.uid !== auth.currentUser?.uid && !isUserPrimaryAdmin(selectedUser.email) && (
                    <div className="mt-8">
                      <button
                        onClick={() => setRevokingUser(selectedUser)}
                        className="w-full py-3 rounded-xl font-bold text-sm bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-600 hover:text-white dark:hover:bg-orange-600 dark:hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <UserMinus size={18} />
                        Revoke Admin Role
                      </button>
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Promotion Confirmation Modal */}
      <AnimatePresence>
        {promotingUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPromotingUser(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 p-8 text-center"
            >
              <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Promote to Admin?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                Are you sure you want to promote <span className="font-bold text-slate-900 dark:text-white">{promotingUser.displayName}</span>? 
                This will grant them full administrative access to the system.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPromotingUser(null)}
                  className="flex-1 py-4 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await dataService.updateUserRole(promotingUser, 'admin');
                      setPromotingUser(null);
                      if (selectedUser?.uid === promotingUser.uid) {
                        setSelectedUser({ ...selectedUser, role: 'admin' });
                      }
                    } catch (e) {
                      setError("Failed to promote user. Please try again.");
                      setTimeout(() => setError(null), 3000);
                    }
                  }}
                  className="flex-1 py-4 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all"
                >
                  Confirm Promotion
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Revocation Confirmation Modal */}
      <AnimatePresence>
        {revokingUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRevokingUser(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 p-8 text-center"
            >
              <div className="w-20 h-20 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserMinus className="w-10 h-10 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Revoke Admin Role?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                Are you sure you want to revoke administrative access for <span className="font-bold text-slate-900 dark:text-white">{revokingUser.displayName}</span>? 
                They will be demoted to a standard student account.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRevokingUser(null)}
                  className="flex-1 py-4 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await dataService.updateUserRole(revokingUser, 'student');
                      setRevokingUser(null);
                      if (selectedUser?.uid === revokingUser.uid) {
                        setSelectedUser({ ...selectedUser, role: 'student' });
                      }
                    } catch (e) {
                      setError("Failed to revoke admin role.");
                      setTimeout(() => setError(null), 3000);
                    }
                  }}
                  className="flex-1 py-4 rounded-xl font-bold bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all"
                >
                  Confirm Revoke
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2"
          >
            <X size={18} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
