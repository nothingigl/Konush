'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useAppState } from '@/components/providers/app-provider';
import type {
  DailyGoalXp,
  FontScalePreference,
  SpeechRatePreference,
  ThemePreference,
} from '@/lib/db/dexie';

export default function SettingsPage() {
  const {
    profile,
    unitProgressMap,
    setDailyGoalXp,
    setTheme,
    setSpeechRate,
    setFontScale,
    clearLocalData,
    deleteAccount,
    signOut,
  } = useAppState();

  const [storageEstimate, setStorageEstimate] = useState<string>('Вычисляется...');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

  const handleClearOfflineCaches = async () => {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    await clearLocalData();
    setStatusMessage('Офлайн-кэш и локальные данные очищены.');
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold sm:text-3xl">⚙️ Настройки</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Управляйте дневной целью, темой оформления, скоростью озвучки, размером шрифта и
          офлайн-памятью.
        </p>
      </header>

      {statusMessage && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        >
          {statusMessage}
        </div>
      )}

      {/* 1. Daily Goal */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold">1. Цель дня (XP)</h2>
        <p className="mt-1 text-xs text-slate-500">
          Мягкая мотивация без штрафов и без сгорания «сердец»:
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {([10, 20, 30] as DailyGoalXp[]).map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => {
                void setDailyGoalXp(goal);
                setStatusMessage(`Дневная цель изменена на ${goal} XP.`);
              }}
              className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                profile.dailyGoalXp === goal
                  ? 'border-sky-600 bg-sky-50 text-sky-900 dark:border-sky-400 dark:bg-sky-950 dark:text-sky-200'
                  : 'border-slate-300 hover:bg-slate-50 dark:border-slate-700'
              }`}
            >
              ⚡ {goal} XP в день
            </button>
          ))}
        </div>
      </section>

      {/* 2. Theme & Font scale */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold">2. Внешний вид и доступность</h2>

        <div className="mt-4">
          <div className="text-xs font-bold uppercase text-slate-500">Тема оформления</div>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {(
              [
                { key: 'light' as ThemePreference, label: '☀️ Светлая' },
                { key: 'dark' as ThemePreference, label: '🌙 Тёмная' },
                { key: 'system' as ThemePreference, label: '🌓 Системная' },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => void setTheme(t.key)}
                className={`rounded-xl border px-4 py-2 text-sm font-bold ${
                  (profile.theme ?? 'system') === t.key
                    ? 'border-sky-600 bg-sky-50 text-sky-900 dark:border-sky-400 dark:bg-sky-950 dark:text-sky-200'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-xs font-bold uppercase text-slate-500">Масштаб шрифта</div>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {(
              [
                { key: 'normal' as FontScalePreference, label: '100% (Обычный)' },
                { key: 'large' as FontScalePreference, label: '112% (Крупный)' },
                { key: 'xlarge' as FontScalePreference, label: '125% (Очень крупный)' },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => void setFontScale(f.key)}
                className={`rounded-xl border px-4 py-2 text-sm font-bold ${
                  (profile.fontScale ?? 'normal') === f.key
                    ? 'border-sky-600 bg-sky-50 text-sky-900 dark:border-sky-400 dark:bg-sky-950 dark:text-sky-200'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-xs font-bold uppercase text-slate-500">Скорость озвучки</div>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {(
              [
                { rate: 0.75 as SpeechRatePreference, label: '🐢 0.75x (Медленно)' },
                { rate: 1.0 as SpeechRatePreference, label: '🔊 1.0x (Нормально)' },
                { rate: 1.15 as SpeechRatePreference, label: '⚡ 1.15x (Быстро)' },
              ] as const
            ).map((s) => (
              <button
                key={s.rate}
                type="button"
                onClick={() => void setSpeechRate(s.rate)}
                className={`rounded-xl border px-4 py-2 text-sm font-bold ${
                  (profile.speechRate ?? 1.0) === s.rate
                    ? 'border-sky-600 bg-sky-50 text-sky-900 dark:border-sky-400 dark:bg-sky-950 dark:text-sky-200'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Offline storage */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold">3. Офлайн-данные и память устройства</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Занято в хранилище браузера: <strong>{storageEstimate}</strong>
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (navigator.storage?.persist) {
                void navigator.storage
                  .persist()
                  .then((granted) =>
                    setStatusMessage(
                      granted
                        ? 'Постоянное хранение офлайн-данных разрешено браузером.'
                        : 'Хранилище управляется браузером автоматически.',
                    ),
                  );
              }
            }}
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Запросить постоянное хранение (persist)
          </button>

          <button
            type="button"
            onClick={() => void handleClearOfflineCaches()}
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
          >
            Очистить офлайн-данные
          </button>
        </div>
      </section>

      {/* 4. Account & Deletion */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold">4. Аккаунт и конфиденциальность</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Статус:{' '}
          <strong>
            {profile.userId
              ? `Авторизован (${profile.email ?? profile.displayName})`
              : 'Гостевой режим (без регистрации)'}
          </strong>
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!profile.userId ? (
            <Link
              href="/auth"
              className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700"
            >
              Войти или создать облачный профиль
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold hover:bg-slate-100 dark:border-slate-700"
              >
                Выйти из аккаунта
              </button>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-900 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"
                >
                  Удалить аккаунт навсегда
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void deleteAccount().then(() => {
                        setConfirmDelete(false);
                        setStatusMessage('Ваш аккаунт и все данные полностью удалены.');
                      });
                    }}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                  >
                    Да, удалить аккаунт (delete_my_account)
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
