'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useAppState } from '@/components/providers/app-provider';
import { CHARACTERS_MAP } from '@/lib/content/characters';
import type { CourseId } from '@/lib/content/schema';
import type { DailyGoalXp } from '@/lib/db/dexie';

export default function WelcomePage() {
  const router = useRouter();
  const { profile, completeOnboarding } = useAppState();

  const [course, setCourse] = useState<CourseId>(profile.preferredCourse);
  const [goal, setGoal] = useState<DailyGoalXp>(profile.dailyGoalXp);
  const [avatar, setAvatar] = useState<string>(profile.avatarKey || 'elif');
  const [name, setName] = useState<string>(
    profile.displayName === 'Гость' ? '' : profile.displayName,
  );

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    await completeOnboarding({
      course,
      dailyGoalXp: goal,
      displayName: name.trim() || 'Гость',
      avatarKey: avatar,
    });
    router.push(
      course === 'tr' ? '/tr/units/1-1-food-and-drinks' : '/en/units/1-1-learn-basic-phrases',
    );
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <span className="inline-block rounded-full bg-sky-100 px-3 py-1 text-xs font-extrabold text-sky-900 dark:bg-sky-950 dark:text-sky-200">
          Добро пожаловать в Konuş!
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Настройте свой языковой путь за 30 секунд
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Регистрация не обязательна — весь прогресс сохраняется в вашем браузере и работает без
          интернета.
        </p>

        <form onSubmit={(e) => void handleStart(e)} className="mt-6 space-y-6">
          {/* Step 1: Course */}
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">
              1. Какой язык будем практиковать?
            </div>
            <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCourse('tr')}
                className={`flex flex-col items-start rounded-2xl border p-4 text-left transition ${
                  course === 'tr'
                    ? 'border-sky-600 bg-sky-50/80 ring-2 ring-sky-500/20 dark:border-sky-400 dark:bg-sky-950/50'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800'
                }`}
              >
                <span className="text-2xl">🇹🇷</span>
                <span className="mt-2 font-bold">Турецкий язык (A1)</span>
                <span className="mt-0.5 text-xs text-slate-500">
                  67 юнитов + 3 босса · 803 слова
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCourse('en')}
                className={`flex flex-col items-start rounded-2xl border p-4 text-left transition ${
                  course === 'en'
                    ? 'border-sky-600 bg-sky-50/80 ring-2 ring-sky-500/20 dark:border-sky-400 dark:bg-sky-950/50'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800'
                }`}
              >
                <span className="text-2xl">🇬🇧</span>
                <span className="mt-2 font-bold">Английский язык (Intro–B2)</span>
                <span className="mt-0.5 text-xs text-slate-500">
                  60 активных юнитов + карта до 295 тем
                </span>
              </button>
            </div>
          </div>

          {/* Step 2: Daily Goal */}
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">
              2. Выберите комфортную цель на день
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2.5">
              {(
                [
                  { xp: 10 as DailyGoalXp, label: 'Спокойно', sub: '1 мини-игра (~3 мин)' },
                  { xp: 20 as DailyGoalXp, label: 'Оптимально', sub: '2 мини-игры (~7 мин)' },
                  { xp: 30 as DailyGoalXp, label: 'Уверенно', sub: 'Полный юнит (~12 мин)' },
                ] as const
              ).map((item) => (
                <button
                  key={item.xp}
                  type="button"
                  onClick={() => setGoal(item.xp)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    goal === item.xp
                      ? 'border-emerald-600 bg-emerald-50/80 dark:border-emerald-500 dark:bg-emerald-950/50'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                    ⚡ {item.xp} XP
                  </div>
                  <div className="mt-0.5 text-xs font-bold">{item.label}</div>
                  <div className="text-[11px] text-slate-500">{item.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Character & Name */}
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">
              3. Выберите персонажа-наставника и ваше имя
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {Object.values(CHARACTERS_MAP).map((char) => (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => setAvatar(char.id)}
                  className={`flex flex-col items-center rounded-2xl border p-3 text-center transition ${
                    avatar === char.id
                      ? 'border-sky-600 bg-sky-50 dark:border-sky-400 dark:bg-sky-950/50'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Image
                    src={char.avatar}
                    alt={char.name_ru}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                  <span className="mt-1.5 text-xs font-bold">{char.name_ru}</span>
                </button>
              ))}
            </div>

            <div className="mt-3">
              <label htmlFor="welcomeName" className="block text-xs font-semibold text-slate-500">
                Как к вам обращаться (необязательно):
              </label>
              <input
                id="welcomeName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например, Тимур или Анна"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-sky-600 py-3.5 text-base font-extrabold text-white shadow-sm hover:bg-sky-700"
          >
            Начать первый урок ({course === 'tr' ? 'Турецкий 1.1' : 'Английский 1.1'}) →
          </button>
        </form>
      </div>
    </main>
  );
}
