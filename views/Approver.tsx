
import React, { useState } from 'react';
import { useApp } from '../store.tsx';
import { RequestStatus, ExpenseRequest, QuarterlyBudget, BudgetRequest } from '../types.ts';
import { Card, Button, Badge, formatCurrency, formatNumberIndian, cn, Input, Select, Label } from '../components/ui.tsx';
import { Check, AlertCircle, XCircle, Eye, Wallet, Save, Pencil, Bot, Loader2, FileText, Download } from 'lucide-react';
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
    budgetRequests
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
  const [budgetSubView, setBudgetSubView] = useState<'requests' | 'manage'>('manage');
  const [budgetSchoolId, setBudgetSchoolId] = useState(SCHOOLS[0].id);
  const [budgetSession, setBudgetSession] = useState(SESSIONS[0]);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [localBudgets, setLocalBudgets] = useState<Record<string, QuarterlyBudget>>({});
  
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

  const handleViewAttachment = (filename: string, data?: string) => {
    if (!data || data.trim() === "") {
      alert("No digital document data available for this request. Please contact the school to re-upload.");
      return;
    }
    try {
      const link = document.createElement('a');
      link.href = data;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Download error:", e);
      alert("Error opening document. File may be incomplete.");
    }
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
            <Check className="w-5 h-5" /> Pending Approvals
         </button>
         <button 
           onClick={() => setActiveView('budgets')}
           className={cn(
             "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
             activeView === 'budgets' ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
           )}
         >
            <Wallet className="w-5 h-5" /> Budget Control
         </button>
      </div>

      <div className="flex-1 space-y-6">
        {activeView === 'approvals' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" /> Pending Expense Requests
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">School</th>
                      <th className="px-4 py-3">Heading</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingRequests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{req.id}</td>
                        <td className="px-4 py-3">{req.schoolName}</td>
                        <td className="px-4 py-3">{req.category}</td>
                        <td className="px-4 py-3 font-bold">{formatCurrency(req.amount)}</td>
                        <td className="px-4 py-3">
                           <Button size="sm" onClick={() => handleActionClick(req)} className="bg-blue-600 text-xs h-auto py-1">
                             Review
                           </Button>
                        </td>
                      </tr>
                    ))}
                    {pendingRequests.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No pending approvals.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                 <h3 className="text-lg font-bold text-gray-900">Historical Activity</h3>
                 <Input 
                   placeholder="Search ID, school..." 
                   className="w-full sm:w-64" 
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
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAllRequests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">{req.schoolName}</div>
                          <div className="text-xs text-gray-400">{req.id}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(req.amount)}</td>
                        <td className="px-4 py-3"><Badge status={req.status} /></td>
                        <td className="px-4 py-3">
                           <button onClick={() => handleActionClick(req)} className="text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-colors"><Eye className="w-4 h-4" /></button>
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
            <Card className="p-6 animate-fade-in">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
                  <h2 className="text-xl font-bold text-gray-900">Master Annual Budget</h2>
                  <div className="flex flex-wrap gap-3">
                    <Select value={budgetSession} onChange={(e) => setBudgetSession(e.target.value)} className="w-32">
                      {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                    <Select value={budgetSchoolId} onChange={(e) => setBudgetSchoolId(e.target.value)} className="w-48" disabled={isEditingBudget}>
                      {SCHOOLS.map(s => <option key={s.id} value={s.id}>{s.name.replace('Darshan Academy, ', '')}</option>)}
                    </Select>
                    {!isEditingBudget ? (
                      <Button onClick={startEditingBudget} className="bg-blue-600"><Pencil className="w-4 h-4" /> Edit Values</Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditingBudget(false)}>Cancel</Button>
                        <Button onClick={saveBudgets} className="bg-green-600"><Save className="w-4 h-4" /> Save</Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] text-left border-collapse min-w-[1100px]">
                    <thead className="bg-slate-100 text-slate-600 uppercase">
                      <tr>
                        <th className="px-3 py-3 border w-48 sticky left-0 bg-slate-100 z-10">Group / Item</th>
                        {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                          <React.Fragment key={q}>
                            <th className="px-2 py-3 border text-center bg-slate-50 w-24">Approved</th>
                            <th className="px-2 py-3 border text-center w-24">Consumed</th>
                            <th className="px-2 py-3 border text-center w-24">Balance</th>
                          </React.Fragment>
                        ))}
                        <th className="px-3 py-3 border text-right bg-blue-50 text-blue-800">Total Yearly</th>
                      </tr>
                    </thead>
                    <tbody>
                      {BUDGET_GROUPS.map(group => (
                        <React.Fragment key={group.name}>
                          <tr className="bg-blue-600 text-white font-bold">
                            <td colSpan={14} className="px-3 py-1.5 text-[11px] sticky left-0 z-10">{group.name}</td>
                          </tr>
                          {group.items.map(cat => {
                            const budgetSource = isEditingBudget ? localBudgets : (budgets[budgetSchoolId] || {});
                            const rowBudget = budgetSource[cat] || { q1: 0, q2: 0, q3: 0, q4: 0 };
                            const totalYear = rowBudget.q1 + rowBudget.q2 + rowBudget.q3 + rowBudget.q4;
                            
                            return (
                              <tr key={cat} className="hover:bg-blue-50 transition-colors">
                                <td className="px-3 py-1.5 border font-medium sticky left-0 bg-white z-10">{cat}</td>
                                {(['q1', 'q2', 'q3', 'q4'] as const).map(q => {
                                  const appr = rowBudget[q];
                                  const cons = getConsumed(budgetSchoolId, cat, q);
                                  const bal = appr - cons;
                                  return (
                                    <React.Fragment key={q}>
                                      <td className="px-1 py-1 border bg-white">
                                        {isEditingBudget ? (
                                          <input 
                                            type="number" 
                                            className="w-full text-right bg-blue-50 rounded outline-none px-1 border border-blue-200 text-[10px]"
                                            value={appr}
                                            onChange={(e) => setLocalBudgets(prev => ({ ...prev, [cat]: { ...prev[cat], [q]: Number(e.target.value) } }))}
                                          />
                                        ) : formatNumberIndian(appr)}
                                      </td>
                                      <td className="px-2 py-1.5 border text-right text-gray-500">{formatNumberIndian(cons)}</td>
                                      <td className={cn("px-2 py-1.5 border text-right font-semibold", bal >= 0 ? "text-green-600" : "text-red-600")}>
                                        {formatNumberIndian(bal)}
                                      </td>
                                    </React.Fragment>
                                  );
                                })}
                                <td className="px-3 py-1.5 border text-right font-bold text-blue-800 bg-blue-50">{formatNumberIndian(totalYear)}</td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
            </Card>
          </div>
        )}
      </div>

      {/* MODAL: Review Expense Request */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
               <div>
                  <h3 className="text-2xl font-bold text-gray-900">Review: {selectedRequest.id}</h3>
                  <div className="text-sm text-gray-500 flex gap-4 mt-1">
                     <span>{selectedRequest.schoolName}</span>
                     <span>Session: {selectedRequest.session}</span>
                  </div>
               </div>
               <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-gray-100 rounded-full"><XCircle className="w-6 h-6 text-gray-400" /></button>
            </div>

            <div className="space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                     <div className="text-xs text-blue-600 font-bold uppercase mb-1">Heading</div>
                     <div className="font-semibold text-gray-900">{selectedRequest.category}</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                     <div className="text-xs text-green-600 font-bold uppercase mb-1">Requested Amount</div>
                     <div className="text-xl font-bold text-gray-900">{formatCurrency(selectedRequest.amount)}</div>
                  </div>
               </div>

               <div>
                  <Label>Description</Label>
                  <p className="p-4 border border-gray-200 rounded-xl bg-slate-50 text-gray-700 leading-relaxed shadow-inner italic">"{selectedRequest.description}"</p>
               </div>

               {selectedRequest.attachmentName && (
                  <div>
                    <Label>School Attachment</Label>
                    <div 
                       onClick={() => handleViewAttachment(selectedRequest.attachmentName!, selectedRequest.attachmentData)}
                       className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer group"
                    >
                       <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all"><FileText className="w-5 h-5" /></div>
                       <div className="flex-1">
                          <p className="text-xs font-bold text-slate-800">{selectedRequest.attachmentName}</p>
                          <p className="text-[10px] text-slate-500">Supporting Document Provided</p>
                       </div>
                       <div className="flex items-center gap-2">
                         <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest px-3 py-1 bg-blue-50 rounded-md">Download Bill</div>
                         <Download className="w-4 h-4 text-blue-600" />
                       </div>
                    </div>
                  </div>
               )}

               {/* AI Section */}
               <div className="border-t border-gray-100 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold flex items-center gap-2 text-sm uppercase text-purple-700 tracking-wider">
                      <Bot className="w-5 h-5" /> Auditor Insight
                    </h4>
                    {!aiAnalysis && !isAnalyzing && (
                       <Button size="sm" onClick={handleAiAnalyze} className="h-8 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[10px]">
                         Run Audit
                       </Button>
                    )}
                  </div>
                  {isAnalyzing && (
                    <div className="p-4 text-xs text-purple-600 animate-pulse bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Scanning financial context...
                    </div>
                  )}
                  {aiAnalysis && (
                    <div className="p-4 text-xs bg-purple-50 border border-purple-100 rounded-xl text-purple-900 leading-relaxed font-medium whitespace-pre-wrap">
                      {aiAnalysis}
                    </div>
                  )}
               </div>

               {selectedRequest.status === RequestStatus.PENDING && (
                 <>
                   {!actionType ? (
                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                         <Button variant="danger" onClick={() => setActionType('REJECT')}>Reject</Button>
                         <Button onClick={() => setActionType('APPROVE')} className="bg-green-600">Approve Request</Button>
                      </div>
                   ) : (
                      <div className="space-y-4 pt-4 border-t border-gray-100 animate-fade-in">
                         <div className="flex justify-between items-center">
                            <Label className="mb-0">{actionType === 'APPROVE' ? 'Approval Remarks' : 'Rejection Reason'} <span className="text-red-500">*</span></Label>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Comments Mandatory</span>
                         </div>
                         <textarea 
                            className={cn(
                              "w-full border p-3 rounded-xl outline-none h-24 text-sm transition-all focus:ring-4 focus:ring-blue-500/10",
                              !comment.trim() ? "border-amber-200 bg-amber-50/30" : "border-gray-200 focus:border-blue-500"
                            )}
                            placeholder={actionType === 'APPROVE' ? "e.g. Approved for sports day requisitions as per policy B-12..." : "e.g. Rejected due to missing vendor quotes. Please re-apply with 3 competitive quotes."}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            autoFocus
                         />
                         {!comment.trim() && (
                            <div className="flex items-center gap-1.5 text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                               <AlertCircle className="w-3 h-3" /> Action blocked until comment is provided
                            </div>
                         )}
                         <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => { setActionType(null); setComment(''); }}>Back</Button>
                            <Button 
                              onClick={submitAction} 
                              size="sm" 
                              disabled={!comment.trim()}
                              className={cn(
                                actionType === 'APPROVE' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700",
                                !comment.trim() && "opacity-50 cursor-not-allowed"
                              )}
                            >
                               Confirm {actionType}
                            </Button>
                         </div>
                      </div>
                   )}
                 </>
               )}

               {selectedRequest.status !== RequestStatus.PENDING && (
                 <div className="space-y-4 pt-4 border-t border-gray-100">
                    <Label>Process Summary</Label>
                    <div className="grid grid-cols-1 gap-3">
                       {selectedRequest.approverComments && (
                         <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Approver's Feedback</span>
                            <p className="text-xs font-medium text-slate-800 italic">"{selectedRequest.approverComments}"</p>
                         </div>
                       )}
                       {selectedRequest.financeComments && (
                         <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Payment Reference</span>
                            <p className="text-xs font-bold text-emerald-800">{selectedRequest.financeComments}</p>
                         </div>
                       )}
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
