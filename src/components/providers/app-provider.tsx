'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEMO_EN_UNIT, DEMO_TR_UNIT } from '@/lib/content/demo-units';
import type { CourseId, Unit } from '@/lib/content/schema';
import {
  getDefaultLocalProfile,
  getLocalDb,
  type DailyGoalXp,
  type LocalDailyActivityRecord,
  type LocalProfileRecord,
  type LocalReviewStateRecord,
  type LocalUnitProgressRecord,
  type SkillKey,
} from '@/lib/db/dexie';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  deleteAccountAndLocalData,
  ensureLocalProfile,
  recordSkillSessionCompleted,
  recordWordsCompleted,
  reportExerciseIssue,
  resetLocalData,
  synchronizeWithCloud,
  updateLocalProfilePreferences,
  type SyncStatusReport,
} from '@/lib/sync/engine';
import { computeStreakDays, toLocalDayString } from '@/lib/sync/merge';

export interface AppContextValue {
  ready: boolean;
  isOnline: boolean;
  supabaseEnabled: boolean;
  profile: LocalProfileRecord;
  unitProgressMap: Record<string, LocalUnitProgressRecord>;
  reviewStateMap: Record<string, LocalReviewStateRecord>;
  dueReviews: LocalReviewStateRecord[];
  dailyActivities: LocalDailyActivityRecord[];
  todayXp: number;
  streakDays: number;
  syncStatus: SyncStatusReport;
  setPreferredCourse: (course: CourseId) => Promise<void>;
  setDailyGoalXp: (goal: DailyGoalXp) => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
  markWordsDone: (unitId: string, courseId: CourseId) => Promise<void>;
  completeSkillSession: (params: {
    unitId: string;
    courseId: CourseId;
    skill: SkillKey;
    scorePercent: number;
    xpEarned: number;
    durationSeconds: number;
    isBoss?: boolean;
  }) => Promise<void>;
  submitFeedback: (params: {
    courseId: CourseId;
    unitId: string;
    exerciseId: string;
    message: string;
  }) => Promise<void>;
  cacheUnitOffline: (unit: Unit) => Promise<void>;
  getCachedUnit: (unitId: string) => Promise<Unit | null>;
  triggerSync: () => Promise<void>;
  signOut: () => Promise<void>;
  clearLocalData: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [profile, setProfile] = useState<LocalProfileRecord>(getDefaultLocalProfile());
  const [unitProgressMap, setUnitProgressMap] = useState<Record<string, LocalUnitProgressRecord>>(
    {},
  );
  const [reviewStateMap, setReviewStateMap] = useState<Record<string, LocalReviewStateRecord>>({});
  const [dueReviews, setDueReviews] = useState<LocalReviewStateRecord[]>([]);
  const [dailyActivities, setDailyActivities] = useState<LocalDailyActivityRecord[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatusReport>({
    state: 'idle',
    lastSyncedAt: null,
    pendingCount: 0,
    errorMessage: null,
  });

  const supabaseEnabled = isSupabaseConfigured();

  const reloadFromDexie = useCallback(async () => {
    const db = getLocalDb();
    const [prof, units, reviews, days, pendingCount] = await Promise.all([
      ensureLocalProfile(db),
      db.unitProgress.toArray(),
      db.reviewState.toArray(),
      db.dailyActivity.toArray(),
      db.syncQueue.count(),
    ]);

    const nowMs = Date.now();
    setProfile(prof);
    setUnitProgressMap(Object.fromEntries(units.map((u) => [u.unitId, u])));
    setReviewStateMap(Object.fromEntries(reviews.map((r) => [r.unitId, r])));
    setDueReviews(reviews.filter((r) => new Date(r.dueAt).getTime() <= nowMs));
    setDailyActivities(days);
    setSyncStatus((prev) => ({ ...prev, pendingCount }));
  }, []);

  const triggerSync = useCallback(async () => {
    setSyncStatus((prev) => ({ ...prev, state: 'syncing' }));
    const report = await synchronizeWithCloud();
    setSyncStatus(report);
    await reloadFromDexie();
  }, [reloadFromDexie]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const db = getLocalDb();
    const init = async () => {
      const nowIso = new Date().toISOString();
      await db.cachedUnits.bulkPut([
        {
          unitId: DEMO_TR_UNIT.id,
          courseId: DEMO_TR_UNIT.course,
          slug: DEMO_TR_UNIT.slug,
          data: DEMO_TR_UNIT,
          cachedAt: nowIso,
        },
        {
          unitId: DEMO_EN_UNIT.id,
          courseId: DEMO_EN_UNIT.course,
          slug: DEMO_EN_UNIT.slug,
          data: DEMO_EN_UNIT,
          cachedAt: nowIso,
        },
      ]);

      await reloadFromDexie();
      setReady(true);
      await triggerSync();
    };

    void init();

    const handleOnline = () => {
      setIsOnline(true);
      void triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus((prev) => ({ ...prev, state: 'offline' }));
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void triggerSync();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void triggerSync();
      }
    }, 60_000);

    const supabase = getSupabaseBrowserClient();
    const authSub = supabase?.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        void triggerSync();
      } else if (event === 'SIGNED_OUT') {
        void (async () => {
          const current = await ensureLocalProfile();
          await db.localProfile.put({
            ...current,
            userId: null,
            email: null,
            displayName: 'Гость',
          });
          await reloadFromDexie();
        })();
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(intervalId);
      authSub?.data.subscription.unsubscribe();
    };
  }, [reloadFromDexie, triggerSync]);

  const setPreferredCourse = useCallback(
    async (course: CourseId) => {
      await updateLocalProfilePreferences({ preferredCourse: course });
      await reloadFromDexie();
      void triggerSync();
    },
    [reloadFromDexie, triggerSync],
  );

  const setDailyGoalXp = useCallback(
    async (goal: DailyGoalXp) => {
      await updateLocalProfilePreferences({ dailyGoalXp: goal });
      await reloadFromDexie();
      void triggerSync();
    },
    [reloadFromDexie, triggerSync],
  );

  const setDisplayName = useCallback(
    async (name: string) => {
      const trimmed = name.trim().slice(0, 80) || 'Ученик';
      await updateLocalProfilePreferences({ displayName: trimmed });
      await reloadFromDexie();
      void triggerSync();
    },
    [reloadFromDexie, triggerSync],
  );

  const markWordsDone = useCallback(
    async (unitId: string, courseId: CourseId) => {
      await recordWordsCompleted(unitId, courseId);
      await reloadFromDexie();
      void triggerSync();
    },
    [reloadFromDexie, triggerSync],
  );

  const completeSkillSession = useCallback(
    async (params: {
      unitId: string;
      courseId: CourseId;
      skill: SkillKey;
      scorePercent: number;
      xpEarned: number;
      durationSeconds: number;
      isBoss?: boolean;
    }) => {
      await recordSkillSessionCompleted(params);
      await reloadFromDexie();
      void triggerSync();
    },
    [reloadFromDexie, triggerSync],
  );

  const submitFeedback = useCallback(
    async (params: { courseId: CourseId; unitId: string; exerciseId: string; message: string }) => {
      await reportExerciseIssue(params);
      await reloadFromDexie();
      void triggerSync();
    },
    [reloadFromDexie, triggerSync],
  );

  const cacheUnitOffline = useCallback(async (unit: Unit) => {
    const db = getLocalDb();
    await db.cachedUnits.put({
      unitId: unit.id,
      courseId: unit.course,
      slug: unit.slug,
      data: unit,
      cachedAt: new Date().toISOString(),
    });
  }, []);

  const getCachedUnit = useCallback(async (unitId: string): Promise<Unit | null> => {
    const db = getLocalDb();
    const record = await db.cachedUnits.get(unitId);
    return record?.data ?? null;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    const db = getLocalDb();
    const current = await ensureLocalProfile(db);
    await db.localProfile.put({
      ...current,
      userId: null,
      email: null,
    });
    await reloadFromDexie();
  }, [reloadFromDexie]);

  const clearLocalData = useCallback(async () => {
    await resetLocalData();
    await reloadFromDexie();
  }, [reloadFromDexie]);

  const deleteAccount = useCallback(async () => {
    await deleteAccountAndLocalData();
    await reloadFromDexie();
  }, [reloadFromDexie]);

  const todayStr = toLocalDayString();
  const todayXp = dailyActivities.find((d) => d.day === todayStr)?.xp ?? 0;
  const streakDays = computeStreakDays(dailyActivities, todayStr);

  return (
    <AppContext.Provider
      value={{
        ready,
        isOnline,
        supabaseEnabled,
        profile,
        unitProgressMap,
        reviewStateMap,
        dueReviews,
        dailyActivities,
        todayXp,
        streakDays,
        syncStatus,
        setPreferredCourse,
        setDailyGoalXp,
        setDisplayName,
        markWordsDone,
        completeSkillSession,
        submitFeedback,
        cacheUnitOffline,
        getCachedUnit,
        triggerSync,
        signOut,
        clearLocalData,
        deleteAccount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppState must be used inside <AppProvider>');
  }
  return ctx;
}
