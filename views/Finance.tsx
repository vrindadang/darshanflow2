
import React, { useState } from 'react';
import { useApp } from '../store.tsx';
import { RequestStatus } from '../types.ts';
import { Card, Button, Badge, formatCurrency, Input, cn, Label } from '../components/ui.tsx';
import { Wallet, CheckCheck, History, Search, ArrowUpRight, XCircle, AlertCircle, CreditCard, FileText, Download } from 'lucide-react';

const Finance: React.FC = () => {
  const { requests, updateRequestStatus, selectedRequest, setSelectedRequest } = useApp();
  const [comment, setComment] = useState('');

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSchool, setFilterSchool] = useState('');

  const approvedRequests = requests.filter(r => r.status === RequestStatus.APPROVED);
  const disbursedRequests = requests.filter(r => r.status === RequestStatus.DISBURSED);
  
  const totalDisbursed = disbursedRequests.reduce((sum, r) => sum + r.amount, 0);
  const pendingDisbursalAmount = approvedRequests.reduce((sum, r) => sum + r.amount, 0);

  // Derive unique schools from disbursed list for filter
  const schools = Array.from(new Set(disbursedRequests.map(r => r.schoolName))).sort();

  const filteredDisbursed = disbursedRequests.filter(req => {
     const matchesSearch = 
       req.financeComments?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       req.amount.toString().includes(searchTerm) ||
       req.schoolName.toLowerCase().includes(searchTerm.toLowerCase());
     
     const matchesSchool = filterSchool ? req.schoolName === filterSchool : true;

     return matchesSearch && matchesSchool;
  });

  const handleDisburse = () => {
    if (selectedRequest) {
      updateRequestStatus(selectedRequest.id, RequestStatus.DISBURSED, comment);
      setSelectedRequest(null);
      setComment('');
    }
  };

  const openRequest = (req: typeof requests[0]) => {
    setSelectedRequest(req);
    setComment('');
  };

  const handleViewAttachment = (filename: string, data?: string) => {
    if (!data) {
      alert("No document data available for this request.");
      return;
    }
    const link = document.createElement('a');
    link.href = data;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white border-none shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-100 font-medium">Pending Disbursal</p>
              <h2 className="text-3xl font-bold mt-1">{approvedRequests.length}</h2>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <ArrowUpRight className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-sm text-green-50">Value: {formatCurrency(pendingDisbursalAmount)}</p>
          </div>
        </Card>

        <Card className="p-6 bg-white border border-gray-200">
           <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 font-medium">Total Disbursed</p>
              <h2 className="text-3xl font-bold text-gray-900 mt-1">{disbursedRequests.length}</h2>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <CheckCheck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Total Value: <span className="text-gray-900 font-semibold">{formatCurrency(totalDisbursed)}</span></p>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-6 animate-fade-in">
           <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
             <AlertCircle className="w-5 h-5 text-blue-600" /> Ready for Disbursal
           </h3>
           
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-xs">
                 <tr>
                   <th className="px-4 py-3 rounded-tl-lg">ID</th>
                   <th className="px-4 py-3">School</th>
                   <th className="px-4 py-3">Category</th>
                   <th className="px-4 py-3">Amount</th>
                   <th className="px-4 py-3">Approved Date</th>
                   <th className="px-4 py-3 rounded-tr-lg">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {approvedRequests.map(req => (
                   <tr key={req.id} className="hover:bg-gray-50/50">
                     <td className="px-4 py-3 font-medium text-gray-900">{req.id}</td>
                     <td className="px-4 py-3">{req.schoolName}</td>
                     <td className="px-4 py-3">{req.category}</td>
                     <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(req.amount)}</td>
                     <td className="px-4 py-3 text-gray-500">{new Date(req.updatedAt).toLocaleDateString()}</td>
                     <td className="px-4 py-3">
                        <Button 
                          size="sm" 
                          onClick={() => openRequest(req)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 h-auto flex items-center gap-1"
                        >
                          <CreditCard className="w-3 h-3" /> Process
                        </Button>
                     </td>
                   </tr>
                 ))}
                 {approvedRequests.length === 0 && (
                   <tr>
                     <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No requests pending disbursal.</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
             <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
               <History className="w-5 h-5 text-gray-500" /> Recent Transactions
             </h3>
             <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Filter transactions..." 
                  className="pl-9" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
          
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider font-bold">
                 <tr>
                   <th className="px-4 py-3 align-top">
                     <div className="flex flex-col gap-1">
                       <span>School</span>
                       <select 
                        className="text-[10px] border border-gray-200 rounded p-1 bg-white font-normal w-32"
                        value={filterSchool}
                        onChange={(e) => setFilterSchool(e.target.value)}
                       >
                         <option value="">All Schools</option>
                         {schools.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                     </div>
                   </th>
                   <th className="px-4 py-3 align-top pt-3">Amount</th>
                   <th className="px-4 py-3 align-top pt-3">Ref/Note</th>
                   <th className="px-4 py-3 align-top pt-3">Date</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {filteredDisbursed.slice(0, 15).map(req => (
                   <tr key={req.id} className="hover:bg-gray-50/50">
                     <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{req.schoolName}</div>
                        <div className="text-[10px] text-gray-400">{req.id}</div>
                     </td>
                     <td className="px-4 py-3 text-green-600 font-semibold">{formatCurrency(req.amount)}</td>
                     <td className="px-4 py-3 text-gray-600 italic">"{req.financeComments}"</td>
                     <td className="px-4 py-3 text-gray-400 text-xs">{new Date(req.updatedAt).toLocaleDateString()}</td>
                   </tr>
                 ))}
                 {filteredDisbursed.length === 0 && (
                   <tr>
                     <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No transactions match filters.</td>
                   </tr>
                 )}
               </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Payment Processing Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
           <Card className="w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold text-gray-900">Confirm Payment</h3>
               <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600">
                 <XCircle className="w-6 h-6" />
               </button>
             </div>
             
             <div className="mb-4 space-y-3 text-sm text-gray-600 bg-slate-50 p-4 rounded-xl border border-gray-100">
               <div className="flex justify-between items-start">
                 <div>
                   <span className="font-bold text-gray-900 text-lg block">{selectedRequest.id}</span>
                   <span className="text-gray-500 text-xs uppercase tracking-tight">{selectedRequest.schoolName}</span>
                 </div>
                 <Badge status={selectedRequest.status} />
               </div>
               <div className="pt-2 border-t border-gray-200">
                 <p><span className="font-semibold text-gray-900">Payable:</span> <span className="text-green-600 font-bold text-base">{formatCurrency(selectedRequest.amount)}</span></p>
                 <p><span className="font-semibold text-gray-900">Category:</span> {selectedRequest.category}</p>
                 <p className="mt-1"><span className="font-semibold text-gray-900">Reason:</span> <br/> <span className="italic">"{selectedRequest.description}"</span></p>
               </div>

               {selectedRequest.attachmentName && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Original School Attachment</span>
                    <div 
                       onClick={() => handleViewAttachment(selectedRequest.attachmentName!, selectedRequest.attachmentData)}
                       className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group"
                    >
                       <FileText className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                       <span className="text-xs font-bold text-slate-700 flex-1 truncate">{selectedRequest.attachmentName}</span>
                       <div className="flex items-center gap-2">
                         <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Download</span>
                         <Download className="w-3 h-3 text-blue-600" />
                       </div>
                    </div>
                  </div>
               )}

               {selectedRequest.approverComments && (
                 <div className="mt-2 pt-2 border-t border-gray-200">
                   <span className="font-semibold text-gray-900">Admin Approval Note:</span>
                   <p className="italic text-gray-600 bg-white p-2 rounded border border-gray-100 mt-1">{selectedRequest.approverComments}</p>
                 </div>
               )}
             </div>

             {selectedRequest.status === RequestStatus.APPROVED && (
               <div className="mt-4 border-t border-gray-100 pt-4">
                 <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                   <CreditCard className="w-4 h-4 text-green-600" /> Enter Transfer Details
                 </h4>
                 
                 <div className="space-y-4">
                   <div>
                     <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">UTR / Transaction Reference / Cheque No. <span className="text-red-500">*</span></label>
                     <Input 
                        value={comment} 
                        onChange={(e) => setComment(e.target.value)} 
                        placeholder="e.g. UTR12345678 or NEFT/123..." 
                        className="bg-white"
                        autoFocus
                     />
                   </div>
                   
                   <div className="flex justify-end gap-3 pt-2">
                      <Button variant="outline" onClick={() => setSelectedRequest(null)}>Cancel</Button>
                      <Button 
                        onClick={handleDisburse} 
                        disabled={!comment.trim()}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Release Funds
                      </Button>
                   </div>
                 </div>
               </div>
             )}
           </Card>
        </div>
      )}
    </div>
  );
};

export default Finance;
