
import React, { useState } from 'react';
import { School, ShieldCheck, Landmark, ArrowRight, Key, Info, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../store.tsx';
import { Role, User } from '../types.ts';
import { SCHOOLS } from '../constants.ts';
import { Card, Button, Input, Select, Label, cn } from '../components/ui.tsx';
import Logo from '../components/Logo.tsx';

const Login: React.FC = () => {
  const { login } = useApp();
  const [activeTab, setActiveTab] = useState<Role>(Role.REQUESTOR);
  
  // Form States
  const [schoolId, setSchoolId] = useState(SCHOOLS[0].id);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let user: User | null = null;
    if (activeTab === Role.REQUESTOR) {
      if (password === 'school@def') {
        const school = SCHOOLS.find(s => s.id === schoolId);
        user = { id: schoolId, name: school?.name || 'School Admin', role: Role.REQUESTOR, schoolId: schoolId };
      } else { setError("Invalid school password."); }
    } else if (activeTab === Role.APPROVER) {
      if (email === 'admin@def.org' && password === 'admin@123') {
        user = { id: 'admin-1', name: 'Head Office Admin', role: Role.APPROVER, email: 'admin@def.org' };
      } else { setError("Invalid admin credentials."); }
    } else {
      if (email === 'finance@def.org' && password === 'finance@123') {
        user = { id: 'finance-1', name: 'Finance Manager', role: Role.FINANCE, email: 'finance@def.org' };
      } else { setError("Invalid finance credentials."); }
    }
    if (user) login(user);
  };

  const TabButton = ({ role, icon: Icon, label }: { role: Role; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => { setActiveTab(role); setError(null); setPassword(''); setShowPassword(false); }}
      className={cn(
        "flex-1 flex flex-col items-center justify-center p-4 gap-2 transition-all border-b-2",
        activeTab === role ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
      )}
    >
      <Icon className="w-6 h-6" />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="mb-8 text-center animate-fade-in">
        <div className="bg-white p-4 rounded-3xl shadow-xl inline-block mb-6 border border-slate-100">
           <Logo className="w-32 h-32" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-1 tracking-tight">DarshanFlow</h1>
        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Education Foundation</p>
      </div>

      <Card className="w-full max-w-md overflow-hidden border-0 shadow-2xl ring-1 ring-gray-900/5 bg-white/80 backdrop-blur-sm">
        <div className="flex border-b border-gray-100">
          <TabButton role={Role.REQUESTOR} icon={School} label="School" />
          <TabButton role={Role.APPROVER} icon={ShieldCheck} label="Admin" />
          <TabButton role={Role.FINANCE} icon={Landmark} label="Finance" />
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">
                {activeTab === Role.REQUESTOR ? 'School Portal' : activeTab === Role.APPROVER ? 'HO Admin' : 'Finance Desk'}
              </h2>
              <p className="text-xs text-gray-500">Authorized access for foundation staff only.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-3 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <p className="text-xs font-bold text-red-700">{error}</p>
              </div>
            )}

            {activeTab === Role.REQUESTOR ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="school">Location</Label>
                  <Select id="school" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="h-11 rounded-xl">
                    {SCHOOLS.map(s => <option key={s.id} value={s.id}>{s.name.replace('Darshan Academy, ', '')}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">School Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter location password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Official Email</Label>
                  <Input id="email" type="email" placeholder="name@darshanacademy.org" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Secret Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full py-3 text-sm font-bold shadow-lg shadow-blue-500/20">Access Portal <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
             <button onClick={() => setShowHelp(!showHelp)} className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors mx-auto">
               <Key className="w-3 h-3" /> {showHelp ? 'Hide Login Guide' : 'Need Login Help?'}
             </button>
             {showHelp && (
               <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3 animate-fade-in">
                  <div className="flex gap-2"><Info className="w-4 h-4 text-blue-500 shrink-0" /><p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">System Default Credentials</p></div>
                  <div className="grid grid-cols-1 gap-2 text-[11px]">
                     <div className="flex justify-between p-2 bg-white rounded border border-slate-100"><span className="text-slate-400">Schools:</span><span className="font-bold text-slate-700">school@def</span></div>
                     <div className="flex justify-between p-2 bg-white rounded border border-slate-100"><span className="text-slate-400">Admin:</span><span className="font-bold text-slate-700">admin@def.org / admin@123</span></div>
                     <div className="flex justify-between p-2 bg-white rounded border border-slate-100"><span className="text-slate-400">Finance:</span><span className="font-bold text-slate-700">finance@def.org / finance@123</span></div>
                  </div>
               </div>
             )}
          </div>
        </div>
        <div className="bg-slate-50/50 p-4 text-center border-t border-gray-100"><p className="text-[10px] text-gray-400 font-bold tracking-wide">DarshanFlow v2.0</p></div>
      </Card>
    </div>
  );
};

export default Login;
