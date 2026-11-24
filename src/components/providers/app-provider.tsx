'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { CourseId, Unit } from '@/lib/content/schema';
import {
  getDefaultLocalProfile,
  getLocalDb,
  type DailyGoalXp,
  type FontScalePreference,
  type LocalDailyActivityRecord,
  type LocalProfileRecord,
  type LocalReviewStateRecord,
  type LocalUnitProgressRecord,
  type SkillKey,
  type SpeechRatePreference,
  type ThemePreference,
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
  setAvatarKey: (avatarKey: string) => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setSpeechRate: (rate: SpeechRatePreference) => Promise<void>;
  setFontScale: (scale: FontScalePreference) => Promise<void>;
  completeOnboarding: (params: {
    course: CourseId;
    dailyGoalXp: DailyGoalXp;
    displayName?: string;
    avatarKey?: string;
  }) => Promise<void>;
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
  const [isOnline, setIsOnline] = useState(true);
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

  // Apply theme (light/dark/system) and font-scale to document.documentElement
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const theme = profile.theme ?? 'system';
    const fontScale = profile.fontScale ?? 'normal';

    root.setAttribute('data-font-scale', fontScale);

    const applyDark = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (theme === 'dark') {
      applyDark(true);
      return;
    }
    if (theme === 'light') {
      applyDark(false);
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    applyDark(media.matches);
    const listener = (e: MediaQueryListEvent) => applyDark(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [profile.theme, profile.fontScale]);

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
      setIsOnline(navigator.onLine);
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

    let unsubscribeAuth: (() => void) | null = null;
    let disposed = false;

    if (isSupabaseConfigured()) {
      void getSupabaseBrowserClient().then((supabase) => {
        if (!supabase || disposed) return;
        const authSub = supabase.auth.onAuthStateChange((event) => {
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
        unsubscribeAuth = () => authSub.data.subscription.unsubscribe();
      });
    }

    return () => {
      disposed = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(intervalId);
      unsubscribeAuth?.();
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

  const setAvatarKey = useCallback(
    async (avatarKey: string) => {
      await updateLocalProfilePreferences({ avatarKey });
      await reloadFromDexie();
      void triggerSync();
    },
    [reloadFromDexie, triggerSync],
  );

  const setTheme = useCallback(
    async (theme: ThemePreference) => {
      await updateLocalProfilePreferences({ theme });
      await reloadFromDexie();
    },
    [reloadFromDexie],
  );

  const setSpeechRate = useCallback(
    async (speechRate: SpeechRatePreference) => {
      await updateLocalProfilePreferences({ speechRate });
      await reloadFromDexie();
    },
    [reloadFromDexie],
  );

  const setFontScale = useCallback(
    async (fontScale: FontScalePreference) => {
      await updateLocalProfilePreferences({ fontScale });
      await reloadFromDexie();
    },
    [reloadFromDexie],
  );

  const completeOnboarding = useCallback(
    async (params: {
      course: CourseId;
      dailyGoalXp: DailyGoalXp;
      displayName?: string;
      avatarKey?: string;
    }) => {
      await updateLocalProfilePreferences({
        preferredCourse: params.course,
        dailyGoalXp: params.dailyGoalXp,
        ...(params.displayName ? { displayName: params.displayName.trim().slice(0, 80) } : {}),
        ...(params.avatarKey ? { avatarKey: params.avatarKey } : {}),
        onboardingDone: true,
      });
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
    const supabase = await getSupabaseBrowserClient();
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
        setAvatarKey,
        setTheme,
        setSpeechRate,
        setFontScale,
        completeOnboarding,
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
