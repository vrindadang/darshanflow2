
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("bg-white rounded-2xl border border-slate-200/60 shadow-sm", className)}>
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}> = ({ 
  children, variant = 'primary', size = 'md', className, ...props 
}) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    secondary: "bg-slate-800 text-white hover:bg-slate-900 shadow-sm",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    outline: "border border-slate-200 text-slate-700 hover:bg-slate-50 bg-white",
    ghost: "text-slate-600 hover:bg-slate-100 bg-transparent"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };
  
  return (
    <button className={cn("rounded-xl font-medium transition-all flex items-center justify-center gap-2 active:scale-[0.98]", variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <div className="relative w-full">
    <input className={cn("w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm placeholder:text-slate-400", className)} {...props} />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, ...props }) => (
  <select className={cn("w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all text-xs font-medium text-slate-600 appearance-none cursor-pointer", className)} {...props} />
);

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className, children, ...props }) => (
  <label className={cn("block text-sm font-semibold text-slate-700 mb-1.5", className)} {...props}>
    {children}
  </label>
);

export const Badge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200/50',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200/50',
    DISBURSED: 'bg-blue-50 text-blue-700 border-blue-200/50',
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border", styles[status] || 'bg-slate-100 text-slate-800')}>
      {status}
    </span>
  );
};

export const StatCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  borderColor: string;
  iconColor: string;
}> = ({ title, value, icon: Icon, borderColor, iconColor }) => (
  <Card className={cn("p-6 flex justify-between items-center border-l-4", borderColor)}>
    <div>
      <p className="text-sm font-semibold text-slate-500 mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
    </div>
    <div className={cn("p-3 rounded-full bg-slate-50", iconColor)}>
      <Icon className="w-8 h-8" />
    </div>
  </Card>
);

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};
