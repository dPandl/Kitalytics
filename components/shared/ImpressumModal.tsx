import React from 'react';
import { Modal, Button } from './ui';

interface ImpressumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImpressumModal: React.FC<ImpressumModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen}>
      <h2 className="text-2xl font-bold mb-4">Impressum</h2>
      <div className="space-y-4 text-slate-700 max-h-[60vh] overflow-y-auto pr-2">
        <p><strong>Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)</strong></p>
        <p>
          Pascal Pander<br />
          Bahnhofstraße 39<br />
          78532 Tuttlingen
        </p>

        <p><strong>Kontakt</strong></p>
        <p>
          E-Mail: pascalpander@by-dp.de
        </p>
      </div>
      <div className="mt-6 text-right">
        <Button onClick={onClose} variant="secondary">Schließen</Button>
      </div>
    </Modal>
  );
};