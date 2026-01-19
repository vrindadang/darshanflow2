
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppProvider, useApp } from './store.tsx';
import Login from './views/Login.tsx';
import Requestor from './views/Requestor.tsx';
import Approver from './views/Approver.tsx';
import Finance from './views/Finance.tsx';
import { Role, RequestStatus } from './types.ts';
import { LogOut, User as UserIcon, X, Download, Upload, Check, AlertCircle, Database, Globe, RefreshCw, Layers, Terminal, Info, Loader2, Bell, CheckCheck, Clock } from 'lucide-react';
import { cn, Card, Button, Input } from './components/ui.tsx';
import { mongoDB, ConnectionStatus } from './db.ts';
import Logo from './components/Logo.tsx';

const SUPABASE_SQL = `-- Supabase Schema for DarshanFlow
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  "schoolId" TEXT,
  "schoolName" TEXT,
  category TEXT,
  description TEXT,
  amount NUMERIC,
  status TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "approverComments" TEXT,
  "financeComments" TEXT,
  "rejectionReason" TEXT,
  "attachmentName" TEXT,
  "attachmentData" TEXT,
  session TEXT,
  "expenseDate" DATE,
  "exceedsBudgetReason" TEXT
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  data JSONB
);

CREATE TABLE IF NOT EXISTS budgetLogs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  "adminName" TEXT,
  "schoolName" TEXT,
  session TEXT,
  category TEXT,
  quarter TEXT,
  "oldAmount" NUMERIC,
  "newAmount" NUMERIC
);

CREATE TABLE IF NOT EXISTS budgetRequests (
  id TEXT PRIMARY KEY,
  "schoolId" TEXT,
  "schoolName" TEXT,
  session TEXT,
  data JSONB,
  status TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  note TEXT,
  "attachmentName" TEXT,
  "adminComments" TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  "userId" TEXT,
  role TEXT,
  "schoolId" TEXT,
  message TEXT,
  type TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  "requestId" TEXT
);

ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgetLogs DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgetRequests DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;`;

const NotificationDropdown: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, user, setSelectedRequest, requests } = useApp();
  
  const filteredNotifications = useMemo(() => {
    if (!user) return [];
    return notifications.filter(n => {
      if (n.role && n.role === user.role) return true;
      if (n.schoolId && n.schoolId === user.schoolId) return true;
      if (n.userId && n.userId === user.id) return true;
      return false;
    });
  }, [notifications, user]);

  const unreadCount = filteredNotifications.filter(n => !n.read).length;

  const handleNotificationClick = (n: any) => {
    markNotificationAsRead(n.id);
    if (n.requestId) {
      const req = requests.find(r => r.id === n.requestId);
      if (req) setSelectedRequest(req);
    }
    onClose();
  };

  return (
    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-fade-in ring-1 ring-slate-900/5">
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
        <div>
           <h3 className="text-sm font-bold text-slate-900 leading-none">Activity Feed</h3>
           {unreadCount > 0 && <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase tracking-wider">{unreadCount} New Progress Alerts</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllNotificationsAsRead} className="text-[10px] text-slate-400 font-bold uppercase hover:text-blue-600 transition-colors">Mark all read</button>
        )}
      </div>
      <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => handleNotificationClick(n)}
              className={cn(
                "p-4 hover:bg-slate-50 cursor-pointer transition-colors relative group",
                !n.read ? "bg-blue-50/30" : ""
              )}
            >
              {!n.read && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full"></div>}
              <div className="flex gap-3">
                 <div className={cn(
                   "p-2 rounded-lg shrink-0",
                   n.type === 'success' ? "bg-emerald-100 text-emerald-600" : 
                   n.type === 'error' ? "bg-rose-100 text-rose-600" : 
                   "bg-blue-100 text-blue-600"
                 )}>
                   {n.type === 'success' ? <CheckCheck className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className={cn("text-xs leading-relaxed", !n.read ? "font-bold text-slate-900" : "text-slate-600")}>
                      {n.message}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                       <Clock className="w-3 h-3 text-slate-400" />
                       <span className="text-[10px] text-slate-400 font-medium">
                         {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </div>
                 </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center space-y-2">
            <Bell className="w-8 h-8 text-slate-200 mx-auto" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quiet for now</p>
          </div>
        )}
      </div>
      <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
         <button onClick={onClose} className="text-[10px] font-bold text-slate-400 uppercase hover:text-slate-600">Close Notifications</button>
      </div>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { user, logout, lastSync, notifications } = useApp();
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [showSqlSetup, setShowSqlSetup] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [diag, setDiag] = useState<ConnectionStatus | null>(mongoDB.lastStatus);
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const runTest = async () => {
    setIsTesting(true);
    try {
      const result = await mongoDB.testConnection();
      setDiag(result);
    } catch (e) {
      console.error("Connection test failed:", e);
    } finally {
      setIsTesting(false);
    }
  };

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    return notifications.filter(n => {
      if (n.read) return false;
      if (n.role && n.role === user.role) return true;
      if (n.schoolId && n.schoolId === user.schoolId) return true;
      if (n.userId && n.userId === user.id) return true;
      return false;
    }).length;
  }, [notifications, user]);

  useEffect(() => { runTest(); }, []);
  useEffect(() => { if (showDataMenu) runTest(); }, [showDataMenu]);
  useEffect(() => {
    const interval = setInterval(() => { setDiag(mongoDB.lastStatus); }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return <Login />;

  const handleExport = () => {
    const data = mongoDB.exportData();
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `DarshanFlow_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (mongoDB.importData(event.target?.result as string)) {
        alert("Data imported successfully! Refreshing...");
        window.location.reload();
      } else { alert("Invalid data file."); }
    };
    reader.readAsText(file);
  };

  const renderContent = () => {
    switch (user.role) {
      case Role.REQUESTOR: return <Requestor />;
      case Role.APPROVER: return <Approver />;
      case Role.FINANCE: return <Finance />;
      default: return <div>Invalid Role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
               <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-md">
                  <Logo className="h-12 w-12" />
               </div>
               <div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">DarshanFlow</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                      {user.role === Role.REQUESTOR ? 'School Portal' : user.role === Role.APPROVER ? 'Admin Console' : 'Finance Desk'}
                    </p>
                    <span className="text-gray-300">|</span>
                    {mongoDB.isLive ? (
                      <button onClick={() => setShowDataMenu(true)} className={cn("flex items-center gap-1.5 p-0.5 pr-1.5 rounded-full border transition-all", diag?.ok ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600")}>
                        <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full", diag?.ok ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
                          {isTesting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Globe className="w-2.5 h-2.5" />}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-tight">{diag?.ok ? 'Cloud Sync' : diag ? 'Cloud Error' : 'Checking...'}</span>
                      </button>
                    ) : (
                      <button onClick={() => setShowDataMenu(true)} className="flex items-center gap-1 text-[9px] text-amber-600 font-bold uppercase bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 hover:bg-amber-100 transition-colors">
                        <Database className="w-2.5 h-2.5" /> Local Only
                      </button>
                    )}
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end mr-2">
                 <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Last Synced</span>
                 <span className="text-[10px] font-bold text-slate-600 mt-1">{lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={cn(
                    "p-2.5 rounded-2xl transition-all relative",
                    unreadCount > 0 ? "bg-blue-50 text-blue-600 shadow-sm" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                  )}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-rose-600 text-white text-[9px] font-black rounded-full border-2 border-white px-1">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && <NotificationDropdown onClose={() => setShowNotifications(false)} />}
              </div>

              <button onClick={() => setShowDataMenu(true)} className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"><RefreshCw className="w-5 h-5" /></button>
              <div className="h-8 w-px bg-gray-200 mx-1"></div>
              <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                 <UserIcon className="w-4 h-4 text-blue-600" />
                 <span className="text-xs font-black text-slate-700">{user.name}</span>
              </div>
              <button onClick={logout} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><LogOut className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{renderContent()}</main>
      {showDataMenu && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-xl p-0 overflow-hidden shadow-2xl border-none">
            <div className="bg-white p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Layers className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">Workspace Control</h3>
                  <p className="text-slate-500 text-xs">Cloud Synchronization & Database</p>
                </div>
              </div>
              <button onClick={() => setShowDataMenu(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">Cloud Diagnostics {isTesting && <Loader2 className="w-3 h-3 animate-spin" />}</h4>
                {diag?.ok ? (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-600" />
                    <div><p className="text-xs font-bold text-emerald-900">Cloud Sync Active</p><p className="text-[10px] text-emerald-600">Your data is being saved to shamowqhlntodbxpnakz.supabase.co</p></div>
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 space-y-3">
                    <div className="flex items-start gap-3"><AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" /><div><p className="text-xs font-bold text-rose-900">Cloud Connection Incomplete</p><p className="text-[10px] text-rose-600 leading-relaxed">The app is currently falling back to <strong>Local Storage</strong>.</p></div></div>
                    {diag?.tablesMissing && <div className="pl-8 flex flex-wrap gap-2">{diag.tablesMissing.map(t => <span key={t} className="text-[9px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded border border-rose-200">Table '{t}' missing</span>)}</div>}
                    <div className="pt-2 pl-8"><Button onClick={() => setShowSqlSetup(true)} size="sm" className="bg-rose-600 text-[10px] h-8 font-bold"><Terminal className="w-3 h-3" /> Supabase SQL Setup</Button></div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manual Data Management</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleExport} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left"><Download className="w-4 h-4 text-blue-600" /><div><p className="text-xs font-bold text-slate-900">Export Backup</p><p className="text-[9px] text-slate-500">Save to .json file</p></div></button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left"><Upload className="w-4 h-4 text-emerald-600" /><div><p className="text-xs font-bold text-slate-900">Import Records</p><p className="text-[9px] text-slate-500">Restore from file</p></div><input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" /></button>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3"><Button onClick={runTest} variant="ghost" size="sm">Retry Connection</Button><Button onClick={() => setShowDataMenu(false)} variant="secondary" size="sm">Close</Button></div>
          </Card>
        </div>
      )}
      {showSqlSetup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in">
          <Card className="w-full max-w-2xl p-0 overflow-hidden shadow-2xl border-none">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center"><div className="flex items-center gap-3"><Terminal className="w-6 h-6 text-emerald-400" /><div><h3 className="font-bold">Supabase SQL Schema</h3><p className="text-slate-400 text-xs tracking-tight">Paste this into your Supabase SQL Editor to go live.</p></div></div><button onClick={() => setShowSqlSetup(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button></div>
            <div className="p-0 relative"><pre className="bg-slate-800 p-6 text-[11px] text-emerald-300 font-mono overflow-auto max-h-[400px] leading-relaxed select-all">{SUPABASE_SQL}</pre><div className="absolute top-4 right-4"><Button onClick={copySql} className={cn("text-[10px] h-9 px-4 font-bold border-none", copied ? "bg-emerald-600 text-white" : "bg-white/10 text-white hover:bg-white/20")}><Check className="w-4 h-4" />{copied ? 'Copied to Clipboard' : 'Copy Code'}</Button></div></div>
            <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4"><div className="flex gap-3"><div className="bg-blue-100 p-2 rounded-lg shrink-0"><Info className="w-5 h-5 text-blue-600" /></div><p className="text-xs text-slate-600 leading-relaxed font-medium"><strong>Instructions:</strong> Open your Supabase dashboard, go to the <strong>SQL Editor</strong>, create a <strong>"New Query"</strong>, paste this code, and click <strong>"Run"</strong>.</p></div><div className="flex justify-end pt-2"><Button onClick={() => setShowSqlSetup(false)} className="bg-slate-900 hover:bg-slate-800 px-8">Got it</Button></div></div>
          </Card>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => <AppProvider><MainLayout /></AppProvider>;
export default App;
