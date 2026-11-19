'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppState } from './providers/app-provider';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isOnline, profile, todayXp, streakDays, syncStatus, triggerSync } = useAppState();

  const isPlayerRoute = pathname?.includes('/play/');

  const syncLabel = !isOnline
    ? '📡 Офлайн'
    : syncStatus.state === 'syncing'
      ? '🔄 Синхронизация...'
      : syncStatus.state === 'synced'
        ? '☁️ В облаке'
        : syncStatus.state === 'error'
          ? '⚠️ Ошибка синхр.'
          : '👤 Гость (локально)';

  return (
    <div className="flex min-h-screen flex-col">
      {!isPlayerRoute && (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-sky-600 dark:text-sky-400"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-xs font-black text-white">
                  TD
                </span>
                <span>Türkçe Duo</span>
              </Link>

              <nav className="flex items-center gap-1 text-sm font-medium" aria-label="Выбор курса">
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
              </nav>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span
                title="Серия дней подряд"
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
              >
                🔥 {streakDays} дн.
              </span>

              <span
                title="Дневная цель XP"
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
              >
                ⚡ {todayXp} / {profile.dailyGoalXp} XP
              </span>

              <button
                type="button"
                onClick={() => void triggerSync()}
                title={
                  syncStatus.lastSyncedAt
                    ? `Последняя синхронизация: ${new Date(syncStatus.lastSyncedAt).toLocaleTimeString('ru-RU')}`
                    : 'Нажмите для синхронизации'
                }
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
                className={`rounded-lg px-2.5 py-1.5 font-medium ${
                  pathname === '/profile'
                    ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                Профиль
              </Link>

              {!profile.userId ? (
                <Link
                  href="/auth"
                  className="rounded-lg bg-sky-600 px-3 py-1.5 font-semibold text-white hover:bg-sky-700"
                >
                  Войти
                </Link>
              ) : (
                <Link
                  href="/profile"
                  className="rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 font-semibold text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200"
                >
                  {profile.displayName}
                </Link>
              )}
            </div>
          </div>
        </header>
      )}

      <div className="flex-1">{children}</div>
    </div>
  );
}
