'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';
import { useAppState } from '@/components/providers/app-provider';
import { CHARACTERS_MAP, getCharacterPersona } from '@/lib/content/characters';
import { toLocalDayString } from '@/lib/sync/merge';

export default function ProfilePage() {
  const {
    profile,
    unitProgressMap,
    dueReviews,
    dailyActivities,
    todayXp,
    streakDays,
    syncStatus,
    setDisplayName,
    setAvatarKey,
    triggerSync,
    signOut,
  } = useAppState();

  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const nameInput = nameOverride ?? profile.displayName;
  const persona = getCharacterPersona(profile.avatarKey || 'elif');

  const completedUnitsCount = Object.values(unitProgressMap).filter(
    (u) => u.completedAt !== null,
  ).length;
  const totalXp = dailyActivities.reduce((acc, d) => acc + d.xp, 0);
  const totalLessons = dailyActivities.reduce((acc, d) => acc + d.lessons, 0);

  // Build 28-day calendar heatmap anchored at today's date string
  const activityByDay = new Map(dailyActivities.map((d) => [d.day, d]));
  const todayStr = toLocalDayString();
  const [ty, tm, td] = todayStr.split('-').map((n) => Number.parseInt(n, 10));
  const calendarDays = Array.from({ length: 28 }, (_, idx) => {
    const offset = 27 - idx;
    const dt = new Date(ty!, tm! - 1, td! - offset);
    const dayStr = toLocalDayString(dt);
    const act = activityByDay.get(dayStr);
    return {
      dayStr,
      dayNum: dt.getDate(),
      xp: act?.xp ?? 0,
    };
  });

  const badges = [
    {
      id: 'first-lesson',
      icon: '🌱',
      title: 'Первый шаг',
      desc: 'Пройти хотя бы 1 мини-игру',
      earned: totalLessons >= 1 || totalXp > 0,
    },
    {
      id: 'streak-3',
      icon: '🔥',
      title: 'Серия 3 дня',
      desc: 'Заниматься 3 дня подряд',
      earned: streakDays >= 3,
    },
    {
      id: 'streak-7',
      icon: '⚡',
      title: 'Серия 7 дней',
      desc: 'Целая неделя без пропусков',
      earned: streakDays >= 7,
    },
    {
      id: 'streak-14',
      icon: '🌟',
      title: 'Серия 14 дней',
      desc: 'Две недели стабильной практики',
      earned: streakDays >= 14,
    },
    {
      id: 'unit-master',
      icon: '🏆',
      title: 'Первый юнит',
      desc: 'Закрыть все 4 навыка юнита',
      earned: completedUnitsCount >= 1,
    },
    {
      id: 'xp-100',
      icon: '💎',
      title: '100 XP',
      desc: 'Набрать 100 очков опыта',
      earned: totalXp >= 100,
    },
  ];

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    await setDisplayName(nameInput);
    setNameOverride(null);
    setStatusMessage('Профиль обновлён!');
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      {/* Profile header card */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image
              src={persona.avatar}
              alt={persona.name_ru}
              width={68}
              height={68}
              className="rounded-full"
            />
            <div>
              <span className="inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-900 dark:bg-sky-950 dark:text-sky-200">
                {profile.userId ? '☁️ Облачный профиль' : '👤 Гостевой профиль (локально)'}
              </span>
              <h1 className="mt-1.5 text-2xl font-extrabold">{profile.displayName}</h1>
              {profile.email && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{profile.email}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void triggerSync()}
              className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              🔄 Синхронизировать ({syncStatus.pendingCount})
            </button>
            <Link
              href="/settings"
              className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              ⚙️ Все настройки
            </Link>
            {profile.userId ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold hover:bg-slate-100 dark:border-slate-700"
              >
                Выйти
              </button>
            ) : (
              <Link
                href="/auth"
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700"
              >
                Войти / Сохранить в облако
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-amber-50/70 p-4 dark:bg-amber-950/30">
            <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Серия дней
            </div>
            <div className="mt-1 text-2xl font-black">🔥 {streakDays} дн.</div>
          </div>
          <div className="rounded-2xl bg-emerald-50/70 p-4 dark:bg-emerald-950/30">
            <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Сегодня XP
            </div>
            <div className="mt-1 text-2xl font-black">
              ⚡ {todayXp} / {profile.dailyGoalXp}
            </div>
          </div>
          <div className="rounded-2xl bg-sky-50/70 p-4 dark:bg-sky-950/30">
            <div className="text-xs font-semibold text-sky-800 dark:text-sky-300">Всего XP</div>
            <div className="mt-1 text-2xl font-black">🏆 {totalXp}</div>
          </div>
          <div className="rounded-2xl bg-violet-50/70 p-4 dark:bg-violet-950/30">
            <div className="text-xs font-semibold text-violet-800 dark:text-violet-300">
              Пройдено юнитов
            </div>
            <div className="mt-1 text-2xl font-black">
              ✅ {completedUnitsCount} (повтор: {dueReviews.length})
            </div>
          </div>
        </div>
      </section>

      {/* 28-Day Streak Calendar */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold">📅 Календарь серии (последние 28 дней)</h2>
            <p className="text-xs text-slate-500">
              Зелёным отмечены дни, когда вы практиковали турецкий или английский
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">Уроков пройдено: {totalLessons}</span>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 sm:gap-2.5">
          {calendarDays.map((item) => {
            const active = item.xp > 0;
            const goalMet = item.xp >= profile.dailyGoalXp;
            return (
              <div
                key={item.dayStr}
                title={`${item.dayStr}: ${item.xp} XP`}
                className={`flex flex-col items-center justify-center rounded-xl border py-2 text-xs font-bold ${
                  goalMet
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : active
                      ? 'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                      : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40'
                }`}
              >
                <span>{item.dayNum}</span>
                <span className="text-[10px] opacity-80">{item.xp > 0 ? `${item.xp}XP` : '·'}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Soft Gamification Badges */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-extrabold">🏅 Значки достижений</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`flex items-center gap-3 rounded-2xl border p-3.5 ${
                b.earned
                  ? 'border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/40'
                  : 'border-slate-200 opacity-50 dark:border-slate-800'
              }`}
            >
              <span className="text-2xl">{b.icon}</span>
              <div>
                <div className="text-sm font-extrabold">{b.title}</div>
                <div className="text-xs text-slate-500">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Avatar & Name Quick Editor */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-extrabold">Персонаж и имя профиля</h2>

        <div className="mt-3 flex flex-wrap gap-3">
          {Object.values(CHARACTERS_MAP).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => void setAvatarKey(c.id)}
              className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold ${
                profile.avatarKey === c.id
                  ? 'border-sky-600 bg-sky-50 dark:border-sky-400 dark:bg-sky-950'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <Image
                src={c.avatar}
                alt={c.name_ru}
                width={28}
                height={28}
                className="rounded-full"
              />
              <span>{c.name_ru}</span>
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => void handleSaveName(e)}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1">
            <label
              htmlFor="profileName"
              className="block text-xs font-bold uppercase text-slate-500"
            >
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
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
          >
            Сохранить имя
          </button>
        </form>

        {statusMessage && (
          <p className="mt-2 text-xs font-bold text-emerald-600">{statusMessage}</p>
        )}
      </section>
    </main>
  );
}
