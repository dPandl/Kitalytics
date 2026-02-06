
import React from 'react';
import { Button } from './ui';

interface CookieBannerProps {
  onAccept: () => void;
  onReject: () => void;
  onShowPrivacy: () => void;
  onShowImpressum: () => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({ onAccept, onReject, onShowPrivacy, onShowImpressum }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800 text-white p-4 shadow-lg z-50" role="dialog" aria-live="polite" aria-label="Cookie Consent Banner">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-300 flex-grow">
          Diese Anwendung nutzt die Browser-Speicherfunktionen, um Ihre Daten automatisch zu sichern. Durch die Zustimmung erlauben Sie uns, Ihre Arbeitsdateien direkt auf Ihrem Gerät zu verwalten. 
          Weitere Informationen finden Sie in unserer{' '}
          <button onClick={onShowPrivacy} className="underline hover:text-[#26C6DA]">Datenschutzerklärung</button>
          {' '}und im{' '}
          <button onClick={onShowImpressum} className="underline hover:text-[#26C6DA]">Impressum</button>.
        </p>
        <div className="flex-shrink-0 flex gap-3">
          <Button onClick={onAccept} variant="primary">Akzeptieren</Button>
          <Button onClick={onReject} variant="secondary">Ablehnen</Button>
        </div>
      </div>
    </div>
  );
};
