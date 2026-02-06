
import { TimestampEvent, TimelineDataPoint } from '../types';

/**
 * Parses a time string (HH:MM) and sets it on a given date.
 */
const parseTime = (timeStr: string, date: Date = new Date()): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
};

/**
 * Calculates the number of children present at a specific time based on event history.
 */
const calculateCountAtTime = (time: number, events: TimestampEvent[]): number => {
  return events
    .filter(event => event.timestamp <= time)
    .reduce((acc, event) => acc + (event.type === 'arrival' ? 1 : -1), 0);
};

/**
 * Processes a list of arrival/departure events into a 15-minute interval timeline.
 */
export const processEventsToTimeline = (
  events: TimestampEvent[],
  openingTime: string,
  closingTime: string,
  finishTimestamp?: number
): TimelineDataPoint[] => {
  if (!openingTime || !closingTime) {
    return [];
  }

  const timeline: TimelineDataPoint[] = [];
  const startTime = parseTime(openingTime);
  const plannedEndTime = parseTime(closingTime);

  // If there are no events, create a baseline timeline from opening to closing.
  if (events.length === 0) {
    let emptyCurrentTime = new Date(startTime);
    while(emptyCurrentTime <= plannedEndTime) {
      timeline.push({
        time: emptyCurrentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        count: 0
      });
      emptyCurrentTime.setMinutes(emptyCurrentTime.getMinutes() + 15);
    }
    return timeline;
  }

  // Determine the actual end time. It's the later of the planned closing time or when the session was finished.
  const effectiveEndTimestamp = Math.max(plannedEndTime.getTime(), finishTimestamp || 0);

  let currentTime = new Date(startTime);

  // Loop until we have passed the effective end of the session.
  while (currentTime.getTime() <= effectiveEndTimestamp) {
    const count = calculateCountAtTime(currentTime.getTime(), events);
    timeline.push({
      time: currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      count: count,
    });
    currentTime.setMinutes(currentTime.getMinutes() + 15);
  }

  return timeline;
};


/**
 * Triggers a browser download for a JSON object.
 */
export const downloadJson = (data: object, filename: string): void => {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2)
  )}`;
  const link = document.createElement("a");
  link.href = jsonString;
  link.download = filename;
  link.click();
};

/**
 * Reads a file from a file input event and parses it as JSON.
 */
export const readJsonFile = <T,>(file: File): Promise<T> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (event.target && typeof event.target.result === 'string') {
          const json = JSON.parse(event.target.result);
          resolve(json as T);
        } else {
          reject(new Error('Failed to read file content.'));
        }
      } catch (error) {
        reject(new Error('Failed to parse JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file.'));
    reader.readAsText(file);
  });
};

/**
 * Formats a Date object into a YYYY-MM-DD string, respecting the local date.
 */
export const toLocalDateString = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};


/**
 * Calculates the week number, start date (Monday), and end date (Sunday) for a given date.
 */
export const getWeekDetails = (d: Date) => {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate()); // Normalize to midnight local time
    const dayOfWeek = date.getDay(); // Sunday - 0, Monday - 1, ...
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(date.setDate(diff));
    
    const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));
    
    const yearStart = new Date(date.getFullYear(), 0, 1);
    // @ts-ignore - Substracting dates is valid in JS
    const weekNo = Math.ceil((((monday - yearStart) / 86400000) + 1) / 7);

    return {
        weekNumber: weekNo,
        startDate: toLocalDateString(monday),
        endDate: toLocalDateString(sunday),
    };
};

/**
 * Formats a date range string for display.
 */
export const formatDateRange = (startDateStr: string, endDateStr: string, weekNumber: number) => {
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `KW ${weekNumber}: ${start.toLocaleDateString('de-DE', options)} - ${end.toLocaleDateString('de-DE', { ...options, year: 'numeric' })}`;
};