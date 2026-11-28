'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppState } from './providers/app-provider';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isOnline,
    profile,
    dueReviews,
    todayXp,
    streakDays,
    syncStatus,
    setTheme,
    setPreferredCourse,
    triggerSync,
  } = useAppState();

  const isPlayerRoute = pathname?.includes('/play/');

  const activeCourse: 'tr' | 'en' = pathname?.startsWith('/en')
    ? 'en'
    : pathname?.startsWith('/tr')
      ? 'tr'
      : profile.preferredCourse;

  const handleToggleCourse = () => {
    const nextCourse: 'tr' | 'en' = activeCourse === 'tr' ? 'en' : 'tr';
    void setPreferredCourse(nextCourse);
    if (pathname?.startsWith('/tr') || pathname?.startsWith('/en')) {
      router.push(`/${nextCourse}`);
    }
  };

  const syncIcon = !isOnline
    ? '📡'
    : syncStatus.state === 'syncing'
      ? '🔄'
      : syncStatus.state === 'synced'
        ? '☁️'
        : syncStatus.state === 'error'
          ? '⚠️'
          : '👤';

  const syncTitle = !isOnline
    ? 'Офлайн-режим'
    : syncStatus.state === 'syncing'
      ? 'Синхронизация...'
      : syncStatus.state === 'synced'
        ? 'Сохранено в облаке'
        : syncStatus.state === 'error'
          ? 'Ошибка синхронизации — нажмите для повтора'
          : 'Гостевой режим (локально)';

  const currentTheme = profile.theme ?? 'system';
  const cycleTheme = () => {
    const next = currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light';
    void setTheme(next);
  };
  const themeIcon = currentTheme === 'dark' ? '🌙' : currentTheme === 'light' ? '☀️' : '🌓';

  const isHomeActive = pathname === '/';
  const isMapActive = pathname?.startsWith('/tr') || pathname?.startsWith('/en');
  const isReviewActive = pathname === '/review';
  const isProfileActive = pathname === '/profile' || pathname === '/auth';
  const isSettingsActive =
    pathname === '/settings' ||
    pathname === '/welcome' ||
    pathname === '/about' ||
    pathname === '/privacy';

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f7fb] text-slate-900 dark:bg-[#0b1020] dark:text-slate-100">
      {!isPlayerRoute && (
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0f1629]/90">
          <div className="mx-auto flex h-13 max-w-5xl flex-nowrap items-center justify-between gap-2 px-3 sm:px-4">
            {/* Left: Compact Brand + 1-tap Course Switcher */}
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/"
                aria-label="Konuş! Главная"
                className="flex items-center gap-1.5 font-black tracking-tight text-sky-600 dark:text-sky-400"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-xs font-black text-white shadow-sm">
                  K!
                </span>
                <span className="hidden text-base sm:inline">Konuş!</span>
              </Link>

              <button
                type="button"
                onClick={handleToggleCourse}
                title="Переключить язык курса (Турецкий / Английский)"
                className={`btn-3d inline-flex items-center gap-1 rounded-xl border border-b-2 px-2.5 py-1 text-xs font-extrabold ${
                  activeCourse === 'tr'
                    ? 'border-rose-200 border-b-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-800/70 dark:border-b-rose-950 dark:bg-rose-950/50 dark:text-rose-200'
                    : 'border-indigo-200 border-b-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-800/70 dark:border-b-indigo-950 dark:bg-indigo-950/50 dark:text-indigo-200'
                }`}
              >
                <span className="text-sm leading-none">{activeCourse === 'tr' ? '🇹🇷' : '🇬🇧'}</span>
                <span>{activeCourse === 'tr' ? 'TR' : 'EN'}</span>
                <span className="text-[10px] opacity-60">⇄</span>
              </button>
            </div>

            {/* Center: Desktop-only sleek single-row navigation */}
            <nav className="hidden items-center gap-1 md:flex" aria-label="Основная навигация">
              <Link
                href="/"
                className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                  isHomeActive
                    ? 'bg-sky-100 text-sky-900 dark:bg-sky-950/80 dark:text-sky-200'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                }`}
              >
                🎯 Урок
              </Link>
              <Link
                href={`/${activeCourse}`}
                className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                  isMapActive
                    ? 'bg-sky-100 text-sky-900 dark:bg-sky-950/80 dark:text-sky-200'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                }`}
              >
                🗺 Карта
              </Link>
              <Link
                href="/review"
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                  isReviewActive
                    ? 'bg-amber-100 text-amber-950 dark:bg-amber-950/80 dark:text-amber-200'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                }`}
              >
                <span>🔁 Повтор</span>
                {dueReviews.length > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-black text-white">
                    {dueReviews.length}
                  </span>
                )}
              </Link>
              <Link
                href="/profile"
                className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                  isProfileActive
                    ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                }`}
              >
                👤 Профиль
              </Link>
              <Link
                href="/settings"
                aria-label="Настройки"
                className={`rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition ${
                  isSettingsActive
                    ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                }`}
              >
                ⚙️
              </Link>
            </nav>

            {/* Right: Ultra-compact status pills */}
            <div className="flex shrink-0 items-center gap-1.5 text-xs">
              <span
                title="Серия дней подряд"
                className="inline-flex items-center gap-1 rounded-full bg-amber-100/90 px-2 py-1 font-black text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
              >
                <span>🔥</span>
                <span>{streakDays}</span>
              </span>

              <span
                title="Дневная цель XP"
                className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2 py-1 font-black text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
              >
                <span>⚡</span>
                <span>
                  {todayXp}/{profile.dailyGoalXp}
                </span>
              </span>

              <button
                type="button"
                onClick={() => void triggerSync()}
                title={syncTitle}
                aria-label={syncTitle}
                className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-800/80 dark:hover:bg-slate-800"
              >
                <span>{syncIcon}</span>
                {syncStatus.pendingCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-black text-white">
                    {syncStatus.pendingCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={cycleTheme}
                aria-label="Переключить тему оформления"
                title={`Тема: ${currentTheme}`}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-800/80 dark:hover:bg-slate-800"
              >
                {themeIcon}
              </button>
            </div>
          </div>
        </header>
      )}

      <div className={`flex-1 ${!isPlayerRoute ? 'pb-20 md:pb-6' : ''}`}>{children}</div>

      {/* Mobile Bottom Navigation Bar */}
      {!isPlayerRoute && (
        <nav
          aria-label="Мобильная навигация"
          className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-md md:hidden dark:border-slate-800/80 dark:bg-[#0f1629]/95"
        >
          <div className="mx-auto grid max-w-lg grid-cols-5 px-1 pt-1.5">
            <Link
              href="/"
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-extrabold transition ${
                isHomeActive
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className={`text-lg leading-none ${isHomeActive ? 'scale-110' : ''}`}>🎯</span>
              <span>Урок</span>
            </Link>

            <Link
              href={`/${activeCourse}`}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-extrabold transition ${
                isMapActive
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className={`text-lg leading-none ${isMapActive ? 'scale-110' : ''}`}>🗺</span>
              <span>Карта</span>
            </Link>

            <Link
              href="/review"
              className={`relative flex flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-extrabold transition ${
                isReviewActive
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className={`text-lg leading-none ${isReviewActive ? 'scale-110' : ''}`}>
                🔁
              </span>
              <span>Повтор</span>
              {dueReviews.length > 0 && (
                <span className="absolute right-3 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-white">
                  {dueReviews.length}
                </span>
              )}
            </Link>

            <Link
              href="/profile"
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-extrabold transition ${
                isProfileActive
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className={`text-lg leading-none ${isProfileActive ? 'scale-110' : ''}`}>
                👤
              </span>
              <span>Профиль</span>
            </Link>

            <Link
              href="/settings"
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-extrabold transition ${
                isSettingsActive
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className={`text-lg leading-none ${isSettingsActive ? 'scale-110' : ''}`}>
                ⚙️
              </span>
              <span>Ещё</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
