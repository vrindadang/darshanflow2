
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { ExpenseRequest, User, Role, RequestStatus, BudgetMap, QuarterlyBudget, BudgetLog, BudgetRequest } from './types.ts';
import { MOCK_REQUESTS, SCHOOLS, INITIAL_BUDGETS, CATEGORIES } from './constants.ts';
import { mongoDB } from './db.ts';
import { Loader2 } from 'lucide-react';
import { composeAuditorNotification } from './lib/gemini.ts';
import Logo from './components/Logo.tsx';

interface BudgetStats {
  budget: number;
  used: number;
  remaining: number;
}

interface AppContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateUserProfile: (name: string, password?: string) => void;
  requests: ExpenseRequest[];
  addRequest: (req: Omit<ExpenseRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  updateRequestStatus: (id: string, status: RequestStatus, comments: string) => void;
  selectedRequest: ExpenseRequest | null;
  setSelectedRequest: (req: ExpenseRequest | null) => void;
  budgets: BudgetMap;
  updateBudget: (schoolId: string, category: string, quarter: keyof QuarterlyBudget, amount: number) => void;
  getBudgetStats: (schoolId: string, category: string, dateStr?: string, session?: string) => BudgetStats;
  getQuarter: (dateStr: string) => keyof QuarterlyBudget;
  budgetRequests: BudgetRequest[];
  addBudgetRequest: (req: Omit<BudgetRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  processBudgetRequest: (id: string, status: 'APPROVED' | 'REJECTED', comments: string, approvedData?: Record<string, QuarterlyBudget>) => void;
  budgetLogs: BudgetLog[];
  addBudgetLog: (log: Omit<BudgetLog, 'id' | 'timestamp'>) => void;
  isHydrated: boolean;
  lastSync: Date;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSync, setLastSync] = useState(new Date());
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [budgets, setBudgets] = useState<BudgetMap>(INITIAL_BUDGETS);
  const [budgetRequests, setBudgetRequests] = useState<BudgetRequest[]>([]);
  const [budgetLogs, setBudgetLogs] = useState<BudgetLog[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null);

  const refreshData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial && mongoDB.isLive) {
        await mongoDB.testConnection();
      }

      const [requestsRes, budgetRequestsRes, budgetLogsRes, budgetsRes] = await Promise.all([
        mongoDB.find('requests'),
        mongoDB.find('budgetRequests'),
        mongoDB.find('budgetLogs'),
        mongoDB.find('budgets')
      ]);
      
      if (requestsRes.documents) {
        const serverRequests = requestsRes.documents as ExpenseRequest[];
        setRequests(prev => {
          if (isInitial && serverRequests.length > 0) return serverRequests;
          if (isInitial && serverRequests.length === 0) return MOCK_REQUESTS;
          const serverMap = new Map(serverRequests.map(r => [r.id, r]));
          const merged = [...prev];
          const result = merged.map(localReq => {
            const serverReq = serverMap.get(localReq.id);
            if (serverReq) {
              if (localReq.attachmentData && !serverReq.attachmentData) {
                return { ...serverReq, attachmentData: localReq.attachmentData, attachmentName: localReq.attachmentName };
              }
              return serverReq;
            }
            return localReq;
          });
          const localIds = new Set(merged.map(r => r.id));
          serverRequests.forEach(serverReq => {
            if (!localIds.has(serverReq.id)) {
              result.push(serverReq);
            }
          });
          return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
      } else if (isInitial) {
        setRequests(MOCK_REQUESTS);
        if (mongoDB.isLive) await mongoDB.bulkPut('requests', MOCK_REQUESTS);
      }

      setBudgetRequests(budgetRequestsRes.documents || []);
      setBudgetLogs((budgetLogsRes.documents || []).sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));

      if (budgetsRes.documents?.length > 0) {
        const budgetMap: BudgetMap = {};
        budgetsRes.documents.forEach((b: any) => { budgetMap[b.id] = b.data; });
        setBudgets(budgetMap);
      } else if (isInitial) {
        if (mongoDB.isLive) {
          const budgetEntries = Object.entries(INITIAL_BUDGETS).map(([id, data]) => ({ id, data }));
          await mongoDB.bulkPut('budgets', budgetEntries);
        }
      }
      setLastSync(new Date());
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }, []);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const sessionRes = await mongoDB.find('session', { id: 'current_user' });
        if (sessionRes.documents?.[0]?.user) {
          setUser(sessionRes.documents[0].user);
        }
        await refreshData(true);
      } catch (error) {
        console.error("Hydration failed", error);
      } finally {
        setIsHydrated(true);
      }
    };
    hydrate();
  }, [refreshData]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => { refreshData(); }, 15000);
    return () => clearInterval(interval);
  }, [user, refreshData]);

  const login = async (newUser: User) => {
    setUser(newUser);
    await mongoDB.updateOne('session', 'current_user', { id: 'current_user', user: newUser });
    await refreshData();
  };
  
  const logout = async () => {
    setUser(null);
    setSelectedRequest(null);
    await mongoDB.updateOne('session', 'current_user', { id: 'current_user', user: null });
  };

  const updateUserProfile = async (name: string, password?: string) => {
    if (user) {
      const updated = { ...user, name };
      setUser(updated);
      await mongoDB.updateOne('session', 'current_user', { id: 'current_user', user: updated });
    }
  };

  const addRequest = async (req: Omit<ExpenseRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const school = SCHOOLS.find(s => s.id === req.schoolId);
    const shortCode = school ? school.shortCode : 'DEF';
    const uniqueNum = Math.floor(1000 + Math.random() * 9000);
    const newId = `${shortCode}/${req.session}/${uniqueNum}`;
    const newRequest: ExpenseRequest = {
      ...req,
      id: newId,
      status: RequestStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRequests(prev => [newRequest, ...prev]);
    try {
      await mongoDB.insertOne('requests', newRequest);
      const emailDraft = await composeAuditorNotification(newRequest);
      console.log(`[MAIL SERVER] Sending Requisition Alert...`, emailDraft);
    } catch (e) {
      console.error("Storage/Notification failed:", e);
    }
  };

  const updateRequestStatus = async (id: string, status: RequestStatus, comments: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    const updated = { ...req, status, updatedAt: new Date().toISOString() };
    if (status === RequestStatus.APPROVED || status === RequestStatus.REJECTED) updated.approverComments = comments;
    if (status === RequestStatus.DISBURSED) updated.financeComments = comments;
    setRequests(prev => prev.map(r => r.id === id ? updated : r));
    await mongoDB.updateOne('requests', id, updated);
  };

  const updateBudget = async (schoolId: string, category: string, quarter: keyof QuarterlyBudget, amount: number) => {
    const currentSchoolData = budgets[schoolId] || {};
    const updatedCategory = { ...(currentSchoolData[category] || { q1: 0, q2: 0, q3: 0, q4: 0 }), [quarter]: amount };
    const updatedBudgets = { ...budgets, [schoolId]: { ...currentSchoolData, [category]: updatedCategory } };
    setBudgets(updatedBudgets);
    await mongoDB.updateOne('budgets', schoolId, { data: updatedBudgets[schoolId] });
  };

  const addBudgetRequest = async (req: Omit<BudgetRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const school = SCHOOLS.find(s => s.id === req.schoolId);
    const shortCode = school ? school.shortCode : 'DEF';
    const newRequest: BudgetRequest = {
      ...req,
      id: `BP/${shortCode}/${Math.floor(100 + Math.random() * 900)}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setBudgetRequests(prev => [newRequest, ...prev]);
    await mongoDB.insertOne('budgetRequests', newRequest);
  };

  const processBudgetRequest = async (id: string, status: 'APPROVED' | 'REJECTED', comments: string, approvedData?: Record<string, QuarterlyBudget>) => {
    setBudgetRequests(prev => prev.map(req => {
      if (req.id !== id) return req;
      const updated = { ...req, status, adminComments: comments, updatedAt: new Date().toISOString() };
      mongoDB.updateOne('budgetRequests', id, updated);
      return updated;
    }));
    if (status === 'APPROVED' && approvedData) {
       const req = budgetRequests.find(r => r.id === id);
       if (req) {
          for (const cat of CATEGORIES) {
             const plan = approvedData[cat];
             if (plan) {
                for (const q of (['q1', 'q2', 'q3', 'q4'] as const)) {
                   const oldAmount = budgets[req.schoolId]?.[cat]?.[q] || 0;
                   if (oldAmount !== plan[q]) {
                      await updateBudget(req.schoolId, cat, q, plan[q]);
                      await addBudgetLog({ adminName: user?.name || 'Admin', schoolName: req.schoolName, session: req.session, category: cat, quarter: q.toUpperCase(), oldAmount, newAmount: plan[q] });
                   }
                }
             }
          }
       }
    }
  };

  const addBudgetLog = async (log: Omit<BudgetLog, 'id' | 'timestamp'>) => {
    const newLog: BudgetLog = { ...log, id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString() };
    setBudgetLogs(prev => [newLog, ...prev]);
    await mongoDB.insertOne('budgetLogs', newLog);
  };

  const getQuarter = (dateStr: string): keyof QuarterlyBudget => {
    const month = new Date(dateStr).getMonth();
    if (month >= 3 && month <= 5) return 'q1';
    if (month >= 6 && month <= 8) return 'q2';
    if (month >= 9 && month <= 11) return 'q3';
    return 'q4';
  };

  const getBudgetStats = (schoolId: string, category: string, dateStr?: string, session?: string): BudgetStats => {
    const categoryBudget = budgets[schoolId]?.[category] || { q1: 0, q2: 0, q3: 0, q4: 0 };
    let budget = 0;
    let used = 0;
    if (dateStr) {
      const quarter = getQuarter(dateStr);
      budget = categoryBudget[quarter];
      used = requests.filter(r => r.schoolId === schoolId && r.category === category && r.status !== RequestStatus.REJECTED && getQuarter(r.expenseDate) === quarter && (session ? r.session === session : true)).reduce((sum, r) => sum + r.amount, 0);
    } else {
      budget = categoryBudget.q1 + categoryBudget.q2 + categoryBudget.q3 + categoryBudget.q4;
      used = requests.filter(r => r.schoolId === schoolId && r.category === category && r.status !== RequestStatus.REJECTED && (session ? r.session === session : true)).reduce((sum, r) => sum + r.amount, 0);
    }
    return { budget, used, remaining: budget - used };
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-6">
        <div className="relative">
           <Logo className="w-48 h-48 animate-pulse drop-shadow-xl" />
           <Loader2 className="w-10 h-10 text-blue-500 animate-spin absolute bottom-2 right-2" />
        </div>
        <div className="text-center">
           <p className="text-slate-900 font-bold text-xl tracking-tight">Initializing DarshanFlow</p>
           <p className="text-slate-400 text-sm font-medium">Establishing secure foundation cloud sync...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ 
      user, login, logout, updateUserProfile,
      requests, addRequest, updateRequestStatus,
      selectedRequest, setSelectedRequest,
      budgets, updateBudget, getBudgetStats, getQuarter,
      budgetRequests, addBudgetRequest, processBudgetRequest,
      budgetLogs, addBudgetLog, isHydrated, lastSync
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
