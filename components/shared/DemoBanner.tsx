import React from 'react';
import { Button } from './ui';

export const DemoBanner: React.FC = () => {
  const handleExitDemo = () => {
    window.location.reload();
  };

  return (
    <div className="bg-purple-600 text-white shadow-lg" role="alert">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2 flex justify-between items-center">
        <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <p className="font-semibold text-sm">
            Sie befinden sich im Demo-Modus. Ihre Änderungen werden nicht gespeichert.
            </p>
        </div>
        <Button onClick={handleExitDemo} variant="secondary" className="bg-purple-500 hover:bg-purple-400 text-white px-3 py-1 text-sm">
            Demo beenden
        </Button>
      </div>
    </div>
  );
};
