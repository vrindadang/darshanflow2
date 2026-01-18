import React, { useState } from 'react';
import { School, ShieldCheck, Landmark, ArrowRight, BookOpen } from 'lucide-react';
import { useApp } from '../store.tsx';
import { Role, User } from '../types.ts';
import { SCHOOLS } from '../constants.ts';
import { Card, Button, Input, Select, Label, cn } from '../components/ui.tsx';

const Login: React.FC = () => {
  const { login } = useApp();
  const [activeTab, setActiveTab] = useState<Role>(Role.REQUESTOR);
  
  // Form States
  const [schoolId, setSchoolId] = useState(SCHOOLS[0].id);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate Login Logic
    let user: User;

    if (activeTab === Role.REQUESTOR) {
      const school = SCHOOLS.find(s => s.id === schoolId);
      user = {
        id: schoolId,
        name: school?.name || 'School Admin',
        role: Role.REQUESTOR,
        schoolId: schoolId
      };
    } else if (activeTab === Role.APPROVER) {
      user = {
        id: 'admin-1',
        name: 'Head Office Admin',
        role: Role.APPROVER
      };
    } else {
      user = {
        id: 'finance-1',
        name: 'Finance Manager',
        role: Role.FINANCE
      };
    }
    
    login(user);
  };

  const TabButton = ({ role, icon: Icon, label }: { role: Role; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => setActiveTab(role)}
      className={cn(
        "flex-1 flex flex-col items-center justify-center p-4 gap-2 transition-all border-b-2",
        activeTab === role 
          ? "border-blue-600 text-blue-600 bg-blue-50/50" 
          : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
      )}
    >
      <Icon className="w-6 h-6" />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="mb-8 text-center">
        <div className="bg-white p-3 rounded-2xl shadow-sm inline-block mb-4">
           <BookOpen className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">DarshanFlow</h1>
        <p className="text-gray-500 text-sm">Expense Approval Workflow System</p>
      </div>

      <Card className="w-full max-w-md overflow-hidden border-0 shadow-xl ring-1 ring-gray-900/5">
        <div className="flex border-b border-gray-100">
          <TabButton role={Role.REQUESTOR} icon={School} label="School" />
          <TabButton role={Role.APPROVER} icon={ShieldCheck} label="Admin" />
          <TabButton role={Role.FINANCE} icon={Landmark} label="Finance" />
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-gray-900">
                {activeTab === Role.REQUESTOR ? 'School Login' : activeTab === Role.APPROVER ? 'Admin Login' : 'Finance Login'}
              </h2>
              <p className="text-sm text-gray-500">
                {activeTab === Role.REQUESTOR 
                  ? 'Select your school to access the portal.' 
                  : 'Enter your credentials to access the dashboard.'}
              </p>
            </div>

            {activeTab === Role.REQUESTOR ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="school">Select School Location</Label>
                  <Select 
                    id="school" 
                    value={schoolId} 
                    onChange={(e) => setSchoolId(e.target.value)}
                  >
                    {SCHOOLS.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name.replace('Darshan Academy, ', '')}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="Enter school password" value="••••••••" readOnly className="bg-gray-50 text-gray-500" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@darshanacademy.org" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full py-2.5 text-base">
              Sign In <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Darshan Education Foundation
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Login;