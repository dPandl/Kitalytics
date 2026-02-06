
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { TimestampEvent, TimelineDataPoint, DatedTimeline, GroupData, Period, AgeGroup, CareType } from '../../types';
import { processEventsToTimeline, getWeekDetails, formatDateRange, toLocalDateString } from '../../lib/utils';
import { Card, Button, Input, Modal, Tabs, Tab } from '../shared/ui';
import { TimelineChart } from '../shared/TimelineChart';
import { ManualGroupEditor, ManualGroupEditorProps } from '../shared/ManualGroupEditor';
import { DateNavigator } from '../shared/DateNavigator';
import fileSystemAccess, { groupFileOptions, groupPeriodFileOptions } from '../../lib/fileSystem';
import { WarningBanner } from '../shared/WarningBanner';
import { get as idbGet, set as idbSet } from '../../lib/indexedDB';
import { useToast } from '../shared/Toast';
import { TimePeriodManager } from '../shared/TimePeriodManager';

interface EducatorViewProps {
  consentStatus: 'pending' | 'accepted' | 'rejected';
  isDemoMode?: boolean;
  demoData?: GroupData;
}

const FILEHANDLE_IDB_KEY = 'kitalytics_educator_filehandle';
const LAST_ACTIVE_PERIOD_IDB_KEY = 'kitalytics_educator_lastActivePeriodId';

interface EducatorStatisticsViewProps {
    group: GroupData;
    activePeriodId: string | null;
}

const EducatorStatisticsView: React.FC<EducatorStatisticsViewProps> = ({ group, activePeriodId }) => {
    const [viewMode, setViewMode] = useState<'week' | 'all' | 'weekday'>('week');
    const [viewDate, setViewDate] = useState<string>(toLocalDateString(new Date()));
    const [selectedWeekday, setSelectedWeekday] = useState<number>(1); // 1 = Monday
    const [thresholdType, setThresholdType] = useState<'percent' | 'absolute'>('percent');
    const [thresholdValue, setThresholdValue] = useState<number>(25);
    const { showToast } = useToast();

    const changeDate = (direction: 'prev' | 'next') => {
        const currentDate = new Date(viewDate + 'T00:00:00');
        const amount = direction === 'prev' ? -7 : 7;
        currentDate.setDate(currentDate.getDate() + amount);
        setViewDate(toLocalDateString(currentDate));
    };
    
    const activePeriod = useMemo(() => {
        return group.periods.find(p => p.id === activePeriodId);
    }, [group, activePeriodId]);

    const hasAnySessions = useMemo(() => {
        return (activePeriod?.datedTimelines.length ?? 0) > 0;
    }, [activePeriod]);

    const handleJumpToFirst = () => {
        if (activePeriod && activePeriod.datedTimelines.length > 0) {
            // Find the earliest date manually to be safe, instead of relying on sort order.
            const firstDate = activePeriod.datedTimelines.map(dt => dt.date).reduce((min, p) => p < min ? p : min);
            setViewDate(firstDate);
            showToast(`Zum Datum der ersten Erfassung gesprungen: ${new Date(firstDate + 'T00:00:00').toLocaleDateString('de-DE')}`, 'info');
        } else {
            showToast('Keine Erfassungen in diesem Zeitraum gefunden.', 'info');
        }
    };

    const aggregatedData = useMemo(() => {
        const relevantPeriods = activePeriodId ? group.periods.filter(p => p.id === activePeriodId) : group.periods;
        
        let allTimelines: TimelineDataPoint[][] = [];
        let timelinesToProcess = relevantPeriods.flatMap(p => p.datedTimelines);

        switch (viewMode) {
            case 'week':
                const { startDate, endDate } = getWeekDetails(new Date(viewDate + 'T12:00:00Z'));
                allTimelines = timelinesToProcess.filter(dt => dt.date >= startDate && dt.date <= endDate).map(dt => dt.timeline);
                break;
            case 'weekday':
                allTimelines = timelinesToProcess.filter(dt => {
                    const d = new Date(dt.date + 'T00:00:00');
                    return d.getDay() === selectedWeekday;
                }).map(dt => dt.timeline);
                break;
            case 'all':
                allTimelines = timelinesToProcess.map(dt => dt.timeline);
                break;
        }

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
    }, [group, activePeriodId, viewMode, viewDate, selectedWeekday, thresholdType, thresholdValue]);

    const chartTitle = useMemo(() => {
        switch (viewMode) {
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
            <h3 className="text-lg font-semibold mb-4">Statistiken für {group.groupName}</h3>
            <div className="bg-slate-100 p-4 rounded-md space-y-4">
                 <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ansicht</label>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex space-x-1 bg-slate-200 rounded-lg p-1" role="group">
                            <button onClick={() => setViewMode('week')} className={`px-3 py-1 text-sm rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#00BCD4] ${viewMode === 'week' ? 'bg-white shadow font-semibold text-[#0097A7]' : 'text-slate-600 hover:bg-slate-300'}`}>Woche</button>
                            <button onClick={() => setViewMode('weekday')} className={`px-3 py-1 text-sm rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#00BCD4] ${viewMode === 'weekday' ? 'bg-white shadow font-semibold text-[#0097A7]' : 'text-slate-600 hover:bg-slate-300'}`}>Wochentag</button>
                            <button onClick={() => setViewMode('all')} className={`px-3 py-1 text-sm rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#00BCD4] ${viewMode === 'all' ? 'bg-white shadow font-semibold text-[#0097A7]' : 'text-slate-600 hover:bg-slate-300'}`}>Gesamt</button>
                        </div>
                        
                        {viewMode === 'weekday' && (
                            <select 
                                value={selectedWeekday} 
                                onChange={(e) => setSelectedWeekday(Number(e.target.value))}
                                className="block pl-3 pr-10 py-1 text-sm border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4] rounded-md h-[32px]"
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
                                className="px-3 py-1 text-sm h-[32px]"
                                disabled={!hasAnySessions}
                                title="Zum Datum der ersten Erfassung springen"
                            >
                                Zur ersten Erfassung
                            </Button>
                        )}
                    </div>
                </div>

                {viewMode === 'week' && (
                    <DateNavigator
                        label={(() => { const weekDetails = getWeekDetails(new Date(viewDate + 'T12:00:00Z')); return formatDateRange(weekDetails.startDate, weekDetails.endDate, weekDetails.weekNumber); })()}
                        onPrev={() => changeDate('prev')}
                        onNext={() => changeDate('next')}
                        className="bg-white"
                    />
                )}
                 <div className="border-t pt-4">
                    <h4 className="text-md font-semibold mb-2 text-slate-800">Niedrige Auslastung definieren</h4>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center"> <input type="radio" id="percent-educator-stats" name="threshold-educator-stats" value="percent" checked={thresholdType === 'percent'} onChange={() => { setThresholdType('percent'); setThresholdValue(25);}} className="h-4 w-4 text-[#00BCD4] border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" /> <label htmlFor="percent-educator-stats" className="ml-2 block text-sm font-medium text-slate-700">Prozentual</label> </div>
                            <div className="flex items-center"> <input type="radio" id="absolute-educator-stats" name="threshold-educator-stats" value="absolute" checked={thresholdType === 'absolute'} onChange={() => { setThresholdType('absolute'); setThresholdValue(5); }} className="h-4 w-4 text-[#00BCD4] border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" /> <label htmlFor="absolute-educator-stats" className="ml-2 block text-sm font-medium text-slate-700">Absoluter Wert</label> </div>
                        </div>
                        <div className="flex items-center gap-2"> <input type="number" value={thresholdValue} onChange={e => setThresholdValue(Number(e.target.value))} className="w-24 px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" /> <span className="text-sm text-slate-600">{thresholdType === 'percent' ? '% der Spitze' : 'Kinder'}</span> </div>
                    </div>
                </div>
            </div>
            <div className="mt-6"> <TimelineChart data={aggregatedData.data} title={chartTitle} color="#22c55e" /> </div>
            {aggregatedData.data.length > 0 && aggregatedData.lowOccupancy && (
                <div className="mt-6 p-4 bg-amber-100 border-l-4 border-amber-500 text-amber-700">
                    <h4 className="font-bold">Zeiten mit geringer Auslastung</h4>
                    <p>Die Auslastung ist im ausgewählten Zeitraum besonders niedrig zu folgenden Zeiten (Durchschnitt): {aggregatedData.lowOccupancy}.</p>
                </div>
            )}
        </div>
    );
};


export const EducatorView: React.FC<EducatorViewProps> = ({ consentStatus, isDemoMode = false, demoData }) => {
  const [groupData, setGroupData] = useState<GroupData | null>(isDemoMode ? demoData || null : null);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);

  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [childCount, setChildCount] = useState<number>(0);
  const [events, setEvents] = useState<TimestampEvent[]>([]);
  
  const [liveOpeningTime, setLiveOpeningTime] = useState('07:00');
  const [liveClosingTime, setLiveClosingTime] = useState('16:00');

  const [sessionToEdit, setSessionToEdit] = useState<DatedTimeline | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<{ periodId: string; date: string } | null>(null);
  const [mode, setMode] = useState<'live' | 'manual' | 'stats'>('live');
  const [viewDate, setViewDate] = useState<string>(toLocalDateString(new Date()));
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'all'>('day');
  const [thresholdType, setThresholdType] = useState<'percent' | 'absolute'>('percent');
  const [thresholdValue, setThresholdValue] = useState<number>(25);

  const { showToast } = useToast();

  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupAge, setNewGroupAge] = useState<AgeGroup>('ue3');
  const [newGroupCareTypes, setNewGroupCareTypes] = useState<CareType[]>([]);

  const activePeriod = useMemo(() => {
    return groupData?.periods.find(p => p.id === activePeriodId);
  }, [groupData, activePeriodId]);

  useEffect(() => {
    if (activePeriod) {
        setLiveOpeningTime(activePeriod.openingTime);
        setLiveClosingTime(activePeriod.closingTime);
    }
  }, [activePeriod]);


  const loadData = useCallback(async (data: GroupData, handle: FileSystemFileHandle) => {
    setGroupData(data);
    const lastActiveId = isDemoMode ? data.periods[0]?.id : await idbGet<string>(LAST_ACTIVE_PERIOD_IDB_KEY);
    if (lastActiveId && data.periods.some(p => p.id === lastActiveId)) {
        setActivePeriodId(lastActiveId);
    } else if (data.periods.length > 0) {
        setActivePeriodId(data.periods[0].id);
    } else {
        setActivePeriodId(null);
    }
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
    if (activePeriodId && !isDemoMode) {
        idbSet(LAST_ACTIVE_PERIOD_IDB_KEY, activePeriodId);
    }
  }, [activePeriodId, isDemoMode]);
  
  useEffect(() => {
    if (!fileHandle || !isDirty || !groupData || isDemoMode) return;
    const handler = setTimeout(async () => {
      await fileSystemAccess.writeFile(fileHandle, JSON.stringify(groupData, null, 2));
      setIsDirty(false);
    }, 1500);
    return () => clearTimeout(handler);
  }, [groupData, fileHandle, isDirty, isDemoMode]);

  useEffect(() => { if (fileHandle && !isDemoMode) setIsDirty(true); }, [groupData, fileHandle, isDemoMode]);
  
  const handleCreateFile = async () => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
    if (!newGroupName.trim()) {
        showToast("Bitte geben Sie einen Gruppennamen an.", "error");
        return;
    }
    const initialData: GroupData = {
        groupName: newGroupName.trim(),
        ageGroup: newGroupAge,
        careTypes: newGroupCareTypes,
        periods: []
    };
    const options = { ...groupFileOptions, suggestedName: `${newGroupName.replace(/\s/g, '_')}.klgruppe` };
    const handle = await fileSystemAccess.createFile(options);
    if (handle) {
        await fileSystemAccess.writeFile(handle, JSON.stringify(initialData, null, 2));
        await idbSet(FILEHANDLE_IDB_KEY, handle);
        await loadData(initialData, handle);
        setIsCreateModalOpen(false);
        setNewGroupName('');
        setNewGroupAge('ue3');
        setNewGroupCareTypes([]);
        showToast(`Datei für Gruppe '${initialData.groupName}' erstellt.`, 'success');
    }
  };

  const handleOpenFile = async () => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
    const handle = await fileSystemAccess.openFile(groupFileOptions);
    if (handle) {
        try {
            const content = await fileSystemAccess.readFile(handle);
            const data = JSON.parse(content);
            // Basic validation
            if (typeof data.groupName !== 'string' || !Array.isArray(data.periods)) {
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


  const handleCreatePeriod = async (name: string) => {
      if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
      if (!groupData) return;
      const newPeriod: Period = {
        id: Date.now().toString(),
        name,
        openingTime: '07:00',
        closingTime: '16:00',
        datedTimelines: []
      };
      const newData = { ...groupData, periods: [...groupData.periods, newPeriod] };
      setGroupData(newData);
      setActivePeriodId(newPeriod.id);
      showToast(`Zeitraum '${name}' wurde erstellt.`, 'success');
  };
  
  const handleRenamePeriod = async (id: string, newName: string) => {
      if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
      if (!groupData) return;
      const newPeriods = groupData.periods.map(p => p.id === id ? { ...p, name: newName } : p);
      setGroupData({ ...groupData, periods: newPeriods });
      showToast('Zeitraum wurde umbenannt.', 'success');
  };

  const handleDeletePeriod = async (id: string) => {
      if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
      if (!groupData) return;
      const newPeriods = groupData.periods.filter(p => p.id !== id);
      setGroupData({ ...groupData, periods: newPeriods });

      if (activePeriodId === id) {
          setActivePeriodId(newPeriods.length > 0 ? newPeriods[0].id : null);
      }
      showToast('Zeitraum wurde gelöscht.', 'success');
  };
  
  const handleExportPeriod = useCallback(async (id: string) => {
      if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
      if (!groupData) return;
      const periodToExport = groupData.periods.find(p => p.id === id);
      if (!periodToExport) {
          showToast('Der zu exportierende Zeitraum wurde nicht gefunden.', 'error');
          return;
      }
      const periodData: GroupData = {
          ...groupData,
          periods: [periodToExport]
      };
      const suggestedName = `${periodToExport.name.replace(/\s/g, '_')}_${groupData.groupName.replace(/\s/g, '_')}.klgrpperiod`;
      
      const handle = await fileSystemAccess.createFile({...groupPeriodFileOptions, suggestedName});
      if (handle) {
          await fileSystemAccess.writeFile(handle, JSON.stringify(periodData, null, 2));
          showToast(`Zeitraum '${periodToExport.name}' wurde als ${handle.name} exportiert.`, 'success');
      }
  }, [groupData, showToast, isDemoMode]);

  const handleStartTracking = () => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
    setEvents([]);
    setChildCount(0);
    setIsTracking(true);
  };

  const recordEvent = (type: 'arrival' | 'departure') => {
    setEvents(prev => [...prev, { timestamp: Date.now(), type }]);
    setChildCount(prev => type === 'arrival' ? prev + 1 : Math.max(0, prev - 1));
  };

  const handleFinishTracking = () => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); setIsTracking(false); return; }
    if (!activePeriod || !groupData) return;

    const finishTimestamp = Date.now();
    const today = toLocalDateString(new Date(finishTimestamp));
    
    const timeline = processEventsToTimeline(events, liveOpeningTime, liveClosingTime, finishTimestamp);
    
    const newDatedTimeline: DatedTimeline = { date: today, timeline };
    
    const updatedPeriods = groupData.periods.map(p => {
        if (p.id === activePeriodId) {
            const existingTimelineIndex = p.datedTimelines.findIndex(dt => dt.date === today);
            let newTimelines = [...p.datedTimelines];
            if (existingTimelineIndex > -1) {
                newTimelines[existingTimelineIndex] = newDatedTimeline;
            } else {
                newTimelines.push(newDatedTimeline);
            }
            newTimelines.sort((a, b) => b.date.localeCompare(a.date));
            return { ...p, datedTimelines: newTimelines };
        }
        return p;
    });

    setGroupData({ ...groupData, periods: updatedPeriods });
    setIsTracking(false);
    setViewDate(today);
  };
  
  const handleSaveManualEntry: ManualGroupEditorProps['onSave'] = ({ openingTime, closingTime, date, timeline }) => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
    if (!activePeriod || !groupData) {
        showToast("Kein aktiver Zeitraum ausgewählt.", 'error');
        return;
    }

    const newDatedTimeline: DatedTimeline = { date, timeline };
    const updatedPeriods = groupData.periods.map(p => {
        if (p.id === activePeriodId) {
            const updatedPeriod = { ...p, openingTime, closingTime };
            const existingTimelineIndex = updatedPeriod.datedTimelines.findIndex(dt => dt.date === date);
            let newTimelines = [...updatedPeriod.datedTimelines];
            if (existingTimelineIndex > -1) {
                newTimelines[existingTimelineIndex] = newDatedTimeline;
            } else {
                newTimelines.push(newDatedTimeline);
            }
            newTimelines.sort((a, b) => b.date.localeCompare(a.date));
            return { ...updatedPeriod, datedTimelines: newTimelines };
        }
        return p;
    });

    setGroupData({ ...groupData, periods: updatedPeriods });
    showToast(`Manuelle Erfassung für ${new Date(date + 'T00:00:00').toLocaleDateString('de-DE')} gespeichert.`, 'success');
    setViewDate(date);
    setViewMode('day');
  };

  const handleDeleteSession = (periodId: string, date: string) => {
      if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
      setSessionToDelete({ periodId, date });
  };
  
  const confirmDelete = () => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); setSessionToDelete(null); return; }
    if (!sessionToDelete || !groupData) return;
    const { periodId, date } = sessionToDelete;

    const updatedPeriods = groupData.periods.map(p => {
        if (p.id === periodId) {
            const newTimelines = p.datedTimelines.filter(dt => dt.date !== date);
            return { ...p, datedTimelines: newTimelines };
        }
        return p;
    });

    setGroupData({ ...groupData, periods: updatedPeriods });
    setSessionToDelete(null);
  };

  const handleSaveACopy = useCallback(async () => {
    if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
    if (!groupData || !fileHandle) { return; }
    const suggestedName = `Kopie_${fileHandle.name.replace(/\.nfgruppe$/, '.klgruppe').replace(/\.kl-gruppe$/, '.klgruppe')}`;
    
    if (fileSystemAccess.isSupported() && consentStatus === 'accepted') {
        const handle = await fileSystemAccess.createFile({...groupFileOptions, suggestedName});
        if (handle) {
            await fileSystemAccess.writeFile(handle, JSON.stringify(groupData, null, 2));
            showToast(`Kopie wurde als ${handle.name} gespeichert.`, 'success');
        }
    } else {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(groupData, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = suggestedName;
        link.click();
    }
  }, [groupData, consentStatus, showToast, fileHandle, isDemoMode]);

  const changeDate = (direction: 'prev' | 'next') => {
      const currentDate = new Date(viewDate + 'T00:00:00');
      const amount = direction === 'prev' ? -1 : 1;
      if (viewMode === 'day') currentDate.setDate(currentDate.getDate() + amount);
      else if (viewMode === 'week') currentDate.setDate(currentDate.getDate() + (amount * 7));
      setViewDate(toLocalDateString(currentDate));
  };

  const handleJumpToFirst = () => {
    if (activePeriod && activePeriod.datedTimelines.length > 0) {
        // Find the earliest date manually to be safe, instead of relying on sort order.
        const firstDate = activePeriod.datedTimelines.map(dt => dt.date).reduce((min, p) => p < min ? p : min);
        setViewDate(firstDate);
        showToast(`Zum Datum der ersten Erfassung gesprungen: ${new Date(firstDate + 'T00:00:00').toLocaleDateString('de-DE')}`, 'info');
    } else {
        showToast('Keine Erfassungen in diesem Zeitraum gefunden.', 'info');
    }
  };

  const toggleCareType = (type: CareType, currentTypes: CareType[], setTypes: (types: CareType[]) => void) => {
      if (currentTypes.includes(type)) {
          setTypes(currentTypes.filter(t => t !== type));
      } else {
          setTypes([...currentTypes, type]);
      }
  };

  const displayedSessions = useMemo(() => {
      if (!activePeriod) return [];
      switch (viewMode) {
          case 'week':
              const { startDate, endDate } = getWeekDetails(new Date(viewDate + 'T12:00:00Z'));
              return activePeriod.datedTimelines.filter(s => s.date >= startDate && s.date <= endDate).sort((a, b) => a.date.localeCompare(b.date));
          case 'all': return activePeriod.datedTimelines;
          default: return activePeriod.datedTimelines.filter(s => s.date === viewDate);
      }
  }, [activePeriod, viewMode, viewDate]);
  
  if (isTracking) {
    return (
      <Card>
        <div className="flex justify-between items-center mb-6"> <h2 className="text-xl font-bold">{groupData?.groupName}</h2> <Button onClick={handleFinishTracking} variant="secondary">Erfassung beenden & Auswerten</Button> </div>
        <div className="text-center">
          <p className="text-lg text-slate-600 mb-2">Aktuell anwesende Kinder</p> <p className="text-8xl font-bold mb-8">{childCount}</p>
          <div className="flex justify-center gap-4"> <Button onClick={() => recordEvent('arrival')} className="w-40 h-20 text-3xl bg-green-500 hover:bg-green-600">+</Button> <Button onClick={() => recordEvent('departure')} className="w-40 h-20 text-3xl bg-red-500 hover:bg-red-600">-</Button> </div>
        </div>
      </Card>
    );
  }

  if (consentStatus !== 'accepted' && !isDemoMode) {
    return <WarningBanner />;
  }
  
  if (!fileHandle && !isDemoMode) {
    return (
        <>
            <Modal isOpen={isCreateModalOpen}>
                <h3 className="text-lg font-bold mb-4">Neue Gruppendatei erstellen</h3>
                <div className="space-y-4">
                    <Input label="Name der Gruppe" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="z.B. Sonnenschein-Gruppe"/>
                    <div>
                        <label htmlFor="ageGroupSelect" className="block text-sm font-medium text-slate-700 mb-1">Altersstruktur</label>
                        <select
                            id="ageGroupSelect"
                            value={newGroupAge}
                            onChange={e => setNewGroupAge(e.target.value as AgeGroup)}
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
                                    onClick={() => toggleCareType(type, newGroupCareTypes, setNewGroupCareTypes)}
                                    className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${newGroupCareTypes.includes(type) ? 'bg-[#00BCD4] text-white border-[#00BCD4]' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                                >
                                    {type === 'VO' ? 'VÖ' : type}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Abbrechen</Button>
                    <Button onClick={handleCreateFile}>Erstellen & Speichern</Button>
                </div>
            </Modal>
            <Card className="text-center">
                <h2 className="text-2xl font-bold mb-2 text-slate-800">Willkommen bei Kitalytics</h2>
                <p className="mb-6 text-slate-600">Um zu beginnen, erstellen Sie eine neue Gruppendatei oder öffnen Sie eine bereits bestehende Datei.</p>
                <div className="flex justify-center gap-4">
                    <Button onClick={() => setIsCreateModalOpen(true)}>Neue Gruppendatei erstellen</Button>
                    <Button onClick={handleOpenFile} variant="secondary">Bestehende Datei öffnen</Button>
                </div>
            </Card>
        </>
    );
  }

  if (!groupData) {
      return <Card><p className="text-center text-slate-500">Daten werden geladen...</p></Card>
  }

  return (
    <div className="space-y-6">
       <Modal isOpen={!!sessionToDelete}>
        <h3 className="text-lg font-bold mb-2">Löschen bestätigen</h3> <p>Sind Sie sicher, dass Sie diese Erfassung unwiderruflich löschen möchten?</p>
        <div className="flex justify-end gap-4 mt-6"> <Button variant="secondary" onClick={() => setSessionToDelete(null)}>Abbrechen</Button> <Button variant="danger" onClick={confirmDelete}>Löschen</Button> </div>
      </Modal>

      <Modal isOpen={!!sessionToEdit} size="4xl">
          {sessionToEdit && activePeriod && groupData && (
              <ManualGroupEditor
                  onSave={(data) => {
                      handleSaveManualEntry(data);
                      setSessionToEdit(null);
                  }}
                  onCancel={() => setSessionToEdit(null)}
                  initialGroupName={groupData.groupName}
                  isGroupNameDisabled={true}
                  initialOpeningTime={activePeriod.openingTime}
                  initialClosingTime={activePeriod.closingTime}
                  initialDate={sessionToEdit.date}
                  initialTimeline={sessionToEdit.timeline}
                  isDemoMode={isDemoMode}
              />
          )}
      </Modal>

      <Card>
          <div className="flex flex-wrap items-end gap-4 mb-4">
              <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">{groupData.groupName}</h2>
                  <div className="flex flex-wrap gap-4">
                      <Input
                          className="max-w-xs"
                          label="Name der Gruppe ändern"
                          id="group-name-edit"
                          value={groupData.groupName}
                          onChange={e => {
                              if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
                              if (groupData) {
                                  setGroupData({ ...groupData, groupName: e.target.value });
                              }
                          }}
                          disabled={isDemoMode}
                      />
                      <div className="w-full sm:w-auto">
                        <label htmlFor="group-age-edit" className="block text-sm font-medium text-slate-700 mb-1">Altersstruktur</label>
                        <select
                            id="group-age-edit"
                            value={groupData.ageGroup || 'ue3'}
                            onChange={e => {
                                if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
                                if (groupData) {
                                    setGroupData({ ...groupData, ageGroup: e.target.value as AgeGroup });
                                }
                            }}
                            disabled={isDemoMode}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]"
                        >
                            <option value="u3">U3</option>
                            <option value="ue3">Ü3</option>
                            <option value="mixed">Gemischt</option>
                        </select>
                      </div>
                      <div className="w-full sm:w-auto">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Betreuungsform</label>
                        <div className="flex gap-1 h-[42px] items-center">
                            {(['VO', 'GT', 'RG'] as CareType[]).map(type => (
                                <button
                                    key={type}
                                    onClick={() => {
                                        if (isDemoMode) { showToast("Diese Funktion ist im Demo-Modus deaktiviert.", "info"); return; }
                                        if (groupData) {
                                            const current = groupData.careTypes || [];
                                            const newTypes = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
                                            setGroupData({ ...groupData, careTypes: newTypes });
                                        }
                                    }}
                                    disabled={isDemoMode}
                                    className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${groupData.careTypes?.includes(type) ? 'bg-[#00BCD4] text-white border-[#00BCD4]' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                                >
                                    {type === 'VO' ? 'VÖ' : type}
                                </button>
                            ))}
                        </div>
                      </div>
                  </div>
              </div>
          </div>
          <TimePeriodManager
              periods={groupData.periods}
              activePeriodId={activePeriodId}
              onSelectPeriod={setActivePeriodId}
              onCreatePeriod={handleCreatePeriod}
              onRenamePeriod={handleRenamePeriod}
              onDeletePeriod={handleDeletePeriod}
              onExportPeriod={handleExportPeriod}
              roleName="Gruppe"
              consentStatus={consentStatus}
              isDemoMode={isDemoMode}
          />
          {fileHandle && !isDemoMode && (
              <div className="mt-4 p-3 bg-[#E0F7FA] border border-[#B2EBF2] rounded-md text-sm">
                  <span className="font-semibold text-[#00838F]">Aktive Datei:</span> {fileHandle.name}
                  <span className={`ml-4 ${isDirty ? 'text-amber-600' : 'text-green-600'}`}>{isDirty ? 'Änderungen werden gespeichert...' : 'Gespeichert'}</span>
              </div>
          )}
      </Card>
      
       <Card>
        <h3 className="text-lg font-semibold mb-2">Datenverwaltung</h3>
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div/>
            <div>
                <p className="text-sm text-slate-600 flex-grow mb-2"> Speichern Sie eine Kopie aller Daten. </p>
                <Button onClick={handleSaveACopy} variant="secondary" disabled={isDemoMode}> Kopie speichern </Button>
            </div>
        </div>
      </Card>

      {activePeriod ? (
        <>
          <Card>
            <Tabs>
              <Tab isActive={mode === 'live'} onClick={() => setMode('live')}>Live-Erfassung</Tab>
              <Tab isActive={mode === 'manual'} onClick={() => setMode('manual')}>Manuelle Erfassung</Tab>
              <Tab isActive={mode === 'stats'} onClick={() => setMode('stats')}>Statistik</Tab>
            </Tabs>
            <div className="pt-6">
              {mode === 'live' && (
                 <div className="space-y-4">
                    <h2 className="text-xl font-bold">Neue Live-Erfassung starten</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <Input label="Öffnungszeit" id="openingTime" type="time" value={liveOpeningTime} onChange={e => setLiveOpeningTime(e.target.value)} disabled={isDemoMode} />
                        <Input label="Schließzeit" id="closingTime" type="time" value={liveClosingTime} onChange={e => setLiveClosingTime(e.target.value)} disabled={isDemoMode} />
                    </div>
                     <p className="text-sm text-slate-500 mt-2">Die Zeiten werden aus dem aktiven Zeitraum übernommen, können aber für diese Erfassung angepasst werden.</p>
                     <div className="mt-6 text-right"> <Button onClick={handleStartTracking} disabled={isDemoMode}>Erfassung starten</Button> </div>
                 </div>
              )}
              {mode === 'manual' && <ManualGroupEditor onSave={handleSaveManualEntry} initialGroupName={groupData.groupName} isGroupNameDisabled={true} initialOpeningTime={activePeriod.openingTime} initialClosingTime={activePeriod.closingTime} isDemoMode={isDemoMode} />}
              {mode === 'stats' && <EducatorStatisticsView group={groupData} activePeriodId={activePeriodId} />}
            </div>
          </Card>
          
          <div>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
              <h2 className="text-2xl font-bold">Abgeschlossene Erfassungen</h2>
              <div className="flex items-center gap-4">
                  <Button
                      onClick={handleJumpToFirst}
                      variant="secondary"
                      className="px-3 py-1 text-sm"
                      disabled={!activePeriod || activePeriod.datedTimelines.length === 0}
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
            
            {activePeriod.datedTimelines.length > 0 && (
              <div className="p-4 bg-slate-100 rounded-lg mb-4">
                  <h4 className="text-md font-semibold mb-2 text-slate-800">Niedrige Auslastung definieren</h4>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      <div className="flex items-center gap-4">
                          <div className="flex items-center"> <input type="radio" id="percent-educator" name="threshold-educator" value="percent" checked={thresholdType === 'percent'} onChange={() => { setThresholdType('percent'); setThresholdValue(25);}} className="h-4 w-4 text-[#00BCD4] border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" /> <label htmlFor="percent-educator" className="ml-2 block text-sm font-medium text-slate-700">Prozentual</label> </div>
                           <div className="flex items-center"> <input type="radio" id="absolute-educator" name="threshold-educator" value="absolute" checked={thresholdType === 'absolute'} onChange={() => { setThresholdType('absolute'); setThresholdValue(5); }} className="h-4 w-4 text-[#00BCD4] border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" /> <label htmlFor="absolute-educator" className="ml-2 block text-sm font-medium text-slate-700">Absoluter Wert</label> </div>
                      </div>
                      <div className="flex items-center gap-2"> <input type="number" value={thresholdValue} onChange={e => setThresholdValue(Number(e.target.value))} className="w-24 px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4]" /> <span className="text-sm text-slate-600">{thresholdType === 'percent' ? '% der Spitze' : 'Kinder'}</span> </div>
                  </div>
              </div>
            )}

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
            
            {displayedSessions.length === 0 ? (
               <Card> <p className="text-slate-500 text-center">Für den ausgewählten Zeitraum wurden keine Erfassungen gefunden.</p> </Card>
            ) : (
              <div className="space-y-6">
                {displayedSessions.map((session) => {
                  const maxCount = Math.max(0, ...session.timeline.map(d => d.count));
                  const lowThreshold = thresholdType === 'percent' ? maxCount * (thresholdValue / 100) : thresholdValue;
                  const timelineWithThreshold = session.timeline.map(d => ({ ...d, isLow: d.count > 0 && d.count <= lowThreshold }));
                  return (
                    <Card key={session.date}>
                      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                        <h3 className="text-xl font-bold">{groupData.groupName} - {new Date(session.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                        <div className="flex gap-2">
                          <Button onClick={() => setSessionToEdit(session)} variant="secondary" disabled={isDemoMode}>Bearbeiten</Button>
                          <Button onClick={() => handleDeleteSession(activePeriodId!, session.date)} variant="danger" disabled={isDemoMode}>Löschen</Button>
                        </div>
                      </div>
                      <TimelineChart data={timelineWithThreshold} title={`Frequenzverlauf`} />
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <Card>
            <p className="text-center text-slate-500">
                Kein Zeitraum ausgewählt. Bitte wählen oder erstellen Sie einen Zeitraum, um Daten anzuzeigen oder zu erfassen.
            </p>
        </Card>
      )}
    </div>
  );
};
