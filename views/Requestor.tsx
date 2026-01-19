
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../store.tsx';
import { RequestStatus, QuarterlyBudget, ExpenseRequest, BudgetRequest } from '../types.ts';
import { BUDGET_GROUPS, CATEGORIES, SESSIONS, EXPENSE_POLICIES } from '../constants.ts';
import { Card, Button, Input, Select, Label, Badge, formatCurrency, formatNumberIndian, cn, StatCard } from '../components/ui.tsx';
import { 
  PlusCircle, XCircle, FileText, PieChart, Eye, Sparkles, Loader2, 
  Clock, CheckCircle2, XCircle as XCircleIcon, Landmark, Search, History, LayoutDashboard, ShieldCheck, Info, ChevronRight, FileCheck, Calendar, Paperclip, X,
  AlertCircle, Download, MailCheck, Send, Cloud, Pencil, Trash2, Save, SendHorizonal, Calculator
} from 'lucide-react';
import { enhanceDescription } from '../lib/gemini.ts';

const Requestor: React.FC = () => {
  const { 
    user, 
    requests, 
    addRequest, 
    modifyRequest, 
    cancelRequest, 
    selectedRequest, 
    setSelectedRequest, 
    getQuarter, 
    budgets, 
    budgetRequests,
    saveBudgetDraft,
    submitBudgetRequest
  } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mainView, setMainView] = useState<'requests' | 'budgets' | 'policies'>('requests');
  const [subView, setSubView] = useState<'dashboard' | 'new' | 'history'>('dashboard');
  const [budgetView, setBudgetView] = useState<'planner' | 'utilisation'>('planner');
  
  const [budgetSession, setBudgetSession] = useState(SESSIONS[0]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [policySearch, setPolicySearch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Budget Planner State
  const [plannerData, setPlannerData] = useState<Record<string, QuarterlyBudget>>({});
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // Load existing draft for planner when session changes
  useEffect(() => {
    if (mainView === 'budgets' && budgetView === 'planner') {
      const existing = budgetRequests.find(r => r.schoolId === user?.schoolId && r.session === budgetSession);
      if (existing) {
        setPlannerData(existing.data);
      } else {
        // Initialize with zeros or current active budget as a baseline
        const base: Record<string, QuarterlyBudget> = {};
        CATEGORIES.forEach(cat => {
          base[cat] = { q1: 0, q2: 0, q3: 0, q4: 0 };
        });
        setPlannerData(base);
      }
    }
  }, [budgetSession, budgetView, mainView, budgetRequests, user?.schoolId]);

  const handlePlannerChange = (cat: string, q: keyof QuarterlyBudget, val: string) => {
    const num = parseInt(val) || 0;
    setPlannerData(prev => ({
      ...prev,
      [cat]: {
        ...prev[cat],
        [q]: num
      }
    }));
  };

  const handleSaveBudgetDraft = async () => {
    if (!user?.schoolId || !user?.name) return;
    setIsSavingBudget(true);
    await saveBudgetDraft({
      schoolId: user.schoolId,
      schoolName: user.name,
      session: budgetSession,
      data: plannerData,
      note: "Budget Drafted by School Admin"
    });
    setIsSavingBudget(false);
    alert("Budget Draft Saved Successfully.");
  };

  const handleSubmitBudgetPlan = async () => {
    const existing = budgetRequests.find(r => r.schoolId === user?.schoolId && r.session === budgetSession);
    if (!existing) {
       // Save as draft first if it doesn't exist
       await handleSaveBudgetDraft();
    }
    
    // Find it again to get the ID
    const toSubmit = budgetRequests.find(r => r.schoolId === user?.schoolId && r.session === budgetSession);
    if (toSubmit) {
       if (confirm("Are you sure you want to submit this budget plan for Head Office approval? You won't be able to edit it until it is reviewed.")) {
          setIsSavingBudget(true);
          await submitBudgetRequest(toSubmit.id);
          setIsSavingBudget(false);
          alert("Budget Plan Submitted for Approval.");
       }
    }
  };

  // Editing logic
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

  // Smart Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState(0); // 0: Encoding, 1: Syncing, 2: Notifying, 3: Success
  
  // Filtering & Searching
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const [formData, setFormData] = useState({
    category: CATEGORIES[0],
    description: '',
    amount: '',
    session: SESSIONS[0],
    expenseDate: new Date().toISOString().split('T')[0],
    attachmentName: '',
    attachmentData: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const filteredPolicies = useMemo(() => {
    if (!policySearch) return EXPENSE_POLICIES;
    return EXPENSE_POLICIES.filter(p => 
      p.group.toLowerCase().includes(policySearch.toLowerCase()) ||
      p.rules.some(r => r.toLowerCase().includes(policySearch.toLowerCase()))
    );
  }, [policySearch]);

  const stats = useMemo(() => {
    const userReqs = requests.filter(r => r.schoolId === user?.schoolId);
    return {
      pending: userReqs.filter(r => r.status === RequestStatus.PENDING).length,
      approved: userReqs.filter(r => r.status === RequestStatus.APPROVED).length,
      rejected: userReqs.filter(r => r.status === RequestStatus.REJECTED).length,
      totalValue: userReqs.reduce((acc, r) => acc + (r.status !== RequestStatus.REJECTED && r.status !== RequestStatus.CANCELLED ? r.amount : 0), 0)
    };
  }, [requests, user]);

  const getConsumed = (category: string, quarter: keyof QuarterlyBudget) => {
    return requests
      .filter(r => 
        r.schoolId === user?.schoolId && 
        r.category === category && 
        r.status !== RequestStatus.REJECTED &&
        r.status !== RequestStatus.CANCELLED &&
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB Limit
        alert("File too large. Maximum size allowed is 2MB.");
        return;
      }
      
      setIsProcessingFile(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile(file);
        setFormData(prev => ({ 
          ...prev, 
          attachmentName: file.name,
          attachmentData: reader.result as string
        }));
        setIsProcessingFile(false);
      };
      reader.onerror = () => {
        alert("Failed to read file.");
        setIsProcessingFile(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const startModify = (req: ExpenseRequest) => {
    setEditingRequestId(req.id);
    setFormData({
      category: req.category,
      description: req.description,
      amount: req.amount.toString(),
      session: req.session,
      expenseDate: req.expenseDate,
      attachmentName: req.attachmentName || '',
      attachmentData: req.attachmentData || ''
    });
    setSelectedFile(null);
    setSelectedRequest(null);
    setSubView('new');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; 
    
    setFormError(null);

    if (isProcessingFile) {
      setFormError("Attachment is still being processed. Please wait...");
      return;
    }

    const amount = Number(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormError("Amount must be greater than zero. Requisition denied.");
      return;
    }

    if (!user?.schoolId || !user?.name) return;

    setIsSubmitting(true);
    setSubmissionStep(0); 

    const submissionData = {
      category: formData.category,
      description: formData.description,
      amount: amount,
      session: formData.session,
      expenseDate: formData.expenseDate,
      attachmentName: formData.attachmentName,
      attachmentData: formData.attachmentData
    };

    setTimeout(() => setSubmissionStep(1), 800);

    if (editingRequestId) {
      await modifyRequest(editingRequestId, submissionData);
    } else {
      await addRequest({
        ...submissionData,
        schoolId: user.schoolId,
        schoolName: user.name
      });
    }
    
    setTimeout(() => setSubmissionStep(2), 1600);
    await new Promise(resolve => setTimeout(resolve, 1200));

    setSubmissionStep(3);
    
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmissionStep(0);
      setEditingRequestId(null);
      setShowNotificationToast(true);
      setTimeout(() => setShowNotificationToast(false), 5000);
      setSubView('dashboard');
      setSelectedFile(null);
      setFormData({
        category: CATEGORIES[0],
        description: '',
        amount: '',
        session: SESSIONS[0],
        expenseDate: new Date().toISOString().split('T')[0],
        attachmentName: '',
        attachmentData: ''
      });
    }, 1500);
  };

  const confirmCancel = () => {
    if (selectedRequest) {
      cancelRequest(selectedRequest.id);
      setSelectedRequest(null);
      setShowCancelConfirm(false);
    }
  };

  const handleViewAttachment = (filename: string, data?: string) => {
    if (!data || data.trim() === "" || data.length < 50) {
      alert("Attachment data is not yet synchronized or is missing. Please try again in 30 seconds.");
      return;
    }
    try {
      const link = document.createElement('a');
      link.href = data;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 100);
    } catch (e) {
      console.error("Download failed:", e);
      alert("Unable to open the attachment.");
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 relative">
      {/* CONFIRM CANCEL MODAL */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
           <Card className="w-full max-w-sm p-8 flex flex-col items-center text-center shadow-2xl border-none">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6">
                 <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Cancel Request?</h3>
              <p className="text-sm text-slate-500 mt-2 mb-8">
                Are you sure you want to cancel the request <strong>{selectedRequest?.id}</strong>? This action will alert the Head Office and cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                 <Button variant="outline" className="flex-1" onClick={() => setShowCancelConfirm(false)}>Stay Active</Button>
                 <Button variant="danger" className="flex-1" onClick={confirmCancel}>Yes, Cancel</Button>
              </div>
           </Card>
        </div>
      )}

      {/* SMART LOADING OVERLAY */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4">
           <Card className="w-full max-w-sm p-10 flex flex-col items-center text-center shadow-2xl border-none">
              <div className="relative mb-8">
                 {submissionStep < 3 ? (
                   <>
                    <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       {submissionStep === 0 && <Paperclip className="w-8 h-8 text-blue-600 animate-pulse" />}
                       {submissionStep === 1 && <Cloud className="w-8 h-8 text-blue-600 animate-pulse" />}
                       {submissionStep === 2 && <Send className="w-8 h-8 text-blue-600 animate-pulse" />}
                    </div>
                   </>
                 ) : (
                   <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
                      <CheckCircle2 className="w-10 h-10" />
                   </div>
                 )}
              </div>
              
              <div className="space-y-2">
                 <h3 className="text-lg font-bold text-slate-900">
                    {submissionStep === 0 && (editingRequestId ? "Updating Documents" : "Finalizing Documents")}
                    {submissionStep === 1 && "Syncing with Cloud"}
                    {submissionStep === 2 && "Notifying Auditor"}
                    {submissionStep === 3 && (editingRequestId ? "Update Complete" : "Submission Complete")}
                 </h3>
                 <p className="text-xs text-slate-500 font-medium leading-relaxed px-4">
                    {submissionStep === 0 && "Your data is being securely processed for foundation records."}
                    {submissionStep === 1 && "Establishing secure handshake with Darshan Foundation servers."}
                    {submissionStep === 2 && "Drafting official notification for intauditor@darshanacademy.org"}
                    {submissionStep === 3 && (editingRequestId ? "The modification has been logged and the auditor alerted." : "Requisition logged and Auditor has been alerted via priority email.")}
                 </p>
              </div>

              <div className="flex gap-2 mt-8">
                 {[0, 1, 2].map(step => (
                   <div key={step} className={cn(
                     "h-1.5 w-8 rounded-full transition-all duration-500",
                     submissionStep === step ? "bg-blue-600 w-12" : (submissionStep > step ? "bg-emerald-500" : "bg-slate-100")
                   )}></div>
                 ))}
              </div>
           </Card>
        </div>
      )}

      {/* Toast Notification */}
      {showNotificationToast && (
        <div className="fixed top-20 right-4 z-[100] animate-bounce">
          <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500">
             <MailCheck className="w-6 h-6" />
             <div>
                <p className="font-bold text-sm">Head Office Notified!</p>
                <p className="text-[10px] opacity-90">Email sent to intauditor@darshanacademy.org</p>
             </div>
             <button onClick={() => setShowNotificationToast(false)} className="p-1 hover:bg-emerald-500 rounded"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

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
            onClick={() => { setMainView('budgets'); setBudgetView('planner'); }} 
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", 
              mainView === 'budgets' ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <PieChart className="w-5 h-5" /> Fund Tracking
          </button>
          <button 
            onClick={() => setMainView('policies')} 
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", 
              mainView === 'policies' ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <ShieldCheck className="w-5 h-5" /> Admin Policy
          </button>
        </Card>

        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100/50 shadow-sm">
           <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-amber-100 rounded-lg"><Info className="w-4 h-4 text-amber-600" /></div>
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-widest">Filing Tip</h4>
           </div>
           <p className="text-xs text-amber-700 leading-relaxed font-medium">
             Always attach supporting GST invoices for any activity expenditure exceeding ₹15,000 to ensure fast disbursement.
           </p>
        </div>
      </div>

      <div className="flex-1 space-y-8">
        {mainView === 'requests' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-3">
              <Button 
                variant={subView === 'dashboard' ? 'primary' : 'outline'} 
                onClick={() => setSubView('dashboard')}
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Button>
              <Button 
                variant={subView === 'new' ? 'primary' : 'outline'} 
                onClick={() => { setEditingRequestId(null); setSubView('new'); setFormData({ category: CATEGORIES[0], description: '', amount: '', session: SESSIONS[0], expenseDate: new Date().toISOString().split('T')[0], attachmentName: '', attachmentData: '' }); setSelectedFile(null); }}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Pending" value={stats.pending} icon={Clock} borderColor="border-amber-400" iconColor="text-amber-400" />
                  <StatCard title="Approved" value={stats.approved} icon={CheckCircle2} borderColor="border-emerald-400" iconColor="text-emerald-400" />
                  <StatCard title="Rejected" value={stats.rejected} icon={XCircleIcon} borderColor="border-rose-400" iconColor="text-rose-400" />
                  <StatCard title="Total Value" value={formatCurrency(stats.totalValue)} icon={Landmark} borderColor="border-blue-400" iconColor="text-blue-500" />
                </div>

                <Card className="p-0 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="text-xl font-bold text-slate-900">Recent Requests</h3>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input placeholder="Search..." className="pl-9 h-10 rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                      </div>
                      <Button variant="outline" size="sm" className="h-10 px-4" onClick={() => setSubView('history')}>View All</Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">ID</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4">Status</th>
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
              </div>
            )}

            {subView === 'new' && (
              <Card className="max-w-3xl p-8 animate-fade-in mx-auto">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{editingRequestId ? `Modify Requisition: ${editingRequestId}` : 'Raise Fund Requisition'}</h2>
                    <p className="text-slate-500 text-sm mt-1">{editingRequestId ? 'Update the details of your pending request.' : 'Please fill out the details for your expense request.'}</p>
                  </div>
                  <Button variant="ghost" onClick={() => { setEditingRequestId(null); setSubView('dashboard'); }}><XCircleIcon className="w-5 h-5" /></Button>
                </div>

                {formError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {formError}
                  </div>
                )}

                <form onSubmit={handleFormSubmit} className="space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                       <Label>Fiscal Year</Label>
                       <Select value={formData.session} onChange={(e) => setFormData({...formData, session: e.target.value})} className="h-11 text-sm rounded-xl">
                          {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                       </Select>
                     </div>
                     <div className="space-y-2">
                       <div className="flex justify-between items-center">
                          <Label>Date of Expense</Label>
                          {formData.expenseDate && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md">
                               <Calendar className="w-3 h-3 text-blue-600" />
                               <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Pertains to {getQuarter(formData.expenseDate).toUpperCase()}</span>
                            </div>
                          )}
                       </div>
                       <Input type="date" value={formData.expenseDate} onChange={(e) => setFormData({...formData, expenseDate: e.target.value})} className="h-11 rounded-xl" />
                     </div>
                   </div>

                   <div className="space-y-2">
                     <Label>Expense Heading</Label>
                     <Select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="h-11 text-sm rounded-xl">
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
                        <button type="button" onClick={handleEnhance} disabled={isEnhancing || !formData.description.trim()} className="text-[10px] uppercase tracking-wider text-blue-600 font-bold hover:underline flex items-center gap-1 disabled:opacity-50 transition-all">
                           {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                           Polish with AI
                        </button>
                     </div>
                     <textarea className="w-full border border-slate-200 p-4 rounded-xl min-h-[140px] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-slate-400 bg-slate-50/30" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Explain why these funds are needed for the school..." />
                   </div>

                   <div className="space-y-2">
                     <Label>Supporting Documents (Invoices/Bills)</Label>
                     <div onClick={() => fileInputRef.current?.click()} className={cn("border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer", (selectedFile || formData.attachmentName) ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 bg-slate-50/30 hover:border-blue-300 hover:bg-blue-50/30")}>
                        {isProcessingFile ? (
                           <div className="flex flex-col items-center gap-2">
                              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Encoding Content...</p>
                           </div>
                        ) : (selectedFile || formData.attachmentName) ? (
                          <div className="flex flex-col items-center gap-2">
                             <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full"><FileText className="w-6 h-6" /></div>
                             <div className="text-center">
                                <p className="text-sm font-bold text-slate-900">{selectedFile?.name || formData.attachmentName}</p>
                                {selectedFile && <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>}
                             </div>
                             <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setFormData(p => ({...p, attachmentName: '', attachmentData: ''})); }} className="text-xs text-rose-600 font-bold uppercase hover:underline mt-2">Remove</button>
                          </div>
                        ) : (
                          <>
                            <div className="p-3 bg-white shadow-sm rounded-full text-slate-400"><Paperclip className="w-6 h-6" /></div>
                            <div className="text-center">
                               <p className="text-sm font-bold text-slate-900">Click to upload attachment</p>
                               <p className="text-xs text-slate-500">PDF, JPG or PNG (Max 2MB)</p>
                            </div>
                          </>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                     </div>
                   </div>

                   <div className="space-y-2">
                     <Label>Net Amount (INR)</Label>
                     <Input type="number" min="0.01" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="0.00" className="h-12 text-lg font-bold rounded-xl" />
                   </div>

                   <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                      <Button variant="outline" type="button" onClick={() => { setEditingRequestId(null); setSubView('dashboard'); }} className="px-8">Discard</Button>
                      <Button type="submit" disabled={isProcessingFile || isSubmitting} className="px-8 bg-blue-600 hover:bg-blue-700">
                         {isSubmitting ? "Processing..." : (editingRequestId ? "Update Request" : "Submit Request")}
                      </Button>
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
                    <Input placeholder="Search history..." className="pl-9 h-10 rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
           <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3">
                <Button 
                  variant={budgetView === 'planner' ? 'primary' : 'outline'} 
                  onClick={() => setBudgetView('planner')}
                >
                  <Calculator className="w-4 h-4" /> Budget Planner
                </Button>
                <Button 
                  variant={budgetView === 'utilisation' ? 'primary' : 'outline'} 
                  onClick={() => setBudgetView('utilisation')}
                >
                  <PieChart className="w-4 h-4" /> Fund Utilisation
                </Button>
              </div>

              {budgetView === 'planner' && (
                <Card className="p-0 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     <div>
                        <h2 className="text-xl font-bold text-slate-900">Annual Budget Planner</h2>
                        <p className="text-xs text-slate-500 mt-1">Draft your quarterly fund requirements for the selected session.</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <Select value={budgetSession} onChange={(e) => setBudgetSession(e.target.value)} className="w-32 rounded-xl">
                          {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                        <Button variant="outline" size="sm" onClick={handleSaveBudgetDraft} disabled={isSavingBudget}>
                           {isSavingBudget ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-4 h-4" />} Save Draft
                        </Button>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmitBudgetPlan} disabled={isSavingBudget}>
                           <SendHorizonal className="w-4 h-4" /> Submit Plan
                        </Button>
                     </div>
                  </div>
                  
                  {/* Status Indicator for current session budget request */}
                  {budgetRequests.find(r => r.schoolId === user?.schoolId && r.session === budgetSession) && (
                    <div className="px-6 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plan Status:</span>
                          <Badge status={budgetRequests.find(r => r.schoolId === user?.schoolId && r.session === budgetSession)?.status || 'DRAFT'} />
                       </div>
                       {budgetRequests.find(r => r.schoolId === user?.schoolId && r.session === budgetSession)?.adminComments && (
                         <div className="text-[10px] text-rose-600 font-bold bg-rose-50 px-3 py-1 rounded-lg border border-rose-100">
                           Admin: {budgetRequests.find(r => r.schoolId === user?.schoolId && r.session === budgetSession)?.adminComments}
                         </div>
                       )}
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] text-left border-collapse min-w-[800px]">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-4 border-b border-slate-200 w-48 sticky left-0 bg-slate-50 z-10">Budget Head</th>
                          {['Q1 (Apr-Jun)', 'Q2 (Jul-Sep)', 'Q3 (Oct-Dec)', 'Q4 (Jan-Mar)'].map(q => (
                             <th key={q} className="px-4 py-4 border-b border-l border-slate-200 text-center">{q} Requirement</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {BUDGET_GROUPS.map(group => (
                          <React.Fragment key={group.name}>
                             <tr className="bg-slate-50 text-slate-900 font-bold">
                                <td colSpan={5} className="px-4 py-2.5 text-xs uppercase tracking-widest border-y border-slate-200">{group.name}</td>
                             </tr>
                             {group.items.map(cat => {
                                const row = plannerData[cat] || { q1: 0, q2: 0, q3: 0, q4: 0 };
                                const isLocked = budgetRequests.find(r => r.schoolId === user?.schoolId && r.session === budgetSession && r.status === 'PENDING');
                                return (
                                  <tr key={cat} className="hover:bg-slate-50/50 transition-colors">
                                     <td className="px-4 py-3 border-r border-slate-100 font-semibold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-10">{cat}</td>
                                     {(['q1', 'q2', 'q3', 'q4'] as const).map(q => (
                                       <td key={q} className="px-2 py-2 border-l border-slate-100">
                                          <input 
                                            type="number" 
                                            className={cn(
                                              "w-full px-2 py-1.5 rounded-lg border bg-white text-right font-bold transition-all outline-none",
                                              isLocked ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed" : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                                            )}
                                            value={row[q]}
                                            disabled={!!isLocked}
                                            onChange={(e) => handlePlannerChange(cat, q, e.target.value)}
                                          />
                                       </td>
                                     ))}
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

              {budgetView === 'utilisation' && (
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
                                                  <td className="px-2 py-2 text-right border-l border-slate-100">{formatNumberIndian(appr)}</td>
                                                  <td className="px-2 py-2 text-right text-blue-600 font-medium">{formatNumberIndian(cons)}</td>
                                                  <td className={cn("px-2 py-2 text-right font-bold", bal >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatNumberIndian(bal)}</td>
                                                </React.Fragment>
                                            );
                                          })}
                                          <td className="px-4 py-2 text-right font-bold bg-slate-50/50 border-l border-slate-200 text-slate-900">{formatNumberIndian(row.q1+row.q2+row.q3+row.q4)}</td>
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

        {mainView === 'policies' && (
          <div className="space-y-8 animate-fade-in">
             <div className="flex justify-between items-center">
               <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                 <ShieldCheck className="w-8 h-8 text-blue-600" /> Foundation Financial Policies
               </h2>
               <div className="relative w-64">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <Input placeholder="Search policies..." className="pl-9 h-10 rounded-xl" value={policySearch} onChange={(e) => setPolicySearch(e.target.value)} />
               </div>
             </div>
             <div className="grid grid-cols-1 gap-6">
                {filteredPolicies.map((p, idx) => (
                   <Card key={idx} className="p-0 overflow-hidden border-none shadow-md hover:shadow-lg transition-all ring-1 ring-slate-100">
                      <div className="bg-white p-6 border-b border-slate-50 flex items-center gap-4">
                         <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><FileCheck className="w-6 h-6" /></div>
                         <div><h3 className="font-bold text-slate-900 text-lg leading-none">{p.group}</h3><p className="text-slate-500 text-xs mt-2 font-medium">{p.description}</p></div>
                      </div>
                      <div className="p-6 bg-slate-50/50 space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {p.rules.map((rule, ridx) => (
                               <div key={ridx} className="flex gap-3 items-start bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><ChevronRight className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" /><p className="text-xs text-slate-600 font-medium leading-relaxed">{rule}</p></div>
                            ))}
                         </div>
                         <div className="mt-4 p-4 bg-rose-50 rounded-xl border border-rose-100 flex items-center gap-3"><div className="bg-rose-500 text-white p-1 rounded-lg"><Landmark className="w-4 h-4" /></div><p className="text-xs font-bold text-rose-800">{p.limit}</p></div>
                      </div>
                   </Card>
                ))}
             </div>
          </div>
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
              
              <div className="p-8 space-y-6">
                 <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Request Details</Label>
                    <p className="text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">"{selectedRequest.description}"</p>
                 </div>

                 {selectedRequest.attachmentName && (
                   <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-slate-400">Supporting Attachment</Label>
                      <div onClick={() => handleViewAttachment(selectedRequest.attachmentName!, selectedRequest.attachmentData)} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl group hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all"><FileText className="w-4 h-4" /></div>
                            <span className="text-xs font-bold text-slate-700">{selectedRequest.attachmentName}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest group-hover:underline">Download Bill</span>
                            <Download className="w-3 h-3 text-blue-600" />
                         </div>
                      </div>
                   </div>
                 )}

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

                 {selectedRequest.status === RequestStatus.PENDING && (
                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                       <Button variant="outline" className="flex-1" onClick={() => startModify(selectedRequest)}>
                          <Pencil className="w-4 h-4" /> Modify Details
                       </Button>
                       <Button variant="outline" className="flex-1 text-rose-600 border-rose-100 hover:bg-rose-50" onClick={() => setShowCancelConfirm(true)}>
                          <Trash2 className="w-4 h-4" /> Cancel Requisition
                       </Button>
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
