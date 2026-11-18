import type {
  LocalDailyActivityRecord,
  LocalProfileRecord,
  LocalReviewStateRecord,
  LocalUnitProgressRecord,
} from '../db/dexie';

/**
 * Spaced repetition intervals in days required by Section 2 & 6 of the master prompt:
 * Step 1 -> +1 day
 * Step 2 -> +3 days
 * Step 3 -> +7 days
 * Step 4 -> +14 days
 */
export const REVIEW_INTERVAL_DAYS: Record<number, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
};

/**
 * Computes the next review state step and due timestamp according to the 1 -> 3 -> 7 -> 14 schedule.
 */
export function computeNextReviewSchedule(
  currentStep: number | null,
  now: Date = new Date(),
): { step: number; dueAt: string } {
  const nextStep = currentStep === null || currentStep < 1 ? 1 : Math.min(currentStep + 1, 5);
  const daysToAdd = REVIEW_INTERVAL_DAYS[nextStep] ?? 14;
  const dueDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return {
    step: nextStep,
    dueAt: dueDate.toISOString(),
  };
}

/**
 * Formats a Date object as local YYYY-MM-DD string.
 */
export function toLocalDayString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes current streak (consecutive days with xp > 0 ending today or yesterday).
 */
export function computeStreakDays(
  activities: readonly LocalDailyActivityRecord[],
  todayStr: string = toLocalDayString(),
): number {
  const activeDays = new Set(activities.filter((a) => a.xp > 0).map((a) => a.day));
  if (activeDays.size === 0) return 0;

  const parseDay = (dayStr: string): Date => {
    const [y, m, d] = dayStr.split('-').map((n) => Number.parseInt(n, 10));
    return new Date(y!, m! - 1, d!);
  };

  let cursor = parseDay(todayStr);
  if (!activeDays.has(todayStr)) {
    // Check if streak is still alive from yesterday
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
    if (!activeDays.has(toLocalDayString(cursor))) {
      return 0;
    }
  }

  let streak = 0;
  while (activeDays.has(toLocalDayString(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }
  return streak;
}

/**
 * Last-Write-Wins (LWW) comparison by ISO-8601 `updatedAt`.
 * Returns true if `a` is strictly newer than or equal to `b`.
 */
export function isNewerOrEqual(aIso: string, bIso: string): boolean {
  return new Date(aIso).getTime() >= new Date(bIso).getTime();
}

/**
 * 1. Merge `profiles`: Last-Write-Wins by `updatedAt`.
 */
export function mergeProfile(
  local: LocalProfileRecord,
  remote: LocalProfileRecord,
): LocalProfileRecord {
  if (isNewerOrEqual(local.updatedAt, remote.updatedAt)) {
    return {
      ...local,
      userId: remote.userId ?? local.userId,
      email: remote.email ?? local.email,
    };
  }
  return {
    ...remote,
    id: 'current',
  };
}

function maxNullable(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

function minIsoNullable(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

/**
 * 2. Merge `unit_progress`:
 * Preserves best skill scores (`Math.max`) and `wordsDone` (`||`) across devices/guest mode,
 * while taking the newer `updatedAt`.
 */
export function mergeUnitProgress(
  local: LocalUnitProgressRecord,
  remote: LocalUnitProgressRecord,
): LocalUnitProgressRecord {
  const speakingBest = maxNullable(local.speakingBest, remote.speakingBest);
  const listeningBest = maxNullable(local.listeningBest, remote.listeningBest);
  const writingBest = maxNullable(local.writingBest, remote.writingBest);
  const readingBest = maxNullable(local.readingBest, remote.readingBest);
  const wordsDone = local.wordsDone || remote.wordsDone;
  const completedAt = minIsoNullable(local.completedAt, remote.completedAt);
  const updatedAt = isNewerOrEqual(local.updatedAt, remote.updatedAt)
    ? local.updatedAt
    : remote.updatedAt;

  return {
    unitId: local.unitId,
    courseId: local.courseId,
    wordsDone,
    speakingBest,
    listeningBest,
    writingBest,
    readingBest,
    completedAt,
    updatedAt,
  };
}

/**
 * 3. Merge `review_state`: Last-Write-Wins by `updatedAt`.
 */
export function mergeReviewState(
  local: LocalReviewStateRecord,
  remote: LocalReviewStateRecord,
): LocalReviewStateRecord {
  return isNewerOrEqual(local.updatedAt, remote.updatedAt) ? { ...local } : { ...remote };
}

/**
 * 4. Merge `daily_activity`:
 * Per Section 4.2 of the master prompt: "для daily_activity берётся максимум".
 */
export function mergeDailyActivity(
  local: LocalDailyActivityRecord,
  remote: LocalDailyActivityRecord,
): LocalDailyActivityRecord {
  const updatedAt = isNewerOrEqual(local.updatedAt, remote.updatedAt)
    ? local.updatedAt
    : remote.updatedAt;
  return {
    day: local.day,
    xp: Math.max(local.xp, remote.xp),
    lessons: Math.max(local.lessons, remote.lessons),
    seconds: Math.max(local.seconds, remote.seconds),
    updatedAt,
  };
}
