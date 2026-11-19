import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-100 text-4xl font-black text-sky-700 dark:bg-sky-950 dark:text-sky-300">
        404
      </div>
      <h1 className="text-2xl font-extrabold sm:text-3xl">Страница не найдена</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Кажется, такой страницы или юнита нет. Зато все 67 юнитов турецкого и 60 юнитов английского
        ждут вас на карте курсов!
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
        >
          На главную Konuş!
        </Link>
        <Link
          href="/tr"
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700"
        >
          🇹🇷 Турецкий курс
        </Link>
        <Link
          href="/en"
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700"
        >
          🇬🇧 Английский курс
        </Link>
      </div>
    </main>
  );
}
