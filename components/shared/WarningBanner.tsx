
import React from 'react';

export const WarningBanner: React.FC = () => {
  return (
    <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 rounded-md shadow-md flex justify-between items-center" role="alert">
      <div>
        <p className="font-bold">Zustimmung erforderlich</p>
        <p className="text-sm">Um die Anwendung nutzen zu können, ist Ihre Zustimmung zur Datenspeicherung auf Ihrem Gerät erforderlich. Bitte akzeptieren Sie die Nutzungsbedingungen im Banner am unteren Bildschirmrand.</p>
      </div>
    </div>
  );
};
