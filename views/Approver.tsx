
import React, { useState } from 'react';
import { useApp } from '../store.tsx';
import { RequestStatus, ExpenseRequest, QuarterlyBudget, BudgetRequest } from '../types.ts';
import { Card, Button, Badge, formatCurrency, formatNumberIndian, cn, Input, Select, Label } from '../components/ui.tsx';
// Added missing Landmark and Calendar icons to the imports
import { Check, AlertCircle, XCircle, Eye, Wallet, Save, Pencil, Bot, Loader2, FileText, Download, ClipboardCheck, History, Landmark, Calendar } from 'lucide-react';
import { BUDGET_GROUPS, CATEGORIES, SCHOOLS, SESSIONS } from '../constants.ts';
import { analyzeRequest } from '../lib/gemini.ts';

const Approver: React.FC = () => {
  const { 
    requests, 
    updateRequestStatus, 
    selectedRequest, 
    setSelectedRequest, 
    budgets, 
    updateBudget, 
    getQuarter, 
    user, 
    addBudgetLog, 
    budgetRequests,
    processBudgetRequest
  } = useApp();
  
  const [activeView, setActiveView] = useState<'approvals' | 'budgets'>('approvals');
  
  // Approval View States
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [comment, setComment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // AI States
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Budget View States
  const [budgetSubView, setBudgetSubView] = useState<'requests' | 'manage'>('requests');
  const [budgetSchoolId, setBudgetSchoolId] = useState(SCHOOLS[0].id);
  const [budgetSession, setBudgetSession] = useState(SESSIONS[0]);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [localBudgets, setLocalBudgets] = useState<Record<string, QuarterlyBudget>>({});
  const [selectedBudgetRequest, setSelectedBudgetRequest] = useState<BudgetRequest | null>(null);
  const [budgetActionType, setBudgetActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [budgetComment, setBudgetComment] = useState('');
  
  // Derived Data
  const pendingRequests = requests.filter(r => r.status === RequestStatus.PENDING);
  const pendingBudgetRequests = budgetRequests.filter(r => r.status === 'PENDING');

  const filteredAllRequests = requests.filter(req => {
    const matchesSearch = 
      req.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.amount.toString().includes(searchTerm);
    return matchesSearch;
  });

  const getConsumed = (schoolId: string, category: string, quarter: keyof QuarterlyBudget) => {
    return requests
      .filter(r => 
        r.schoolId === schoolId && 
        r.category === category && 
        r.session === budgetSession && 
        r.status !== RequestStatus.REJECTED &&
        r.status !== RequestStatus.CANCELLED &&
        getQuarter(r.expenseDate) === quarter
      )
      .reduce((sum, r) => sum + r.amount, 0);
  };

  const handleActionClick = (req: ExpenseRequest) => {
    setSelectedRequest(req);
    setActionType(null);
    setComment('');
    setAiAnalysis(null);
  };

  const submitAction = () => {
    if (selectedRequest && actionType) {
      if (!comment.trim()) {
        alert("A comment is mandatory for all approval or rejection actions.");
        return;
      }
      updateRequestStatus(
        selectedRequest.id,
        actionType === 'APPROVE' ? RequestStatus.APPROVED : RequestStatus.REJECTED,
        comment
      );
      setSelectedRequest(null);
    }
  };

  const handleAiAnalyze = async () => {
    if (!selectedRequest) return;
    setIsAnalyzing(true);
    const result = await analyzeRequest(selectedRequest);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const startEditingBudget = () => {
    const currentBudgets = budgets[budgetSchoolId] || {};
    const copy: Record<string, QuarterlyBudget> = {};
    CATEGORIES.forEach(cat => {
      copy[cat] = { ...(currentBudgets[cat] || { q1: 0, q2: 0, q3: 0, q4: 0 }) };
    });
    setLocalBudgets(copy);
    setIsEditingBudget(true);
  };

  const saveBudgets = () => {
    const currentSchoolBudgets = budgets[budgetSchoolId] || {};
    const schoolName = SCHOOLS.find(s => s.id === budgetSchoolId)?.name || 'Unknown School';
    
    CATEGORIES.forEach(cat => {
      const newBudget = localBudgets[cat];
      const oldBudget = currentSchoolBudgets[cat] || { q1: 0, q2: 0, q3: 0, q4: 0 };
      if (newBudget) {
        (['q1', 'q2', 'q3', 'q4'] as const).forEach(q => {
          if (oldBudget[q] !== newBudget[q]) {
            addBudgetLog({
              adminName: user?.name || 'Admin',
              schoolName,
              session: budgetSession,
              category: cat,
              quarter: q.toUpperCase(),
              oldAmount: oldBudget[q],
              newAmount: newBudget[q]
            });
            updateBudget(budgetSchoolId, cat, q, newBudget[q]);
          }
        });
      }
    });
    setIsEditingBudget(false);
  };

  const handleReviewBudget = (br: BudgetRequest) => {
    setSelectedBudgetRequest(br);
    setBudgetActionType(null);
    setBudgetComment('');
  };

  const submitBudgetAction = () => {
    if (selectedBudgetRequest && budgetActionType) {
      if (!budgetComment.trim()) {
        alert("Comments are mandatory.");
        return;
      }
      processBudgetRequest(
        selectedBudgetRequest.id,
        budgetActionType === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        budgetComment,
        budgetActionType === 'APPROVE' ? selectedBudgetRequest.data : undefined
      );
      setSelectedBudgetRequest(null);
    }
  };

  const handleViewAttachment = (filename: string, data?: string) => {
    if (!data || data.trim() === "") {
      alert("No digital document data available for this request.");
      return;
    }
    const link = document.createElement('a');
    link.href = data;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex-shrink-0 bg-white border border-gray-200 rounded-xl p-4 space-y-2 h-fit">
         <button 
           onClick={() => setActiveView('approvals')}
           className={cn(
             "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
             activeView === 'approvals' ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
           )}
         >
            <Check className="w-5 h-5" /> Expense Approvals
         </button>
         <button 
           onClick={() => setActiveView('budgets')}
           className={cn(
             "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
             activeView === 'budgets' ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
           )}
         >
            <Wallet className="w-5 h-5" /> Budgeting Flow
         </button>
      </div>

      <div className="flex-1 space-y-6">
        {activeView === 'approvals' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" /> Pending Requisitions
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">School</th>
                      <th className="px-4 py-3">Heading</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingRequests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{req.id}</td>
                        <td className="px-4 py-3">{req.schoolName}</td>
                        <td className="px-4 py-3 text-xs">{req.category}</td>
                        <td className="px-4 py-3 font-bold">{formatCurrency(req.amount)}</td>
                        <td className="px-4 py-3 text-center">
                           <Button size="sm" onClick={() => handleActionClick(req)} className="bg-blue-600 text-[10px] h-8 py-1 uppercase font-bold tracking-wider">
                             Review
                           </Button>
                        </td>
                      </tr>
                    ))}
                    {pendingRequests.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No pending requisitions for review.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                 <h3 className="text-lg font-bold text-gray-900">Foundation History</h3>
                 <Input 
                   placeholder="Search ID, school..." 
                   className="w-full sm:w-64 h-10 rounded-xl" 
                   value={searchTerm} 
                   onChange={(e) => setSearchTerm(e.target.value)} 
                 />
              </div>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 sticky top-0 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">School / ID</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAllRequests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900 leading-none">{req.schoolName}</div>
                          <div className="text-[10px] text-gray-400 mt-1 uppercase font-black tracking-widest">{req.id}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(req.amount)}</td>
                        <td className="px-4 py-3"><Badge status={req.status} /></td>
                        <td className="px-4 py-3 text-center">
                           <button onClick={() => handleActionClick(req)} className="text-blue-600 p-2 hover:bg-blue-50 rounded-xl transition-all"><Eye className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeView === 'budgets' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
               <Button variant={budgetSubView === 'requests' ? 'primary' : 'outline'} onClick={() => setBudgetSubView('requests')} className="text-xs">
                  <ClipboardCheck className="w-4 h-4" /> Planning Requests {pendingBudgetRequests.length > 0 && <span className="ml-2 bg-rose-500 text-white text-[10px] px-1.5 rounded-full">{pendingBudgetRequests.length}</span>}
               </Button>
               <Button variant={budgetSubView === 'manage' ? 'primary' : 'outline'} onClick={() => setBudgetSubView('manage')} className="text-xs">
                  <History className="w-4 h-4" /> Live Budget Matrix
               </Button>
            </div>

            {budgetSubView === 'requests' && (
              <Card className="p-6 animate-fade-in">
                 <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-blue-600" /> Pending Budget Plans
                 </h2>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                       <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                          <tr>
                             <th className="px-4 py-4 border-b border-slate-100">Request ID</th>
                             <th className="px-4 py-4 border-b border-slate-100">School</th>
                             <th className="px-4 py-4 border-b border-slate-100">Session</th>
                             <th className="px-4 py-4 border-b border-slate-100">Total Requested</th>
                             <th className="px-4 py-4 border-b border-slate-100 text-center">Action</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {pendingBudgetRequests.map(br => {
                             const total = Object.values(br.data).reduce((acc, cat) => acc + cat.q1 + cat.q2 + cat.q3 + cat.q4, 0);
                             return (
                                <tr key={br.id} className="hover:bg-slate-50/50">
                                   <td className="px-4 py-4 font-bold text-slate-900">{br.id}</td>
                                   <td className="px-4 py-4 font-medium text-slate-600">{br.schoolName}</td>
                                   <td className="px-4 py-4"><Badge status={br.session} /></td>
                                   <td className="px-4 py-4 font-black text-blue-600">{formatCurrency(total)}</td>
                                   <td className="px-4 py-4 text-center">
                                      <Button size="sm" onClick={() => handleReviewBudget(br)} className="bg-blue-600 text-[10px] h-8 uppercase font-bold tracking-widest px-4">Review Plan</Button>
                                   </td>
                                </tr>
                             );
                          })}
                          {pendingBudgetRequests.length === 0 && (
                             <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">No budget planning requests currently pending.</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </Card>
            )}

            {budgetSubView === 'manage' && (
              <Card className="p-6 animate-fade-in">
                  <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
                    <h2 className="text-xl font-bold text-gray-900">Master Annual Budget Matrix</h2>
                    <div className="flex flex-wrap gap-3">
                      <Select value={budgetSession} onChange={(e) => setBudgetSession(e.target.value)} className="w-32 h-10 rounded-xl">
                        {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </Select>
                      <Select value={budgetSchoolId} onChange={(e) => setBudgetSchoolId(e.target.value)} className="w-48 h-10 rounded-xl" disabled={isEditingBudget}>
                        {SCHOOLS.map(s => <option key={s.id} value={s.id}>{s.name.replace('Darshan Academy, ', '')}</option>)}
                      </Select>
                      {!isEditingBudget ? (
                        <Button onClick={startEditingBudget} className="bg-blue-600 h-10 px-4 rounded-xl"><Pencil className="w-4 h-4" /> Override Budget</Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setIsEditingBudget(false)} className="h-10 rounded-xl">Discard</Button>
                          <Button onClick={saveBudgets} className="bg-green-600 h-10 px-6 rounded-xl shadow-lg shadow-green-600/20"><Save className="w-4 h-4" /> Apply Changes</Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] text-left border-collapse min-w-[1100px]">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-black tracking-widest">
                        <tr>
                          <th className="px-3 py-4 border w-48 sticky left-0 bg-slate-100 z-10">Budget Heading</th>
                          {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                            <React.Fragment key={q}>
                              <th className="px-2 py-4 border text-center bg-slate-50 w-24">Allocation</th>
                              <th className="px-2 py-4 border text-center w-24">Consumed</th>
                              <th className="px-2 py-4 border text-center w-24">Net Balance</th>
                            </React.Fragment>
                          ))}
                          <th className="px-3 py-4 border text-right bg-blue-50 text-blue-800">Annual Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {BUDGET_GROUPS.map(group => (
                          <React.Fragment key={group.name}>
                            <tr className="bg-slate-800 text-white font-bold">
                              <td colSpan={14} className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] sticky left-0 z-10">{group.name}</td>
                            </tr>
                            {group.items.map(cat => {
                              // Fixed type inference by explicitly typing the budget source mapping
                              const budgetSource: Record<string, QuarterlyBudget> = isEditingBudget ? localBudgets : (budgets[budgetSchoolId] || {});
                              const rowBudget: QuarterlyBudget = budgetSource[cat] || { q1: 0, q2: 0, q3: 0, q4: 0 };
                              const totalYear = rowBudget.q1 + rowBudget.q2 + rowBudget.q3 + rowBudget.q4;
                              
                              return (
                                <tr key={cat} className="hover:bg-blue-50 transition-colors group">
                                  <td className="px-3 py-1.5 border font-semibold text-slate-700 sticky left-0 bg-white group-hover:bg-blue-50 z-10">{cat}</td>
                                  {(['q1', 'q2', 'q3', 'q4'] as const).map(q => {
                                    const appr = rowBudget[q];
                                    const cons = getConsumed(budgetSchoolId, cat, q);
                                    const bal = appr - cons;
                                    return (
                                      <React.Fragment key={q}>
                                        <td className="px-1 py-1 border bg-white group-hover:bg-blue-50 transition-colors">
                                          {isEditingBudget ? (
                                            <input 
                                              type="number" 
                                              className="w-full text-right bg-blue-50 rounded-lg outline-none px-2 py-1 border border-blue-200 text-[10px] font-bold"
                                              value={appr}
                                              onChange={(e) => setLocalBudgets(prev => ({ ...prev, [cat]: { ...prev[cat], [q]: Number(e.target.value) } }))}
                                            />
                                          ) : (
                                            <span className="block text-right px-2 font-medium">{formatNumberIndian(appr)}</span>
                                          )}
                                        </td>
                                        <td className="px-2 py-1.5 border text-right text-slate-500 font-medium">{formatNumberIndian(cons)}</td>
                                        <td className={cn("px-2 py-1.5 border text-right font-black", bal >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                          {formatNumberIndian(bal)}
                                        </td>
                                      </React.Fragment>
                                    );
                                  })}
                                  <td className="px-3 py-1.5 border text-right font-black text-blue-800 bg-blue-50">{formatNumberIndian(totalYear)}</td>
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
        )}
      </div>

      {/* MODAL: Review Expense Request */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-xl p-8 shadow-2xl overflow-y-auto max-h-[90vh] border-none">
            <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
               <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">{selectedRequest.id}</h3>
                  <div className="text-xs text-gray-500 flex gap-4 mt-2 font-bold uppercase tracking-wider">
                     <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100"><Landmark className="w-3 h-3" /> {selectedRequest.schoolName}</span>
                     <span className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100"><Calendar className="w-3 h-3" /> {selectedRequest.session}</span>
                  </div>
               </div>
               <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><XCircle className="w-6 h-6 text-gray-300 hover:text-rose-500" /></button>
            </div>

            <div className="space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1.5">Budget Head</div>
                     <div className="font-bold text-gray-900 text-sm leading-tight">{selectedRequest.category}</div>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                     <div className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-1.5">Requisition Amount</div>
                     <div className="text-2xl font-black text-emerald-700 tracking-tight leading-none">{formatCurrency(selectedRequest.amount)}</div>
                  </div>
               </div>

               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">School Justification</Label>
                  <p className="p-5 border border-slate-100 rounded-2xl bg-slate-50 text-gray-700 leading-relaxed font-medium shadow-inner italic">"{selectedRequest.description}"</p>
               </div>

               {selectedRequest.attachmentName && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Digital Documentation</Label>
                    <div 
                       onClick={() => handleViewAttachment(selectedRequest.attachmentName!, selectedRequest.attachmentData)}
                       className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group shadow-sm"
                    >
                       <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all"><FileText className="w-6 h-6" /></div>
                       <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-800 truncate">{selectedRequest.attachmentName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Verified Supporting Evidence</p>
                       </div>
                       <div className="flex items-center gap-2">
                         <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-3 py-1.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">Download</div>
                         <Download className="w-4 h-4 text-blue-600" />
                       </div>
                    </div>
                  </div>
               )}

               {/* AI Section */}
               <div className="border-t border-slate-100 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-black flex items-center gap-2 text-[10px] uppercase text-purple-700 tracking-[0.2em]">
                      <Bot className="w-5 h-5" /> Gemini Auditor Insights
                    </h4>
                    {!aiAnalysis && !isAnalyzing && (
                       <Button size="sm" onClick={handleAiAnalyze} className="h-8 bg-purple-600 text-white hover:bg-purple-700 rounded-xl text-[9px] font-black uppercase tracking-widest px-4 shadow-lg shadow-purple-600/20">
                         Compute Audit
                       </Button>
                    )}
                  </div>
                  {isAnalyzing && (
                    <div className="p-6 text-xs text-purple-600 animate-pulse bg-purple-50/50 rounded-2xl border border-purple-100 flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" /> 
                      <span className="font-bold uppercase tracking-widest">Scanning global financial standards...</span>
                    </div>
                  )}
                  {aiAnalysis && (
                    <div className="p-5 text-xs bg-purple-50 border border-purple-100 rounded-2xl text-purple-900 leading-relaxed font-bold whitespace-pre-wrap shadow-inner">
                      {aiAnalysis}
                    </div>
                  )}
               </div>

               {selectedRequest.status === RequestStatus.PENDING && (
                 <>
                   {!budgetActionType && !actionType ? (
                      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                         <Button variant="danger" className="flex-1 py-3 text-xs uppercase font-black tracking-widest rounded-2xl" onClick={() => setActionType('REJECT')}>Reject Requisition</Button>
                         <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 py-3 text-xs uppercase font-black tracking-widest rounded-2xl shadow-xl shadow-emerald-600/20" onClick={() => setActionType('APPROVE')}>Grant Approval</Button>
                      </div>
                   ) : (
                      <div className="space-y-4 pt-6 border-t border-slate-100 animate-fade-in">
                         <div className="flex justify-between items-center">
                            <Label className="mb-0 text-[10px] font-black uppercase tracking-widest">{actionType === 'APPROVE' ? 'Approval Reference' : 'Rejection Explanation'} <span className="text-rose-500">*</span></Label>
                         </div>
                         <textarea 
                            className={cn(
                              "w-full border p-4 rounded-2xl outline-none h-28 text-sm font-medium transition-all focus:ring-4 focus:ring-blue-500/10 shadow-inner",
                              !comment.trim() ? "border-amber-200 bg-amber-50/30" : "border-slate-200 focus:border-blue-500"
                            )}
                            placeholder={actionType === 'APPROVE' ? "State the basis of approval for auditors..." : "Provide clear reasons for rejection to help the school refine their request."}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            autoFocus
                         />
                         <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" className="px-6 rounded-xl text-xs font-bold uppercase tracking-wider" onClick={() => { setActionType(null); setComment(''); }}>Go Back</Button>
                            <Button 
                              onClick={submitAction} 
                              disabled={!comment.trim()}
                              className={cn(
                                "px-8 rounded-xl text-xs font-black uppercase tracking-widest",
                                actionType === 'APPROVE' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700",
                                !comment.trim() && "opacity-50 cursor-not-allowed"
                              )}
                            >
                               Finalize {actionType}
                            </Button>
                         </div>
                      </div>
                   )}
                 </>
               )}

               {selectedRequest.status !== RequestStatus.PENDING && (
                 <div className="space-y-4 pt-6 border-t border-slate-100">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Workflow History</Label>
                    <div className="grid grid-cols-1 gap-3">
                       {selectedRequest.approverComments && (
                         <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Admin Remarks</span>
                            <p className="text-xs font-bold text-slate-800 italic">"{selectedRequest.approverComments}"</p>
                         </div>
                       )}
                       {selectedRequest.financeComments && (
                         <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] block mb-2">Transaction Proof</span>
                            <p className="text-xs font-black text-emerald-800">{selectedRequest.financeComments}</p>
                         </div>
                       )}
                    </div>
                 </div>
               )}
            </div>
          </Card>
        </div>
      )}

      {/* MODAL: Review Budget Request */}
      {selectedBudgetRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
           <Card className="w-full max-w-4xl p-0 shadow-2xl overflow-hidden border-none animate-fade-in">
              <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                 <div>
                    <h3 className="text-xl font-black tracking-tight leading-none">Review Budget Plan: {selectedBudgetRequest.id}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{selectedBudgetRequest.schoolName} — Fiscal Session {selectedBudgetRequest.session}</p>
                 </div>
                 <button onClick={() => setSelectedBudgetRequest(null)} className="text-slate-400 hover:text-white transition-all p-2">
                    <XCircle className="w-6 h-6" />
                 </button>
              </div>

              <div className="p-0 overflow-y-auto max-h-[60vh]">
                 <table className="w-full text-[10px] text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest sticky top-0 z-20 shadow-sm">
                       <tr>
                          <th className="px-4 py-4 border-b w-48 bg-slate-50">Budget Head</th>
                          <th className="px-4 py-4 border-b border-l text-center">Q1 Req</th>
                          <th className="px-4 py-4 border-b border-l text-center">Q2 Req</th>
                          <th className="px-4 py-4 border-b border-l text-center">Q3 Req</th>
                          <th className="px-4 py-4 border-b border-l text-center">Q4 Req</th>
                          <th className="px-4 py-4 border-b border-l text-right bg-blue-50 text-blue-800">Annual Total</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {BUDGET_GROUPS.map(group => (
                          <React.Fragment key={group.name}>
                             <tr className="bg-slate-100/50">
                                <td colSpan={6} className="px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{group.name}</td>
                             </tr>
                             {group.items.map(cat => {
                                const row = selectedBudgetRequest.data[cat] || { q1: 0, q2: 0, q3: 0, q4: 0 };
                                const total = row.q1 + row.q2 + row.q3 + row.q4;
                                return (
                                   <tr key={cat} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-4 py-2.5 font-bold text-slate-700">{cat}</td>
                                      <td className="px-4 py-2.5 text-center border-l border-slate-50 font-medium text-slate-600">{formatNumberIndian(row.q1)}</td>
                                      <td className="px-4 py-2.5 text-center border-l border-slate-50 font-medium text-slate-600">{formatNumberIndian(row.q2)}</td>
                                      <td className="px-4 py-2.5 text-center border-l border-slate-50 font-medium text-slate-600">{formatNumberIndian(row.q3)}</td>
                                      <td className="px-4 py-2.5 text-center border-l border-slate-50 font-medium text-slate-600">{formatNumberIndian(row.q4)}</td>
                                      <td className="px-4 py-2.5 text-right border-l border-slate-100 bg-blue-50/30 font-black text-blue-700">{formatNumberIndian(total)}</td>
                                   </tr>
                                );
                             })}
                          </React.Fragment>
                       ))}
                    </tbody>
                 </table>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-200">
                 {!budgetActionType ? (
                    <div className="flex gap-4 justify-end">
                       <Button variant="outline" className="px-8 rounded-xl font-bold uppercase tracking-widest" onClick={() => setSelectedBudgetRequest(null)}>Review Later</Button>
                       <Button variant="danger" className="px-8 rounded-xl font-bold uppercase tracking-widest" onClick={() => setBudgetActionType('REJECT')}>Reject Plan</Button>
                       <Button className="bg-emerald-600 hover:bg-emerald-700 px-10 rounded-xl font-bold uppercase tracking-widest shadow-xl shadow-emerald-600/20" onClick={() => setBudgetActionType('APPROVE')}>Confirm & Activate Budget</Button>
                    </div>
                 ) : (
                    <div className="space-y-4 animate-fade-in">
                       <div className="flex justify-between items-center">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{budgetActionType === 'APPROVE' ? 'Approval Reference' : 'Rejection Explanation'} <span className="text-rose-500">*</span></Label>
                       </div>
                       <textarea 
                          className="w-full border border-slate-200 p-4 rounded-2xl outline-none h-24 text-sm font-medium transition-all focus:ring-4 focus:ring-blue-500/10 shadow-inner bg-white"
                          placeholder="Provide assessment of the proposed budget plan..."
                          value={budgetComment}
                          onChange={(e) => setBudgetComment(e.target.value)}
                          autoFocus
                       />
                       <div className="flex justify-end gap-3">
                          <Button variant="outline" onClick={() => setBudgetActionType(null)} className="rounded-xl font-bold uppercase tracking-widest">Back</Button>
                          <Button 
                             onClick={submitBudgetAction}
                             disabled={!budgetComment.trim()}
                             className={cn(
                                "px-10 rounded-xl font-bold uppercase tracking-widest",
                                budgetActionType === 'APPROVE' ? "bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20" : "bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-600/20",
                                !budgetComment.trim() && "opacity-50 cursor-not-allowed"
                             )}
                          >
                             Finalize {budgetActionType}
                          </Button>
                       </div>
                    </div>
                 )}
              </div>
           </Card>
        </div>
      )}
    </div>
  );
};

export default Approver;
