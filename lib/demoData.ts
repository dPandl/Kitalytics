
import { GroupData, KindergartenData, TimelineDataPoint, DatedTimeline, Period } from '../types';

// Utility to generate a single day's timeline
const generateTimeline = (date: string, maxCount: number, opening: string, closing: string): DatedTimeline => {
  const timeline: TimelineDataPoint[] = [];
  const [startHour] = opening.split(':').map(Number);
  const [endHour] = closing.split(':').map(Number);

  // Simple pseudo-random fluctuation
  const seed = date.split('-').reduce((acc, val) => acc + parseInt(val), 0);

  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      
      let count = 0;
      if (h < 9) { // ramp up
        count = Math.round(maxCount * ( (h - startHour) / (9 - startHour) + (m / 60) * 0.2 ));
      } else if (h >= 14) { // ramp down
        count = Math.round(maxCount * ( (endHour - h) / (endHour - 14) - (m/60) * 0.3 ));
      } else { // peak time
        count = maxCount;
      }
      
      // Add some noise
      const noise = Math.floor( ( (seed + h * 4 + m) % 5 ) - 2) * 0.1 * maxCount;
      count = Math.max(0, Math.round(count + noise));
      
      timeline.push({ time, count });
    }
  }
  return { date, timeline };
};

// --- Data for Educator View (Single Group) ---
const sonnenscheinPeriod: Period = {
    id: 'period-sonnenschein-1',
    name: 'Schuljahr 2023/24',
    openingTime: '07:30',
    closingTime: '16:00',
    datedTimelines: [
        generateTimeline('2024-05-20', 18, '07:30', '16:00'),
        generateTimeline('2024-05-21', 20, '07:30', '16:00'),
        generateTimeline('2024-05-22', 22, '07:30', '16:00'),
        generateTimeline('2024-05-23', 21, '07:30', '16:00'),
        generateTimeline('2024-05-24', 15, '07:30', '16:00'),
    ]
};

export const demoEducatorGroupData: GroupData = {
    groupName: 'Sonnenschein-Gruppe',
    ageGroup: 'ue3',
    careTypes: ['VO', 'GT'],
    periods: [sonnenscheinPeriod]
};


// --- Data for Director View (One Kindergarten, Multiple Groups) ---
const regenbogenPeriod: Period = {
    id: 'period-regenbogen-1',
    name: 'Schuljahr 2023/24',
    openingTime: '07:00',
    closingTime: '16:30',
    datedTimelines: [
        generateTimeline('2024-05-20', 15, '07:00', '16:30'),
        generateTimeline('2024-05-21', 16, '07:00', '16:30'),
        generateTimeline('2024-05-22', 14, '07:00', '16:30'),
        generateTimeline('2024-05-23', 17, '07:00', '16:30'),
        generateTimeline('2024-05-24', 12, '07:00', '16:30'),
    ]
};

export const demoDirectorKindergartenData: KindergartenData = {
    kindergartenName: 'Kita Pusteblume',
    periodNames: ['Schuljahr 2023/24', 'Sommerferien 2024'],
    groups: [
        { groupName: 'Sonnenschein-Gruppe', ageGroup: 'ue3', careTypes: ['VO', 'GT'], periods: [sonnenscheinPeriod] },
        { groupName: 'Regenbogen-Gruppe', ageGroup: 'u3', careTypes: ['RG'], periods: [regenbogenPeriod] }
    ]
};


// --- Data for Admin View (Multiple Kindergartens) ---

// Second Kindergarten
const wolkenPeriod: Period = {
    id: 'period-wolken-1',
    name: 'Schuljahr 2023/24',
    openingTime: '08:00',
    closingTime: '15:00',
    datedTimelines: [
        generateTimeline('2024-05-21', 24, '08:00', '15:00'),
        generateTimeline('2024-05-22', 25, '08:00', '15:00'),
        generateTimeline('2024-05-23', 23, '08:00', '15:00'),
    ]
};
const sternePeriod: Period = {
    id: 'period-sterne-1',
    name: 'Schuljahr 2023/24',
    openingTime: '07:00',
    closingTime: '17:00',
    datedTimelines: [
        generateTimeline('2024-05-21', 18, '07:00', '17:00'),
        generateTimeline('2024-05-22', 19, '07:00', '17:00'),
        generateTimeline('2024-05-23', 18, '07:00', '17:00'),
    ]
};

const kitaWirbelwind: KindergartenData = {
    kindergartenName: 'Kita Wirbelwind',
    periodNames: ['Schuljahr 2023/24'],
    groups: [
        { groupName: 'Wolken-Stürmer', ageGroup: 'mixed', careTypes: ['VO'], periods: [wolkenPeriod] },
        { groupName: 'Sternen-Tänzer', ageGroup: 'ue3', careTypes: ['GT'], periods: [sternePeriod] }
    ]
};

export const demoAdminWorkspaceData = {
    periodNames: ['Schuljahr 2023/24', 'Sommerferien 2024'],
    kindergartens: [
        demoDirectorKindergartenData,
        kitaWirbelwind
    ]
};
