import React from 'react';
import { Button } from './ui';

interface DateNavigatorProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  disablePrev?: boolean;
  disableNext?: boolean;
  className?: string;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({ 
  label, 
  onPrev, 
  onNext, 
  disablePrev = false, 
  disableNext = false,
  className = 'bg-white' 
}) => {
  return (
    <div className={`flex justify-center items-center gap-4 p-2 rounded-lg border ${className}`}>
      <Button onClick={onPrev} disabled={disablePrev} aria-label="Vorheriger Zeitraum">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>

      </Button>
      
      <span className="font-semibold text-slate-700 text-center text-base sm:text-lg tabular-nums w-64 sm:w-80 truncate">
        {label}
      </span>
      
      <Button onClick={onNext} disabled={disableNext} aria-label="Nächster Zeitraum">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>

      </Button>
    </div>
  );
};