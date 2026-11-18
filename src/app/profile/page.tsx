'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useAppState } from '@/components/providers/app-provider';
import type { DailyGoalXp } from '@/lib/db/dexie';

export default function ProfilePage() {
  const {
    profile,
    unitProgressMap,
    dueReviews,
    dailyActivities,
    todayXp,
    streakDays,
    syncStatus,
    setDailyGoalXp,
    setDisplayName,
    triggerSync,
    signOut,
    clearLocalData,
    deleteAccount,
  } = useAppState();

  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<string>('Вычисляется...');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const nameInput = nameOverride ?? profile.displayName;

  useEffect(() => {
    let active = true;
    const loadEstimate = async () => {
      if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
        if (active) setStorageEstimate('Не поддерживается браузером');
        return;
      }
      try {
        const est = await navigator.storage.estimate();
        const usedMb = ((est.usage ?? 0) / (1024 * 1024)).toFixed(2);
        const quotaMb = ((est.quota ?? 0) / (1024 * 1024)).toFixed(0);
        if (active) setStorageEstimate(`${usedMb} МБ из ${quotaMb} МБ`);
      } catch {
        if (active) setStorageEstimate('Недоступно');
      }
    };
    void loadEstimate();
    return () => {
      active = false;
    };
  }, [unitProgressMap]);

  const completedUnitsCount = Object.values(unitProgressMap).filter(
    (u) => u.completedAt !== null,
  ).length;
  const totalXp = dailyActivities.reduce((acc, d) => acc + d.xp, 0);
  const dueReviewsCount = dueReviews.length;

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    await setDisplayName(nameInput);
    setNameOverride(null);
    setStatusMessage('Имя сохранено!');
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-900 dark:bg-sky-950 dark:text-sky-200">
              {profile.userId
                ? 'Облачный профиль (Supabase)'
                : 'Гостевой режим (локально в браузере)'}
            </span>
            <h1 className="mt-2 text-2xl font-bold">{profile.displayName}</h1>
            {profile.email && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{profile.email}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void triggerSync()}
              className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              🔄 Синхронизировать ({syncStatus.pendingCount} в очереди)
            </button>
            {profile.userId ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Выйти
              </button>
            ) : (
              <Link
                href="/auth"
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Войти / Сохранить в облако
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
            <div className="text-xs text-slate-500">Серия дней</div>
            <div className="mt-1 text-xl font-bold">🔥 {streakDays} дн.</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
            <div className="text-xs text-slate-500">Сегодня XP</div>
            <div className="mt-1 text-xl font-bold">
              ⚡ {todayXp} / {profile.dailyGoalXp}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
            <div className="text-xs text-slate-500">Всего XP</div>
            <div className="mt-1 text-xl font-bold">🏆 {totalXp}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
            <div className="text-xs text-slate-500">Пройдено юнитов</div>
            <div className="mt-1 text-xl font-bold">
              ✅ {completedUnitsCount} (к повтор.: {dueReviewsCount})
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold">Настройки обучения</h2>

        <form
          onSubmit={(e) => void handleSaveName(e)}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1">
            <label htmlFor="profileName" className="block text-xs font-semibold uppercase">
              Отображаемое имя
            </label>
            <input
              id="profileName"
              type="text"
              value={nameInput}
              onChange={(e) => setNameOverride(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Сохранить имя
          </button>
        </form>

        <div className="mt-5">
          <div className="text-xs font-semibold uppercase">Дневная цель XP</div>
          <div className="mt-2 flex gap-2">
            {([10, 20, 30] as DailyGoalXp[]).map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => void setDailyGoalXp(goal)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                  profile.dailyGoalXp === goal
                    ? 'border-sky-600 bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-200'
                    : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {goal} XP / день
              </button>
            ))}
          </div>
        </div>

        {statusMessage && (
          <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {statusMessage}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold">Офлайн-память и управление данными</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Занятое место в браузере (IndexedDB + Cache Storage): <strong>{storageEstimate}</strong>
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (navigator.storage?.persist) {
                void navigator.storage.persist().then((granted) => {
                  setStatusMessage(
                    granted
                      ? 'Браузер разрешил постоянное офлайн-хранение!'
                      : 'Постоянное хранение управляется браузером автоматически.',
                  );
                });
              }
            }}
            className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Закрепить офлайн-кэш (storage.persist)
          </button>

          <button
            type="button"
            onClick={() => {
              void clearLocalData().then(() =>
                setStatusMessage('Локальные данные в браузере очищены.'),
              );
            }}
            className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
          >
            Сбросить локальный прогресс
          </button>

          {profile.userId && (
            <>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-900 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"
                >
                  Удалить аккаунт и все данные
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void deleteAccount().then(() => {
                        setConfirmDelete(false);
                        setStatusMessage('Аккаунт и все данные удалены.');
                      });
                    }}
                    className="rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700"
                  >
                    Подтвердить удаление (delete_my_account)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-slate-500 underline"
                  >
                    Отмена
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
