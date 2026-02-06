
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { KindergartenData, TimelineDataPoint, GroupData, DatedTimeline, Period, AgeGroup, CareType } from '../../types';
import { readJsonFile, getWeekDetails, formatDateRange, toLocalDateString } from '../../lib/utils';
import { Card, Button, Tabs, Tab, Modal, Input } from '../shared/ui';
import { TimelineChart } from '../shared/TimelineChart';
import { DateNavigator } from '../shared/DateNavigator';
import fileSystemAccess, { adminImportFileOptions, workspaceFileOptions } from '../../lib/fileSystem';
import { WarningBanner } from '../shared/WarningBanner';
import { get as idbGet, set as idbSet } from '../../lib/indexedDB';
import { useToast } from '../shared/Toast';
import { TimePeriodManager } from '../shared/TimePeriodManager';


interface StatisticsViewProps {
    kindergartens: KindergartenData[];
    activePeriodId: string | null;
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ kindergartens, activePeriodId }) => {
    const [selectedKindergarten, setSelectedKindergarten] = useState<string>('all');
    const [selectedGroup, setSelectedGroup] = useState<string>('all');
    const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | 'all'>('all');
    const [selectedCareType, setSelectedCareType] = useState<CareType | 'all'>('all');
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'all' | 'weekday'>('all');
    const [viewDate, setViewDate] = useState<string>(toLocalDateString(new Date()));
    const [selectedWeekday, setSelectedWeekday] = useState<number>(1);
    const [thresholdType, setThresholdType] = useState<'percent' | 'absolute'>('percent');
    const [thresholdValue, setThresholdValue] = useState<number>(25);
    const { showToast } = useToast();

    const kindergartenOptions = useMemo(() => kindergartens.map(k => k.kindergartenName), [kindergartens]);

    const availableGroups = useMemo(() => {
        let kitas = kindergartens;
        if (selectedKindergarten !== 'all') {
            kitas = kitas.filter(k => k.kindergartenName === selectedKindergarten);
        }
        
        let groups = kitas.flatMap(k => k.groups);
        
        if (selectedAgeGroup !== 'all') {
            groups = groups.filter(g => (g.ageGroup || 'ue3') === selectedAgeGroup);
        }
        if (selectedCareType !== 'all') {
            groups = groups.filter(g => g.careTypes?.includes(selectedCareType));
        }
        
        return groups;
    }, [selectedKindergarten, selectedAgeGroup, selectedCareType, kindergartens]);

    const groupOptions = useMemo(() => {
        // Unique group names from available groups
        return Array.from(new Set(availableGroups.map(g => g.groupName))).sort();
    }, [availableGroups]);

    // Reset group selection if invalid
    useEffect(() => {
        if (selectedGroup !== 'all' && !groupOptions.includes(selectedGroup)) {
            setSelectedGroup('all');
        }
    }, [groupOptions, selectedGroup]);


    const changeDate = (direction: 'prev' | 'next') => {
        const currentDate = new Date(viewDate + 'T00:00:00');
        const amount = direction === 'prev' ? -1 : 1;
        if (viewMode === 'day') currentDate.setDate(currentDate.getDate() + amount);
        else if (viewMode === 'week') currentDate.setDate(currentDate.getDate() + (amount * 7));
        setViewDate(toLocalDateString(currentDate));
    };

    const hasAnySessions = useMemo(() => {
        let relevantGroups = availableGroups;
        if (selectedGroup !== 'all') {
            relevantGroups = relevantGroups.filter(g => g.groupName === selectedGroup);
        }

        return relevantGroups.some(group => {
            const relevantPeriod = activePeriodId ? group.periods.find(p => p.name === activePeriodId) : undefined;
            return (relevantPeriod?.datedTimelines.length ?? 0) > 0;
        });
    }, [availableGroups, activePeriodId, selectedGroup]);

    const handleJumpToFirst = () => {
        let relevantGroups = availableGroups;
        if (selectedGroup !== 'all') {
            relevantGroups = relevantGroups.filter(g => g.groupName === selectedGroup);
        }

        let firstDate: string | null = null;
        relevantGroups.forEach(group => {
            const relevantPeriod = activePeriodId ? group.periods.find(p => p.name === activePeriodId) : undefined;
            if (relevantPeriod && relevantPeriod.datedTimelines.length > 0) {
                const earliestInGroup = relevantPeriod.datedTimelines.map(dt => dt.date).reduce((min, p) => p < min ? p : min);
                if (!firstDate || earliestInGroup < firstDate) {
                    firstDate = earliestInGroup;
                }
            }
        });

        if (firstDate) {
            setViewDate(firstDate);
            showToast(`Zum Datum der ersten Erfassung gesprungen: ${new Date(firstDate + 'T00:00:00').toLocaleDateString('de-DE')}`, 'info');
        } else {
            showToast('Keine Erfassungen im ausgewählten Bereich gefunden.', 'info');
        }
    };
    
    const aggregatedData = useMemo(() => {
        let relevantGroups = availableGroups;
        if (selectedGroup !== 'all') {
            relevantGroups = relevantGroups.filter(g => g.groupName === selectedGroup);
        }
        
        const allTimelines = relevantGroups.flatMap(group => {
            const relevantPeriods = activePeriodId ? group.periods.filter(p => p.name === activePeriodId) : group.periods;
            let timelinesToProcess = relevantPeriods.flatMap(p => p.datedTimelines) || [];
            switch (viewMode) {
                case 'day': timelinesToProcess = timelinesToProcess.filter(dt => dt.date === viewDate); break;
                case 'week':
                    const { startDate, endDate } = getWeekDetails(new Date(viewDate + 'T12:00:00Z'));
                    timelinesToProcess = timelinesToProcess.filter(dt => dt.date >= startDate && dt.date <= endDate);
                    break;
                case 'weekday':
                    timelinesToProcess = timelinesToProcess.filter(dt => {
                        const d = new Date(dt.date + 'T00:00:00');
                        return d.getDay() === selectedWeekday;
                    });
                    break;
            }
            return timelinesToProcess.map(dt => dt.timeline);
        });
        
        if (allTimelines.length === 0) return { data: [], lowOccupancy: '' };
        const timeMap: { [time: string]: { total: number, count: number } } = {};
        allTimelines.forEach(timeline => timeline.forEach(point => {
            if (!timeMap[point.time]) timeMap[point.time] = { total: 0, count: 0 };
            timeMap[point.time].total += point.count;
            timeMap[point.time].count += 1;
        }));
        
        const preAveragedData = Object.keys(timeMap).sort().map(time => ({ time, count: parseFloat((timeMap[time].total / timeMap[time].count).toFixed(2)) }));
        const maxCount = Math.max(...preAveragedData.map(d => d.count));
        const lowThreshold = thresholdType === 'percent' ? maxCount * (thresholdValue / 100) : thresholdValue;
        const averagedData = preAveragedData.map(d => ({ ...d, isLow: d.count > 0 && d.count <= lowThreshold }));
        const lowTimes = averagedData.filter(d => d.isLow).map(d => d.time);
        return { data: averagedData, lowOccupancy: lowTimes.join(', ') };
    }, [availableGroups, selectedGroup, viewMode, viewDate, selectedWeekday, thresholdType, thresholdValue, activePeriodId]);
    
    const chartTitle = useMemo(() => {
        switch (viewMode) {
            case 'day': return `Durchschnittliche Auslastung am ${new Date(viewDate + 'T00:00:00').toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}`;
            case 'week':
                const weekDetails = getWeekDetails(new Date(viewDate + 'T12:00:00Z'));
                return `Durchschnittliche Auslastung für ${formatDateRange(weekDetails.startDate, weekDetails.endDate, weekDetails.weekNumber)}`;
            case 'weekday':
                const weekdays = ['Sonntage', 'Montage', 'Dienstage', 'Mittwoche', 'Donnerstage', 'Freitage', 'Samstage'];
                return `Durchschnittliche Auslastung (${weekdays[selectedWeekday]})`;
            default: return 'Durchschnittliche Auslastung (Gesamt)';
        }
    }, [viewMode, viewDate, selectedWeekday]);

    return (
        <div>
            <h3 className="text-lg font-semibold mb-4">Statistiken</h3>
            <div className="bg-slate-100 p-4 rounded-md space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label htmlFor="age-select" className="block text-sm font-medium text-slate-700">Altersstruktur</label>
                        <select id="age-select" value={selectedAgeGroup} onChange={e => setSelectedAgeGroup(e.target.value as AgeGroup | 'all')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4] sm:text-sm rounded-md">
                            <option value="all">Alle</option>
                            <option value="u3">U3</option>
                            <option value="ue3">Ü3</option>
                            <option value="mixed">Gemischt</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label htmlFor="care-select" className="block text-sm font-medium text-slate-700">Betreuungsform</label>
                        <select id="care-select" value={selectedCareType} onChange={e => setSelectedCareType(e.target.value as CareType | 'all')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4] sm:text-sm rounded-md">
                            <option value="all">Alle</option>
                            <option value="VO">VÖ (Verlängerte Öffnungszeit)</option>
                            <option value="GT">GT (Ganztagesbetreuung)</option>
                            <option value="RG">RG (Regelgruppe)</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label htmlFor="kita-select" className="block text-sm font-medium text-slate-700">Kindergarten</label>
                        <select id="kita-select" value={selectedKindergarten} onChange={e => { setSelectedKindergarten(e.target.value); setSelectedGroup('all'); }} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4] sm:text-sm rounded-md">
                            <option value="all">Alle Einrichtungen</option> {kindergartenOptions.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label htmlFor="group-select" className="block text-sm font-medium text-slate-700">Gruppe</label>
                        <select id="group-select" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4] sm:text-sm rounded-md disabled:bg-slate-200">
                            <option value="all">Alle Gruppen</option> {groupOptions.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ansicht</label>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex space-x-1 bg-slate-200 rounded-lg p-1" role="group">
                            <button onClick={() => setViewMode('day')} className={`px-4 py-2 text-sm rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#00BCD4] ${viewMode === 'day' ? 'bg-white shadow font-semibold text-[#0097A7]' : 'text-slate-600 hover:bg-slate-300'}`}>Tag</button>
                            <button onClick={() => setViewMode('week')} className={`px-4 py-2 text-sm rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#00BCD4] ${viewMode === 'week' ? 'bg-white shadow font-semibold text-[#0097A7]' : 'text-slate-600 hover:bg-slate-300'}`}>Woche</button>
                            <button onClick={() => setViewMode('weekday')} className={`px-4 py-2 text-sm rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#00BCD4] ${viewMode === 'weekday' ? 'bg-white shadow font-semibold text-[#0097A7]' : 'text-slate-600 hover:bg-slate-300'}`}>Wochentag</button>
                            <button onClick={() => setViewMode('all')} className={`px-4 py-2 text-sm rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#00BCD4] ${viewMode === 'all' ? 'bg-white shadow font-semibold text-[#0097A7]' : 'text-slate-600 hover:bg-slate-300'}`}>Gesamt</button>
                        </div>
                        
                        {viewMode === 'weekday' && (
                            <select 
                                value={selectedWeekday} 
                                onChange={(e) => setSelectedWeekday(Number(e.target.value))}
                                className="block pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4] rounded-md"
                            >
                                <option value={1}>Montag</option>
                                <option value={2}>Dienstag</option>
                                <option value={3}>Mittwoch</option>
                                <option value={4}>Donnerstag</option>
                                <option value={5}>Freitag</option>
                            </select>
                        )}

                        {viewMode !== 'all' && viewMode !== 'weekday' && (
                            <Button
                                onClick={handleJumpToFirst}
                                variant="secondary"
                                className="px-4 py-2 text-sm"
                                disabled={!hasAnySessions}
                                title="Zum Datum der ersten Erfassung springen"
                            >
                                Zur ersten Erfassung
                            </Button>
                        )}
                    </div>
                </div>

                {viewMode !== 'all' && viewMode !== 'weekday' && (
                    <DateNavigator
                        label={viewMode === 'day' 
                            ? new Date(viewDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                            : (() => { const weekDetails = getWeekDetails(new Date(viewDate + 'T12:00:00Z')); return formatDateRange(weekDetails.startDate, weekDetails.endDate, weekDetails.weekNumber); })()
                        }
                        onPrev={() => changeDate('prev')}
                        onNext={() => changeDate('next')}
                        className="bg-white"
                    />
                )}
                 <div className="border-t pt-4">
                    <h4 className="text-md font-semibold mb-2 text-slate-800">Niedrige Auslastung definieren</h4>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center"> <input type="radio" id="percent-admin" name="threshold-admin" value="percent" checked={thresholdType === 'percent'} onChange={() => { setThresholdType('percent'); setThresholdValue(25);}} className="h-4 w-4 text-[#00BCD4] border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" /> <label htmlFor="percent-admin" className="ml-2 block text-sm font-medium text-slate-700">Prozentual</label> </div>
                             <div className="flex items-center"> <input type="radio" id="absolute-admin" name="threshold-admin" value="absolute" checked={thresholdType === 'absolute'} onChange={() => { setThresholdType('absolute'); setThresholdValue(5); }} className="h-4 w-4 text-[#00BCD4] border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" /> <label htmlFor="absolute-admin" className="ml-2 block text-sm font-medium text-slate-700">Absoluter Wert</label> </div>
                        </div>
                        <div className="flex items-center gap-2"> <input type="number" value={thresholdValue} onChange={e => setThresholdValue(Number(e.target.value))} className="w-24 px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" /> <span className="text-sm text-slate-600">{thresholdType === 'percent' ? '% der Spitze' : 'Kinder'}</span> </div>
                    </div>
                </div>
            </div>
            <div className="mt-6"> <TimelineChart data={aggregatedData.data} title={chartTitle} color="#22c55e"/> </div>
            {aggregatedData.data.length > 0 && aggregatedData.lowOccupancy && (
                <div className="mt-6 p-4 bg-amber-100 border-l-4 border-amber-500 text-amber-700">
                    <h4 className="font-bold">Zeiten mit geringer Auslastung</h4>
                    <p>Die Auslastung ist im ausgewählten Zeitraum besonders niedrig zu folgenden Zeiten (Durchschnitt): {aggregatedData.lowOccupancy}.</p>
                </div>
            )}
        </div>
    );
};

interface AdminViewProps {
  consentStatus: 'pending' | 'accepted' | 'rejected';
  isDemoMode?: boolean;
  demoData?: WorkspaceData;
}

interface WorkspaceData {
    periodNames: string[];
    kindergartens: KindergartenData[];
}

const FILEHANDLE_IDB_KEY = 'kitalytics_admin_filehandle';


export const AdminView: React.FC<AdminViewProps> = ({ consentStatus, isDemoMode = false, demoData }) => {
    const [kindergartens, setKindergartens] = useState<KindergartenData[]>(isDemoMode ? demoData?.kindergartens || [] : []);
    const [workspacePeriodNames, setWorkspacePeriodNames] = useState<string[]>(isDemoMode ? demoData?.periodNames || [] : []);
    const [activeTab, setActiveTab] = useState<string>('stats');
    const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'all'>('day');
    const [viewDate, setViewDate] = useState<string>(toLocalDateString(new Date()));
    const [thresholdType, setThresholdType] = useState<'percent' | 'absolute'>('percent');
    const [thresholdValue, setThresholdValue] = useState<number>(25);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [kitaToRenameIndex, setKitaToRenameIndex] = useState<number | null>(null);
    const [newKitaName, setNewKitaName] = useState('');
    const [kitaToDeleteIndex, setKitaToDeleteIndex] = useState<number | null>(null);
    const { showToast } = useToast();

    const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
    const [isDirty, setIsDirty] = useState<boolean>(false);

    const loadData = useCallback(async (rawData: any, handle: FileSystemFileHandle) => {
        let kitas: KindergartenData[] = [];
        let periodNames: string[] = [];

        if (Array.isArray(rawData)) { // Legacy format: KindergartenData[]
            kitas = rawData;
            const derivedPeriodNames = new Set<string>();
            rawData.forEach(kita => {
                (kita.periodNames || []).forEach(name => derivedPeriodNames.add(name));
                kita.groups.forEach(group => {
                    group.periods.forEach(p => derivedPeriodNames.add(p.name));
                });
            });
            periodNames = Array.from(derivedPeriodNames).sort();
        } else if (rawData && Array.isArray(rawData.kindergartens)) { // New format
            kitas = rawData.kindergartens;
            periodNames = rawData.periodNames || [];
        }

        setKindergartens(kitas);
        setWorkspacePeriodNames(periodNames);
        if (!isDemoMode) {
          setFileHandle(handle);
          setIsDirty(false);
        }
    }, [isDemoMode]);
    
    const unifiedPeriods = useMemo(() => {
        const periodMap = new Map<string, Period>();
        
        workspacePeriodNames.forEach(name => {
            periodMap.set(name, { id: name, name: name, openingTime: '07:00', closingTime: '16:00', datedTimelines: [] });
        });
        
        kindergartens.forEach(kita => {
            kita.groups.forEach(group => {
                group.periods.forEach(period => {
                    if (!periodMap.has(period.name)) {
                        periodMap.set(period.name, { ...period, id: period.name });
                    }
                });
            });
        });
        return Array.from(periodMap.values()).sort((a,b) => a.name.localeCompare(b.name));
    }, [kindergartens, workspacePeriodNames]);

    useEffect(() => {
        if (unifiedPeriods.length > 0 && (!activePeriodId || !unifiedPeriods.some(p => p.id === activePeriodId))) {
            setActivePeriodId(unifiedPeriods[0].id);
        } else if (unifiedPeriods.length === 0) {
            setActivePeriodId(null);
        }
    }, [unifiedPeriods, activePeriodId]);


    useEffect(() => {
        const loadFileHandle = async () => {
            if (consentStatus !== 'accepted' || isDemoMode) return;
            const handle = await idbGet<FileSystemFileHandle>(FILEHANDLE_IDB_KEY);
            if (handle) {
                try {
                    const content = await fileSystemAccess.readFile(handle);
                    const data = JSON.parse(content);
                    await loadData(data, handle);
                } catch (e) {
                    showToast("Gespeicherte Workspace-Datei konnte nicht gelesen werden.", "error");
                }
            }
        };
        if (consentStatus !== 'pending') loadFileHandle();
    }, [consentStatus, loadData, showToast, isDemoMode]);

    useEffect(() => {
        if (!fileHandle || !isDirty || isDemoMode) return;
        const handler = setTimeout(async () => {
          const dataToSave: WorkspaceData = {
              periodNames: workspacePeriodNames,
              kindergartens: kindergartens
          };
          await fileSystemAccess.writeFile(fileHandle, JSON.stringify(dataToSave, null, 2));
          setIsDirty(false);
        }, 1500);
        return () => clearTimeout(handler);
    }, [kindergartens, workspacePeriodNames, fileHandle, isDirty, isDemoMode]);

    useEffect(() => { if (fileHandle && !isDemoMode) setIsDirty(true); }, [kindergartens, workspacePeriodNames, fileHandle, isDemoMode]);
    
    const handleCreateFile = async () => {
        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
        const initialData: WorkspaceData = { periodNames: [], kindergartens: [] };
        const options = { ...workspaceFileOptions, suggestedName: `Workspace.klworkspace` };
        const handle = await fileSystemAccess.createFile(options);
        if (handle) {
            await fileSystemAccess.writeFile(handle, JSON.stringify(initialData, null, 2));
            await idbSet(FILEHANDLE_IDB_KEY, handle);
            await loadData(initialData, handle);
            showToast(`Neuer Workspace '${handle.name}' wurde erstellt.`, 'success');
        }
    };

    const handleOpenFile = async () => {
        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
        const handle = await fileSystemAccess.openFile(workspaceFileOptions);
        if (handle) {
            try {
                const content = await fileSystemAccess.readFile(handle);
                const data = JSON.parse(content);
                await idbSet(FILEHANDLE_IDB_KEY, handle);
                await loadData(data, handle);
                showToast(`Workspace '${handle.name}' geladen.`, 'success');
            } catch(e) {
                showToast("Datei konnte nicht gelesen werden oder hat ein ungültiges Format.", "error");
            }
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
        if (!event.target.files) return;

        if (!activePeriodId) {
            showToast("Bitte wählen Sie zuerst einen Workspace-Zeitraum aus, um Daten zu importieren.", "error");
            event.target.value = ''; // Reset file input
            return;
        }

        const files: File[] = Array.from(event.target.files);
        let updatedKitas = JSON.parse(JSON.stringify(kindergartens)) as KindergartenData[];
        let hasChanged = false;

        for (const file of files) {
             if (!file.name.endsWith('.kleinrperiod')) {
                continue;
            }
            try {
                const importedKitaData = await readJsonFile<KindergartenData>(file);
                if (!importedKitaData.kindergartenName || !Array.isArray(importedKitaData.groups)) continue;

                let existingKita = updatedKitas.find(k => k.kindergartenName === importedKitaData.kindergartenName);
                let wasUpdatedInKita = false;

                if (!existingKita) {
                    existingKita = { kindergartenName: importedKitaData.kindergartenName, periodNames: [], groups: [] };
                    updatedKitas.push(existingKita);
                }

                for (const importedGroup of importedKitaData.groups) {
                    if (!importedGroup.periods || importedGroup.periods.length === 0) continue;

                    const importedPeriod = importedGroup.periods[0];
                    let existingGroup = existingKita.groups.find(g => g.groupName === importedGroup.groupName);

                    if (!existingGroup) {
                        existingGroup = {
                            groupName: importedGroup.groupName,
                            ageGroup: importedGroup.ageGroup || 'ue3',
                            careTypes: importedGroup.careTypes || [],
                            periods: unifiedPeriods.map(p => ({
                                ...p,
                                id: `${existingKita!.kindergartenName}-${importedGroup.groupName}-${p.name}-${Date.now()}`
                            }))
                        };
                        existingKita.groups.push(existingGroup);
                    } else {
                        // Update age group and careTypes if available
                        if (importedGroup.ageGroup) {
                            existingGroup.ageGroup = importedGroup.ageGroup;
                        }
                        if (importedGroup.careTypes) {
                            existingGroup.careTypes = importedGroup.careTypes;
                        }
                    }

                    const targetPeriod = existingGroup.periods.find(p => p.name === activePeriodId);
                    if (targetPeriod) {
                        const existingDates = new Set(targetPeriod.datedTimelines.map(dt => dt.date));
                        const newTimelines = importedPeriod.datedTimelines.filter(dt => !existingDates.has(dt.date));

                        if (newTimelines.length > 0) {
                            targetPeriod.datedTimelines.push(...newTimelines);
                            targetPeriod.datedTimelines.sort((a, b) => b.date.localeCompare(a.date));
                            wasUpdatedInKita = true;
                        }
                    }
                }

                if (wasUpdatedInKita) {
                    hasChanged = true;
                    showToast(`Daten für Einrichtung '${existingKita.kindergartenName}' in Zeitraum '${activePeriodId}' importiert/aktualisiert.`, 'success');
                }

            } catch (error) {
                showToast(`Datei ${file.name} konnte nicht gelesen oder verarbeitet werden.`, 'error');
            }
        }

        if (hasChanged) {
            setKindergartens(updatedKitas);
        } else {
            showToast('Keine neuen Daten importiert. Die Zeiträume könnten bereits aktuell sein oder die Daten existieren schon.', 'info');
        }
        event.target.value = '';
    };
    
     const handleCreatePeriod = async (name: string) => {
        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
        if (workspacePeriodNames.includes(name)) {
            showToast(`Ein Zeitraum mit dem Namen '${name}' existiert bereits.`, "error");
            return;
        }

        setWorkspacePeriodNames(prev => [...prev, name].sort());

        const newData = [...kindergartens];
        newData.forEach(kita => {
            (kita.periodNames = kita.periodNames || []).push(name);
            kita.groups.forEach(group => {
                if (!group.periods.some(p => p.name === name)) {
                     const newPeriod: Period = {
                        id: `${kita.kindergartenName}-${group.groupName}-${name}-${Date.now()}`,
                        name,
                        openingTime: '07:00',
                        closingTime: '16:00',
                        datedTimelines: []
                    };
                    group.periods.push(newPeriod);
                }
            });
        });

        setKindergartens(newData);
        setActivePeriodId(name);
        showToast(`Zeitraum '${name}' wurde für den gesamten Workspace erstellt.`, 'success');
    };
    
    const handleRenamePeriod = async (oldName: string, newName: string) => {
        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
        if (!newName.trim() || oldName === newName.trim()) return;

        const trimmedNewName = newName.trim();
        if (workspacePeriodNames.includes(trimmedNewName)) {
            showToast('Ein Zeitraum mit diesem Namen existiert bereits.', 'error');
            return;
        }

        setWorkspacePeriodNames(prev => prev.map(p => p === oldName ? trimmedNewName : p).sort());

        const newData = [...kindergartens];
        newData.forEach(kita => {
            if(kita.periodNames) {
                kita.periodNames = kita.periodNames.map(p => p === oldName ? trimmedNewName : p);
            }
            kita.groups.forEach(group => {
                group.periods.forEach(period => {
                    if (period.name === oldName) {
                        period.name = trimmedNewName;
                    }
                });
            });
        });

        setKindergartens(newData);
        setActivePeriodId(trimmedNewName);
        showToast(`Zeitraum '${oldName}' wurde zu '${trimmedNewName}' umbenannt.`, 'success');
    };

    const handleDeletePeriod = async (name: string) => {
        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
        setWorkspacePeriodNames(prev => prev.filter(p => p !== name));

        const newData = [...kindergartens];
        newData.forEach(kita => {
            if(kita.periodNames) {
                kita.periodNames = kita.periodNames.filter(p => p !== name);
            }
            kita.groups.forEach(group => {
                group.periods = group.periods.filter(p => p.name !== name);
            });
        });

        setKindergartens(newData);
        showToast(`Zeitraum '${name}' wurde aus dem Workspace gelöscht.`, 'success');
    };

    const openRenameModal = (index: number) => {
        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
        setKitaToRenameIndex(index);
        setNewKitaName(kindergartens[index].kindergartenName);
        setIsRenameModalOpen(true);
    };

    const handleConfirmRename = () => {
        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); setIsRenameModalOpen(false); return; }
        if (kitaToRenameIndex === null || !newKitaName.trim()) return;
        const oldName = kindergartens[kitaToRenameIndex].kindergartenName;
        const trimmedNewName = newKitaName.trim();
        if (trimmedNewName === oldName) { setIsRenameModalOpen(false); return; }
        if (kindergartens.some((k, i) => k.kindergartenName === trimmedNewName && i !== kitaToRenameIndex)) {
            showToast('Eine Einrichtung mit diesem Namen existiert bereits im Workspace.', 'error');
            return;
        }
        setKindergartens(prev => {
            const newKitas = [...prev];
            newKitas[kitaToRenameIndex].kindergartenName = trimmedNewName;
            return newKitas;
        });
        setActiveTab(trimmedNewName);
        setIsRenameModalOpen(false);
    };

    const handleDeleteKita = (index: number) => {
        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
        setKitaToDeleteIndex(index);
    };

    const confirmKitaDelete = () => {
        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); setKitaToDeleteIndex(null); return; }
        if (kitaToDeleteIndex === null) return;

        const newKitas = [...kindergartens];
        const deletedKitaName = newKitas[kitaToDeleteIndex].kindergartenName;
        newKitas.splice(kitaToDeleteIndex, 1);

        setKindergartens(newKitas);
        setActiveTab('stats');
        setKitaToDeleteIndex(null);
        showToast(`Einrichtung '${deletedKitaName}' wurde gelöscht.`, 'success');
    };

    const activeKitaIndex = useMemo(() => kindergartens.findIndex(k => k.kindergartenName === activeTab), [kindergartens, activeTab]);

    const changeDate = (direction: 'prev' | 'next') => {
        const currentDate = new Date(viewDate + 'T00:00:00');
        const amount = direction === 'prev' ? -1 : 1;
        if (viewMode === 'day') currentDate.setDate(currentDate.getDate() + amount);
        else if (viewMode === 'week') currentDate.setDate(currentDate.getDate() + (amount * 7));
        setViewDate(toLocalDateString(currentDate));
    };

    const hasAnySessions = useMemo(() => {
        const activeKita = kindergartens.find(k => k.kindergartenName === activeTab);
        if (!activeKita || !activePeriodId) return false;
        return activeKita.groups.some(g => (g.periods.find(p => p.name === activePeriodId)?.datedTimelines.length ?? 0) > 0);
    }, [kindergartens, activeTab, activePeriodId]);

    const handleJumpToFirst = () => {
        const activeKita = kindergartens.find(k => k.kindergartenName === activeTab);
        if (!activeKita || !activePeriodId) {
            showToast('Keine Einrichtung oder Zeitraum ausgewählt.', 'info');
            return;
        }

        let firstDate: string | null = null;
        
        for (const group of activeKita.groups) {
            const activePeriod = group.periods.find(p => p.name === activePeriodId);
            if (activePeriod && activePeriod.datedTimelines.length > 0) {
                const currentEarliest = activePeriod.datedTimelines.map(dt => dt.date).reduce((min, p) => p < min ? p : min);
                if (!firstDate || currentEarliest < firstDate) {
                    firstDate = currentEarliest;
                }
            }
        }

        if (firstDate) {
            setViewDate(firstDate);
            showToast(`Zum Datum der ersten Erfassung gesprungen: ${new Date(firstDate + 'T00:00:00').toLocaleDateString('de-DE')}`, 'info');
        } else {
            showToast('Keine Erfassungen in diesem Zeitraum für diese Einrichtung gefunden.', 'info');
        }
    };

    const filterTimelines = (timelines: DatedTimeline[]): DatedTimeline[] => {
         switch (viewMode) {
            case 'week':
                const { startDate, endDate } = getWeekDetails(new Date(viewDate + 'T12:00:00Z'));
                return timelines.filter(s => s.date >= startDate && s.date <= endDate).sort((a, b) => a.date.localeCompare(b.date));
            case 'all': return timelines.sort((a,b) => b.date.localeCompare(a.date));
            default: return timelines.filter(s => s.date === viewDate);
        }
    }

    if (consentStatus !== 'accepted' && !isDemoMode) {
        return <WarningBanner />;
    }

    if (!fileHandle && !isDemoMode) {
        return (
            <Card className="text-center">
                <h2 className="text-2xl font-bold mb-2 text-slate-800">Willkommen bei Kitalytics</h2>
                <p className="mb-6 text-slate-600">Um zu beginnen, erstellen Sie einen neuen Workspace oder öffnen Sie einen bestehenden.</p>
                <div className="flex justify-center gap-4">
                    <Button onClick={handleCreateFile}>Neuen Workspace erstellen</Button>
                    <Button onClick={handleOpenFile} variant="secondary">Bestehenden Workspace öffnen</Button>
                </div>
            </Card>
        );
    }
    
    return (
        <div className="space-y-6">
            <Modal isOpen={isRenameModalOpen}>
                <h3 className="text-lg font-bold mb-4">Einrichtung umbenennen</h3>
                <Input label="Neuer Name der Einrichtung" id="newKitaName" value={newKitaName} onChange={e => setNewKitaName(e.target.value)} />
                <div className="flex justify-end gap-4 mt-6">
                    <Button variant="secondary" onClick={() => setIsRenameModalOpen(false)}>Abbrechen</Button>
                    <Button variant="primary" onClick={handleConfirmRename}>Speichern</Button>
                </div>
            </Modal>

            <Modal isOpen={kitaToDeleteIndex !== null}>
                <h3 className="text-lg font-bold mb-2">Einrichtung löschen bestätigen</h3>
                <p>Sind Sie sicher, dass Sie die Einrichtung <strong>{kitaToDeleteIndex !== null ? kindergartens[kitaToDeleteIndex]?.kindergartenName : ''}</strong> und alle darin enthaltenen Daten unwiderruflich löschen möchten?</p>
                <div className="flex justify-end gap-4 mt-6">
                    <Button variant="secondary" onClick={() => setKitaToDeleteIndex(null)}>Abbrechen</Button>
                    <Button variant="danger" onClick={confirmKitaDelete}>Löschen</Button>
                </div>
            </Modal>

            <Card>
                <h2 className="text-xl font-bold mb-4">Verwaltungs-Dashboard</h2>
                {!isDemoMode && fileHandle && (
                  <div className="p-2 bg-[#E0F7FA] border border-[#B2EBF2] rounded-md text-sm mb-4">
                      <span className="font-semibold text-[#00838F]">Aktiver Workspace:</span> {fileHandle.name}
                      <span className={`ml-4 ${isDirty ? 'text-amber-600' : 'text-green-600'}`}>{isDirty ? 'Wird gespeichert...' : 'Gespeichert'}</span>
                  </div>
                )}
                <TimePeriodManager
                    periods={unifiedPeriods}
                    activePeriodId={activePeriodId}
                    onSelectPeriod={setActivePeriodId}
                    onCreatePeriod={handleCreatePeriod}
                    onRenamePeriod={handleRenamePeriod}
                    onDeletePeriod={handleDeletePeriod}
                    roleName="Workspace"
                    consentStatus={consentStatus}
                    showExport={false}
                    isDemoMode={isDemoMode}
                />
            </Card>

            <Card>
                <h3 className="text-lg font-semibold mb-2">Datenverwaltung</h3>
                 <div>
                    <label className={`block text-sm font-medium text-slate-700 mb-1 ${!activePeriodId || isDemoMode ? 'text-slate-400' : ''}`}>Einrichtungs-Zeitraumdateien importieren (.kleinrperiod)</label>
                    <input type="file" multiple onChange={handleFileUpload} accept=".kleinrperiod" disabled={!activePeriodId || isDemoMode} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#E0F7FA] file:text-[#0097A7] hover:file:bg-[#B2EBF2] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" />
                    {!activePeriodId && <p className="text-xs text-slate-500 mt-1">Bitte wählen Sie zuerst einen Workspace-Zeitraum aus.</p>}
                </div>
            </Card>

            { kindergartens.length > 0 && activePeriodId &&
            <Card>
                <Tabs>
                    <Tab isActive={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>Statistik</Tab>
                    {kindergartens.map(k => (
                        <Tab key={k.kindergartenName} isActive={activeTab === k.kindergartenName} onClick={() => setActiveTab(k.kindergartenName) }>{k.kindergartenName}</Tab>
                    ))}
                </Tabs>
                <div className="p-4">
                    {activeTab === 'stats' && <StatisticsView kindergartens={kindergartens} activePeriodId={activePeriodId} />}
                    {activeTab !== 'stats' && kindergartens.find(k => k.kindergartenName === activeTab) && (
                        <div>
                            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-xl font-semibold">{activeTab}</h3>
                                    {activeKitaIndex > -1 && <Button variant="secondary" className="px-2 py-1 text-sm" onClick={() => openRenameModal(activeKitaIndex)} disabled={isDemoMode}>Umbenennen</Button>}
                                    {activeKitaIndex > -1 && <Button variant="danger" className="px-2 py-1 text-sm" onClick={() => handleDeleteKita(activeKitaIndex)} disabled={isDemoMode}>Löschen</Button>}
                                </div>
                                <div className="flex items-center gap-4">
                                    <Button
                                        onClick={handleJumpToFirst}
                                        variant="secondary"
                                        className="px-3 py-1 text-sm"
                                        disabled={!hasAnySessions}
                                        title="Zum Datum der ersten Erfassung springen"
                                    >
                                        Zur ersten Erfassung
                                    </Button>
                                    <div className="flex space-x-1 bg-slate-200 rounded-lg p-1" role="group">
                                        <button onClick={() => setViewMode('day')} className={`px-3 py-1 text-sm rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#00BCD4] ${viewMode === 'day' ? 'bg-white shadow font-semibold text-[#0097A7]' : 'text-slate-600 hover:bg-slate-300'}`}>Tag</button>
                                        <button onClick={() => setViewMode('week')} className={`px-3 py-1 text-sm rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#00BCD4] ${viewMode === 'week' ? 'bg-white shadow font-semibold text-[#0097A7]' : 'text-slate-600 hover:bg-slate-300'}`}>Woche</button>
                                        <button onClick={() => setViewMode('all')} className={`px-3 py-1 text-sm rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#00BCD4] ${viewMode === 'all' ? 'bg-white shadow font-semibold text-[#0097A7]' : 'text-slate-600 hover:bg-slate-300'}`}>Gesamt</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-slate-100 rounded-lg mb-4">
                                <h4 className="text-md font-semibold mb-2 text-slate-800">Niedrige Auslastung definieren</h4>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center"> <input type="radio" id="percent-admin" name="threshold-admin" value="percent" checked={thresholdType === 'percent'} onChange={() => { setThresholdType('percent'); setThresholdValue(25);}} className="h-4 w-4 text-[#00BCD4] border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" /> <label htmlFor="percent-admin" className="ml-2 block text-sm font-medium text-slate-700">Prozentual</label> </div>
                                         <div className="flex items-center"> <input type="radio" id="absolute-admin" name="threshold-admin" value="absolute" checked={thresholdType === 'absolute'} onChange={() => { setThresholdType('absolute'); setThresholdValue(5); }} className="h-4 w-4 text-[#00BCD4] border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" /> <label htmlFor="absolute-admin" className="ml-2 block text-sm font-medium text-slate-700">Absoluter Wert</label> </div>
                                    </div>
                                    <div className="flex items-center gap-2"> <input type="number" value={thresholdValue} onChange={e => setThresholdValue(Number(e.target.value))} className="w-24 px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" /> <span className="text-sm text-slate-600">{thresholdType === 'percent' ? '% der Spitze' : 'Kinder'}</span> </div>
                                </div>
                            </div>

                            {viewMode !== 'all' && (
                                <div className="my-4">
                                    <DateNavigator
                                        label={viewMode === 'day' 
                                            ? new Date(viewDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                                            : (() => { const weekDetails = getWeekDetails(new Date(viewDate + 'T12:00:00Z')); return formatDateRange(weekDetails.startDate, weekDetails.endDate, weekDetails.weekNumber); })()
                                        }
                                        onPrev={() => changeDate('prev')}
                                        onNext={() => changeDate('next')}
                                        className="bg-slate-100"
                                    />
                                </div>
                            )}

                             <div className="space-y-8 mt-6">
                                {(kindergartens.find(k => k.kindergartenName === activeTab)?.groups || []).map(g => {
                                    const relevantPeriods = activePeriodId ? g.periods.filter(p => p.name === activePeriodId) : g.periods;
                                    const allTimelinesForGroup = relevantPeriods.flatMap(p => p.datedTimelines);
                                    const displayedTimelines = filterTimelines(allTimelinesForGroup || []);
                                    return (
                                        <div key={g.groupName} className="p-4 border rounded-lg bg-slate-50">
                                            <div className="flex items-center gap-3 mb-4">
                                                <h4 className="text-lg font-bold text-slate-800">{g.groupName}</h4>
                                                <div className="flex gap-2">
                                                    {g.ageGroup && <span className="text-xs font-semibold uppercase bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{g.ageGroup === 'u3' ? 'U3' : g.ageGroup === 'ue3' ? 'Ü3' : 'Gemischt'}</span>}
                                                    {g.careTypes && g.careTypes.map(type => (
                                                        <span key={type} className="text-xs font-semibold uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                                                            {type === 'VO' ? 'VÖ' : type}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            {displayedTimelines.length > 0 ? (
                                                <div className="space-y-6">
                                                    {displayedTimelines.map(dt => {
                                                        const maxCount = Math.max(0, ...dt.timeline.map(d => d.count));
                                                        const lowThreshold = thresholdType === 'percent' ? maxCount * (thresholdValue / 100) : thresholdValue;
                                                        const timelineWithThreshold = dt.timeline.map(d => ({ ...d, isLow: d.count > 0 && d.count <= lowThreshold }));
                                                        return ( <TimelineChart key={dt.date} data={timelineWithThreshold} title={`${new Date(dt.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}`} /> )})}
                                                </div>
                                            ) : ( <p className="text-slate-500 text-center py-4">Für diese Gruppe im ausgewählten Zeitraum keine Daten gefunden.</p> )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </Card>
            }
        </div>
    );
};
