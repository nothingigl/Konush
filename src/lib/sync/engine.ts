import type { CourseId } from '../content/schema';
import {
  getDefaultLocalProfile,
  getLocalDb,
  type DailyGoalXp,
  type LocalDailyActivityRecord,
  type LocalProfileRecord,
  type LocalReviewStateRecord,
  type LocalUnitProgressRecord,
  type SkillKey,
  type SyncTableName,
  type TurkceDuoDatabase,
} from '../db/dexie';
import { getSupabaseBrowserClient } from '../supabase/client';
import {
  computeNextReviewSchedule,
  mergeDailyActivity,
  mergeProfile,
  mergeReviewState,
  mergeUnitProgress,
  toLocalDayString,
} from './merge';

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
    Pick<LocalProfileRecord, 'displayName' | 'preferredCourse' | 'dailyGoalXp' | 'avatarKey'>
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
 * Marks a unit's vocabulary list as reviewed ("Прочитайте список вслух два раза") in Dexie.
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
    throw new Error('Сообщение должно содержать не менее 3 символов');
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
 * Performs a full bidirectional synchronization between local Dexie and Supabase:
 * 1. Checks if browser is online and user is authenticated in Supabase;
 * 2. Pulls remote rows (`profiles`, `unit_progress`, `review_state`, `daily_activity`);
 * 3. Merges local (including any guest progress created prior to login) and remote rows
 *    using the deterministic conflict resolution rules (`merge.ts`);
 * 4. Writes merged state back to Dexie and upserts changed/local-only rows to Supabase;
 * 5. Flushes any queued `content_feedback` items and clears processed `syncQueue` items.
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

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return {
      state: 'guest',
      lastSyncedAt: null,
      pendingCount,
      errorMessage: null,
    };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return {
      state: 'guest',
      lastSyncedAt: null,
      pendingCount,
      errorMessage: null,
    };
  }

  const user = session.user;
  const userId = user.id;

  try {
    // 1. Sync Profile
    const localProfile = await ensureLocalProfile(db);
    const { data: remoteProfileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    let mergedProfile: LocalProfileRecord;
    if (remoteProfileRow) {
      const remoteMapped: LocalProfileRecord = {
        id: 'current',
        userId,
        email: user.email ?? null,
        displayName:
          (remoteProfileRow.display_name as string | null) ?? user.email?.split('@')[0] ?? 'Ученик',
        avatarKey: (remoteProfileRow.avatar_key as string | null) ?? 'elif',
        uiLang: 'ru',
        preferredCourse: (remoteProfileRow.preferred_course as CourseId | null) ?? 'tr',
        dailyGoalXp: (remoteProfileRow.daily_goal_xp as DailyGoalXp | null) ?? 20,
        updatedAt: (remoteProfileRow.updated_at as string | null) ?? new Date(0).toISOString(),
      };
      mergedProfile = mergeProfile(
        { ...localProfile, userId, email: user.email ?? null },
        remoteMapped,
      );
    } else {
      mergedProfile = {
        ...localProfile,
        userId,
        email: user.email ?? null,
        displayName:
          localProfile.displayName !== 'Гость'
            ? localProfile.displayName
            : (user.email?.split('@')[0] ?? 'Ученик'),
        updatedAt: new Date().toISOString(),
      };
    }

    await db.localProfile.put(mergedProfile);
    await supabase.from('profiles').upsert({
      id: userId,
      display_name: mergedProfile.displayName,
      avatar_key: mergedProfile.avatarKey,
      ui_lang: mergedProfile.uiLang,
      preferred_course: mergedProfile.preferredCourse,
      daily_goal_xp: mergedProfile.dailyGoalXp,
      updated_at: mergedProfile.updatedAt,
    });

    // 2. Sync unit_progress (guest progress + multi-device merge)
    const [localUnits, { data: remoteUnits }] = await Promise.all([
      db.unitProgress.toArray(),
      supabase.from('unit_progress').select('*').eq('user_id', userId),
    ]);

    const localUnitMap = new Map(localUnits.map((u) => [u.unitId, u]));
    const remoteUnitMap = new Map<string, LocalUnitProgressRecord>();
    for (const row of remoteUnits ?? []) {
      const rec: LocalUnitProgressRecord = {
        unitId: row.unit_id as string,
        courseId: row.course_id as CourseId,
        wordsDone: Boolean(row.words_done),
        speakingBest: (row.speaking_best as number | null) ?? null,
        listeningBest: (row.listening_best as number | null) ?? null,
        writingBest: (row.writing_best as number | null) ?? null,
        readingBest: (row.reading_best as number | null) ?? null,
        completedAt: (row.completed_at as string | null) ?? null,
        updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
      };
      remoteUnitMap.set(rec.unitId, rec);
    }

    const allUnitIds = new Set([...localUnitMap.keys(), ...remoteUnitMap.keys()]);
    const unitsToUpsertRemote: Array<Record<string, unknown>> = [];

    for (const unitId of allUnitIds) {
      const loc = localUnitMap.get(unitId);
      const rem = remoteUnitMap.get(unitId);
      const merged = loc && rem ? mergeUnitProgress(loc, rem) : (loc ?? rem)!;
      await db.unitProgress.put(merged);

      // Push to Supabase if local had changes or didn't exist remotely
      if (!rem || JSON.stringify(merged) !== JSON.stringify(rem)) {
        unitsToUpsertRemote.push({
          user_id: userId,
          unit_id: merged.unitId,
          course_id: merged.courseId,
          words_done: merged.wordsDone,
          speaking_best: merged.speakingBest,
          listening_best: merged.listeningBest,
          writing_best: merged.writingBest,
          reading_best: merged.readingBest,
          completed_at: merged.completedAt,
          updated_at: merged.updatedAt,
        });
      }
    }

    if (unitsToUpsertRemote.length > 0) {
      await supabase.from('unit_progress').upsert(unitsToUpsertRemote);
    }

    // 3. Sync review_state (LWW by updated_at)
    const [localReviews, { data: remoteReviews }] = await Promise.all([
      db.reviewState.toArray(),
      supabase.from('review_state').select('*').eq('user_id', userId),
    ]);

    const localReviewMap = new Map(localReviews.map((r) => [r.unitId, r]));
    const remoteReviewMap = new Map<string, LocalReviewStateRecord>();
    for (const row of remoteReviews ?? []) {
      const rec: LocalReviewStateRecord = {
        unitId: row.unit_id as string,
        courseId: row.course_id as CourseId,
        step: Number(row.step),
        dueAt: row.due_at as string,
        updatedAt: row.updated_at as string,
      };
      remoteReviewMap.set(rec.unitId, rec);
    }

    const allReviewIds = new Set([...localReviewMap.keys(), ...remoteReviewMap.keys()]);
    const reviewsToUpsertRemote: Array<Record<string, unknown>> = [];

    for (const unitId of allReviewIds) {
      const loc = localReviewMap.get(unitId);
      const rem = remoteReviewMap.get(unitId);
      const merged = loc && rem ? mergeReviewState(loc, rem) : (loc ?? rem)!;
      await db.reviewState.put(merged);

      if (!rem || JSON.stringify(merged) !== JSON.stringify(rem)) {
        reviewsToUpsertRemote.push({
          user_id: userId,
          unit_id: merged.unitId,
          course_id: merged.courseId,
          step: merged.step,
          due_at: merged.dueAt,
          updated_at: merged.updatedAt,
        });
      }
    }

    if (reviewsToUpsertRemote.length > 0) {
      await supabase.from('review_state').upsert(reviewsToUpsertRemote);
    }

    // 4. Sync daily_activity (GREATEST / Math.max for xp, lessons, seconds)
    const [localDays, { data: remoteDays }] = await Promise.all([
      db.dailyActivity.toArray(),
      supabase.from('daily_activity').select('*').eq('user_id', userId),
    ]);

    const localDayMap = new Map(localDays.map((d) => [d.day, d]));
    const remoteDayMap = new Map<string, LocalDailyActivityRecord>();
    for (const row of remoteDays ?? []) {
      const rec: LocalDailyActivityRecord = {
        day: row.day as string,
        xp: Number(row.xp),
        lessons: Number(row.lessons),
        seconds: Number(row.seconds),
        updatedAt: row.updated_at as string,
      };
      remoteDayMap.set(rec.day, rec);
    }

    const allDays = new Set([...localDayMap.keys(), ...remoteDayMap.keys()]);
    const daysToUpsertRemote: Array<Record<string, unknown>> = [];

    for (const day of allDays) {
      const loc = localDayMap.get(day);
      const rem = remoteDayMap.get(day);
      const merged = loc && rem ? mergeDailyActivity(loc, rem) : (loc ?? rem)!;
      await db.dailyActivity.put(merged);

      if (!rem || JSON.stringify(merged) !== JSON.stringify(rem)) {
        daysToUpsertRemote.push({
          user_id: userId,
          day: merged.day,
          xp: merged.xp,
          lessons: merged.lessons,
          seconds: merged.seconds,
          updated_at: merged.updatedAt,
        });
      }
    }

    if (daysToUpsertRemote.length > 0) {
      await supabase.from('daily_activity').upsert(daysToUpsertRemote);
    }

    // 5. Flush queued content_feedback items and clear syncQueue
    const queuedItems = await db.syncQueue.toArray();
    for (const item of queuedItems) {
      if (item.table === 'content_feedback') {
        const { error: fbError } = await supabase.from('content_feedback').insert({
          user_id: userId,
          ...item.payload,
        });
        if (!fbError && item.id !== undefined) {
          await db.syncQueue.delete(item.id);
        }
      } else if (item.id !== undefined) {
        await db.syncQueue.delete(item.id);
      }
    }

    const remainingCount = await db.syncQueue.count();
    return {
      state: 'synced',
      lastSyncedAt: new Date().toISOString(),
      pendingCount: remainingCount,
      errorMessage: null,
    };
  } catch (err) {
    return {
      state: 'error',
      lastSyncedAt: null,
      pendingCount: await db.syncQueue.count(),
      errorMessage: (err as Error).message,
    };
  }
}

/**
 * Deletes the authenticated user's account in Supabase via `delete_my_account()` RPC
 * and clears all local IndexedDB records.
 */
export async function deleteAccountAndLocalData(
  db: TurkceDuoDatabase = getLocalDb(),
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) {
        throw new Error(`Ошибка удаления аккаунта в облаке: ${error.message}`);
      }
      await supabase.auth.signOut();
    }
  }
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
