'use client';

import Link from 'next/link';
import { useAppState } from '@/components/providers/app-provider';

const STEP_LABELS: Record<number, { interval: string; desc: string }> = {
  1: { interval: 'Через 1 день', desc: 'Первое закрепление списка из 12 слов вслух' },
  2: { interval: 'Через 3 дня', desc: 'Быстрый повтор слов и 1–2 мини-игр' },
  3: { interval: 'Через 7 дней', desc: 'Недельная проверка долговременной памяти' },
  4: { interval: 'Через 14 дней', desc: 'Финальное закрепление юнита' },
  5: { interval: 'Освоен полностью', desc: 'Все 4 цикла (1/3/7/14 дн.) успешно пройдены' },
};

function unitIdToHref(unitId: string, courseId: string): string {
  if (unitId === 'tr-1-1') return '/tr/units/1-1-food-and-drinks';
  if (unitId === 'en-1-1') return '/en/units/1-1-learn-basic-phrases';
  return `/${courseId}`;
}

export default function ReviewPage() {
  const { reviewStateMap, dueReviews } = useAppState();
  const allReviews = Object.values(reviewStateMap).sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  );
  const dueIds = new Set(dueReviews.map((r) => r.unitId));
  const upcomingReviews = allReviews.filter((r) => !dueIds.has(r.unitId));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-6 dark:border-amber-900 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40">
        <span className="inline-block rounded-full bg-amber-600 px-3 py-0.5 text-xs font-bold text-white">
          Интервальное повторение 1 → 3 → 7 → 14 дней
        </span>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Расписание повторений</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          По методике курса к каждому пройденному юниту нужно вернуться через 1 день, 3 дня, 7 дней
          и 14 дней. Достаточно вслух пробежать 12 слов и пройти 1–2 мини-игры.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className="rounded-2xl border border-slate-200 bg-white/90 p-3 dark:border-slate-800 dark:bg-slate-900/90"
            >
              <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                Шаг {step} из 4
              </div>
              <div className="mt-0.5 text-sm font-extrabold">{STEP_LABELS[step]?.interval}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">{STEP_LABELS[step]?.desc}</div>
            </div>
          ))}
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold">🔔 Готовы к повторению сегодня ({dueReviews.length})</h2>
        {dueReviews.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
            На сегодня срочных повторений нет! Завершите все 4 навыка любого юнита (например, демо{' '}
            <Link href="/tr/units/1-1-food-and-drinks" className="font-bold text-sky-600 underline">
              Турецкий 1.1
            </Link>{' '}
            или{' '}
            <Link
              href="/en/units/1-1-learn-basic-phrases"
              className="font-bold text-sky-600 underline"
            >
              Английский 1.1
            </Link>
            ), чтобы он встал в расписание 1 → 3 → 7 → 14 дней.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {dueReviews.map((rev) => (
              <div
                key={rev.unitId}
                className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-800 dark:bg-amber-950/40"
              >
                <div>
                  <div className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300">
                    {rev.courseId === 'tr' ? '🇹🇷 Турецкий' : '🇬🇧 Английский'} · Шаг {rev.step}/4
                  </div>
                  <div className="mt-0.5 text-base font-extrabold">Юнит {rev.unitId}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {STEP_LABELS[rev.step]?.interval}
                  </div>
                </div>
                <Link
                  href={unitIdToHref(rev.unitId, rev.courseId)}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
                >
                  Повторить →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold">
          📅 Запланированные будущие повторения ({upcomingReviews.length})
        </h2>
        {upcomingReviews.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Пока нет юнитов, ожидающих следующего шага повторения.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {upcomingReviews.map((rev) => (
              <div
                key={rev.unitId}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div>
                  <div className="text-xs font-bold text-slate-500">
                    Шаг {rev.step}/4 · {STEP_LABELS[rev.step]?.interval}
                  </div>
                  <div className="mt-0.5 font-bold">Юнит {rev.unitId}</div>
                  <div className="text-xs text-slate-500">
                    Дата: {new Date(rev.dueAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <Link
                  href={unitIdToHref(rev.unitId, rev.courseId)}
                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700"
                >
                  Открыть
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
