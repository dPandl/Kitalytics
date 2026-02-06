
export interface TimestampEvent {
  timestamp: number;
  type: 'arrival' | 'departure';
}

export interface TimelineDataPoint {
  time: string;
  count: number;
  isLow?: boolean;
}

export interface DatedTimeline {
  date: string; // YYYY-MM-DD
  timeline: TimelineDataPoint[];
}

export interface Period {
  id: string;
  name: string;
  openingTime: string;
  closingTime: string;
  datedTimelines: DatedTimeline[];
}

export type AgeGroup = 'u3' | 'ue3' | 'mixed';
export type CareType = 'VO' | 'GT' | 'RG';

export interface GroupData {
  groupName: string;
  ageGroup?: AgeGroup; // New field for age structure
  careTypes?: CareType[]; // New field for care types (VÖ, GT, RG)
  periods: Period[];
  events?: TimestampEvent[]; // For live tracking state, not for files
}

export interface KindergartenData {
  kindergartenName: string;
  groups: GroupData[];
  periodNames?: string[];
}

export interface ReleaseNote {
  version: string;
  optionalTitle?: string;
  date: string;
  icon: React.ElementType;
  whatsNew: string[];
  bugFixes: string[];
  adjustments: string[];
}
