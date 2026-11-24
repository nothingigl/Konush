'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Course } from '@/lib/content/schema';
import { downloadSectionForOffline } from '@/lib/pwa/offline';
import { useAppState } from './providers/app-provider';

export interface CourseUnitSummary {
  id: string;
  section: number;
  order: number;
  slug: string;
  title_ru: string;
  boss: boolean;
  wordCount: number;
  exerciseCount: number;
}

export function CoursePathClient({
  course,
  units,
}: {
  course: Course;
  units: CourseUnitSummary[];
}) {
  const { unitProgressMap } = useAppState();
  const [downloadingSection, setDownloadingSection] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<number, string>>({});
  const unitById = new Map(units.map((u) => [u.id, u]));

  const recommendedUnitId =
    units.find((u) => u.exerciseCount > 0 && !unitProgressMap[u.id]?.completedAt)?.id ??
    units[0]?.id;

  const handleDownloadSection = async (sectionNum: number, sectionUnits: CourseUnitSummary[]) => {
    if (downloadingSection !== null || sectionUnits.length === 0) return;
    setDownloadingSection(sectionNum);
    setDownloadProgress((prev) => ({
      ...prev,
      [sectionNum]: `Скачивание 0/${sectionUnits.length}…`,
    }));

    const result = await downloadSectionForOffline({
      courseId: course.id,
      unitSlugs: sectionUnits.map((u) => u.slug),
      onProgress: (completed, total) => {
        setDownloadProgress((prev) => ({
          ...prev,
          [sectionNum]: `Скачивание ${completed}/${total}…`,
        }));
      },
    });

    setDownloadingSection(null);
    setDownloadProgress((prev) => ({
      ...prev,
      [sectionNum]: result.messageRu,
    }));
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-sky-600 dark:text-sky-400">
          <span>{course.id === 'tr' ? '🇹🇷 Курс турецкого' : '🇬🇧 Курс английского'}</span>
          <span>·</span>
          <span>Все юниты открыты</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{course.title_ru}</h1>
        <p className="text-slate-600 dark:text-slate-300">{course.description_ru}</p>
      </header>

      {course.sections.map((sec) => {
        const sectionUnits = sec.unit_ids
          .map((id) => unitById.get(id))
          .filter((u): u is CourseUnitSummary => Boolean(u));

        return (
          <section
            key={sec.section}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <span className="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-900 dark:bg-sky-950 dark:text-sky-200">
                  Уровень {sec.cefr}
                </span>
                <h2 className="mt-1 text-xl font-bold">{sec.title_ru}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">{sec.description_ru}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="text-xs font-semibold text-slate-500">
                  {sectionUnits.length > 0
                    ? `${sectionUnits.length} юнитов`
                    : `${sec.planned_topics?.length ?? 0} тем в плане`}
                </div>
                {sectionUnits.length > 0 && (
                  <button
                    type="button"
                    disabled={downloadingSection !== null}
                    onClick={() => void handleDownloadSection(sec.section, sectionUnits)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-sky-500 hover:text-sky-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {downloadingSection === sec.section
                      ? (downloadProgress[sec.section] ?? 'Скачивание…')
                      : '📥 Скачать секцию для офлайна'}
                  </button>
                )}
                {downloadProgress[sec.section] && downloadingSection !== sec.section && (
                  <div
                    role="status"
                    className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"
                  >
                    {downloadProgress[sec.section]}
                  </div>
                )}
              </div>
            </div>

            {sectionUnits.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sectionUnits.map((u) => {
                  const prog = unitProgressMap[u.id];
                  const isRecommended = u.id === recommendedUnitId;
                  const isCompleted = Boolean(prog?.completedAt);

                  return (
                    <Link
                      key={u.id}
                      href={`/${course.id}/units/${u.slug}`}
                      className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                        isRecommended
                          ? 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/20 dark:border-sky-500 dark:bg-sky-950/30'
                          : isCompleted
                            ? 'border-emerald-300 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/20'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-500">
                            {u.boss ? `🏆 Босс ${u.section}` : `Юнит ${u.section}.${u.order}`}
                          </span>
                          {isRecommended && (
                            <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-bold text-white">
                              Рекомендуемый
                            </span>
                          )}
                          {isCompleted && !isRecommended && (
                            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                              ✓ Пройден
                            </span>
                          )}
                        </div>

                        <h3 className="mt-1.5 font-bold">{u.title_ru}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {u.boss ? 'Босс-марафон' : `${u.wordCount} слов`} ·{' '}
                          {u.exerciseCount > 0 ? `${u.exerciseCount} упр.` : 'Скоро'}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        <span className={prog?.speakingBest ? 'font-bold text-emerald-600' : ''}>
                          🗣 {prog?.speakingBest ?? 0}%
                        </span>
                        <span>·</span>
                        <span className={prog?.listeningBest ? 'font-bold text-emerald-600' : ''}>
                          🎧 {prog?.listeningBest ?? 0}%
                        </span>
                        <span>·</span>
                        <span className={prog?.writingBest ? 'font-bold text-emerald-600' : ''}>
                          ✍️ {prog?.writingBest ?? 0}%
                        </span>
                        <span>·</span>
                        <span className={prog?.readingBest ? 'font-bold text-emerald-600' : ''}>
                          📖 {prog?.readingBest ?? 0}%
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-medium text-sky-600 dark:text-sky-400">
                  Показать карту запланированных тем модуля {sec.section} (
                  {sec.planned_topics?.length ?? 0} юнитов)
                </summary>
                <ul className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 dark:text-slate-400">
                  {sec.planned_topics?.map((pt) => (
                    <li
                      key={pt.unit_number}
                      className="rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800"
                    >
                      <strong>{pt.unit_number}</strong> {pt.title_ru} —{' '}
                      <span lang="en" className="italic">
                        {pt.title_en}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        );
      })}
    </main>
  );
}
