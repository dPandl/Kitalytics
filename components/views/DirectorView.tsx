
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GroupData, TimelineDataPoint, DatedTimeline, KindergartenData, Period, AgeGroup, CareType } from '../../types';
import { readJsonFile, getWeekDetails, formatDateRange, toLocalDateString } from '../../lib/utils';
import { Card, Button, Input, Tabs, Tab, Modal } from '../shared/ui';
import { TimelineChart } from '../shared/TimelineChart';
import { DateNavigator } from '../shared/DateNavigator';
import fileSystemAccess, { kindergartenFileOptions, directorImportFileOptions, kindergartenPeriodFileOptions } from '../../lib/fileSystem';
import { WarningBanner } from '../shared/WarningBanner';
import { get as idbGet, set as idbSet } from '../../lib/indexedDB';
import { useToast } from '../shared/Toast';
import { TimePeriodManager } from '../shared/TimePeriodManager';
import { ManualGroupEditor, ManualGroupEditorProps } from '../shared/ManualGroupEditor';


interface DirectorViewProps {
  consentStatus: 'pending' | 'accepted' | 'rejected';
  isDemoMode?: boolean;
  demoData?: KindergartenData;
}

const FILEHANDLE_IDB_KEY = 'kitalytics_director_filehandle';

interface DirectorStatisticsViewProps {
    kindergarten: KindergartenData;
    activePeriodId: string | null;
}

const DirectorStatisticsView: React.FC<DirectorStatisticsViewProps> = ({ kindergarten, activePeriodId }) => {
    const [selectedGroup, setSelectedGroup] = useState<string>('all');
    const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | 'all'>('all');
    const [selectedCareType, setSelectedCareType] = useState<CareType | 'all'>('all');
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'all' | 'weekday'>('all');
    const [viewDate, setViewDate] = useState<string>(toLocalDateString(new Date()));
    const [selectedWeekday, setSelectedWeekday] = useState<number>(1);
    const [thresholdType, setThresholdType] = useState<'percent' | 'absolute'>('percent');
    const [thresholdValue, setThresholdValue] = useState<number>(25);
    const { showToast } = useToast();

    // Filter options based on selection
    const availableGroups = useMemo(() => {
        let groups = kindergarten.groups;
        if (selectedAgeGroup !== 'all') {
            groups = groups.filter(g => (g.ageGroup || 'ue3') === selectedAgeGroup);
        }
        if (selectedCareType !== 'all') {
            groups = groups.filter(g => g.careTypes?.includes(selectedCareType));
        }
        return groups;
    }, [kindergarten, selectedAgeGroup, selectedCareType]);

    const groupOptions = useMemo(() => availableGroups.map(g => g.groupName), [availableGroups]);

    // Reset selected group if it's no longer in the list after age/care filter change
    useEffect(() => {
        if (selectedGroup !== 'all' && !groupOptions.includes(selectedGroup)) {
            setSelectedGroup('all');
        }
    }, [availableGroups, groupOptions, selectedGroup]);


    const changeDate = (direction: 'prev' | 'next') => {
        const currentDate = new Date(viewDate + 'T00:00:00');
        const amount = direction === 'prev' ? -1 : 1;
        if (viewMode === 'day') currentDate.setDate(currentDate.getDate() + amount);
        else if (viewMode === 'week') currentDate.setDate(currentDate.getDate() + (amount * 7));
        setViewDate(toLocalDateString(currentDate));
    };
    
    const hasAnySessions = useMemo(() => {
        const relevantGroups = selectedGroup === 'all' ? availableGroups : availableGroups.filter(g => g.groupName === selectedGroup);
        
        return relevantGroups.some(group => {
            const relevantPeriod = activePeriodId ? group.periods.find(p => p.name === activePeriodId) : undefined;
            return (relevantPeriod?.datedTimelines.length ?? 0) > 0;
        });
    }, [availableGroups, activePeriodId, selectedGroup]);

    const handleJumpToFirst = () => {
        const relevantGroups = selectedGroup === 'all' ? availableGroups : availableGroups.filter(g => g.groupName === selectedGroup);

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
        let relevantGroups: GroupData[] = [];
        if (selectedGroup === 'all') {
            relevantGroups = availableGroups;
        } else {
            const group = availableGroups.find(g => g.groupName === selectedGroup);
            if (group) relevantGroups = [group];
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
    }, [selectedGroup, availableGroups, viewMode, viewDate, selectedWeekday, thresholdType, thresholdValue, activePeriodId]);
    
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
            <h3 className="text-lg font-semibold mb-4">Statistiken für {kindergarten.kindergartenName}</h3>
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
                        <label htmlFor="group-select" className="block text-sm font-medium text-slate-700">Gruppe</label>
                        <select id="group-select" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4] sm:text-sm rounded-md">
                            <option value="all">Alle {selectedAgeGroup !== 'all' ? selectedAgeGroup.toUpperCase() : ''} Gruppen</option> {groupOptions.map(name => <option key={name} value={name}>{name}</option>)}
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
                            <div className="flex items-center"> <input type="radio" id="percent-director-stats" name="threshold-director-stats" value="percent" checked={thresholdType === 'percent'} onChange={() => { setThresholdType('percent'); setThresholdValue(25);}} className="h-4 w-4 text-[#00BCD4] border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" /> <label htmlFor="percent-director-stats" className="ml-2 block text-sm font-medium text-slate-700">Prozentual</label> </div>
                            <div className="flex items-center"> <input type="radio" id="absolute-director-stats" name="threshold-director-stats" value="absolute" checked={thresholdType === 'absolute'} onChange={() => { setThresholdType('absolute'); setThresholdValue(5); }} className="h-4 w-4 text-[#00BCD4] border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" /> <label htmlFor="absolute-director-stats" className="ml-2 block text-sm font-medium text-slate-700">Absoluter Wert</label> </div>
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


export const DirectorView: React.FC<DirectorViewProps> = ({ consentStatus, isDemoMode = false, demoData }) => {
  const [kindergartenData, setKindergartenData] = useState<KindergartenData | null>(isDemoMode ? demoData || null : null);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null); // Name of the period
  
  const [activeTab, setActiveTab] = useState<number | 'stats'>(0);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'all'>('day');
  const [viewDate, setViewDate] = useState<string>(toLocalDateString(new Date()));
  const [thresholdType, setThresholdType] = useState<'percent' | 'absolute'>('percent');
  const [thresholdValue, setThresholdValue] = useState<number>(25);

  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [groupToEditIndex, setGroupToEditIndex] = useState<number | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupAge, setEditGroupAge] = useState<AgeGroup>('ue3');
  const [editGroupCareTypes, setEditGroupCareTypes] = useState<CareType[]>([]);
  const [groupToDeleteIndex, setGroupToDeleteIndex] = useState<number | null>(null);
  
  const { showToast } = useToast();

  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newKitaName, setNewKitaName] = useState('');
  
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [newGroupNameForCreation, setNewGroupNameForCreation] = useState('');
  const [newGroupAgeForCreation, setNewGroupAgeForCreation] = useState<AgeGroup>('ue3');
  const [newGroupCareTypesForCreation, setNewGroupCareTypesForCreation] = useState<CareType[]>([]);

  const [showManualEditor, setShowManualEditor] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<DatedTimeline | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<{ groupName: string; date: string } | null>(null);
  
  const loadData = useCallback(async (data: KindergartenData, handle: FileSystemFileHandle) => {
    setKindergartenData(data);
    if (!isDemoMode) {
      setFileHandle(handle);
      setIsDirty(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode && demoData) {
        loadData(demoData, {} as FileSystemFileHandle);
    }
  }, [isDemoMode, demoData, loadData]);

  const unifiedPeriods = useMemo(() => {
    if (!kindergartenData) return [];
    const periodMap = new Map<string, Period>();
    
    (kindergartenData.periodNames || []).forEach(name => {
        if (!periodMap.has(name)) {
            periodMap.set(name, {
                id: name,
                name: name,
                openingTime: '07:00',
                closingTime: '16:00',
                datedTimelines: [],
            });
        }
    });

    kindergartenData.groups.forEach(group => {
        group.periods.forEach(period => {
            if (!periodMap.has(period.name)) {
                periodMap.set(period.name, { ...period, id: period.name });
            }
        });
    });

    return Array.from(periodMap.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [kindergartenData]);

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
                console.error("Failed to read file on startup", e);
                showToast("Gespeicherte Arbeitsdatei konnte nicht gelesen werden.", "error");
            }
        }
    };
    if (consentStatus !== 'pending') {
        loadFileHandle();
    }
  }, [consentStatus, loadData, showToast, isDemoMode]);

  useEffect(() => {
    if (!fileHandle || !isDirty || !kindergartenData || isDemoMode) return;
    const handler = setTimeout(async () => {
      await fileSystemAccess.writeFile(fileHandle, JSON.stringify(kindergartenData, null, 2));
      setIsDirty(false);
    }, 1500);
    return () => clearTimeout(handler);
  }, [kindergartenData, fileHandle, isDirty, isDemoMode]);
  
  useEffect(() => { if (fileHandle && !isDemoMode) setIsDirty(true); }, [kindergartenData, fileHandle, isDemoMode]);
  
  const handleCreateFile = async () => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
    if (!newKitaName.trim()) {
        showToast("Bitte geben Sie einen Namen für die Einrichtung an.", "error");
        return;
    }
    const initialData: KindergartenData = {
        kindergartenName: newKitaName.trim(),
        groups: []
    };
    const options = { ...kindergartenFileOptions, suggestedName: `${newKitaName.replace(/\s/g, '_')}.kleinrichtung` };
    const handle = await fileSystemAccess.createFile(options);
    if (handle) {
        await fileSystemAccess.writeFile(handle, JSON.stringify(initialData, null, 2));
        await idbSet(FILEHANDLE_IDB_KEY, handle);
        await loadData(initialData, handle);
        setIsCreateModalOpen(false);
        setNewKitaName('');
        showToast(`Datei für Einrichtung '${initialData.kindergartenName}' erstellt.`, 'success');
    }
  };

  const handleOpenFile = async () => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
    const handle = await fileSystemAccess.openFile(kindergartenFileOptions);
    if (handle) {
        try {
            const content = await fileSystemAccess.readFile(handle);
            const data = JSON.parse(content);
            if (typeof data.kindergartenName !== 'string' || !Array.isArray(data.groups)) {
                throw new Error("Invalid file format.");
            }
            await idbSet(FILEHANDLE_IDB_KEY, handle);
            await loadData(data, handle);
            showToast(`Datei '${handle.name}' geladen.`, 'success');
        } catch (e) {
            showToast("Datei konnte nicht gelesen werden oder hat ein ungültiges Format.", "error");
        }
    }
  };
  
  const activeGroup = useMemo(() => {
    if (kindergartenData && typeof activeTab === 'number' && activeTab < kindergartenData.groups.length) {
      return kindergartenData.groups[activeTab];
    }
    return null;
  }, [kindergartenData, activeTab]);

  useEffect(() => {
    setShowManualEditor(false); 
    if (!activeGroup || !activePeriodId) {
      setViewDate(toLocalDateString(new Date()));
      return;
    }
    const activePeriod = activeGroup.periods.find(p => p.name === activePeriodId);
    if (activePeriod && activePeriod.datedTimelines.length > 0) {
      setViewDate(activePeriod.datedTimelines.sort((a,b) => b.date.localeCompare(a.date))[0].date);
    } else {
      setViewDate(toLocalDateString(new Date()));
    }
    setViewMode('day');
  }, [activeTab, kindergartenData, activePeriodId, activeGroup]);


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
    if (!event.target.files || !kindergartenData) return;
    
    if (!activePeriodId) {
        showToast("Bitte wählen Sie zuerst einen Zeitraum aus, um Daten zu importieren.", "error");
        event.target.value = ''; 
        return;
    }

    const files: File[] = Array.from(event.target.files);
    let updatedData = JSON.parse(JSON.stringify(kindergartenData)) as KindergartenData;
    let changed = false;

    for (const file of files) {
        if (!file.name.endsWith('.klgrpperiod')) continue;
        
        try {
            const importedGroupData = await readJsonFile<GroupData>(file);
            if (!importedGroupData.groupName || !Array.isArray(importedGroupData.periods) || importedGroupData.periods.length === 0) {
                showToast(`Datei ${file.name} hat ein ungültiges Format für einen Zeitraum-Import.`, 'error');
                continue;
            }
            const importedPeriod = importedGroupData.periods[0];

            let existingGroup = updatedData.groups.find(g => g.groupName === importedGroupData.groupName);
            
            if (!existingGroup) {
                existingGroup = { 
                    groupName: importedGroupData.groupName,
                    ageGroup: importedGroupData.ageGroup || 'ue3', 
                    careTypes: importedGroupData.careTypes || [],
                    periods: unifiedPeriods.map(p => ({
                        ...p,
                        id: `${importedGroupData.groupName}-${p.name}-${Date.now()}`,
                        datedTimelines: []
                    }))
                };
                updatedData.groups.push(existingGroup);
            } else {
                // Update age group and careTypes if available in import
                if (importedGroupData.ageGroup) {
                    existingGroup.ageGroup = importedGroupData.ageGroup;
                }
                if (importedGroupData.careTypes) {
                    existingGroup.careTypes = importedGroupData.careTypes;
                }
            }

            const targetPeriod = existingGroup.periods.find(p => p.name === activePeriodId);

            if (targetPeriod) {
                const existingDates = new Set(targetPeriod.datedTimelines.map(dt => dt.date));
                const newTimelines = importedPeriod.datedTimelines.filter(dt => !existingDates.has(dt.date));

                if (newTimelines.length > 0) {
                    targetPeriod.datedTimelines.push(...newTimelines);
                    targetPeriod.datedTimelines.sort((a, b) => b.date.localeCompare(a.date));
                    targetPeriod.openingTime = importedPeriod.openingTime;
                    targetPeriod.closingTime = importedPeriod.closingTime;
                    changed = true;
                    showToast(`Daten für Gruppe '${existingGroup.groupName}' in Zeitraum '${activePeriodId}' importiert.`, 'success');
                }
            } else {
                 showToast(`Der Ziel-Zeitraum '${activePeriodId}' wurde in Gruppe '${existingGroup.groupName}' nicht gefunden. Import übersprungen.`, 'error');
            }
        } catch (error) {
            showToast(`Datei ${file.name} konnte nicht gelesen oder verarbeitet werden.`, 'error');
        }
    }

    if (changed) {
        setKindergartenData(updatedData);
    } else {
        showToast("Keine neuen Daten importiert. Die Zeiträume könnten bereits aktuell sein oder die Daten existieren schon.", "info");
    }
    
    event.target.value = '';
  };
  
  
  const handleSaveACopy = useCallback(async () => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
    if (!kindergartenData || !fileHandle) { return; }
    const suggestedName = `Kopie_${fileHandle.name.replace(/\.nfkita$/, '.kleinrichtung').replace(/\.kl-einrichtung$/, '.kleinrichtung')}`;
    if (fileSystemAccess.isSupported() && consentStatus === 'accepted') {
        const handle = await fileSystemAccess.createFile({...kindergartenFileOptions, suggestedName});
        if (handle) {
            await fileSystemAccess.writeFile(handle, JSON.stringify(kindergartenData, null, 2));
            showToast(`Kopie wurde als ${handle.name} gespeichert.`, 'success');
        }
    } else {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(kindergartenData, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = suggestedName;
        link.click();
    }
  }, [kindergartenData, consentStatus, showToast, fileHandle, isDemoMode]);

  const handleCreatePeriod = async (name: string) => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
    if (!kindergartenData) return;
    if (unifiedPeriods.some(p => p.name === name)) {
        showToast(`Ein Zeitraum mit dem Namen '${name}' existiert bereits.`, "error");
        return;
    }
    
    const newPeriodNames = [...(kindergartenData.periodNames || [])];
    if (!newPeriodNames.includes(name)) {
        newPeriodNames.push(name);
    }

    const newData: KindergartenData = {
        ...kindergartenData,
        periodNames: newPeriodNames,
        groups: kindergartenData.groups.map(group => {
            if (group.periods.some(p => p.name === name)) {
                return group; 
            }
            return {
                ...group,
                periods: [
                    ...group.periods,
                    {
                        id: `${group.groupName}-${Date.now()}`,
                        name,
                        openingTime: '07:00',
                        closingTime: '16:00',
                        datedTimelines: []
                    }
                ]
            };
        })
    };

    setKindergartenData(newData);
    setActivePeriodId(name);
    showToast(`Zeitraum '${name}' wurde erstellt.`, 'success');
  };
  
  const handleRenamePeriod = async (oldName: string, newName: string) => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
    if (!kindergartenData || !newName.trim()) return;
    if (unifiedPeriods.some(p => p.name === newName)) {
        showToast('Ein Zeitraum mit diesem Namen existiert bereits.', 'error');
        return;
    }
    const newTrimmedName = newName.trim();
    const newData = { ...kindergartenData };
    
    if (newData.periodNames) {
        const index = newData.periodNames.indexOf(oldName);
        if (index > -1) {
            newData.periodNames[index] = newTrimmedName;
        }
    }
    
    newData.groups.forEach(group => {
        group.periods.forEach(period => {
            if (period.name === oldName) {
                period.name = newTrimmedName;
            }
        });
    });
    setKindergartenData(newData);
    setActivePeriodId(newTrimmedName);
    showToast(`Zeitraum '${oldName}' wurde zu '${newTrimmedName}' umbenannt.`, 'success');
  };

  const handleDeletePeriod = async (name: string) => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
    if (!kindergartenData) return;
    const newData = { ...kindergartenData };

    if (newData.periodNames) {
        newData.periodNames = newData.periodNames.filter(pName => pName !== name);
    }
    
    newData.groups.forEach(group => {
        group.periods = group.periods.filter(p => p.name !== name);
    });
    setKindergartenData(newData);
    showToast(`Zeitraum '${name}' wurde aus allen Gruppen gelöscht.`, 'success');
  };
  
  const handleExportPeriod = useCallback(async (name: string) => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
    if (!kindergartenData || !name) {
        showToast('Kein Zeitraum zum Exportieren ausgewählt.', 'error');
        return;
    }
    const periodData: KindergartenData = {
        ...kindergartenData,
        groups: kindergartenData.groups.map(g => ({
            ...g,
            periods: g.periods.filter(p => p.name === name)
        })).filter(g => g.periods.length > 0)
    };
    if (periodData.groups.length === 0) {
        showToast(`Keine Daten für den Zeitraum '${name}' in dieser Einrichtung gefunden.`, 'info');
        return;
    }
    const suggestedName = `${name.replace(/\s/g, '_')}_${kindergartenData.kindergartenName.replace(/\s/g, '_')}.kleinrperiod`;
    const handle = await fileSystemAccess.createFile({...kindergartenPeriodFileOptions, suggestedName});
    if (handle) {
        await fileSystemAccess.writeFile(handle, JSON.stringify(periodData, null, 2));
        showToast(`Zeitraum '${name}' wurde als ${handle.name} exportiert.`, 'success');
    }
  }, [kindergartenData, showToast, isDemoMode]);

  const openEditGroupModal = (index: number) => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
    if (!kindergartenData) return;
    setGroupToEditIndex(index);
    setEditGroupName(kindergartenData.groups[index].groupName);
    setEditGroupAge(kindergartenData.groups[index].ageGroup || 'ue3');
    setEditGroupCareTypes(kindergartenData.groups[index].careTypes || []);
    setIsEditGroupModalOpen(true);
  };

  const handleConfirmEditGroup = () => {
      if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); setIsEditGroupModalOpen(false); return; }
      if (groupToEditIndex === null || !editGroupName.trim() || !kindergartenData) return;
      
      const oldName = kindergartenData.groups[groupToEditIndex].groupName;
      const trimmedNewName = editGroupName.trim();
      
      if (trimmedNewName !== oldName && kindergartenData.groups.some((g, i) => g.groupName === trimmedNewName && i !== groupToEditIndex)) {
          showToast('Eine Gruppe mit diesem Namen existiert bereits.', 'error');
          return;
      }
      
      const newGroups = [...kindergartenData.groups];
      newGroups[groupToEditIndex].groupName = trimmedNewName;
      newGroups[groupToEditIndex].ageGroup = editGroupAge;
      newGroups[groupToEditIndex].careTypes = editGroupCareTypes;
      
      setKindergartenData({ ...kindergartenData, groups: newGroups });
      setIsEditGroupModalOpen(false);
      showToast('Gruppe erfolgreich bearbeitet.', 'success');
  };
  
  const handleCreateGroup = () => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); setIsCreateGroupModalOpen(false); return; }
    if (!newGroupNameForCreation.trim()) {
        showToast("Bitte geben Sie einen Gruppennamen an.", "error");
        return;
    }
    if (kindergartenData?.groups.some(g => g.groupName === newGroupNameForCreation.trim())) {
        showToast("Eine Gruppe mit diesem Namen existiert bereits.", "error");
        return;
    }

    const newGroup: GroupData = {
        groupName: newGroupNameForCreation.trim(),
        ageGroup: newGroupAgeForCreation,
        careTypes: newGroupCareTypesForCreation,
        periods: unifiedPeriods.map(p => ({
            ...p,
            id: `${newGroupNameForCreation.trim()}-${p.name}-${Date.now()}`,
            datedTimelines: []
        })),
    };

    const newData = { ...kindergartenData!, groups: [...kindergartenData!.groups, newGroup] };
    setKindergartenData(newData);
    
    setActiveTab(kindergartenData!.groups.length);

    setIsCreateGroupModalOpen(false);
    setNewGroupNameForCreation('');
    setNewGroupAgeForCreation('ue3');
    setNewGroupCareTypesForCreation([]);
    showToast(`Gruppe '${newGroup.groupName}' wurde erstellt.`, 'success');
  };

  const handleDeleteGroup = (index: number) => {
      if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
      setGroupToDeleteIndex(index);
  };

  const confirmGroupDelete = () => {
      if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); setGroupToDeleteIndex(null); return; }
      if (groupToDeleteIndex === null || !kindergartenData) return;

      const newGroups = [...kindergartenData.groups];
      const deletedGroupName = newGroups[groupToDeleteIndex].groupName;
      newGroups.splice(groupToDeleteIndex, 1);

      setKindergartenData({ ...kindergartenData, groups: newGroups });
      setActiveTab('stats');
      setGroupToDeleteIndex(null);
      showToast(`Gruppe '${deletedGroupName}' wurde gelöscht.`, 'success');
  };

  const toggleCareType = (type: CareType, currentTypes: CareType[], setTypes: (types: CareType[]) => void) => {
      if (currentTypes.includes(type)) {
          setTypes(currentTypes.filter(t => t !== type));
      } else {
          setTypes([...currentTypes, type]);
      }
  };

  
  const handleSaveManualEntry: ManualGroupEditorProps['onSave'] = ({ date, timeline, openingTime, closingTime }) => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
    if (!kindergartenData || !activeGroup || !activePeriodId) {
        showToast("Keine aktive Gruppe oder Zeitraum ausgewählt.", 'error');
        return;
    }

    const newDatedTimeline: DatedTimeline = { date, timeline };

    const newKindergartenData = JSON.parse(JSON.stringify(kindergartenData)) as KindergartenData;
    const groupToUpdate = newKindergartenData.groups.find(g => g.groupName === activeGroup.groupName);
    if (!groupToUpdate) return;
    
    let periodToUpdate = groupToUpdate.periods.find(p => p.name === activePeriodId);

    if (!periodToUpdate) {
        showToast(`Fehler: Zeitraum '${activePeriodId}' nicht in Gruppe '${activeGroup.groupName}' gefunden.`, 'error');
        return;
    }
    
    periodToUpdate.openingTime = openingTime;
    periodToUpdate.closingTime = closingTime;
    
    const existingTimelineIndex = periodToUpdate.datedTimelines.findIndex(dt => dt.date === date);

    if (existingTimelineIndex > -1) {
        periodToUpdate.datedTimelines[existingTimelineIndex] = newDatedTimeline;
    } else {
        periodToUpdate.datedTimelines.push(newDatedTimeline);
    }
    periodToUpdate.datedTimelines.sort((a, b) => b.date.localeCompare(a.date));

    setKindergartenData(newKindergartenData);
    showToast(`Manuelle Erfassung für ${new Date(date + 'T00:00:00').toLocaleDateString('de-DE')} in Gruppe '${activeGroup.groupName}' gespeichert.`, 'success');
    setShowManualEditor(false);
    setSessionToEdit(null);
    setViewDate(date);
    setViewMode('day');
  };

  const handleDeleteSession = (groupName: string, date: string) => {
      if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
      setSessionToDelete({ groupName, date });
  };
  
  const confirmDelete = () => {
      if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); setSessionToDelete(null); return; }
      if (!sessionToDelete || !kindergartenData || !activePeriodId) return;
      const { groupName, date } = sessionToDelete;

      const newKindergartenData = JSON.parse(JSON.stringify(kindergartenData)) as KindergartenData;
      const groupToUpdate = newKindergartenData.groups.find(g => g.groupName === groupName);
      if (!groupToUpdate) return;
      
      const periodToUpdate = groupToUpdate.periods.find(p => p.name === activePeriodId);
      if (!periodToUpdate) return;

      periodToUpdate.datedTimelines = periodToUpdate.datedTimelines.filter(dt => dt.date !== date);

      setKindergartenData(newKindergartenData);
      setSessionToDelete(null);
      showToast(`Erfassung vom ${new Date(date + 'T00:00:00').toLocaleDateString('de-DE')} für Gruppe '${groupName}' gelöscht.`, 'success');
  };

  const changeDate = (direction: 'prev' | 'next') => {
      const currentDate = new Date(viewDate + 'T00:00:00');
      const amount = direction === 'prev' ? -1 : 1;
      if (viewMode === 'day') currentDate.setDate(currentDate.getDate() + amount);
      else if (viewMode === 'week') currentDate.setDate(currentDate.getDate() + (amount * 7));
      setViewDate(toLocalDateString(currentDate));
  };

  const handleJumpToFirst = () => {
    if (!activeGroup || !activePeriodId) {
        showToast('Keine Gruppe oder Zeitraum ausgewählt.', 'info');
        return;
    }
    const activePeriod = activeGroup.periods.find(p => p.name === activePeriodId);
    if (activePeriod && activePeriod.datedTimelines.length > 0) {
        const firstDate = activePeriod.datedTimelines.map(dt => dt.date).reduce((min, p) => p < min ? p : min);
        setViewDate(firstDate);
        showToast(`Zum Datum der ersten Erfassung gesprungen: ${new Date(firstDate + 'T00:00:00').toLocaleDateString('de-DE')}`, 'info');
    } else {
        showToast('Keine Erfassungen in diesem Zeitraum für diese Gruppe gefunden.', 'info');
    }
  };

  const displayedTimelines = useMemo(() => {
    if (!activeGroup || !activePeriodId) return [];
    const activePeriod = activeGroup.periods.find(p => p.name === activePeriodId);
    if (!activePeriod) return [];

    const timelines = activePeriod.datedTimelines;
    switch (viewMode) {
        case 'week':
            const { startDate, endDate } = getWeekDetails(new Date(viewDate + 'T12:00:00Z'));
            return timelines.filter(s => s.date >= startDate && s.date <= endDate).sort((a, b) => a.date.localeCompare(b.date));
        case 'all': return timelines.sort((a, b) => b.date.localeCompare(a.date));
        default: return timelines.filter(s => s.date === viewDate);
    }
  }, [activeGroup, viewMode, viewDate, activePeriodId]);

  if (consentStatus !== 'accepted' && !isDemoMode) {
    return <WarningBanner />;
  }

  if (!fileHandle && !isDemoMode) {
    return (
        <>
            <Modal isOpen={isCreateModalOpen}>
                <h3 className="text-lg font-bold mb-4">Neue Einrichtungsdatei erstellen</h3>
                <Input label="Name der Einrichtung" value={newKitaName} onChange={e => setNewKitaName(e.target.value)} placeholder="z.B. Kita Pusteblume"/>
                <div className="flex justify-end gap-4 mt-6">
                    <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Abbrechen</Button>
                    <Button onClick={handleCreateFile}>Erstellen & Speichern</Button>
                </div>
            </Modal>
            <Card className="text-center">
                <h2 className="text-2xl font-bold mb-2 text-slate-800">Willkommen bei Kitalytics</h2>
                <p className="mb-6 text-slate-600">Um zu beginnen, erstellen Sie eine neue Einrichtungsdatei oder öffnen Sie eine bestehende Datei.</p>
                <div className="flex justify-center gap-4">
                    <Button onClick={() => setIsCreateModalOpen(true)}>Neue Einrichtungsdatei erstellen</Button>
                    <Button onClick={handleOpenFile} variant="secondary">Bestehende Datei öffnen</Button>
                </div>
            </Card>
        </>
    );
  }

  if (!kindergartenData) {
      return <Card><p className="text-center text-slate-500">Daten werden geladen...</p></Card>
  }

  return (
    <div className="space-y-6">
       <Modal isOpen={!!sessionToDelete}>
        <h3 className="text-lg font-bold mb-2">Löschen bestätigen</h3>
        <p>Sind Sie sicher, dass Sie diese Erfassung unwiderruflich löschen möchten?</p>
        <div className="flex justify-end gap-4 mt-6">
            <Button variant="secondary" onClick={() => setSessionToDelete(null)}>Abbrechen</Button>
            <Button variant="danger" onClick={confirmDelete}>Löschen</Button>
        </div>
      </Modal>

      <Modal isOpen={groupToDeleteIndex !== null}>
        <h3 className="text-lg font-bold mb-2">Gruppe löschen bestätigen</h3>
        <p>Sind Sie sicher, dass Sie die Gruppe <strong>{groupToDeleteIndex !== null ? kindergartenData.groups[groupToDeleteIndex]?.groupName : ''}</strong> und alle zugehörigen Daten unwiderruflich löschen möchten?</p>
        <div className="flex justify-end gap-4 mt-6">
            <Button variant="secondary" onClick={() => setGroupToDeleteIndex(null)}>Abbrechen</Button>
            <Button variant="danger" onClick={confirmGroupDelete}>Löschen</Button>
        </div>
      </Modal>

      <Modal isOpen={!!sessionToEdit} size="4xl">
        {sessionToEdit && activeGroup && activePeriodId && (
            <ManualGroupEditor
                onSave={handleSaveManualEntry}
                onCancel={() => setSessionToEdit(null)}
                initialGroupName={activeGroup.groupName}
                isGroupNameDisabled={true}
                initialOpeningTime={activeGroup.periods.find(p => p.name === activePeriodId)?.openingTime || '07:00'}
                initialClosingTime={activeGroup.periods.find(p => p.name === activePeriodId)?.closingTime || '16:00'}
                initialDate={sessionToEdit.date}
                initialTimeline={sessionToEdit.timeline}
                isDemoMode={isDemoMode}
            />
        )}
      </Modal>

       <Modal isOpen={isEditGroupModalOpen}>
        <h3 className="text-lg font-bold mb-4">Gruppe bearbeiten</h3>
        <div className="space-y-4">
            <Input label="Gruppenname" id="editGroupName" value={editGroupName} onChange={e => setEditGroupName(e.target.value)} />
            <div>
                <label htmlFor="editGroupAge" className="block text-sm font-medium text-slate-700 mb-1">Altersstruktur</label>
                <select
                    id="editGroupAge"
                    value={editGroupAge}
                    onChange={e => setEditGroupAge(e.target.value as AgeGroup)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]"
                >
                    <option value="u3">U3 (Unter 3 Jahre)</option>
                    <option value="ue3">Ü3 (Über 3 Jahre)</option>
                    <option value="mixed">Gemischt</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Betreuungsform</label>
                <div className="flex gap-2">
                    {(['VO', 'GT', 'RG'] as CareType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => toggleCareType(type, editGroupCareTypes, setEditGroupCareTypes)}
                            className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${editGroupCareTypes.includes(type) ? 'bg-[#00BCD4] text-white border-[#00BCD4]' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                        >
                            {type === 'VO' ? 'VÖ' : type}
                        </button>
                    ))}
                </div>
            </div>
        </div>
        <div className="flex justify-end gap-4 mt-6"> <Button variant="secondary" onClick={() => setIsEditGroupModalOpen(false)}>Abbrechen</Button> <Button variant="primary" onClick={handleConfirmEditGroup}>Speichern</Button> </div>
      </Modal>

      <Modal isOpen={isCreateGroupModalOpen}>
        <h3 className="text-lg font-bold mb-4">Neue Gruppe erstellen</h3>
        <div className="space-y-4">
            <Input label="Name der neuen Gruppe" value={newGroupNameForCreation} onChange={e => setNewGroupNameForCreation(e.target.value)} placeholder="z.B. Wolken-Gruppe"/>
            <div>
                <label htmlFor="newGroupAge" className="block text-sm font-medium text-slate-700 mb-1">Altersstruktur</label>
                <select
                    id="newGroupAge"
                    value={newGroupAgeForCreation}
                    onChange={e => setNewGroupAgeForCreation(e.target.value as AgeGroup)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]"
                >
                    <option value="u3">U3 (Unter 3 Jahre)</option>
                    <option value="ue3">Ü3 (Über 3 Jahre)</option>
                    <option value="mixed">Gemischt</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Betreuungsform</label>
                <div className="flex gap-2">
                    {(['VO', 'GT', 'RG'] as CareType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => toggleCareType(type, newGroupCareTypesForCreation, setNewGroupCareTypesForCreation)}
                            className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${newGroupCareTypesForCreation.includes(type) ? 'bg-[#00BCD4] text-white border-[#00BCD4]' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                        >
                            {type === 'VO' ? 'VÖ' : type}
                        </button>
                    ))}
                </div>
            </div>
        </div>
        <div className="flex justify-end gap-4 mt-6">
            <Button variant="secondary" onClick={() => setIsCreateGroupModalOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreateGroup}>Erstellen</Button>
        </div>
      </Modal>

      <Card>
          <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
              <h2 className="text-2xl font-bold text-slate-800">{kindergartenData.kindergartenName}</h2>
              <Input 
                  className="max-w-xs" 
                  label="Name der Einrichtung ändern" 
                  value={kindergartenData.kindergartenName} 
                  onChange={e => {
                      if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
                      setKindergartenData({ ...kindergartenData, kindergartenName: e.target.value })
                  }} 
                  placeholder="z.B. Kita Pusteblume" 
                  disabled={isDemoMode}
              />
          </div>
          <TimePeriodManager
              periods={unifiedPeriods}
              activePeriodId={activePeriodId}
              onSelectPeriod={setActivePeriodId}
              onCreatePeriod={handleCreatePeriod}
              onRenamePeriod={handleRenamePeriod}
              onDeletePeriod={handleDeletePeriod}
              onExportPeriod={handleExportPeriod}
              roleName="Einrichtung"
              consentStatus={consentStatus}
              isDemoMode={isDemoMode}
          />
          {fileHandle && !isDemoMode && (
              <div className="mt-4 p-3 bg-[#E0F7FA] border border-[#B2EBF2] rounded-md text-sm">
                  <span className="font-semibold text-[#00838F]">Aktive Datei:</span> {fileHandle.name}
                  <span className={`ml-4 ${isDirty ? 'text-amber-600' : 'text-green-600'}`}>{isDirty ? 'Wird gespeichert...' : 'Gespeichert'}</span>
              </div>
          )}
      </Card>
      
      <Card>
        <h3 className="text-lg font-semibold mb-2">Datenverwaltung</h3>
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
                <label className={`block text-sm font-medium text-slate-700 mb-1 ${!activePeriodId || isDemoMode ? 'text-slate-400' : ''}`}>Gruppen-Zeiträume importieren</label>
                <input type="file" multiple onChange={handleFileUpload} accept=".klgrpperiod" disabled={!activePeriodId || isDemoMode} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#E0F7FA] file:text-[#0097A7] hover:file:bg-[#B2EBF2] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" />
                {!activePeriodId && <p className="text-xs text-slate-500 mt-1">Bitte wählen Sie zuerst einen Zeitraum aus.</p>}
            </div>
            <div>
                <p className="text-sm text-slate-600 flex-grow mb-2"> Speichern Sie eine Kopie der gesamten Einrichtung. </p>
                <Button onClick={handleSaveACopy} variant="secondary" disabled={isDemoMode}> Kopie speichern </Button>
            </div>
        </div>
      </Card>

      {activePeriodId ? (      
        <Card>
          <div className="flex items-center justify-between border-b-2 border-slate-200">
            <Tabs>
            {kindergartenData.groups.map((group, index) => (
                <Tab key={index} isActive={activeTab === index} onClick={() => setActiveTab(index)}>{group.groupName}</Tab>
            ))}
             <Tab isActive={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>Statistik</Tab>
            </Tabs>
            <Button onClick={() => {
                if(isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
                setIsCreateGroupModalOpen(true)
              }} 
              className="ml-4 mb-0.5 whitespace-nowrap"
              disabled={isDemoMode}
              >+ Neue Gruppe</Button>
          </div>
            <div className="p-4">
            {activeTab === 'stats' ? (
                <DirectorStatisticsView kindergarten={kindergartenData} activePeriodId={activePeriodId} />
            ) : activeGroup ? (
                <div>
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                        <div className="flex items-center gap-4">
                            <div>
                                <h2 className="text-xl font-bold">{activeGroup.groupName}</h2>
                                <div className="flex gap-2 mt-1">
                                    {activeGroup.ageGroup && <span className="text-xs font-semibold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{activeGroup.ageGroup === 'u3' ? 'U3' : activeGroup.ageGroup === 'ue3' ? 'Ü3' : 'Gemischt'}</span>}
                                    {activeGroup.careTypes && activeGroup.careTypes.map(type => (
                                        <span key={type} className="text-xs font-semibold uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                                            {type === 'VO' ? 'VÖ' : type}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <Button variant="secondary" className="px-2 py-1 text-sm" onClick={() => openEditGroupModal(activeTab as number)} disabled={isDemoMode}>Bearbeiten</Button>
                            <Button variant="danger" className="px-2 py-1 text-sm" onClick={() => handleDeleteGroup(activeTab as number)} disabled={isDemoMode}>Löschen</Button>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button
                                onClick={handleJumpToFirst}
                                variant="secondary"
                                className="px-3 py-1 text-sm"
                                disabled={!activeGroup?.periods.find(p => p.name === activePeriodId)?.datedTimelines.length}
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
                                <div className="flex items-center"> <input type="radio" id="percent-director" name="threshold-director" value="percent" checked={thresholdType === 'percent'} onChange={() => { setThresholdType('percent'); setThresholdValue(25);}} className="h-4 w-4 text-[#00BCD4] border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" /> <label htmlFor="percent-director" className="ml-2 block text-sm font-medium text-slate-700">Prozentual</label> </div>
                                <div className="flex items-center"> <input type="radio" id="absolute-director" name="threshold-director" value="absolute" checked={thresholdType === 'absolute'} onChange={() => { setThresholdType('absolute'); setThresholdValue(5); }} className="h-4 w-4 text-[#00BCD4] border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" /> <label htmlFor="absolute-director" className="ml-2 block text-sm font-medium text-slate-700">Absoluter Wert</label> </div>
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
                    
                    {displayedTimelines.length === 0 ? (
                        <div className="text-center p-8 bg-slate-100 rounded-lg"> <p className="text-slate-500">Für den ausgewählten Zeitraum wurden keine Erfassungen gefunden.</p> </div>
                    ) : (
                        <div className="space-y-6 mt-6">
                            {displayedTimelines.map((session) => {
                                const maxCount = Math.max(0, ...session.timeline.map(d => d.count));
                                const lowThreshold = thresholdType === 'percent' ? maxCount * (thresholdValue / 100) : thresholdValue;
                                const timelineWithThreshold = session.timeline.map(d => ({ ...d, isLow: d.count > 0 && d.count <= lowThreshold }));
                                return (
                                <Card key={session.date}>
                                    <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                                        <h3 className="text-xl font-bold">{activeGroup!.groupName} - {new Date(session.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                                        <div className="flex gap-2">
                                            <Button onClick={() => setSessionToEdit(session)} variant="secondary" disabled={isDemoMode}>Bearbeiten</Button>
                                            <Button onClick={() => handleDeleteSession(activeGroup!.groupName, session.date)} variant="danger" disabled={isDemoMode}>Löschen</Button>
                                        </div>
                                    </div>
                                    <TimelineChart data={timelineWithThreshold} title={`Frequenzverlauf`} />
                                </Card>
                            );
                            })}
                        </div>
                    )}

                    <div className="mt-6 border-t pt-6">
                        <Button onClick={() => setShowManualEditor(!showManualEditor)} variant="secondary" disabled={!activePeriodId || isDemoMode}>
                            {showManualEditor ? 'Editor schließen' : 'Manuelle Erfassung hinzufügen'}
                        </Button>
                        {showManualEditor && (
                            <div className="mt-4 bg-slate-50 p-4 rounded-lg border">
                                <ManualGroupEditor
                                    onSave={handleSaveManualEntry}
                                    initialGroupName={activeGroup.groupName}
                                    isGroupNameDisabled={true}
                                    initialOpeningTime={activeGroup.periods.find(p => p.name === activePeriodId)?.openingTime || '07:00'}
                                    initialClosingTime={activeGroup.periods.find(p => p.name === activePeriodId)?.closingTime || '16:00'}
                                    isDemoMode={isDemoMode}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center p-8 bg-slate-100 rounded-lg">
                    <p className="text-slate-500">Keine Gruppen in dieser Einrichtung vorhanden.</p>
                    <p className="text-sm text-slate-400 mt-1">Bitte importieren oder erstellen Sie zuerst Daten für Ihre Gruppen.</p>
                </div>
            )}
            </div>
        </Card>
      ) : (
        <Card>
            <p className="text-center text-slate-500">
                Kein Zeitraum ausgewählt. Bitte wählen oder erstellen Sie einen Zeitraum, um Daten anzuzeigen oder zu importieren.
            </p>
        </Card>
      )}

    </div>
  );
};
