'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppState } from './providers/app-provider';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isOnline, profile, dueReviews, todayXp, streakDays, syncStatus, setTheme, triggerSync } =
    useAppState();

  const isPlayerRoute = pathname?.includes('/play/');

  const syncLabel = !isOnline
    ? '📡 Офлайн'
    : syncStatus.state === 'syncing'
      ? '🔄 Синхр...'
      : syncStatus.state === 'synced'
        ? '☁️ В облаке'
        : syncStatus.state === 'error'
          ? '⚠️ Ошибка'
          : '👤 Гость';

  const currentTheme = profile.theme ?? 'system';
  const cycleTheme = () => {
    const next = currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light';
    void setTheme(next);
  };
  const themeIcon = currentTheme === 'dark' ? '🌙' : currentTheme === 'light' ? '☀️' : '🌓';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {!isPlayerRoute && (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-lg font-black tracking-tight text-sky-600 dark:text-sky-400"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-600 text-xs font-black text-white shadow-xs">
                  K!
                </span>
                <span>Konuş!</span>
              </Link>

              <nav
                className="flex flex-wrap items-center gap-1 text-xs font-semibold sm:text-sm"
                aria-label="Основная навигация"
              >
                <Link
                  href="/tr"
                  className={`rounded-lg px-2.5 py-1.5 transition ${
                    pathname?.startsWith('/tr')
                      ? 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  🇹🇷 Турецкий
                </Link>
                <Link
                  href="/en"
                  className={`rounded-lg px-2.5 py-1.5 transition ${
                    pathname?.startsWith('/en')
                      ? 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  🇬🇧 Английский
                </Link>
                <Link
                  href="/review"
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition ${
                    pathname === '/review'
                      ? 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>🔁 Повторение</span>
                  {dueReviews.length > 0 && (
                    <span className="rounded-full bg-amber-600 px-1.5 text-[11px] font-bold text-white">
                      {dueReviews.length}
                    </span>
                  )}
                </Link>
              </nav>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
              <span
                title="Серия дней подряд"
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
              >
                🔥 {streakDays} дн.
              </span>

              <span
                title="Дневная цель XP"
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
              >
                ⚡ {todayXp}/{profile.dailyGoalXp} XP
              </span>

              <button
                type="button"
                onClick={cycleTheme}
                aria-label="Переключить тему оформления"
                title={`Тема: ${currentTheme}`}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
              >
                {themeIcon}
              </button>

              <button
                type="button"
                onClick={() => void triggerSync()}
                title="Статус синхронизации"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <span>{syncLabel}</span>
                {syncStatus.pendingCount > 0 && (
                  <span className="rounded-full bg-sky-600 px-1.5 text-[11px] text-white">
                    {syncStatus.pendingCount}
                  </span>
                )}
              </button>

              <Link
                href="/profile"
                className={`rounded-lg px-2 py-1.5 font-semibold ${
                  pathname === '/profile'
                    ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                Профиль
              </Link>

              <Link
                href="/settings"
                aria-label="Настройки"
                className={`rounded-lg px-2 py-1.5 font-semibold ${
                  pathname === '/settings'
                    ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                ⚙️
              </Link>

              {!profile.userId && (
                <Link
                  href="/auth"
                  className="rounded-lg bg-sky-600 px-3 py-1.5 font-bold text-white hover:bg-sky-700"
                >
                  Войти
                </Link>
              )}
            </div>
          </div>
        </header>
      )}

      <div className="flex-1">{children}</div>

      {!isPlayerRoute && (
        <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">Konuş!</span>
              <span>— бесплатный PWA для практики турецкого и английского (0 ₽, без рекламы)</span>
            </div>
            <nav className="flex flex-wrap gap-4 font-medium" aria-label="Ссылки в подвале">
              <Link href="/welcome" className="hover:text-sky-600 dark:hover:text-sky-400">
                Выбор цели
              </Link>
              <Link href="/review" className="hover:text-sky-600 dark:hover:text-sky-400">
                Повторение 1/3/7/14
              </Link>
              <Link href="/settings" className="hover:text-sky-600 dark:hover:text-sky-400">
                Настройки
              </Link>
              <Link href="/about" className="hover:text-sky-600 dark:hover:text-sky-400">
                О проекте
              </Link>
              <Link href="/privacy" className="hover:text-sky-600 dark:hover:text-sky-400">
                Конфиденциальность
              </Link>
            </nav>
          </div>
        </footer>
      )}
    </div>
  );
}
