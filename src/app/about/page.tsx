import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <span className="inline-block rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-900 dark:bg-sky-950 dark:text-sky-200">
          О проекте Konuş!
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
          Бесплатная практика турецкого и английского по 4 навыкам
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
          <strong>Konuş!</strong> (*«Говори!»* по-турецки) создан для русскоязычных учеников,
          которые хотят практиковать живой турецкий и английский языки короткими сессиями по 10–15
          минут в день без платных подписок, без рекламы и без искусственных ограничений вроде
          сгорающих «сердец».
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <h2 className="font-bold">🗣 🎧 ✍️ 📖 Четыре навыка в каждом юните</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Каждый юнит включает 12 новых слов и 4 полноценные мини-игры: говорение вслух с
              самопроверкой, понимание скриптов на слух, письмо («кубики» и исправление багов) и
              осмысленное чтение диалогов.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <h2 className="font-bold">🔁 Повторение 1 → 3 → 7 → 14 дней</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Чтобы слова перешли в активный запас, приложение автоматически напоминает повторить
              пройденный юнит через 1, 3, 7 и 14 дней.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <h2 className="font-bold">📡 Работает офлайн и на любом устройстве</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Открытые юниты сохраняются в браузере (IndexedDB + Service Worker), поэтому учиться
              можно в дороге и без сети. А при входе в аккаунт прогресс синхронизируется между
              телефоном и компьютером.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <h2 className="font-bold">🎭 4 персонажа с живыми эмоциями</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Уроки ведут четыре героя — Элиф, Кемаль, Зейнеп и Эмре. Все материалы составлены
              автором специально для этого проекта и не копируют сторонние сервисы.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/tr"
            className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
          >
            Перейти к турецкому курсу →
          </Link>
          <Link
            href="/en"
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold hover:bg-slate-100 dark:border-slate-700"
          >
            Перейти к английскому курсу →
          </Link>
        </div>
      </section>
    </main>
  );
}
