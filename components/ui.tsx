
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("bg-white rounded-xl border border-gray-100 shadow-sm", className)}>
    {children}
  </div>
);

// Added size prop to support small, medium, and large button variants used throughout the app
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}> = ({ 
  children, variant = 'primary', size = 'md', className, ...props 
}) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    secondary: "bg-gray-800 text-white hover:bg-gray-900 shadow-sm",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };
  
  return (
    <button className={cn("rounded-lg font-medium transition-colors flex items-center justify-center gap-2", variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <input className={cn("w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all", className)} {...props} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, ...props }) => (
  <select className={cn("w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all", className)} {...props} />
);

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className, children, ...props }) => (
  <label className={cn("block text-sm font-medium text-gray-700 mb-1", className)} {...props}>
    {children}
  </label>
);

export const Badge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    APPROVED: 'bg-green-50 text-green-700 border-green-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
    DISBURSED: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", styles[status] || 'bg-gray-100 text-gray-800')}>
      {status}
    </span>
  );
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};
