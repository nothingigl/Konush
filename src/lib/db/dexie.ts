import Dexie, { type EntityTable } from 'dexie';
import type { CourseId, Unit } from '../content/schema';

export type DailyGoalXp = 10 | 20 | 30;
export type SkillKey = 'speaking' | 'listening' | 'writing' | 'reading';
export type ThemePreference = 'light' | 'dark' | 'system';
export type SpeechRatePreference = 0.75 | 1.0 | 1.15;
export type FontScalePreference = 'normal' | 'large' | 'xlarge';

export interface LocalProfileRecord {
  id: 'current';
  userId: string | null;
  email: string | null;
  displayName: string;
  avatarKey: string;
  uiLang: 'ru';
  preferredCourse: CourseId;
  dailyGoalXp: DailyGoalXp;
  theme?: ThemePreference;
  speechRate?: SpeechRatePreference;
  fontScale?: FontScalePreference;
  onboardingDone?: boolean;
  updatedAt: string;
}

export interface LocalUnitProgressRecord {
  unitId: string;
  courseId: CourseId;
  wordsDone: boolean;
  speakingBest: number | null;
  listeningBest: number | null;
  writingBest: number | null;
  readingBest: number | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface LocalReviewStateRecord {
  unitId: string;
  courseId: CourseId;
  /**
   * 1 = +1 day, 2 = +3 days, 3 = +7 days, 4 = +14 days, 5 = graduated
   */
  step: number;
  dueAt: string;
  updatedAt: string;
}

export interface LocalDailyActivityRecord {
  /** YYYY-MM-DD in user's local timezone */
  day: string;
  xp: number;
  lessons: number;
  seconds: number;
  updatedAt: string;
}

export type SyncTableName =
  'profiles' | 'unit_progress' | 'review_state' | 'daily_activity' | 'content_feedback';

export interface SyncQueueItem {
  id?: number;
  table: SyncTableName;
  recordKey: string;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
}

export interface CachedUnitRecord {
  unitId: string;
  courseId: CourseId;
  slug: string;
  data: Unit;
  cachedAt: string;
}

export class TurkceDuoDatabase extends Dexie {
  localProfile!: EntityTable<LocalProfileRecord, 'id'>;
  unitProgress!: EntityTable<LocalUnitProgressRecord, 'unitId'>;
  reviewState!: EntityTable<LocalReviewStateRecord, 'unitId'>;
  dailyActivity!: EntityTable<LocalDailyActivityRecord, 'day'>;
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;
  cachedUnits!: EntityTable<CachedUnitRecord, 'unitId'>;

  constructor(name = 'TurkceDuoDB') {
    super(name);
    this.version(1).stores({
      localProfile: 'id',
      unitProgress: 'unitId, courseId, updatedAt',
      reviewState: 'unitId, courseId, dueAt, updatedAt',
      dailyActivity: 'day, updatedAt',
      syncQueue: '++id, table, recordKey, createdAt',
      cachedUnits: 'unitId, courseId, slug, cachedAt',
    });
  }
}

let dbInstance: TurkceDuoDatabase | null = null;

/**
 * Returns the singleton Dexie database in the browser.
 */
export function getLocalDb(): TurkceDuoDatabase {
  if (!dbInstance) {
    dbInstance = new TurkceDuoDatabase();
  }
  return dbInstance;
}

export function getDefaultLocalProfile(): LocalProfileRecord {
  return {
    id: 'current',
    userId: null,
    email: null,
    displayName: 'Гость',
    avatarKey: 'elif',
    uiLang: 'ru',
    preferredCourse: 'tr',
    dailyGoalXp: 20,
    theme: 'system',
    speechRate: 1.0,
    fontScale: 'normal',
    onboardingDone: false,
    updatedAt: new Date(0).toISOString(),
  };
}
