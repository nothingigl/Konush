'use client';

import Link from 'next/link';
import { useAppState } from '@/components/providers/app-provider';

export default function HomePage() {
  const { profile, unitProgressMap, dueReviews, todayXp, streakDays, setPreferredCourse } =
    useAppState();

  const tr11Progress = unitProgressMap['tr-1-1'];
  const en11Progress = unitProgressMap['en-1-1'];

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
      <section className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 sm:p-8 dark:border-sky-900 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <span className="inline-block rounded-full bg-sky-600 px-3 py-1 text-xs font-bold text-white">
              Бесплатный PWA · Работает офлайн · Без «сердец» и блокировок
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Практика турецкого и английского по 4 навыкам
            </h1>
            <p className="text-sm text-slate-600 sm:text-base dark:text-slate-300">
              Короткие уроки по 10–15 минут: 12 слов и 4 мини-игры (🗣 говорение, 🎧 слушание, ✍️
              письмо, 📖 чтение) с интервальным повторением через 1, 3, 7 и 14 дней.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm shadow-xs dark:border-slate-800 dark:bg-slate-900/90">
            <div className="font-semibold">Ваш прогресс сегодня</div>
            <div className="flex items-center gap-4 text-base font-bold">
              <span>🔥 Серия: {streakDays} дн.</span>
              <span>
                ⚡ {todayXp} / {profile.dailyGoalXp} XP
              </span>
            </div>
            <div className="text-xs text-slate-500">
              {profile.userId
                ? `Синхронизация включена (${profile.email ?? profile.displayName})`
                : 'Гостевой режим (прогресс хранится в браузере и перенесётся при входе)'}
            </div>
          </div>
        </div>
      </section>

      {dueReviews.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/50">
          <h2 className="text-lg font-bold text-amber-950 dark:text-amber-200">
            🔔 Пора повторить ({dueReviews.length} юнит.)
          </h2>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            Интервальное повторение по расписанию 1 → 3 → 7 → 14 дней:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {dueReviews.map((rev) => (
              <Link
                key={rev.unitId}
                href={
                  rev.unitId === 'tr-1-1'
                    ? '/tr/units/1-1-food-and-drinks'
                    : rev.unitId === 'en-1-1'
                      ? '/en/units/1-1-learn-basic-phrases'
                      : `/${rev.courseId}`
                }
                className="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700"
              >
                Повторить {rev.unitId} (шаг {rev.step}/4) →
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Демо-юниты Этапа 2" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Демо-юниты с работающим плеером (доступны офлайн)</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-900 dark:bg-rose-950 dark:text-rose-200">
                  🇹🇷 Турецкий · Юнит 1.1
                </span>
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  ✓ Загружен для офлайна
                </span>
              </div>
              <h3 className="mt-3 text-xl font-bold">1.1 Еда и напитки</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                12 слов (<span lang="tr">su, çay, kahve, süt, ekmek, peynir…</span>) и 32 упражнения
                по 4 навыкам: Эмодзи-блиц, Заказ вслепую, Кубики, Исправь баг и Чтение.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                  Слова: {tr11Progress?.wordsDone ? '✅' : '☐'}
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                  🗣 {tr11Progress?.speakingBest ?? 0}%
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                  🎧 {tr11Progress?.listeningBest ?? 0}%
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                  ✍️ {tr11Progress?.writingBest ?? 0}%
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                  📖 {tr11Progress?.readingBest ?? 0}%
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/tr/units/1-1-food-and-drinks"
                onClick={() => void setPreferredCourse('tr')}
                className="flex-1 rounded-xl bg-sky-600 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-sky-700"
              >
                Открыть юнит 1.1 (Турецкий) →
              </Link>
              <Link
                href="/tr"
                className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Весь курс (67 юнитов)
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
                  🇬🇧 Английский · Юнит 1.1
                </span>
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  ✓ Загружен для офлайна
                </span>
              </div>
              <h3 className="mt-3 text-xl font-bold">1.1 Основные фразы</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                12 слов (<span lang="en">hello, goodbye, please, thank you, excuse me…</span>) и 32
                упражнения по 4 навыкам: Три интонации, Время суток, Пары реплик и Мини-диалог.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                  Слова: {en11Progress?.wordsDone ? '✅' : '☐'}
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                  🗣 {en11Progress?.speakingBest ?? 0}%
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                  🎧 {en11Progress?.listeningBest ?? 0}%
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                  ✍️ {en11Progress?.writingBest ?? 0}%
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                  📖 {en11Progress?.readingBest ?? 0}%
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/en/units/1-1-learn-basic-phrases"
                onClick={() => void setPreferredCourse('en')}
                className="flex-1 rounded-xl bg-sky-600 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-sky-700"
              >
                Открыть юнит 1.1 (Английский) →
              </Link>
              <Link
                href="/en"
                className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Весь курс (60+235 тем)
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
