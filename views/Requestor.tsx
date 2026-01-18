
import React, { useState, useMemo } from 'react';
import { useApp } from '../store.tsx';
import { RequestStatus, QuarterlyBudget } from '../types.ts';
import { BUDGET_GROUPS, CATEGORIES, SESSIONS } from '../constants.ts';
import { Card, Button, Input, Select, Label, Badge, formatCurrency, cn, StatCard } from '../components/ui.tsx';
import { 
  PlusCircle, XCircle, FileText, PieChart, Eye, Sparkles, Loader2, 
  Clock, CheckCircle2, XCircle as XCircleIcon, Landmark, Search, History, LayoutDashboard
} from 'lucide-react';
import { enhanceDescription } from '../lib/gemini.ts';

const Requestor: React.FC = () => {
  const { user, requests, addRequest, selectedRequest, setSelectedRequest, getQuarter, budgets } = useApp();
  
  const [mainView, setMainView] = useState<'requests' | 'budgets'>('requests');
  const [subView, setSubView] = useState<'dashboard' | 'new' | 'history'>('dashboard');
  const [budgetSession, setBudgetSession] = useState(SESSIONS[0]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Filtering & Searching
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const [formData, setFormData] = useState({
    category: CATEGORIES[0],
    description: '',
    amount: '',
    session: SESSIONS[0],
    expenseDate: new Date().toISOString().split('T')[0]
  });

  const myRequests = useMemo(() => {
    let list = requests.filter(r => r.schoolId === user?.schoolId);
    
    if (searchQuery) {
      list = list.filter(r => 
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterCategory !== 'All') {
      list = list.filter(r => r.category === filterCategory);
    }
    
    if (filterStatus !== 'All') {
      list = list.filter(r => r.status === filterStatus);
    }
    
    return list;
  }, [requests, user, searchQuery, filterCategory, filterStatus]);

  const stats = useMemo(() => {
    const userReqs = requests.filter(r => r.schoolId === user?.schoolId);
    return {
      pending: userReqs.filter(r => r.status === RequestStatus.PENDING).length,
      approved: userReqs.filter(r => r.status === RequestStatus.APPROVED).length,
      rejected: userReqs.filter(r => r.status === RequestStatus.REJECTED).length,
      totalValue: userReqs.reduce((acc, r) => acc + (r.status !== RequestStatus.REJECTED ? r.amount : 0), 0)
    };
  }, [requests, user]);

  const getConsumed = (category: string, quarter: keyof QuarterlyBudget) => {
    return requests
      .filter(r => 
        r.schoolId === user?.schoolId && 
        r.category === category && 
        r.status !== RequestStatus.REJECTED &&
        getQuarter(r.expenseDate) === quarter &&
        r.session === budgetSession
      )
      .reduce((sum, r) => sum + r.amount, 0);
  };

  const handleEnhance = async () => {
    if (!formData.description.trim()) return;
    setIsEnhancing(true);
    const enhanced = await enhanceDescription(formData.description);
    setFormData(prev => ({ ...prev, description: enhanced }));
    setIsEnhancing(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.schoolId || !user?.name) return;
    addRequest({
      schoolId: user.schoolId,
      schoolName: user.name,
      category: formData.category,
      description: formData.description,
      amount: Number(formData.amount),
      session: formData.session,
      expenseDate: formData.expenseDate,
    });
    setSubView('dashboard');
  };

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-72 flex-shrink-0 space-y-4">
        <Card className="p-4 space-y-1">
          <button 
            onClick={() => setMainView('requests')} 
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", 
              mainView === 'requests' ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <LayoutDashboard className="w-5 h-5" /> Expense Portal
          </button>
          <button 
            onClick={() => setMainView('budgets')} 
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", 
              mainView === 'budgets' ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <PieChart className="w-5 h-5" /> Fund Tracking
          </button>
        </Card>
      </div>

      <div className="flex-1 space-y-8">
        {mainView === 'requests' && (
          <div className="space-y-8 animate-fade-in">
            {/* View Switcher */}
            <div className="flex items-center gap-3">
              <Button 
                variant={subView === 'dashboard' ? 'primary' : 'outline'} 
                onClick={() => setSubView('dashboard')}
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Button>
              <Button 
                variant={subView === 'new' ? 'primary' : 'outline'} 
                onClick={() => setSubView('new')}
              >
                <PlusCircle className="w-4 h-4" /> New Request
              </Button>
              <Button 
                variant={subView === 'history' ? 'primary' : 'outline'} 
                onClick={() => setSubView('history')}
              >
                <History className="w-4 h-4" /> History
              </Button>
            </div>

            {subView === 'dashboard' && (
              <div className="space-y-8">
                {/* Stats Grid - MATCHES SCREENSHOT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard 
                    title="Pending" 
                    value={stats.pending} 
                    icon={Clock} 
                    borderColor="border-amber-400" 
                    iconColor="text-amber-400" 
                  />
                  <StatCard 
                    title="Approved" 
                    value={stats.approved} 
                    icon={CheckCircle2} 
                    borderColor="border-emerald-400" 
                    iconColor="text-emerald-400" 
                  />
                  <StatCard 
                    title="Rejected" 
                    value={stats.rejected} 
                    icon={XCircleIcon} 
                    borderColor="border-rose-400" 
                    iconColor="text-rose-400" 
                  />
                  <StatCard 
                    title="Total Value" 
                    value={formatCurrency(stats.totalValue)} 
                    icon={Landmark} 
                    borderColor="border-blue-400" 
                    iconColor="text-blue-500" 
                  />
                </div>

                {/* Recent Requests Table Section - MATCHES SCREENSHOT */}
                <Card className="p-0 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="text-xl font-bold text-slate-900">Recent Requests</h3>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          placeholder="Search..." 
                          className="pl-9 h-10 rounded-xl" 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <Button variant="outline" size="sm" className="h-10 px-4" onClick={() => setSubView('history')}>View All</Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">ID</th>
                          <th className="px-6 py-4">
                            <div className="flex flex-col gap-1.5">
                              <span>Category</span>
                              <Select 
                                value={filterCategory} 
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-32 bg-white"
                              >
                                <option value="All">All</option>
                                {CATEGORIES.slice(0, 10).map(c => <option key={c} value={c}>{c}</option>)}
                              </Select>
                            </div>
                          </th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4">
                            <div className="flex flex-col gap-1.5">
                              <span>Status</span>
                              <Select 
                                value={filterStatus} 
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-24 bg-white"
                              >
                                <option value="All">All</option>
                                {Object.values(RequestStatus).map(s => <option key={s} value={s}>{s}</option>)}
                              </Select>
                            </div>
                          </th>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {myRequests.slice(0, 5).map(req => (
                          <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 font-bold text-slate-900">{req.id}</td>
                            <td className="px-6 py-4 text-slate-600 font-medium">{req.category}</td>
                            <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(req.amount)}</td>
                            <td className="px-6 py-4"><Badge status={req.status} /></td>
                            <td className="px-6 py-4 text-slate-500 text-xs font-medium">{new Date(req.expenseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => setSelectedRequest(req)} 
                                className="p-2 hover:bg-blue-50 rounded-xl text-blue-600 transition-all inline-flex items-center"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {myRequests.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center justify-center text-slate-400">
                                <History className="w-12 h-12 mb-2 opacity-20" />
                                <p className="text-sm font-medium">No requests found.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {subView === 'new' && (
              <Card className="max-w-3xl p-8 animate-fade-in mx-auto">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Raise Fund Requisition</h2>
                    <p className="text-slate-500 text-sm mt-1">Please fill out the details for your expense request.</p>
                  </div>
                  <Button variant="ghost" onClick={() => setSubView('dashboard')}><XCircleIcon className="w-5 h-5" /></Button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                       <Label>Fiscal Year</Label>
                       <Select 
                        value={formData.session} 
                        onChange={(e) => setFormData({...formData, session: e.target.value})}
                        className="h-11 text-sm rounded-xl"
                       >
                          {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                       </Select>
                     </div>
                     <div className="space-y-2">
                       <Label>Date of Expense</Label>
                       <Input 
                        type="date" 
                        value={formData.expenseDate} 
                        onChange={(e) => setFormData({...formData, expenseDate: e.target.value})} 
                        className="h-11 rounded-xl"
                       />
                     </div>
                   </div>

                   <div className="space-y-2">
                     <Label>Expense Heading</Label>
                     <Select 
                        value={formData.category} 
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="h-11 text-sm rounded-xl"
                     >
                        {BUDGET_GROUPS.map(group => (
                          <optgroup key={group.name} label={group.name}>
                             {group.items.map(item => <option key={item} value={item}>{item}</option>)}
                          </optgroup>
                        ))}
                     </Select>
                   </div>

                   <div className="space-y-2 relative">
                     <div className="flex justify-between items-center">
                        <Label>Justification / Description</Label>
                        <button 
                           type="button" 
                           onClick={handleEnhance}
                           disabled={isEnhancing || !formData.description.trim()}
                           className="text-[10px] uppercase tracking-wider text-blue-600 font-bold hover:underline flex items-center gap-1 disabled:opacity-50 transition-all"
                        >
                           {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                           Polish with AI
                        </button>
                     </div>
                     <textarea 
                        className="w-full border border-slate-200 p-4 rounded-xl min-h-[140px] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-slate-400 bg-slate-50/30" 
                        value={formData.description} 
                        onChange={(e) => setFormData({...formData, description: e.target.value})} 
                        placeholder="Explain why these funds are needed for the school..."
                     />
                   </div>

                   <div className="space-y-2">
                     <Label>Net Amount (INR)</Label>
                     <Input 
                        type="number" 
                        value={formData.amount} 
                        onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                        placeholder="0.00" 
                        className="h-12 text-lg font-bold rounded-xl"
                     />
                   </div>

                   <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                      <Button variant="outline" type="button" onClick={() => setSubView('dashboard')} className="px-8">Discard</Button>
                      <Button type="submit" className="px-8 bg-blue-600 hover:bg-blue-700">Submit Request</Button>
                   </div>
                </form>
              </Card>
            )}

            {subView === 'history' && (
              <Card className="p-0 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <h3 className="text-xl font-bold text-slate-900">Submission History</h3>
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Search history..." 
                      className="pl-9 h-10 rounded-xl" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">Reference</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {myRequests.map(req => (
                          <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                             <td className="px-6 py-4 font-bold text-slate-900">{req.id}</td>
                             <td className="px-6 py-4 font-medium text-slate-600">{req.category}</td>
                             <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(req.amount)}</td>
                             <td className="px-6 py-4"><Badge status={req.status} /></td>
                             <td className="px-6 py-4 text-center">
                               <button onClick={() => setSelectedRequest(req)} className="p-2 hover:bg-blue-50 rounded-xl text-blue-600 transition-all inline-flex items-center">
                                 <Eye className="w-4 h-4" />
                               </button>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {mainView === 'budgets' && (
           <Card className="p-0 overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                 <h2 className="text-xl font-bold text-slate-900">Quarterly Fund Monitoring</h2>
                 <Select value={budgetSession} onChange={(e) => setBudgetSession(e.target.value)} className="w-40 rounded-xl">
                   {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                 </Select>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-[10px] text-left border-collapse min-w-[1000px]">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                       <tr>
                          <th className="px-4 py-4 border-b border-slate-200 w-48 sticky left-0 bg-slate-50 z-10">Budget Head</th>
                          {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                             <th key={q} colSpan={3} className="px-2 py-4 border-b border-l border-slate-200 text-center font-bold">{q} Utilisation</th>
                          ))}
                          <th className="px-4 py-4 border-b border-l border-slate-200 text-right bg-slate-100/50">Year Total</th>
                       </tr>
                       <tr className="bg-slate-50/50">
                          <th className="px-4 py-2 border-b border-slate-200"></th>
                          {['q1','q2','q3','q4'].map(q => (
                             <React.Fragment key={q}>
                                <th className="px-2 py-2 border-b border-l border-slate-200 text-center font-bold text-[9px] text-slate-400">Limit</th>
                                <th className="px-2 py-2 border-b border-slate-200 text-center font-bold text-[9px] text-slate-400">Used</th>
                                <th className="px-2 py-2 border-b border-slate-200 text-center font-bold text-[9px] text-slate-400">Bal</th>
                             </React.Fragment>
                          ))}
                          <th className="px-4 py-2 border-b border-l border-slate-200 bg-slate-100/50"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {BUDGET_GROUPS.map(group => (
                          <React.Fragment key={group.name}>
                             <tr className="bg-slate-100/30 text-slate-900 font-bold">
                                <td colSpan={14} className="px-4 py-2.5 text-xs uppercase tracking-widest bg-slate-100/50 border-y border-slate-200">{group.name}</td>
                             </tr>
                             {group.items.map(cat => {
                                const schoolBudget = budgets[user?.schoolId || ''] || {};
                                const row = schoolBudget[cat] || { q1: 0, q2: 0, q3: 0, q4: 0 };
                                return (
                                   <tr key={cat} className="hover:bg-slate-50 transition-colors group">
                                      <td className="px-4 py-2 border-r border-slate-100 font-semibold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-10">{cat}</td>
                                      {(['q1', 'q2', 'q3', 'q4'] as const).map(q => {
                                         const appr = row[q];
                                         const cons = getConsumed(cat, q);
                                         const bal = appr - cons;
                                         return (
                                            <React.Fragment key={q}>
                                               <td className="px-2 py-2 text-right border-l border-slate-100">{formatCurrency(appr).replace('₹', '')}</td>
                                               <td className="px-2 py-2 text-right text-blue-600 font-medium">{formatCurrency(cons).replace('₹', '')}</td>
                                               <td className={cn("px-2 py-2 text-right font-bold", bal >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatCurrency(bal).replace('₹', '')}</td>
                                            </React.Fragment>
                                         );
                                      })}
                                      <td className="px-4 py-2 text-right font-bold bg-slate-50/50 border-l border-slate-200 text-slate-900">{formatCurrency(row.q1+row.q2+row.q3+row.q4)}</td>
                                   </tr>
                                );
                             })}
                          </React.Fragment>
                       ))}
                    </tbody>
                 </table>
              </div>
           </Card>
        )}
      </div>

      {/* Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-fade-in">
           <Card className="w-full max-w-xl p-0 shadow-2xl overflow-hidden border-none">
              <div className="bg-slate-50 p-6 flex justify-between items-center border-b border-slate-200">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 leading-none">{selectedRequest.id}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{selectedRequest.category}</p>
                 </div>
                 <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
                    <XCircle className="w-6 h-6" />
                 </button>
              </div>
              
              <div className="p-8 space-y-8">
                 <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Request Details</Label>
                    <p className="text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">"{selectedRequest.description}"</p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                       <Label className="mb-1 text-blue-600 text-[10px] uppercase tracking-wider">Requested Amount</Label>
                       <div className="text-2xl font-black text-blue-700">{formatCurrency(selectedRequest.amount)}</div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center">
                       <Label className="mb-2 text-[10px] uppercase tracking-wider">Current Status</Label>
                       <div><Badge status={selectedRequest.status} /></div>
                    </div>
                 </div>

                 {(selectedRequest.approverComments || selectedRequest.financeComments) && (
                   <div className="space-y-4 pt-4 border-t border-slate-100">
                      {selectedRequest.approverComments && (
                         <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/50">
                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block mb-1">Administrative Feedback</span>
                            <p className="text-xs font-medium text-amber-900">{selectedRequest.approverComments}</p>
                         </div>
                      )}
                      {selectedRequest.financeComments && (
                         <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/50">
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Finance Desk Note</span>
                            <p className="text-xs font-medium text-emerald-900">{selectedRequest.financeComments}</p>
                         </div>
                      )}
                   </div>
                 )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                 <Button onClick={() => setSelectedRequest(null)} variant="secondary" className="px-8">Close Details</Button>
              </div>
           </Card>
        </div>
      )}
    </div>
  );
};

export default Requestor;
