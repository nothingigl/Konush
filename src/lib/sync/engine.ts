import type { CourseId } from '../content/schema';
import {
  getDefaultLocalProfile,
  getLocalDb,
  type LocalDailyActivityRecord,
  type LocalProfileRecord,
  type LocalReviewStateRecord,
  type LocalUnitProgressRecord,
  type SkillKey,
  type SyncTableName,
  type TurkceDuoDatabase,
} from '../db/dexie';
import { computeNextReviewSchedule, toLocalDayString } from './merge';

/**
 * Enqueues or updates a pending change in `syncQueue` (deduplicating by table + recordKey
 * except for append-only `content_feedback`).
 */
export async function enqueueSyncChange(
  db: TurkceDuoDatabase,
  table: SyncTableName,
  recordKey: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const nowIso = new Date().toISOString();
  if (table !== 'content_feedback') {
    const existing = await db.syncQueue
      .where('[table+recordKey]')
      .equals([table, recordKey])
      .first()
      .catch(async () => {
        const all = await db.syncQueue.where('table').equals(table).toArray();
        return all.find((item) => item.recordKey === recordKey);
      });

    if (existing?.id !== undefined) {
      await db.syncQueue.update(existing.id, {
        payload,
        createdAt: nowIso,
      });
      return;
    }
  }

  await db.syncQueue.add({
    table,
    recordKey,
    payload,
    createdAt: nowIso,
    attempts: 0,
  });
}

/**
 * Ensures the singleton `localProfile` row exists in Dexie.
 */
export async function ensureLocalProfile(
  db: TurkceDuoDatabase = getLocalDb(),
): Promise<LocalProfileRecord> {
  const existing = await db.localProfile.get('current');
  if (existing) return existing;
  const def = getDefaultLocalProfile();
  await db.localProfile.put(def);
  return def;
}

/**
 * Updates user profile preferences locally in Dexie and enqueues a sync item.
 */
export async function updateLocalProfilePreferences(
  patch: Partial<
    Pick<
      LocalProfileRecord,
      | 'displayName'
      | 'preferredCourse'
      | 'dailyGoalXp'
      | 'avatarKey'
      | 'theme'
      | 'speechRate'
      | 'fontScale'
      | 'onboardingDone'
    >
  >,
  db: TurkceDuoDatabase = getLocalDb(),
): Promise<LocalProfileRecord> {
  const current = await ensureLocalProfile(db);
  const nowIso = new Date().toISOString();
  const updated: LocalProfileRecord = {
    ...current,
    ...patch,
    updatedAt: nowIso,
  };
  await db.localProfile.put(updated);
  await enqueueSyncChange(db, 'profiles', 'current', {
    display_name: updated.displayName,
    avatar_key: updated.avatarKey,
    ui_lang: updated.uiLang,
    preferred_course: updated.preferredCourse,
    daily_goal_xp: updated.dailyGoalXp,
    updated_at: updated.updatedAt,
  });
  return updated;
}

/**
 * Marks a unit's vocabulary list as reviewed ("РџСЂРѕС‡РёС‚Р°Р№С‚Рµ СЃРїРёСЃРѕРє РІСЃР»СѓС… РґРІР° СЂР°Р·Р°") in Dexie.
 */
export async function recordWordsCompleted(
  unitId: string,
  courseId: CourseId,
  db: TurkceDuoDatabase = getLocalDb(),
): Promise<LocalUnitProgressRecord> {
  const nowIso = new Date().toISOString();
  const existing = await db.unitProgress.get(unitId);

  const updated: LocalUnitProgressRecord = existing
    ? {
        ...existing,
        wordsDone: true,
        updatedAt: nowIso,
      }
    : {
        unitId,
        courseId,
        wordsDone: true,
        speakingBest: null,
        listeningBest: null,
        writingBest: null,
        readingBest: null,
        completedAt: null,
        updatedAt: nowIso,
      };

  await db.unitProgress.put(updated);
  await enqueueSyncChange(db, 'unit_progress', unitId, {
    unit_id: updated.unitId,
    course_id: updated.courseId,
    words_done: updated.wordsDone,
    speaking_best: updated.speakingBest,
    listening_best: updated.listeningBest,
    writing_best: updated.writingBest,
    reading_best: updated.readingBest,
    completed_at: updated.completedAt,
    updated_at: updated.updatedAt,
  });

  return updated;
}

/**
 * Records completion of a skill session (or boss challenge):
 * 1. Updates `unitProgress` in Dexie (keeping best score 0..100);
 * 2. If all 4 skills are completed, marks `completedAt` and schedules/advances `reviewState` (1->3->7->14d);
 * 3. Adds earned XP, lesson count, and practice seconds to today's `dailyActivity`;
 * 4. Enqueues all modified records in `syncQueue`.
 */
export async function recordSkillSessionCompleted(
  params: {
    unitId: string;
    courseId: CourseId;
    skill: SkillKey;
    scorePercent: number;
    xpEarned: number;
    durationSeconds: number;
    isBoss?: boolean;
  },
  db: TurkceDuoDatabase = getLocalDb(),
): Promise<{
  progress: LocalUnitProgressRecord;
  daily: LocalDailyActivityRecord;
  review: LocalReviewStateRecord | null;
}> {
  const now = new Date();
  const nowIso = now.toISOString();
  const clampedScore = Math.max(0, Math.min(100, Math.round(params.scorePercent)));

  const existing = await db.unitProgress.get(params.unitId);
  const base: LocalUnitProgressRecord = existing ?? {
    unitId: params.unitId,
    courseId: params.courseId,
    wordsDone: Boolean(params.isBoss),
    speakingBest: null,
    listeningBest: null,
    writingBest: null,
    readingBest: null,
    completedAt: null,
    updatedAt: nowIso,
  };

  const speakingBest =
    params.skill === 'speaking' || params.isBoss
      ? Math.max(base.speakingBest ?? 0, clampedScore)
      : base.speakingBest;
  const listeningBest =
    params.skill === 'listening' || params.isBoss
      ? Math.max(base.listeningBest ?? 0, clampedScore)
      : base.listeningBest;
  const writingBest =
    params.skill === 'writing' || params.isBoss
      ? Math.max(base.writingBest ?? 0, clampedScore)
      : base.writingBest;
  const readingBest =
    params.skill === 'reading' || params.isBoss
      ? Math.max(base.readingBest ?? 0, clampedScore)
      : base.readingBest;

  const allSkillsDone =
    speakingBest !== null && listeningBest !== null && writingBest !== null && readingBest !== null;

  const completedAt = base.completedAt ?? (allSkillsDone ? nowIso : null);

  const progress: LocalUnitProgressRecord = {
    unitId: params.unitId,
    courseId: params.courseId,
    wordsDone: base.wordsDone || Boolean(params.isBoss),
    speakingBest,
    listeningBest,
    writingBest,
    readingBest,
    completedAt,
    updatedAt: nowIso,
  };

  await db.unitProgress.put(progress);
  await enqueueSyncChange(db, 'unit_progress', progress.unitId, {
    unit_id: progress.unitId,
    course_id: progress.courseId,
    words_done: progress.wordsDone,
    speaking_best: progress.speakingBest,
    listening_best: progress.listeningBest,
    writing_best: progress.writingBest,
    reading_best: progress.readingBest,
    completed_at: progress.completedAt,
    updated_at: progress.updatedAt,
  });

  // Update spaced repetition schedule if unit is completed
  let review: LocalReviewStateRecord | null = null;
  if (allSkillsDone && !params.isBoss) {
    const existingReview = await db.reviewState.get(params.unitId);
    const shouldAdvance =
      !existingReview || new Date(existingReview.dueAt).getTime() <= now.getTime();
    if (shouldAdvance) {
      const nextSchedule = computeNextReviewSchedule(existingReview?.step ?? null, now);
      review = {
        unitId: params.unitId,
        courseId: params.courseId,
        step: nextSchedule.step,
        dueAt: nextSchedule.dueAt,
        updatedAt: nowIso,
      };
      await db.reviewState.put(review);
      await enqueueSyncChange(db, 'review_state', review.unitId, {
        unit_id: review.unitId,
        course_id: review.courseId,
        step: review.step,
        due_at: review.dueAt,
        updated_at: review.updatedAt,
      });
    } else {
      review = existingReview;
    }
  }

  // Update today's activity
  const todayStr = toLocalDayString(now);
  const existingDaily = await db.dailyActivity.get(todayStr);
  const daily: LocalDailyActivityRecord = {
    day: todayStr,
    xp: (existingDaily?.xp ?? 0) + Math.max(0, params.xpEarned),
    lessons: (existingDaily?.lessons ?? 0) + 1,
    seconds: (existingDaily?.seconds ?? 0) + Math.max(1, Math.round(params.durationSeconds)),
    updatedAt: nowIso,
  };

  await db.dailyActivity.put(daily);
  await enqueueSyncChange(db, 'daily_activity', daily.day, {
    day: daily.day,
    xp: daily.xp,
    lessons: daily.lessons,
    seconds: daily.seconds,
    updated_at: daily.updatedAt,
  });

  return { progress, daily, review };
}

/**
 * Enqueues a "Report an issue" feedback message from an exercise.
 */
export async function reportExerciseIssue(
  params: {
    courseId: CourseId;
    unitId: string;
    exerciseId: string;
    message: string;
  },
  db: TurkceDuoDatabase = getLocalDb(),
): Promise<void> {
  const trimmed = params.message.trim();
  if (trimmed.length < 3) {
    throw new Error(
      'РЎРѕРѕР±С‰РµРЅРёРµ РґРѕР»Р¶РЅРѕ СЃРѕРґРµСЂР¶Р°С‚СЊ РЅРµ РјРµРЅРµРµ 3 СЃРёРјРІРѕР»РѕРІ',
    );
  }
  await enqueueSyncChange(db, 'content_feedback', `${params.exerciseId}-${Date.now()}`, {
    course_id: params.courseId,
    unit_id: params.unitId,
    exercise_id: params.exerciseId,
    message: trimmed,
  });
}

export interface SyncStatusReport {
  state: 'idle' | 'syncing' | 'synced' | 'offline' | 'guest' | 'error';
  lastSyncedAt: string | null;
  pendingCount: number;
  errorMessage: string | null;
}

/**
 * Placeholder cloud synchronization hook.
 * Currently operates in local-only (IndexedDB / Dexie) mode until a cloud database
 * backend is connected. Conflict-resolution helpers remain in `merge.ts`.
 */
export async function synchronizeWithCloud(
  db: TurkceDuoDatabase = getLocalDb(),
): Promise<SyncStatusReport> {
  const pendingCount = await db.syncQueue.count();

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      state: 'offline',
      lastSyncedAt: null,
      pendingCount,
      errorMessage: null,
    };
  }

  return {
    state: 'guest',
    lastSyncedAt: null,
    pendingCount,
    errorMessage: null,
  };
}

/**
 * Clears all local IndexedDB records. When a cloud database is connected later,
 * remote account deletion will be triggered here prior to local reset.
 */
export async function deleteAccountAndLocalData(
  db: TurkceDuoDatabase = getLocalDb(),
): Promise<void> {
  await resetLocalData(db);
}

/**
 * Clears all local progress and resets profile to default Guest state.
 */
export async function resetLocalData(db: TurkceDuoDatabase = getLocalDb()): Promise<void> {
  await Promise.all([
    db.localProfile.clear(),
    db.unitProgress.clear(),
    db.reviewState.clear(),
    db.dailyActivity.clear(),
    db.syncQueue.clear(),
  ]);
  await ensureLocalProfile(db);
}
