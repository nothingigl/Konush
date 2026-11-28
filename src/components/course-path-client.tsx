'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { CHARACTERS_MAP } from '@/lib/content/characters';
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

const SECTION_THEMES = [
  {
    banner: 'from-sky-500 via-cyan-500 to-teal-500 shadow-sky-500/20',
    nodeActive: 'border-sky-700 bg-gradient-to-b from-sky-400 to-sky-500 text-white',
    ring: 'ring-sky-400/50',
    mascot: 'elif',
  },
  {
    banner: 'from-orange-500 via-rose-500 to-pink-500 shadow-rose-500/20',
    nodeActive: 'border-rose-700 bg-gradient-to-b from-orange-400 to-rose-500 text-white',
    ring: 'ring-rose-400/50',
    mascot: 'kemal',
  },
  {
    banner: 'from-indigo-500 via-violet-500 to-fuchsia-500 shadow-violet-500/20',
    nodeActive: 'border-violet-700 bg-gradient-to-b from-indigo-400 to-violet-500 text-white',
    ring: 'ring-violet-400/50',
    mascot: 'zeynep',
  },
  {
    banner: 'from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-500/20',
    nodeActive: 'border-emerald-700 bg-gradient-to-b from-emerald-400 to-teal-500 text-white',
    ring: 'ring-emerald-400/50',
    mascot: 'emre',
  },
];

// Winding sine-wave horizontal offsets (px) for the stepping-stone path
const PATH_OFFSETS = [0, 48, 72, 48, 0, -48, -72, -48];

const UNIT_EMOJIS = ['☕', '👋', '🏠', '🚌', '🛍', '🍽', '🎵', '🌍', '💬', '⚡', '🧭', '🎯'];

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
      [sectionNum]: `0/${sectionUnits.length}`,
    }));

    const result = await downloadSectionForOffline({
      courseId: course.id,
      unitSlugs: sectionUnits.map((u) => u.slug),
      onProgress: (completed, total) => {
        setDownloadProgress((prev) => ({
          ...prev,
          [sectionNum]: `${completed}/${total}`,
        }));
      },
    });

    setDownloadingSection(null);
    setDownloadProgress((prev) => ({
      ...prev,
      [sectionNum]: result.quotaExceeded ? 'Память заполнена' : '✓ Офлайн',
    }));
  };

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 px-3 py-4 sm:px-4 sm:py-6">
      {course.sections.map((sec, secIdx) => {
        const theme = SECTION_THEMES[secIdx % SECTION_THEMES.length]!;
        const mascot = CHARACTERS_MAP[theme.mascot] ?? CHARACTERS_MAP.elif!;
        const sectionUnits = sec.unit_ids
          .map((id) => unitById.get(id))
          .filter((u): u is CourseUnitSummary => Boolean(u));

        const completedCount = sectionUnits.filter((u) =>
          Boolean(unitProgressMap[u.id]?.completedAt),
        ).length;

        return (
          <section key={sec.section} className="space-y-6">
            {/* Vibrant Section Banner — minimal text, maximum energy */}
            <div
              className={`rounded-3xl bg-gradient-to-r p-4 text-white shadow-lg sm:p-5 ${theme.banner}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-white/85">
                    <span className="rounded-full bg-white/20 px-2 py-0.5">{sec.cefr}</span>
                    <span>
                      {completedCount}/{sectionUnits.length} пройдено
                    </span>
                  </div>
                  <h2 className="mt-1 truncate text-lg font-black sm:text-xl">{sec.title_ru}</h2>
                </div>

                {sectionUnits.length > 0 && (
                  <button
                    type="button"
                    disabled={downloadingSection !== null}
                    onClick={() => void handleDownloadSection(sec.section, sectionUnits)}
                    title="Скачать секцию для офлайна"
                    className="btn-3d shrink-0 rounded-2xl border-b-2 border-black/20 bg-white/20 px-3 py-2 text-xs font-black text-white backdrop-blur-xs hover:bg-white/30 disabled:opacity-50"
                  >
                    {downloadingSection === sec.section
                      ? `⏳ ${downloadProgress[sec.section] ?? ''}`
                      : (downloadProgress[sec.section] ?? '📥 Офлайн')}
                  </button>
                )}
              </div>
            </div>

            {/* Winding Stepping-Stone Path */}
            {sectionUnits.length > 0 ? (
              <div className="relative flex flex-col items-center gap-6 py-2">
                {sectionUnits.map((u, idx) => {
                  const prog = unitProgressMap[u.id];
                  const isRecommended = u.id === recommendedUnitId;
                  const isCompleted = Boolean(prog?.completedAt);
                  const offsetX = PATH_OFFSETS[idx % PATH_OFFSETS.length]!;
                  const emoji = u.boss ? '🏆' : UNIT_EMOJIS[idx % UNIT_EMOJIS.length]!;
                  const showMascotHere = idx === 2 || (isRecommended && idx > 0);

                  return (
                    <div
                      key={u.id}
                      className="relative flex flex-col items-center"
                      style={{ transform: `translateX(${offsetX}px)` }}
                    >
                      {/* Floating START bubble on recommended unit */}
                      {isRecommended && (
                        <div className="animate-float mb-2 rounded-2xl border-2 border-sky-200 bg-white px-3.5 py-1 text-xs font-black uppercase tracking-wide text-sky-600 shadow-md dark:border-sky-700 dark:bg-[#131b2e] dark:text-sky-300">
                          СТАРТ!
                        </div>
                      )}

                      {/* Mascot cheering alongside the path */}
                      {showMascotHere && (
                        <div
                          className={`pointer-events-none absolute top-1 hidden sm:block ${
                            offsetX >= 0 ? '-left-28' : '-right-28'
                          }`}
                        >
                          <div className="animate-float rounded-full bg-white/90 p-1.5 shadow-md dark:bg-[#131b2e]">
                            <Image
                              src={mascot.avatar}
                              alt={mascot.name_ru}
                              width={52}
                              height={52}
                              className="rounded-full"
                            />
                          </div>
                        </div>
                      )}

                      {/* Chunky 3D Circular Unit Node */}
                      <Link
                        href={`/${course.id}/units/${u.slug}`}
                        className={`btn-3d relative flex h-18 w-18 items-center justify-center rounded-full border-b-[6px] text-2xl font-black shadow-md transition ${
                          isRecommended
                            ? `${theme.nodeActive} animate-pulse-halo ring-4 ${theme.ring}`
                            : u.boss
                              ? 'border-amber-700 bg-gradient-to-b from-amber-300 to-amber-500 text-white shadow-amber-500/25'
                              : isCompleted
                                ? 'border-emerald-700 bg-gradient-to-b from-emerald-400 to-emerald-500 text-white shadow-emerald-500/20'
                                : 'border-slate-300 bg-white text-slate-700 hover:brightness-98 dark:border-slate-800 dark:bg-[#19233b] dark:text-slate-200'
                        }`}
                      >
                        <span>{isCompleted && !isRecommended ? '⭐' : emoji}</span>
                        <span className="absolute -bottom-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900/85 px-1.5 text-[10px] font-black text-white dark:bg-white dark:text-slate-900">
                          {u.boss ? '★' : `${u.section}.${u.order}`}
                        </span>
                      </Link>

                      {/* Crisp Short Title Below Node */}
                      <span className="mt-2 max-w-36 text-center text-xs font-extrabold leading-tight text-slate-700 dark:text-slate-200">
                        {u.title_ru}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center text-xs font-bold text-slate-400 dark:border-slate-800">
                🚀 Скоро откроются новые темы ({sec.planned_topics?.length ?? 0})
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
