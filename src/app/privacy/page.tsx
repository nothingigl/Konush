import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Конфиденциальность простым языком
        </span>
        <h1 className="mt-3 break-words text-2xl font-extrabold tracking-tight sm:text-3xl">
          Политика конфиденциальности
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Мы придерживаемся принципа минимального сбора данных: никаких рекламных пикселей, никаких
          сторонних трекеров и никакой продажи данных.
        </p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              1. Можно заниматься вообще без регистрации
            </h2>
            <p className="mt-1">
              В гостевом режиме ваш прогресс, XP и расписание повторений хранятся только локально в
              вашем собственном браузере (IndexedDB). На сервер при этом ничего не передаётся.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              2. Что хранится при создании аккаунта
            </h2>
            <p className="mt-1">
              Если вы регистрируетесь для синхронизации между устройствами, в защищённой базе
              Supabase (с включённым Row Level Security, где каждый пользователь имеет доступ только
              к своим строкам) сохраняются исключительно:
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              <li>Адрес электронной почты (для входа и восстановления доступа);</li>
              <li>Выбранное вами отображаемое имя, аватар персонажа и дневная цель XP;</li>
              <li>Ваш учебный прогресс по юнитам, серия дней и расписание повторений 1/3/7/14;</li>
              <li>
                Сообщения об опечатках, которые вы сами отправляете через «Сообщить об ошибке».
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              3. Записи микрофона никогда не покидают ваш браузер
            </h2>
            <p className="mt-1">
              В упражнениях на говорение кнопка «Записать себя для сравнения» использует
              MediaRecorder исключительно в оперативной памяти вашего браузера, чтобы вы могли
              сравнить своё произношение с эталоном. Аудиозаписи вашего голоса никуда не
              отправляются и не сохраняются на серверах.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              4. Полное удаление аккаунта одной кнопкой
            </h2>
            <p className="mt-1">
              В любой момент вы можете открыть раздел{' '}
              <Link href="/settings" className="font-bold text-sky-600 underline">
                Настройки
              </Link>{' '}
              и нажать <strong>«Удалить аккаунт навсегда»</strong>. Эта кнопка вызывает защищённую
              функцию базы данных <code>delete_my_account()</code>, которая безвозвратно удаляет ваш
              аккаунт и все связанные записи прогресса в облаке и очищает локальную базу в браузере.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
