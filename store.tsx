import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ExpenseRequest, User, Role, RequestStatus, BudgetMap, QuarterlyBudget, BudgetLog, BudgetRequest } from './types.ts';
import { MOCK_REQUESTS, SCHOOLS, INITIAL_BUDGETS, CATEGORIES } from './constants.ts';

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
  // Budget Context
  budgets: BudgetMap;
  updateBudget: (schoolId: string, category: string, quarter: keyof QuarterlyBudget, amount: number) => void;
  getBudgetStats: (schoolId: string, category: string, dateStr?: string, session?: string) => BudgetStats;
  getQuarter: (dateStr: string) => keyof QuarterlyBudget;
  // Budget Requests (Workflow)
  budgetRequests: BudgetRequest[];
  addBudgetRequest: (req: Omit<BudgetRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  processBudgetRequest: (id: string, status: 'APPROVED' | 'REJECTED', comments: string, approvedData?: Record<string, QuarterlyBudget>) => void;
  // Budget Logs
  budgetLogs: BudgetLog[];
  addBudgetLog: (log: Omit<BudgetLog, 'id' | 'timestamp'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<ExpenseRequest[]>(MOCK_REQUESTS);
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null);
  const [budgets, setBudgets] = useState<BudgetMap>(INITIAL_BUDGETS);
  const [budgetLogs, setBudgetLogs] = useState<BudgetLog[]>([]);
  const [budgetRequests, setBudgetRequests] = useState<BudgetRequest[]>([]);

  const login = (newUser: User) => setUser(newUser);
  const logout = () => {
    setUser(null);
    setSelectedRequest(null);
  };

  const updateUserProfile = (name: string, password?: string) => {
    if (user) {
      setUser({ ...user, name });
      // In a real app, we would handle password update here (API call)
      console.log(`Updated profile for ${user.id}: Name=${name}, Password=${password ? 'Changed' : 'Unchanged'}`);
    }
  };

  const addRequest = (req: Omit<ExpenseRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    // Generate ID Format: ShortCode/Session/Random
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
  };

  const updateRequestStatus = (id: string, status: RequestStatus, comments: string) => {
    setRequests(prev => prev.map(req => {
      if (req.id !== id) return req;
      const updated = { ...req, status, updatedAt: new Date().toISOString() };
      
      if (status === RequestStatus.APPROVED || status === RequestStatus.REJECTED) {
        updated.approverComments = comments;
      }
      if (status === RequestStatus.DISBURSED) {
        updated.financeComments = comments;
      }
      return updated;
    }));
  };

  const updateBudget = (schoolId: string, category: string, quarter: keyof QuarterlyBudget, amount: number) => {
    setBudgets(prev => ({
      ...prev,
      [schoolId]: {
        ...prev[schoolId],
        [category]: {
          ...(prev[schoolId]?.[category] || { q1: 0, q2: 0, q3: 0, q4: 0 }),
          [quarter]: amount
        }
      }
    }));
  };

  const addBudgetRequest = (req: Omit<BudgetRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const school = SCHOOLS.find(s => s.id === req.schoolId);
    const shortCode = school ? school.shortCode : 'DEF';
    const uniqueNum = Math.floor(100 + Math.random() * 900);
    
    const newRequest: BudgetRequest = {
      ...req,
      id: `BP/${shortCode}/${uniqueNum}`, // BP for Budget Plan
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setBudgetRequests(prev => [newRequest, ...prev]);
  };

  const processBudgetRequest = (id: string, status: 'APPROVED' | 'REJECTED', comments: string, approvedData?: Record<string, QuarterlyBudget>) => {
    setBudgetRequests(prev => prev.map(req => {
      if (req.id !== id) return req;
      return { ...req, status, adminComments: comments, updatedAt: new Date().toISOString() };
    }));

    if (status === 'APPROVED' && approvedData) {
       const req = budgetRequests.find(r => r.id === id);
       if (req) {
          // Update the global budgets with the approved data
          CATEGORIES.forEach(cat => {
             const plan = approvedData[cat];
             if (plan) {
                (['q1', 'q2', 'q3', 'q4'] as const).forEach(q => {
                   const oldAmount = budgets[req.schoolId]?.[cat]?.[q] || 0;
                   const newAmount = plan[q];
                   
                   if (oldAmount !== newAmount) {
                      updateBudget(req.schoolId, cat, q, newAmount);
                      addBudgetLog({
                         adminName: user?.name || 'Admin',
                         schoolName: req.schoolName,
                         session: req.session,
                         category: cat,
                         quarter: q.toUpperCase(),
                         oldAmount,
                         newAmount
                      });
                   }
                });
             }
          });
       }
    }
  };

  const addBudgetLog = (log: Omit<BudgetLog, 'id' | 'timestamp'>) => {
    const newLog: BudgetLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
    setBudgetLogs(prev => [newLog, ...prev]);
  };

  const getQuarter = (dateStr: string): keyof QuarterlyBudget => {
    const date = new Date(dateStr);
    const month = date.getMonth(); // 0-11
    // Indian Financial Year: Apr-Jun(Q1), Jul-Sep(Q2), Oct-Dec(Q3), Jan-Mar(Q4)
    if (month >= 3 && month <= 5) return 'q1';
    if (month >= 6 && month <= 8) return 'q2';
    if (month >= 9 && month <= 11) return 'q3';
    return 'q4';
  };

  const getBudgetStats = (schoolId: string, category: string, dateStr?: string, session?: string): BudgetStats => {
    const categoryBudget = budgets[schoolId]?.[category] || { q1: 0, q2: 0, q3: 0, q4: 0 };
    
    let budget = 0;
    let used = 0;

    // Filter by session if provided to ensure we only sum requests for the correct financial year
    const matchesSession = (r: ExpenseRequest) => session ? r.session === session : true;

    if (dateStr) {
      // Calculate for specific quarter
      const quarter = getQuarter(dateStr);
      budget = categoryBudget[quarter];
      
      used = requests
        .filter(r => 
          r.schoolId === schoolId && 
          r.category === category && 
          r.status !== RequestStatus.REJECTED &&
          getQuarter(r.expenseDate) === quarter &&
          matchesSession(r)
        )
        .reduce((sum, r) => sum + r.amount, 0);
    } else {
      // Annual Total
      budget = categoryBudget.q1 + categoryBudget.q2 + categoryBudget.q3 + categoryBudget.q4;
      
      used = requests
        .filter(r => 
          r.schoolId === schoolId && 
          r.category === category && 
          r.status !== RequestStatus.REJECTED &&
          matchesSession(r)
        )
        .reduce((sum, r) => sum + r.amount, 0);
    }

    return {
      budget,
      used,
      remaining: budget - used
    };
  };

  return (
    <AppContext.Provider value={{ 
      user, login, logout, updateUserProfile,
      requests, addRequest, updateRequestStatus,
      selectedRequest, setSelectedRequest,
      budgets, updateBudget, getBudgetStats, getQuarter,
      budgetRequests, addBudgetRequest, processBudgetRequest,
      budgetLogs, addBudgetLog
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