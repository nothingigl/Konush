'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useAppState } from '@/components/providers/app-provider';
import { getCharacterPersona } from '@/lib/content/characters';

export default function HomePage() {
  const { profile, unitProgressMap, dueReviews, todayXp, streakDays, setPreferredCourse } =
    useAppState();

  const tr11Progress = unitProgressMap['tr-1-1'];
  const en11Progress = unitProgressMap['en-1-1'];
  const persona = getCharacterPersona(profile.avatarKey || 'elif');
  const goalPct = Math.min(100, Math.round((todayXp / profile.dailyGoalXp) * 100));

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
      {/* Hero & Daily Goal Card */}
      <section className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 sm:p-8 dark:border-sky-900 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950">
        <div className="grid items-center gap-6 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full bg-sky-600 px-3 py-1 text-xs font-extrabold text-white">
                Konuş! · Бесплатный PWA
              </span>
              <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                Работает офлайн · Без «сердец»
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
              Говори свободно по-турецки и по-английски
            </h1>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
              Короткие уроки по 10–15 минут: 12 слов и 4 мини-игры (🗣 говорение, 🎧 слушание, ✍️
              письмо, 📖 чтение) с интервальным повторением строго через 1, 3, 7 и 14 дней.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href={
                  profile.preferredCourse === 'en'
                    ? '/en/units/1-1-learn-basic-phrases'
                    : '/tr/units/1-1-food-and-drinks'
                }
                className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-extrabold text-white shadow-xs hover:bg-sky-700"
              >
                Продолжить урок ({profile.preferredCourse === 'en' ? 'Английский' : 'Турецкий'}) →
              </Link>
              <Link
                href="/welcome"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                🎯 Выбрать язык и цель
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-xs lg:col-span-5 dark:border-slate-800 dark:bg-slate-900/95">
            <div className="flex items-center gap-3">
              <Image
                src={persona.avatar}
                alt={persona.name_ru}
                width={52}
                height={52}
                className="rounded-full"
              />
              <div>
                <div className="text-xs font-bold uppercase text-sky-600 dark:text-sky-400">
                  Наставник: {persona.name_ru}
                </div>
                <div className="text-sm font-bold">{persona.greeting_tr}</div>
                <div className="text-xs text-slate-500">{persona.role_ru}</div>
              </div>
            </div>

            <div className="mt-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>
                  Дневная цель: ⚡ {todayXp} / {profile.dailyGoalXp} XP
                </span>
                <span>🔥 Серия: {streakDays} дн.</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
              <span>
                {profile.userId
                  ? `Облачный профиль: ${profile.email ?? profile.displayName}`
                  : 'Гостевой режим (сохранено в браузере)'}
              </span>
              {!profile.userId && (
                <Link href="/auth" className="font-bold text-sky-600 underline dark:text-sky-400">
                  Синхронизировать →
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {dueReviews.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-amber-950 dark:text-amber-200">
                🔔 Пора повторить ({dueReviews.length} юнит.)
              </h2>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Интервальное повторение по расписанию 1 → 3 → 7 → 14 дней:
              </p>
            </div>
            <Link
              href="/review"
              className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
            >
              Открыть расписание повторений →
            </Link>
          </div>
        </section>
      )}

      {/* Active Courses & Demo Units */}
      <section aria-label="Курсы и демо-юниты" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold">Выберите курс или начните демо-урок</h2>
          <span className="text-xs text-slate-500">
            Все 133 юнита открыты · Демо-юниты 1.1 предзагружены для офлайна
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Turkish card */}
          <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-extrabold text-rose-900 dark:bg-rose-950 dark:text-rose-200">
                  🇹🇷 Турецкий · 67 юнитов + 3 босса
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  ✓ Офлайн-демо
                </span>
              </div>
              <h3 className="mt-3 text-xl font-extrabold">Юнит 1.1: Еда и напитки</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                12 слов (<span lang="tr">su, çay, kahve, süt, ekmek, peynir…</span>) и 32 упражнения
                по 4 навыкам: Эмодзи-блиц, Заказ вслепую, Кубики, Исправь баг и Чтение.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                  Слова: {tr11Progress?.wordsDone ? '✅' : '☐'}
                </span>
                <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200">
                  🗣 {tr11Progress?.speakingBest ?? 0}%
                </span>
                <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200">
                  🎧 {tr11Progress?.listeningBest ?? 0}%
                </span>
                <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200">
                  ✍️ {tr11Progress?.writingBest ?? 0}%
                </span>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
                  📖 {tr11Progress?.readingBest ?? 0}%
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                href="/tr/units/1-1-food-and-drinks"
                onClick={() => void setPreferredCourse('tr')}
                className="flex-1 rounded-2xl bg-sky-600 px-4 py-2.5 text-center text-sm font-extrabold text-white hover:bg-sky-700"
              >
                Начать юнит 1.1 →
              </Link>
              <Link
                href="/tr"
                className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Карта 67 юнитов
              </Link>
            </div>
          </div>

          {/* English card */}
          <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-extrabold text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
                  🇬🇧 Английский · 60 юнитов + 3 босса
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  ✓ Офлайн-демо
                </span>
              </div>
              <h3 className="mt-3 text-xl font-extrabold">Юнит 1.1: Основные фразы</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                12 слов (<span lang="en">hello, goodbye, please, thank you, excuse me…</span>) и 32
                упражнения по 4 навыкам: Три интонации, Время суток, Пары реплик и Мини-диалог.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                  Слова: {en11Progress?.wordsDone ? '✅' : '☐'}
                </span>
                <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200">
                  🗣 {en11Progress?.speakingBest ?? 0}%
                </span>
                <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200">
                  🎧 {en11Progress?.listeningBest ?? 0}%
                </span>
                <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200">
                  ✍️ {en11Progress?.writingBest ?? 0}%
                </span>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
                  📖 {en11Progress?.readingBest ?? 0}%
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                href="/en/units/1-1-learn-basic-phrases"
                onClick={() => void setPreferredCourse('en')}
                className="flex-1 rounded-2xl bg-sky-600 px-4 py-2.5 text-center text-sm font-extrabold text-white hover:bg-sky-700"
              >
                Начать юнит 1.1 →
              </Link>
              <Link
                href="/en"
                className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Карта курса (до B2)
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
