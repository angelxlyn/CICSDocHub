import React, { useState, useEffect } from "react";
import { 
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { ActivityLog, PROGRAMS, UserProfile } from "../types";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  Upload,
  Calendar,
  ExternalLink,
  Shield
} from "lucide-react";
import { 
  format, 
  subDays, 
  startOfDay, 
  endOfDay, 
  eachDayOfInterval,
  isSameDay
} from "date-fns";

import { dataService } from "../services/dataService";

export default function AdminDashboard({ darkMode }: { darkMode?: boolean }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [allTimeLogs, setAllTimeLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState<"daily" | "weekly" | "monthly" | "custom">("weekly");
  const [customRange, setCustomRange] = useState({
    start: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd")
  });

  const isDark = darkMode ?? (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLoading(true);
    
    let start: Date;
    let end: Date = endOfDay(new Date());

    if (timeRange === "daily") {
      start = subDays(new Date(), 1);
    } else if (timeRange === "weekly") {
      start = startOfDay(subDays(new Date(), 6));
    } else if (timeRange === "monthly") {
      start = startOfDay(subDays(new Date(), 29));
    } else {
      start = startOfDay(new Date(customRange.start));
      end = endOfDay(new Date(customRange.end));
    }

    const unsubLogs = dataService.subscribeToLogs((activityLogs) => {
      setLogs(activityLogs);
      setLoading(false);
    }, start, end);

    const unsubUsers = dataService.subscribeToUsers((allUsers) => {
      console.log("Dashboard: Received users update, count:", allUsers.length);
      setUsers(allUsers);
    });

    const unsubAllLogs = dataService.subscribeToLogs((allLogs) => {
      setAllTimeLogs(allLogs);
    });

    return () => {
      unsubLogs();
      unsubUsers();
      unsubAllLogs();
    };
  }, [timeRange, customRange]);

  const getChartData = () => {
    let start: Date;
    let end: Date = endOfDay(new Date());

    if (timeRange === "daily") {
      start = subDays(new Date(), 1);
    } else if (timeRange === "weekly") {
      start = startOfDay(subDays(new Date(), 6));
    } else if (timeRange === "monthly") {
      start = startOfDay(subDays(new Date(), 29));
    } else {
      start = startOfDay(new Date(customRange.start));
      end = endOfDay(new Date(customRange.end));
    }

    const interval = eachDayOfInterval({
      start: start,
      end: end
    });

    return interval.map(date => {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayUploads = logs.filter(log => {
        if (log.action !== "upload" || !log.timestamp) return false;
        const lDate = typeof log.timestamp.toDate === 'function' ? log.timestamp.toDate() : new Date((log.timestamp.seconds || 0) * 1000);
        return lDate >= dayStart && lDate <= dayEnd;
      });
      const dayStudentLogins = logs.filter(log => {
        if (log.action !== "login" || !log.timestamp || log.userRole === 'admin') return false;
        const lDate = typeof log.timestamp.toDate === 'function' ? log.timestamp.toDate() : new Date((log.timestamp.seconds || 0) * 1000);
        return lDate >= dayStart && lDate <= dayEnd;
      });
      const dayAdminLogins = logs.filter(log => {
        if (log.action !== "login" || !log.timestamp || log.userRole !== 'admin') return false;
        const lDate = typeof log.timestamp.toDate === 'function' ? log.timestamp.toDate() : new Date((log.timestamp.seconds || 0) * 1000);
        return lDate >= dayStart && lDate <= dayEnd;
      });
      const dayViews = logs.filter(log => {
        if (log.action !== "view" || !log.timestamp) return false;
        const lDate = typeof log.timestamp.toDate === 'function' ? log.timestamp.toDate() : new Date((log.timestamp.seconds || 0) * 1000);
        return lDate >= dayStart && lDate <= dayEnd;
      });
      return {
        name: format(date, "MMM d"),
        uploads: dayUploads.length,
        studentLogins: dayStudentLogins.length,
        adminLogins: dayAdminLogins.length,
        views: dayViews.length
      };
    });
  };

  const stats = {
    totalViews: allTimeLogs.filter(l => l.action === "view").length,
    totalUploads: allTimeLogs.filter(l => l.action === "upload").length,
    onlineNow: users.filter(u => {
      if (!u.lastActive) return false;
      
      // Handle both Firestore Timestamp and plain objects (from local fallback)
      const lastActiveDate = typeof u.lastActive.toDate === 'function' 
        ? u.lastActive.toDate() 
        : new Date((u.lastActive.seconds || 0) * 1000);
        
      // Online if active in the last 5 minutes
      return (Date.now() - lastActiveDate.getTime()) < 5 * 60 * 1000;
    }).length,
    activeUsers: users.length, // Total registered users
    activeThisPeriod: users.filter(u => {
      const activeTimestamp = u.lastActive || u.createdAt;
      if (!activeTimestamp) return false;
      
      const activeDate = typeof activeTimestamp.toDate === 'function' 
        ? activeTimestamp.toDate() 
        : new Date((activeTimestamp.seconds || 0) * 1000);
        
      let start: Date;
      if (timeRange === "daily") {
        start = subDays(new Date(), 1);
      } else if (timeRange === "weekly") {
        start = startOfDay(subDays(new Date(), 6));
      } else if (timeRange === "monthly") {
        start = startOfDay(subDays(new Date(), 29));
      } else {
        start = startOfDay(new Date(customRange.start));
      }
      return activeDate >= start;
    }).length
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto scrollbar-hide">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">System Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Monitor document activity and user engagement.</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4">
          {timeRange === "custom" && (
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-xl shadow-sm">
              <input 
                type="date" 
                className="text-xs font-semibold outline-none bg-transparent dark:text-white"
                value={customRange.start}
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
              />
              <span className="text-slate-400 text-xs">to</span>
              <input 
                type="date" 
                className="text-xs font-semibold outline-none bg-transparent dark:text-white"
                value={customRange.end}
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          )}
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-xl shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select 
              className="bg-transparent text-sm font-semibold outline-none cursor-pointer dark:text-white"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
            >
              <option value="daily" className="dark:bg-zinc-900">Last 24 Hours</option>
              <option value="weekly" className="dark:bg-zinc-900">Last 7 Days</option>
              <option value="monthly" className="dark:bg-zinc-900">Last 30 Days</option>
              <option value="custom" className="dark:bg-zinc-900">Custom Range</option>
            </select>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Total Views" 
          value={stats.totalViews} 
          icon={<ExternalLink className="text-purple-600 dark:text-purple-400" />} 
          color="bg-purple-50 dark:bg-purple-500/10"
        />
        <StatCard 
          title="New Uploads" 
          value={stats.totalUploads} 
          icon={<Upload className="text-emerald-600 dark:text-emerald-400" />} 
          color="bg-emerald-50 dark:bg-emerald-500/10"
        />
        <StatCard 
          title="Active Users" 
          value={stats.activeThisPeriod} 
          icon={<Users className="text-indigo-600 dark:text-indigo-400" />} 
          color="bg-indigo-50 dark:bg-indigo-500/10"
          subtitle={`Out of ${stats.activeUsers} total`}
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white dark:bg-zinc-900 p-4 md:p-8 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm mb-8 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Activity Trends</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>Views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span>Uploads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span>Student Log-ins</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <span>Admin Log-ins</span>
            </div>
          </div>
        </div>
        <div className="h-[400px] w-full relative overflow-hidden">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={100}>
              <AreaChart data={getChartData()} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorStudentLogins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAdminLogins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: isDark ? '#64748b' : '#94a3b8', fontSize: 12}}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: isDark ? '#64748b' : '#94a3b8', fontSize: 12}}
              />
              <Tooltip 
                contentStyle={{
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  backgroundColor: isDark ? '#18181b' : '#ffffff',
                  color: isDark ? '#ffffff' : '#000000'
                }}
                itemStyle={{
                  color: isDark ? '#e2e8f0' : '#475569'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="views" 
                stroke="#a855f7" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorViews)" 
              />
              <Area 
                type="monotone" 
                dataKey="uploads" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorUploads)" 
              />
              <Area 
                type="monotone" 
                dataKey="studentLogins" 
                name="Student Log-ins"
                stroke="#f59e0b" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorStudentLogins)" 
              />
              <Area 
                type="monotone" 
                dataKey="adminLogins" 
                name="Admin Log-ins"
                stroke="#f43f5e" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorAdminLogins)" 
              />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Recent Activity</h3>
        </div>
        <div className="p-2">
          <div className="space-y-1">
            {logs.filter(l => l.action !== 'download').slice(0, 15).map((log) => (
              <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all group">
                <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  log.action === 'view' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                  log.action === 'upload' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                  log.action === 'unblock' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                  log.action === 'block' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' :
                  log.action === 'delete' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                  'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                }`}>
                  {log.action === 'view' && <ExternalLink size={18} />}
                  {log.action === 'upload' && <Upload size={18} />}
                  {(log.action === 'block' || log.action === 'unblock') && <Users size={18} />}
                  {log.action === 'delete' && <TrendingUp size={18} className="rotate-45" />}
                  {log.action === 'login' && <Calendar size={18} />}
                  {log.action === 'role_update' && <Shield size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <span className="font-bold text-slate-900 dark:text-white">{log.userEmail}</span>
                    {" "}
                    {log.action === 'view' && (
                      <>viewed <span className="font-semibold text-indigo-600 dark:text-indigo-400">{log.documentTitle}</span></>
                    )}
                    {log.action === 'upload' && (
                      <>uploaded <span className="font-semibold text-emerald-600 dark:text-emerald-400">{log.documentTitle}</span></>
                    )}
                    {log.action === 'block' && (
                      <>blocked <span className="font-semibold text-red-600 dark:text-red-400">{log.targetUserEmail || log.targetUserId}</span></>
                    )}
                    {log.action === 'unblock' && (
                      <>unblocked <span className="font-semibold text-emerald-600 dark:text-emerald-400">{log.targetUserEmail || log.targetUserId}</span></>
                    )}
                    {log.action === 'delete' && (
                      <>deleted <span className="font-semibold text-rose-600 dark:text-rose-400">{log.documentTitle}</span></>
                    )}
                    {log.action === 'login' && <>logged into the portal</>}
                    {log.action === 'role_update' && (
                      <>updated role for <span className="font-semibold text-slate-900 dark:text-white">{log.targetUserEmail || log.targetUserId}</span> {log.details}</>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium uppercase tracking-wider">
                    {format(log.timestamp.toDate(), "MMM d, yyyy • HH:mm")}
                  </p>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-slate-400 dark:text-slate-500 text-sm italic">No recent activity recorded.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, subtitle }: { title: string; value: number; icon: React.ReactNode; color: string; subtitle?: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between gap-4">
        <div className={`${color} p-3 rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
        <div className="flex flex-col items-end text-right">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
          <h4 className="text-3xl font-medium text-slate-900 dark:text-white tabular-nums">{value.toLocaleString()}</h4>
          {subtitle && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium italic">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
