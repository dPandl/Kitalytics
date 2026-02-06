
import React, { ReactNode, useEffect } from 'react';

// --- Card Component ---
interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
    {children}
  </div>
);

// --- Button Component ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className = '', variant = 'primary', ...props }, ref) => {
    const baseClasses = 'px-4 py-2 rounded-md font-semibold transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]';
    const variantClasses = {
      primary: 'bg-[#00BCD4] text-white hover:bg-[#00ACC1]',
      secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    };
    return (
      <button ref={ref} className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
        {children}
      </button>
    );
  }
);

// --- Input Component ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, className = '', ...props }, ref) => (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        ref={ref}
        id={id}
        className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4] ${className}`}
        {...props}
      />
    </div>
  )
);

// --- Tabs Component ---
interface TabsProps {
  children: ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({ children }) => (
  <div className="flex space-x-1 border-b-2 border-slate-200" role="tablist">
    {children}
  </div>
);

interface TabProps {
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
}

export const Tab: React.FC<TabProps> = ({ children, isActive, onClick }) => (
  <button
    onClick={onClick}
    role="tab"
    aria-selected={isActive}
    className={`relative px-4 py-2 text-sm font-medium rounded-t-lg focus:outline-none -mb-0.5 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00BCD4]
      ${isActive
        ? 'border-b-2 border-[#00BCD4] text-[#0097A7] bg-slate-50'
        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
      }`
    }
  >
    {children}
  </button>
);

// --- Modal Component ---
interface ModalProps {
  children: ReactNode;
  isOpen: boolean;
  size?: 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({ children, isOpen, size = 'lg' }) => {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50 animate-in fade-in duration-200" aria-modal="true" role="dialog">
      <div className={`bg-white rounded-lg shadow-xl p-6 m-4 ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200`}>
        {children}
      </div>
    </div>
  );
};
