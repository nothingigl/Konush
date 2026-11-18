import messages from '../../messages/ru.json';

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{messages.app.title}</h1>
        <p className="text-slate-600 dark:text-slate-300">{messages.app.subtitle}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Доступные курсы">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-semibold">{messages.app.courses.tr}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            67 юнитов + 3 босс-вызова · 4 навыка · интервальное повторение 1/3/7/14 дней
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-semibold">{messages.app.courses.en}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            60 активных юнитов + 3 босс-вызова (Intro + A1) · карта тем до B2
          </p>
        </article>
      </section>
    </main>
  );
}
