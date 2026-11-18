'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { playReferenceAudio } from '@/lib/audio/speech';
import type { Unit } from '@/lib/content/schema';
import type { SkillKey } from '@/lib/db/dexie';
import { useAppState } from './providers/app-provider';

const SKILL_META: Array<{
  key: SkillKey;
  emoji: string;
  title_ru: string;
  desc_ru: string;
}> = [
  {
    key: 'speaking',
    emoji: '🗣',
    title_ru: 'Говорение',
    desc_ru: 'Произношение вслух, быстрая подача слов и фраз с самопроверкой',
  },
  {
    key: 'listening',
    emoji: '🎧',
    title_ru: 'Слушание',
    desc_ru: 'Понимание скриптов и реплик на слух',
  },
  {
    key: 'writing',
    emoji: '✍️',
    title_ru: 'Письмо',
    desc_ru: 'Кубики, исправление багов, пары и правописание окончаний',
  },
  {
    key: 'reading',
    emoji: '📖',
    title_ru: 'Чтение',
    desc_ru: 'Чтение мини-историй и диалогов с ответами на вопросы',
  },
];

export function UnitDetailClient({ unit }: { unit: Unit }) {
  const { unitProgressMap, reviewStateMap, markWordsDone, cacheUnitOffline } = useAppState();
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [offlineSaved, setOfflineSaved] = useState(false);

  const progress = unitProgressMap[unit.id];
  const review = reviewStateMap[unit.id];

  // Automatically cache any opened unit in IndexedDB for offline access
  useEffect(() => {
    void cacheUnitOffline(unit).then(() => setOfflineSaved(true));
  }, [cacheUnitOffline, unit]);

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = {
      title: `${unit.title_ru} — Türkçe Duo`,
      text: `Практикуем юнит «${unit.title_ru}» (${unit.words.length} слов и 4 навыка)!`,
      url: shareUrl,
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareMsg('Ссылка скопирована в буфер обмена!');
        setTimeout(() => setShareMsg(null), 3000);
      }
    } catch {
      // Ignore user share cancellation
    }
  };

  const handleOfflineDownload = async () => {
    await cacheUnitOffline(unit);
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open('turkce-duo-content-v1');
        await cache.add(window.location.pathname);
      } catch {
        // Ignore cache error if offline
      }
    }
    setOfflineSaved(true);
    setShareMsg('Юнит сохранён в браузере для работы без интернета!');
    setTimeout(() => setShareMsg(null), 3000);
  };

  const getBestScore = (skill: SkillKey): number | null => {
    if (!progress) return null;
    switch (skill) {
      case 'speaking':
        return progress.speakingBest;
      case 'listening':
        return progress.listeningBest;
      case 'writing':
        return progress.writingBest;
      case 'reading':
        return progress.readingBest;
    }
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link
          href={`/${unit.course}`}
          className="font-medium text-sky-600 hover:underline dark:text-sky-400"
        >
          ← Назад к карте курса ({unit.course === 'tr' ? 'Турецкий' : 'Английский'})
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleOfflineDownload()}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
          >
            {offlineSaved ? '✓ Доступен офлайн' : '📥 Скачать для офлайна'}
          </button>

          <button
            type="button"
            onClick={() => void handleShare()}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
          >
            🔗 Поделиться
          </button>
        </div>
      </div>

      {shareMsg && (
        <div
          role="status"
          className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        >
          {shareMsg}
        </div>
      )}

      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-bold text-sky-900 dark:bg-sky-950 dark:text-sky-200">
              {unit.course === 'tr' ? '🇹🇷 Турецкий' : '🇬🇧 Английский'} · Секция {unit.section} ·{' '}
              {unit.boss ? 'Босс' : `Юнит ${unit.section}.${unit.order}`}
            </span>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{unit.title_ru}</h1>
          </div>

          {review && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
              <div className="font-bold">Повторение (1/3/7/14 дн.): шаг {review.step}/4</div>
              <div>Следующее: {new Date(review.dueAt).toLocaleDateString('ru-RU')}</div>
            </div>
          )}
        </div>
      </header>

      {!unit.boss && unit.words.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">1. Слова юнита ({unit.words.length}) — 2 минуты</h2>
              <p className="text-xs text-slate-500">
                Прочитайте список вслух два раза. Нажмите на слово, чтобы прослушать произношение.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void markWordsDone(unit.id, unit.course)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                progress?.wordsDone
                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                  : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}
            >
              {progress?.wordsDone
                ? '✅ Слова прочитаны вслух'
                : 'Отметить слова прочитанными (2 раза)'}
            </button>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
            {unit.words.map((word) => (
              <button
                key={word.id}
                type="button"
                onClick={() =>
                  void playReferenceAudio({
                    text: word.text,
                    course: unit.course,
                    audioRelPath: word.audio,
                  })
                }
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-left transition hover:border-sky-400 hover:bg-sky-50/50 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-sky-600"
              >
                <div>
                  <div lang={unit.course} className="font-bold text-slate-900 dark:text-white">
                    {word.text}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">{word.ru}</div>
                </div>
                <span aria-label="Прослушать" className="text-base text-sky-600 dark:text-sky-400">
                  🔊
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3" aria-label="Навыки юнита">
        <h2 className="text-xl font-bold">2. Четыре навыка (по 2–3 минуты на игру)</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {SKILL_META.map((sk) => {
            const exercises = unit.skills[sk.key].exercises;
            const best = getBestScore(sk.key);
            const hasExercises = exercises.length > 0;

            return (
              <div
                key={sk.key}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{sk.emoji}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        best !== null
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {best !== null ? `Лучший: ${best}%` : 'Не начато'}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold">{sk.title_ru}</h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{sk.desc_ru}</p>
                </div>

                <div className="mt-5">
                  {hasExercises ? (
                    <Link
                      href={`/${unit.course}/units/${unit.slug}/play/${sk.key}`}
                      className="block w-full rounded-xl bg-sky-600 py-2.5 text-center text-sm font-bold text-white hover:bg-sky-700"
                    >
                      {best !== null
                        ? `Повторить (${exercises.length} упр.)`
                        : `Начать (${exercises.length} упр.)`}{' '}
                      →
                    </Link>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 py-2.5 text-center text-xs text-slate-500 dark:border-slate-700">
                      Упражнения наполняются на Этапе 4
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
