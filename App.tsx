import React, { useState, useRef, useEffect } from 'react';
import { AppProvider, useApp } from './store.tsx';
import Login from './views/Login.tsx';
import Requestor from './views/Requestor.tsx';
import Approver from './views/Approver.tsx';
import Finance from './views/Finance.tsx';
import { Role } from './types.ts';
import { BookOpen, LogOut, User as UserIcon, Bell, X, Settings, XCircle, Check, AlertCircle } from 'lucide-react';
import { cn, Card, Button, Input, Label } from './components/ui.tsx';

const MainLayout: React.FC = () => {
  const { user, logout, requests, setSelectedRequest, updateUserProfile } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastReadTime, setLastReadTime] = useState(new Date());
  const notifRef = useRef<HTMLDivElement>(null);

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openProfileModal = () => {
    if (user) {
      setProfileName(user.name);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
      setShowProfileModal(true);
    }
  };

  // Validation Logic
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasSpecial;

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword) {
        if (!currentPassword) {
            setPasswordError("Please enter your current password.");
            return;
        }
        if (!isPasswordValid) {
            setPasswordError("New password does not meet requirements.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match.");
            return;
        }
    }

    updateUserProfile(profileName, newPassword || undefined);
    setShowProfileModal(false);
  };

  if (!user) {
    return <Login />;
  }

  // Derive notifications from recent updates
  const notifications = [...requests]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const hasUnread = notifications.some(n => new Date(n.updatedAt) > lastReadTime);

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      setLastReadTime(new Date());
    }
  };

  const openNotificationRequest = (req: typeof notifications[0]) => {
    setSelectedRequest(req);
    setShowNotifications(false);
  };

  const renderContent = () => {
    switch (user.role) {
      case Role.REQUESTOR:
        return <Requestor />;
      case Role.APPROVER:
        return <Approver />;
      case Role.FINANCE:
        return <Finance />;
      default:
        return <div>Invalid Role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
               <div className="bg-blue-600 p-1.5 rounded-lg">
                  <BookOpen className="h-6 w-6 text-white" />
               </div>
               <div>
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight">DarshanFlow</h1>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                    {user.role === Role.REQUESTOR ? 'School Portal' : user.role === Role.APPROVER ? 'Admin Console' : 'Finance Desk'}
                  </p>
               </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={handleNotificationClick}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {hasUnread && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900 text-sm">Recent Activity</h3>
                      <button onClick={() => setShowNotifications(false)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map(notif => (
                          <div 
                            key={notif.id} 
                            onClick={() => openNotificationRequest(notif)}
                            className="p-3 border-b border-gray-50 hover:bg-blue-50/50 text-sm cursor-pointer transition-colors"
                          >
                            <p className="font-medium text-gray-900">{notif.schoolName}</p>
                            <p className="text-gray-500 text-xs mt-0.5">
                              Request {notif.id} is <span className={cn(
                                "font-medium",
                                notif.status === 'APPROVED' ? "text-green-600" :
                                notif.status === 'REJECTED' ? "text-red-600" :
                                notif.status === 'DISBURSED' ? "text-blue-600" : "text-yellow-600"
                              )}>{notif.status}</span>
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">{new Date(notif.updatedAt).toLocaleString()}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-400 text-sm">No recent notifications</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={openProfileModal}
                className="hidden sm:flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <UserIcon className="w-4 h-4" />
                <span className="font-medium truncate max-w-[150px]">{user.name}</span>
              </button>
              
              <button 
                onClick={logout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <Card className="w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
               <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                 <Settings className="w-5 h-5 text-gray-500" /> User Profile
               </h3>
               <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-gray-600">
                 <XCircle className="w-6 h-6" />
               </button>
             </div>

             <form onSubmit={handleProfileUpdate} className="space-y-4">
               <div>
                  <Label>Role</Label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-sm font-medium">
                     {user.role}
                  </div>
               </div>
               
               <div>
                  <Label>Display Name</Label>
                  <Input 
                     value={profileName}
                     onChange={(e) => setProfileName(e.target.value)}
                     required
                  />
               </div>

               <div className="space-y-3 pt-2 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-900">Change Password</h4>
                  
                  <div>
                      <Label>Current Password</Label>
                      <Input 
                         type="password"
                         value={currentPassword}
                         onChange={(e) => setCurrentPassword(e.target.value)}
                         placeholder="Enter current password"
                      />
                  </div>

                  <div>
                      <Label>New Password</Label>
                      <Input 
                         type="password"
                         value={newPassword}
                         onChange={(e) => setNewPassword(e.target.value)}
                         placeholder="Enter new password"
                      />
                  </div>
                  
                  {newPassword && (
                      <div className="text-xs space-y-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <p className="font-medium text-gray-700 mb-1">Password Requirements:</p>
                          <div className={cn("flex items-center gap-1.5", hasMinLength ? "text-green-600" : "text-gray-400")}>
                              {hasMinLength ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-gray-300" />}
                              <span>Minimum 8 characters</span>
                          </div>
                          <div className={cn("flex items-center gap-1.5", hasUpper ? "text-green-600" : "text-gray-400")}>
                              {hasUpper ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-gray-300" />}
                              <span>At least one uppercase letter</span>
                          </div>
                          <div className={cn("flex items-center gap-1.5", hasLower ? "text-green-600" : "text-gray-400")}>
                              {hasLower ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-gray-300" />}
                              <span>At least one lowercase letter</span>
                          </div>
                          <div className={cn("flex items-center gap-1.5", hasSpecial ? "text-green-600" : "text-gray-400")}>
                              {hasSpecial ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-gray-300" />}
                              <span>At least one special character</span>
                          </div>
                      </div>
                  )}

                  <div>
                      <Label>Confirm New Password</Label>
                      <Input 
                         type="password"
                         value={confirmPassword}
                         onChange={(e) => setConfirmPassword(e.target.value)}
                         placeholder="Re-enter new password"
                      />
                  </div>
                  
                  {passwordError && (
                      <p className="text-xs text-red-600 flex items-center gap-1 bg-red-50 p-2 rounded">
                          <AlertCircle className="w-3 h-3" /> {passwordError}
                      </p>
                  )}
               </div>

               <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowProfileModal(false)}>Cancel</Button>
                  <Button type="submit">Update Profile</Button>
               </div>
             </form>
           </Card>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export default App;