
import React, { useState, useRef, useEffect } from 'react';
import { AppProvider, useApp } from './store.tsx';
import Login from './views/Login.tsx';
import Requestor from './views/Requestor.tsx';
import Approver from './views/Approver.tsx';
import Finance from './views/Finance.tsx';
import { Role } from './types.ts';
import { BookOpen, LogOut, User as UserIcon, Bell, X, Download, Upload, Check, AlertCircle, Database, Globe, HelpCircle, FileJson, RefreshCw, Layers, Server, Activity } from 'lucide-react';
import { cn, Card, Button, Input, Label } from './components/ui.tsx';
import { mongoDB } from './db.ts';

const MainLayout: React.FC = () => {
  const { user, logout, lastSync } = useApp();
  const [showDataMenu, setShowDataMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return <Login />;

  const handleExport = () => {
    const data = mongoDB.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DarshanFlow_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (mongoDB.importData(content)) {
        alert("Data imported successfully! Refreshing...");
        window.location.reload();
      } else {
        alert("Invalid data file.");
      }
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
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
               <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
                  <BookOpen className="h-6 w-6 text-white" />
               </div>
               <div>
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">DarshanFlow</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                      {user.role === Role.REQUESTOR ? 'School Portal' : user.role === Role.APPROVER ? 'Admin Console' : 'Finance Desk'}
                    </p>
                    <span className="text-gray-300">|</span>
                    {mongoDB.isLive ? (
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border",
                          mongoDB.mode === 'SUPABASE' ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-blue-600 bg-blue-50 border-blue-100"
                        )}>
                          <Globe className="w-2.5 h-2.5" /> {mongoDB.mode} Cloud
                        </span>
                        <div className="flex items-center gap-1 text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                          <Activity className="w-2 h-2 text-emerald-500 animate-pulse" /> Live Syncing
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowDataMenu(true)}
                        className="flex items-center gap-1 text-[9px] text-amber-600 font-bold uppercase bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 hover:bg-amber-100 transition-colors"
                      >
                        <Database className="w-2.5 h-2.5" /> Offline Workspace
                      </button>
                    )}
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end mr-2">
                 <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Last Synced</span>
                 <span className="text-[10px] font-medium text-slate-600">{lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
              <button onClick={() => setShowDataMenu(true)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                <RefreshCw className="w-5 h-5" />
              </button>
              <div className="h-8 w-px bg-gray-200 mx-1"></div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200">
                 <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                 <span className="text-xs font-bold text-slate-700">{user.name}</span>
              </div>
              <button onClick={logout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
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
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">Data Strategy</h3>
                  <p className="text-slate-500 text-xs">Manage your school's data storage</p>
                </div>
              </div>
              <button onClick={() => setShowDataMenu(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6 space-y-8">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Connection</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className={cn("p-4 rounded-xl border flex flex-col gap-2 transition-all", mongoDB.mode === 'SUPABASE' ? "bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/20" : "bg-slate-50 border-slate-200 opacity-60")}>
                    <div className="flex justify-between">
                      <Server className={cn("w-5 h-5", mongoDB.mode === 'SUPABASE' ? "text-emerald-600" : "text-slate-400")} />
                      {mongoDB.mode === 'SUPABASE' && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <span className="font-bold text-slate-900">Supabase</span>
                    <span className="text-[10px] text-slate-500">Professional SQL database. Synchronized across all users.</span>
                  </div>
                  <div className={cn("p-4 rounded-xl border flex flex-col gap-2 transition-all", mongoDB.mode === 'MONGODB' ? "bg-blue-50 border-blue-200 ring-2 ring-blue-500/20" : "bg-slate-50 border-slate-200 opacity-60")}>
                    <div className="flex justify-between">
                      <Database className={cn("w-5 h-5", mongoDB.mode === 'MONGODB' ? "text-blue-600" : "text-slate-400")} />
                      {mongoDB.mode === 'MONGODB' && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <span className="font-bold text-slate-900">MongoDB</span>
                    <span className="text-[10px] text-slate-500">NoSQL Document store. Flexible but requires App ID.</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manual Data Management</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleExport} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
                    <Download className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Export Backup</p>
                      <p className="text-[9px] text-slate-500">Save to .json file</p>
                    </div>
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Import Records</p>
                      <p className="text-[9px] text-slate-500">Restore from file</p>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
                  </button>
                </div>
              </div>

              {!mongoDB.isLive && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    You are currently using <strong>Offline Mode</strong>. Your data is safe in this browser, but to share it with other schools, you must either connect a cloud database or use the <strong>Export/Import</strong> tools above.
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end"><Button onClick={() => setShowDataMenu(false)} variant="secondary">Close</Button></div>
          </Card>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => <AppProvider><MainLayout /></AppProvider>;
export default App;
