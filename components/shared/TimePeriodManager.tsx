
import React, { useState } from 'react';
import { Period } from '../../types';
import { Button, Input, Modal } from './ui';
import { useToast } from './Toast';

interface TimePeriodManagerProps {
    periods: Period[];
    activePeriodId: string | null;
    onSelectPeriod: (id: string) => void;
    onCreatePeriod: (name: string) => Promise<void>;
    onRenamePeriod: (id: string, newName: string) => Promise<void>;
    onDeletePeriod: (id: string) => Promise<void>;
    onExportPeriod?: (id: string) => Promise<void>;
    roleName: 'Gruppe' | 'Einrichtung' | 'Workspace';
    consentStatus: 'pending' | 'accepted' | 'rejected';
    showExport?: boolean;
    isDemoMode?: boolean;
}

export const TimePeriodManager: React.FC<TimePeriodManagerProps> = ({
    periods, activePeriodId, onSelectPeriod, onCreatePeriod, onRenamePeriod, onDeletePeriod, onExportPeriod, roleName, consentStatus, showExport = true, isDemoMode = false,
}) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [periodName, setPeriodName] = useState('');
    const { showToast } = useToast();

    const handleCreate = async () => {
        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); setIsCreateModalOpen(false); return; }
        if (!periodName.trim()) {
            alert('Bitte geben Sie einen Namen an.');
            return;
        }
        await onCreatePeriod(periodName);
        setIsCreateModalOpen(false);
        setPeriodName('');
    };

    const handleRename = async () => {
        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); setIsRenameModalOpen(false); return; }
        if (!periodName.trim() || !activePeriodId) return;
        await onRenamePeriod(activePeriodId, periodName);
        setIsRenameModalOpen(false);
        setPeriodName('');
    };

    const handleDelete = async () => {
        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); setIsDeleteModalOpen(false); return; }
        if (!activePeriodId) return;
        await onDeletePeriod(activePeriodId);
        setIsDeleteModalOpen(false);
    };
    
    const handleExport = async () => {
        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
        if (!activePeriodId || !onExportPeriod) return;
        await onExportPeriod(activePeriodId);
    }

    const openRenameModal = () => {
        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
        const activePeriod = periods.find(p => p.id === activePeriodId);
        if (activePeriod) {
            setPeriodName(activePeriod.name);
            setIsRenameModalOpen(true);
        }
    };

    if (consentStatus !== 'accepted' && !isDemoMode) {
        return (
            <div className="text-center p-4 bg-slate-100 rounded-lg">
                <h3 className="font-semibold text-slate-800">Speicherzugriff erforderlich</h3>
                <p className="text-sm text-slate-600">Bitte akzeptieren Sie die Speicherrichtlinien, um Zeiträume zu verwalten.</p>
            </div>
        );
    }
    
    if (periods.length === 0) {
        return (
            <div className="text-center p-6 bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-700">Keine Zeiträume vorhanden</h3>
                <p className="mt-2 mb-4 text-slate-500">
                    Sie haben noch keine Zeiträume angelegt. Erstellen Sie Ihren ersten, um zu beginnen.
                </p>
                <Button onClick={() => {
                    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
                    setIsCreateModalOpen(true);
                }}
                disabled={isDemoMode}
                >
                    Ersten Zeitraum erstellen
                </Button>

                 <Modal isOpen={isCreateModalOpen}>
                    <h3 className="text-lg font-bold mb-4">Neuen Zeitraum erstellen</h3>
                    <Input label={`Name des Zeitraums (z.B. Schuljahr 2023/24)`} value={periodName} onChange={e => setPeriodName(e.target.value)} />
                    <div className="flex justify-end gap-4 mt-6">
                        <Button variant="secondary" onClick={() => { setIsCreateModalOpen(false); setPeriodName(''); }}>Abbrechen</Button>
                        <Button onClick={handleCreate}>Erstellen</Button>
                    </div>
                </Modal>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold">Zeitraum-Verwaltung</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                    <label htmlFor="period-select" className="block text-sm font-medium text-slate-700 mb-1">Aktiver Zeitraum</label>
                    <select
                        id="period-select"
                        value={activePeriodId || ''}
                        onChange={e => onSelectPeriod(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]"
                    >
                        {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="flex flex-wrap gap-2 self-end">
                    <Button onClick={() => {
                        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
                        setIsCreateModalOpen(true)
                    }} disabled={isDemoMode}>Neu</Button>
                    <Button onClick={openRenameModal} variant="secondary" disabled={!activePeriodId || isDemoMode}>Umbenennen</Button>
                    {showExport && <Button onClick={handleExport} variant="secondary" disabled={!activePeriodId || isDemoMode}>Exportieren</Button>}
                    <Button onClick={() => {
                        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
                        setIsDeleteModalOpen(true)
                    }} variant="danger" disabled={!activePeriodId || isDemoMode}>Löschen</Button>
                </div>
            </div>

            {/* Create Modal */}
            <Modal isOpen={isCreateModalOpen}>
                <h3 className="text-lg font-bold mb-4">Neuen Zeitraum erstellen</h3>
                <Input label={`Name des Zeitraums (z.B. Sommerferien 2024)`} value={periodName} onChange={e => setPeriodName(e.target.value)} />
                <div className="flex justify-end gap-4 mt-6">
                    <Button variant="secondary" onClick={() => { setIsCreateModalOpen(false); setPeriodName(''); }}>Abbrechen</Button>
                    <Button onClick={handleCreate}>Erstellen</Button>
                </div>
            </Modal>

            {/* Rename Modal */}
            <Modal isOpen={isRenameModalOpen}>
                <h3 className="text-lg font-bold mb-4">Zeitraum umbenennen</h3>
                <Input label="Neuer Name" value={periodName} onChange={e => setPeriodName(e.target.value)} />
                <div className="flex justify-end gap-4 mt-6">
                    <Button variant="secondary" onClick={() => setIsRenameModalOpen(false)}>Abbrechen</Button>
                    <Button onClick={handleRename}>Speichern</Button>
                </div>
            </Modal>

            {/* Delete Modal */}
            <Modal isOpen={isDeleteModalOpen}>
                <h3 className="text-lg font-bold mb-2">Löschen bestätigen</h3>
                <p>Sind Sie sicher, dass Sie diesen Zeitraum und alle darin enthaltenen Erfassungen unwiderruflich löschen möchten?</p>
                <div className="flex justify-end gap-4 mt-6">
                    <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Abbrechen</Button>
                    <Button variant="danger" onClick={handleDelete}>Löschen</Button>
                </div>
            </Modal>
        </div>
    );
};
