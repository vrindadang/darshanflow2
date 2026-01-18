import React, { useState } from 'react';
import { useApp } from '../store.tsx';
import { RequestStatus, QuarterlyBudget } from '../types.ts';
import { BUDGET_GROUPS, CATEGORIES, SESSIONS } from '../constants.ts';
import { Card, Button, Input, Select, Label, Badge, formatCurrency, cn } from '../components/ui.tsx';
import { PlusCircle, XCircle, FileText, PieChart, Eye, Sparkles, Loader2 } from 'lucide-react';
import { enhanceDescription } from '../lib/gemini.ts';

const Requestor: React.FC = () => {
  const { user, requests, addRequest, selectedRequest, setSelectedRequest, getQuarter, budgets } = useApp();
  
  const [mainView, setMainView] = useState<'requests' | 'budgets'>('requests');
  const [subView, setSubView] = useState<'dashboard' | 'new'>('dashboard');
  const [budgetSession, setBudgetSession] = useState(SESSIONS[0]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const [formData, setFormData] = useState({
    category: CATEGORIES[0],
    description: '',
    amount: '',
    session: SESSIONS[0],
    expenseDate: new Date().toISOString().split('T')[0]
  });

  const myRequests = requests.filter(r => r.schoolId === user?.schoolId);

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
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-64 flex-shrink-0 bg-white border border-gray-200 rounded-xl p-4 space-y-2 h-fit">
         <button onClick={() => setMainView('requests')} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors", mainView === 'requests' ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50")}>
            <FileText className="w-5 h-5" /> Expense Portal
         </button>
         <button onClick={() => setMainView('budgets')} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors", mainView === 'budgets' ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50")}>
            <PieChart className="w-5 h-5" /> Fund Tracking
         </button>
      </div>

      <div className="flex-1 space-y-6">
        {mainView === 'requests' && (
          <div className="space-y-6">
            <div className="flex gap-2">
              <Button variant={subView === 'dashboard' ? 'primary' : 'outline'} onClick={() => setSubView('dashboard')}>Dashboard</Button>
              <Button variant={subView === 'new' ? 'primary' : 'outline'} onClick={() => setSubView('new')}><PlusCircle className="w-4 h-4" /> New Requisition</Button>
            </div>

            {subView === 'new' && (
              <Card className="max-w-2xl p-8 animate-fade-in">
                <h2 className="text-2xl font-bold mb-6">Raise Fund Requisition</h2>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <Label>Fiscal Year</Label>
                       <Select value={formData.session} onChange={(e) => setFormData({...formData, session: e.target.value})}>
                          {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                       </Select>
                     </div>
                     <div>
                       <Label>Date of Expense</Label>
                       <Input type="date" value={formData.expenseDate} onChange={(e) => setFormData({...formData, expenseDate: e.target.value})} />
                     </div>
                   </div>
                   <div>
                     <Label>Expense Heading</Label>
                     <Select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                        {BUDGET_GROUPS.map(group => (
                          <optgroup key={group.name} label={group.name}>
                             {group.items.map(item => <option key={item} value={item}>{item}</option>)}
                          </optgroup>
                        ))}
                     </Select>
                   </div>
                   <div className="relative">
                     <div className="flex justify-between items-center mb-1">
                        <Label>Justification / Description</Label>
                        <button 
                           type="button" 
                           onClick={handleEnhance}
                           disabled={isEnhancing || !formData.description.trim()}
                           className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1 disabled:opacity-50"
                        >
                           {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                           AI Polish
                        </button>
                     </div>
                     <textarea 
                        className="w-full border border-gray-200 p-3 rounded-xl min-h-[120px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" 
                        value={formData.description} 
                        onChange={(e) => setFormData({...formData, description: e.target.value})} 
                        placeholder="Explain why these funds are needed..."
                     />
                   </div>
                   <div>
                     <Label>Net Amount (INR)</Label>
                     <Input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="0.00" />
                   </div>
                   <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" type="button" onClick={() => setSubView('dashboard')}>Cancel</Button>
                      <Button type="submit">Submit for Approval</Button>
                   </div>
                </form>
              </Card>
            )}

            {subView === 'dashboard' && (
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4">My Submissions</h3>
                <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3">Reference</th>
                          <th className="px-4 py-3">Heading</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Action</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {myRequests.map(req => (
                          <tr key={req.id}>
                             <td className="px-4 py-3 font-medium">{req.id}</td>
                             <td className="px-4 py-3">{req.category}</td>
                             <td className="px-4 py-3 font-bold">{formatCurrency(req.amount)}</td>
                             <td className="px-4 py-3"><Badge status={req.status} /></td>
                             <td className="px-4 py-3">
                               <button onClick={() => setSelectedRequest(req)} className="p-2 hover:bg-gray-100 rounded-full text-blue-600">
                                 <Eye className="w-4 h-4" />
                               </button>
                             </td>
                          </tr>
                        ))}
                        {myRequests.length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No requests found.</td></tr>
                        )}
                     </tbody>
                   </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {mainView === 'budgets' && (
           <Card className="p-6 overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold">Quarterly Fund Monitoring</h2>
                 <Select value={budgetSession} onChange={(e) => setBudgetSession(e.target.value)} className="w-40">
                   {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                 </Select>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-[10px] text-left border-collapse min-w-[1000px]">
                    <thead className="bg-slate-50 text-slate-500 uppercase">
                       <tr>
                          <th className="px-3 py-3 border w-48 sticky left-0 bg-slate-50 z-10">Budget Head</th>
                          {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                             <th key={q} colSpan={3} className="px-2 py-3 border text-center font-bold border-l-2">{q} Utilisation</th>
                          ))}
                          <th className="px-3 py-3 border text-right bg-slate-100">Year Total</th>
                       </tr>
                       <tr className="bg-slate-50">
                          <th className="border px-3 py-1"></th>
                          {['q1','q2','q3','q4'].map(q => (
                             <React.Fragment key={q}>
                                <th className="border px-1 text-center font-normal border-l-2">Limit</th>
                                <th className="border px-1 text-center font-normal">Used</th>
                                <th className="border px-1 text-center font-normal">Bal</th>
                             </React.Fragment>
                          ))}
                          <th className="border px-3 py-1 bg-slate-100"></th>
                       </tr>
                    </thead>
                    <tbody>
                       {BUDGET_GROUPS.map(group => (
                          <React.Fragment key={group.name}>
                             <tr className="bg-blue-600 text-white font-bold"><td colSpan={14} className="px-3 py-1.5">{group.name}</td></tr>
                             {group.items.map(cat => {
                                const schoolBudget = budgets[user?.schoolId || ''] || {};
                                const row = schoolBudget[cat] || { q1: 0, q2: 0, q3: 0, q4: 0 };
                                return (
                                   <tr key={cat} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-3 py-1.5 border font-medium sticky left-0 bg-white z-10">{cat}</td>
                                      {(['q1', 'q2', 'q3', 'q4'] as const).map(q => {
                                         const appr = row[q];
                                         const cons = getConsumed(cat, q);
                                         const bal = appr - cons;
                                         return (
                                            <React.Fragment key={q}>
                                               <td className="px-2 py-1.5 border text-right border-l-2">{formatCurrency(appr).replace('₹', '')}</td>
                                               <td className="px-2 py-1.5 border text-right text-blue-600">{formatCurrency(cons).replace('₹', '')}</td>
                                               <td className={cn("px-2 py-1.5 border text-right font-bold", bal >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(bal).replace('₹', '')}</td>
                                            </React.Fragment>
                                         );
                                      })}
                                      <td className="px-3 py-1.5 border text-right font-bold bg-slate-50">{formatCurrency(row.q1+row.q2+row.q3+row.q4)}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
           <Card className="w-full max-w-lg p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold">{selectedRequest.id}</h3>
                 <button onClick={() => setSelectedRequest(null)}><XCircle className="w-6 h-6 text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                 <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Category</div>
                    <div className="font-semibold">{selectedRequest.category}</div>
                 </div>
                 <div className="p-4 bg-white border border-gray-100 rounded-xl">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Description</div>
                    <p className="text-sm italic text-gray-700">"{selectedRequest.description}"</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                       <Label className="mb-0 text-blue-600">Amount</Label>
                       <div className="text-lg font-bold">{formatCurrency(selectedRequest.amount)}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-center">
                       <Label className="mb-1">Status</Label>
                       <div><Badge status={selectedRequest.status} /></div>
                    </div>
                 </div>
                 {selectedRequest.approverComments && (
                    <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200 text-xs">
                       <span className="font-bold">Admin Feedback:</span> {selectedRequest.approverComments}
                    </div>
                 )}
                 {selectedRequest.financeComments && (
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs">
                       <span className="font-bold">Finance UTR/Note:</span> {selectedRequest.financeComments}
                    </div>
                 )}
              </div>
              <div className="mt-8 flex justify-end">
                 <Button onClick={() => setSelectedRequest(null)} variant="outline">Close</Button>
              </div>
           </Card>
        </div>
      )}
    </div>
  );
};

export default Requestor;