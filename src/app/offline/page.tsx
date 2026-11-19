import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl dark:bg-amber-950">
        📡
      </div>
      <h1 className="text-2xl font-bold">Вы сейчас без интернета (Офлайн-режим)</h1>
      <p className="text-slate-600 dark:text-slate-300">
        Ничего страшного! Все загруженные и открытые юниты работают без сети, а ваш прогресс
        сохраняется в локальной базе браузера (IndexedDB) и автоматически синхронизируется с
        облаком, как только появится соединение.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/tr/units/1-1-food-and-drinks"
          className="rounded-xl bg-sky-600 px-5 py-2.5 font-semibold text-white hover:bg-sky-700"
        >
          Открыть демо-юнит: Турецкий 1.1
        </Link>
        <Link
          href="/en/units/1-1-learn-basic-phrases"
          className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          Открыть демо-юнит: Английский 1.1
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
        >
          На главную
        </Link>
      </div>
    </main>
  );
}
