
import React, { useState, useEffect } from 'react';
import { TimelineDataPoint } from '../../types';
import { toLocalDateString } from '../../lib/utils';
import { Input, Button } from './ui';
import { useToast } from './Toast';

export interface ManualGroupEditorProps {
    onSave: (data: { groupName: string; openingTime: string; closingTime: string; date: string; timeline: TimelineDataPoint[] }) => void;
    onCancel?: () => void;
    initialGroupName?: string;
    isGroupNameDisabled?: boolean;
    initialOpeningTime?: string;
    initialClosingTime?: string;
    initialDate?: string;
    initialTimeline?: TimelineDataPoint[];
    isDemoMode?: boolean;
}

export const ManualGroupEditor: React.FC<ManualGroupEditorProps> = ({ 
    onSave, 
    initialGroupName = '', 
    isGroupNameDisabled = false,
    initialOpeningTime = '07:00',
    initialClosingTime = '16:00',
    initialDate,
    initialTimeline,
    onCancel,
    isDemoMode = false,
}) => {
    const [groupName, setGroupName] = useState(initialGroupName);
    const [openingTime, setOpeningTime] = useState(initialOpeningTime);
    const [closingTime, setClosingTime] = useState(initialClosingTime);
    const [date, setDate] = useState(initialDate || toLocalDateString(new Date()));
    const [timeline, setTimeline] = useState<{ time: string, count: string }[]>(initialTimeline ? initialTimeline.map(d => ({ time: d.time, count: String(d.count) })) : []);
    const { showToast } = useToast();

    useEffect(() => {
        setGroupName(initialGroupName);
    }, [initialGroupName]);

    useEffect(() => {
        setOpeningTime(initialOpeningTime);
        setClosingTime(initialClosingTime);
    }, [initialOpeningTime, initialClosingTime]);

    const generateTimeline = () => {
        const slots: { time: string, count: string }[] = [];
        if (!openingTime || !closingTime) return;
        
        const startTime = new Date(`${date}T${openingTime}`);
        const endTime = new Date(`${date}T${closingTime}`);
        
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return;

        let currentTime = new Date(startTime);
        while (currentTime <= endTime) {
            slots.push({
                time: currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
                count: ''
            });
            currentTime.setMinutes(currentTime.getMinutes() + 15);
        }
        setTimeline(slots);
    };
    

    const addExtraTimeSlot = () => {
        if (timeline.length === 0) return;
        setTimeline(prevTimeline => {
            const lastEntry = prevTimeline[prevTimeline.length - 1];
            const [hours, minutes] = lastEntry.time.split(':').map(Number);
            
            const newTime = new Date();
            newTime.setHours(hours, minutes, 0, 0);
            newTime.setMinutes(newTime.getMinutes() + 15);
            
            const newSlot = {
                time: newTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
                count: ''
            };
            
            return [...prevTimeline, newSlot];
        });
    };

    const handleDataChange = (index: number, value: string) => {
        const newTimeline = [...timeline];
        newTimeline[index].count = value;
        setTimeline(newTimeline);
    };
    
    const handleSave = () => {
        if (isDemoMode) {
            showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info");
            return;
        }
        if (!groupName) {
            alert("Bitte einen Gruppennamen angeben.");
            return;
        }

        let lastValidCount = 0;
        const finalTimeline: TimelineDataPoint[] = timeline.map(point => {
            const numCount = parseInt(point.count, 10);
            if (!isNaN(numCount) && point.count.trim() !== '') {
                lastValidCount = numCount >= 0 ? numCount : lastValidCount;
            }
            return { time: point.time, count: lastValidCount };
        });

        onSave({ groupName, openingTime, closingTime, date, timeline: finalTimeline });
        if (!isGroupNameDisabled && !initialTimeline) {
            setGroupName('');
        }
        if (!initialTimeline) {
            setTimeline([]);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">{initialTimeline ? 'Erfassung bearbeiten' : 'Manuelle Gruppenerfassung'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <Input label="Gruppenname" value={groupName} onChange={e => setGroupName(e.target.value)} disabled={isGroupNameDisabled}/>
                <Input label="Datum" type="date" value={date} onChange={e => setDate(e.target.value)} disabled={!!initialDate} />
                <Input label="Öffnungszeit" type="time" value={openingTime} onChange={e => setOpeningTime(e.target.value)} disabled={timeline.length > 0} />
                <Input label="Schließzeit" type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} disabled={timeline.length > 0} />
                <div className="self-end">
                    <Button onClick={generateTimeline} disabled={!openingTime || !closingTime || !date || timeline.length > 0}>Zeitstrahl erstellen</Button>
                </div>
            </div>
            {timeline.length > 0 && (
                <div className="space-y-4">
                   <p className="text-sm text-slate-600">Tragen Sie die Anwesenheitszahlen ein. Leere Felder übernehmen automatisch den vorherigen Wert.</p>
                   <div className="max-h-96 overflow-y-auto space-y-2 p-2 border rounded-md">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {timeline.map((point, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <label className="w-16 font-mono text-sm">{point.time}</label>
                                    <input
                                        type="number"
                                        value={point.count}
                                        onChange={e => handleDataChange(index, e.target.value)}
                                        className="w-20 p-1 border rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4]"
                                        min="0"
                                        placeholder="Auto"
                                    />
                                </div>
                            ))}
                        </div>
                   </div>
                   <div className="flex justify-between items-center mt-4 pt-4 border-t">
                        <Button onClick={addExtraTimeSlot} variant="secondary">
                            +15 Min. (Überziehung)
                        </Button>
                        <div className="flex gap-2">
                            {onCancel && (
                                <Button onClick={onCancel} variant="secondary">Abbrechen</Button>
                            )}
                            <Button onClick={handleSave} disabled={!groupName || isDemoMode}>{initialTimeline ? 'Änderungen speichern' : 'Manuelle Erfassung speichern'}</Button>
                        </div>
                   </div>
                </div>
            )}
        </div>
    );
};
