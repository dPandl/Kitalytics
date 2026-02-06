
import React, { useState, createContext, useContext, useCallback, ReactNode, useEffect } from 'react';
import ReactDOM from 'react-dom';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const newToast = { id: toastId++, message, type };
    setToasts(currentToasts => [newToast, ...currentToasts]);
  }, []);

  const removeToast = (id: number) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {typeof document !== 'undefined' && ReactDOM.createPortal(
        <ToastContainer toasts={toasts} onRemove={removeToast} />,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// --- Helper components ---

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: number) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-5 right-5 z-[100] space-y-3 w-full max-w-sm">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  );
};

interface ToastProps extends ToastMessage {
  onRemove: () => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onRemove, 300); // Corresponds to animation duration
    }, 4700);

    return () => clearTimeout(timer);
  }, [onRemove]);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(onRemove, 300);
  };
  
  const SuccessIcon = () => (
    <svg className="w-6 h-6 text-white-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
  );

  const ErrorIcon = () => (
    <svg className="w-6 h-6 text-white-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
  );

  const InfoIcon = () => (
    <svg className="w-6 h-6 text-white-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
  );

  const icons = { success: <SuccessIcon />, error: <ErrorIcon />, info: <InfoIcon /> };
  const typeClasses = {
    success: 'border-green-500 bg-green-600 bg-opacity-35',
    error: 'border-red-500 bg-red-600 bg-opacity-35',
    info: 'border-sky-500 bg-sky-600 bg-opacity-35',
  };

  return (
    <div
      role="alert"
      className={`
        flex items-start p-4 rounded-xl border text-slate-50 shadow-2xl 
        backdrop-blur-lg
        transition-all duration-300 ease-in-out transform
        ${typeClasses[type]}
        ${isExiting ? 'opacity-0 translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100'}
      `}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="ml-3 flex-1 text-sm font-medium">{message}</div>
      <button onClick={handleRemove} className="ml-4 -mr-1 -mt-1 flex-shrink-0 p-1 rounded-full text-white/70 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
        <span className="sr-only">Close</span>
        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
