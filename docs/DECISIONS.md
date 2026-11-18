# Архитектурные и технические решения (DECISIONS.md)

В этом документе фиксируются ключевые архитектурные решения проекта, выбранные версии пакетов, обоснование технических компромиссов и ответы на ограничения бесплатных тарифов.

---

## 1. Стек технологий и точные версии пакетов (Этап 1)

Проверено в реестре `npm` 18.11.2026. Все зависимости в `package.json` фиксируются точными версиями (без `^` и `~` в соответствии с разделом 12 мастер-промпта).

- **Фреймворк:** `next` (App Router) со статической генерацией (SSG) для публичных страниц курсов/юнитов и клиентским SPA-плеером для прохождения уроков.
- **Язык:** `typescript` в режиме `strict: true`, `noUncheckedIndexedAccess: true`.
- **Стилизация:** `tailwindcss` + `@tailwindcss/postcss`.
- **Валидация схем и контента:** `zod`.
- **Локальное хранилище (Offline-first):** `dexie` (обёртка над IndexedDB, подключается на Этапе 2).
- **Облачная синхронизация и Auth:** `@supabase/supabase-js` и `@supabase/ssr` (подключаются на Этапе 2).
- **PWA / Service Worker:** `@serwist/next` и `serwist` (настраиваются на Этапе 2; при необходимости тонкой настройки кэша аудио предусмотрен фоллбэк на кастомный Service Worker, компилируемый через Serwist).
- **Тестирование и качество кода:** `vitest` (юнит- и интеграционные тесты), `@playwright/test` (E2E на Этапе 7), `eslint`, `prettier`, `tsx` (запуск CLI-скриптов контента и TTS).

---

## 2. Хранение исходных файлов и статус 4-го файла (`duolingo_turkish_practice.md`)

- В рабочей папке при старте оказались 3 из 4 исходных файлов:
  - `content-src/duolingo_turkish_skills_words.md` (67 юнитов + 3 босса турецкого курса)
  - `content-src/duolingo_english_skills_words.md` (60 юнитов + 3 босса английского курса, модули 1–3)
  - `content-src/duolingo_english_topics.md` (полная карта 295 юнитов английского курса, модули 1–8)
- Четвёртый файл `content-src/duolingo_turkish_practice.md` (дополнительные задания на перевод и 4 текста для чтения по турецкому) на момент старта Этапа 1 ещё не положен в рабочую папку.
- **Решение:** Скрипты `pnpm content:init` и `pnpm content:check` спроектированы так, что они обязательно требуют наличия базовых файлов (`duolingo_turkish_skills_words.md`, `duolingo_english_skills_words.md`, `duolingo_english_topics.md`), а при появлении `duolingo_turkish_practice.md` автоматически подхватывают дополнительные упражнения и тексты из него. В `reviews/gate-1.md` вынесен вопрос владельцу, чтобы добавить `duolingo_turkish_practice.md` до начала Этапа 4 (конвертация контента).

---

## 3. Проблема лимита писем Supabase Auth и решение для бесплатного тарифа

### Контекст проблемы
Встроенный почтовый сервер Supabase (`default SMTP`) на бесплатном тарифе имеет два жёстких ограничения (см. `docs/LIMITS.md`):
1. Лимит **2 письма в час**.
2. Письма отправляются **только адресам, добавленным в команду проекта (Organization Team Members)**. Обычный пользователь при регистрации с включённым `Confirm email` получит ошибку отправки.
3. Редактирование шаблонов писем (для русификации) в панели Supabase заблокировано до тех пор, пока не подключён Custom SMTP.

### Принятое решение (бесплатное и надёжное)
Мы комбинируем три бесплатных механизма (на выбор и в сочетании, инструкции вынесены в `docs/USER_ACTIONS.md`):

1. **Вариант А (Рекомендуемый для полноценной почты и сброса пароля + русификации писем): Подключение бесплатного Custom SMTP через Resend или Brevo.**
   - **Brevo (бывш. Sendinblue) Free:** даёт **300 писем в день (9 000 / мес)** бесплатно и **не требует платного домена** (позволяет отправлять с подтверждённого личного email-адреса после настройки SMTP-ключа), либо **Resend Free** (**3 000 писем / мес, 100 писем / день** при наличии своего домена).
   - Как только в Supabase (`Authentication → Providers → Email / SMTP Settings`) прописан Custom SMTP, снимается ограничение «только для членов команды» и разблокируется редактирование русских HTML-шаблонов писем в панели Supabase.
2. **Вариант Б (Для мгновенного старта без внешнего SMTP): Отключение `Confirm email` в Supabase Auth.**
   - В `Authentication → Providers → Email` выключается тумблер `Confirm email`.
   - Тогда при регистрации по `email + пароль` Supabase сразу создаёт сессию без отправки письма подтверждения (расход писем = 0).
3. **Вход через Google OAuth (бесплатно в Google Cloud Console):**
   - Не отправляет писем через SMTP вообще, работает в один клик на десктопе и мобильных устройствах.

---

## 4. Схема базы данных Supabase v1 и безопасность (RLS + без `service_role`)

В соответствии с разделом 4.2 мастер-промпта мы доработали минимальную схему БД (`supabase/migrations/0001_initial_schema.sql`):

1. **Полный отказ от `SUPABASE_SERVICE_ROLE_KEY` в приложении:**
   - Приложение использует исключительно `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Создание профиля при регистрации выполняется триггером PostgreSQL `on_auth_user_created` → `public.handle_new_user()` (`security definer set search_path = public`).
   - Полное удаление аккаунта пользователем выполняется через PostgreSQL RPC `public.delete_my_account()` (`security definer set search_path = public, auth`), которая проверяет `auth.uid() IS NOT NULL` и удаляет строку из `auth.users` `WHERE id = auth.uid()`. Благодаря `ON DELETE CASCADE` на всех пользовательских таблицах (`profiles`, `unit_progress`, `review_state`, `daily_activity`), все данные пользователя удаляются атомарно в одной транзакции. В таблице `content_feedback` стоит `ON DELETE SET NULL`, чтобы обезличенные баг-репорты по контенту сохранялись после удаления профиля.
2. **Доработки полей таблиц для надёжной синхронизации:**
   - В `profiles` добавлено поле `updated_at timestamptz not null default now()` и `preferred_course text not null default 'tr' check (preferred_course in ('tr', 'en'))`, чтобы при входе со второго устройства открывался тот же активный курс и корректно разрешались конфликты по `updated_at`.
   - В `unit_progress` добавлены `CHECK`-ограничения на баллы навыков (`speaking_best`, `listening_best`, `writing_best`, `reading_best` в диапазоне `0..100`) и `course_id in ('tr', 'en')`.
   - В `review_state` добавлено поле `course_id text not null check (course_id in ('tr', 'en'))` и `step smallint not null default 1 check (step between 1 and 4)` (соответствует 4 шагам повторения: 1, 3, 7 и 14 дней) + `completed boolean not null default false` (когда все 4 цикла пройдены).
   - В `daily_activity` добавлены неотрицательные `CHECK`-ограничения на `xp`, `lessons`, `seconds`.
   - В `content_feedback` добавлено поле `course_id text not null check (course_id in ('tr', 'en'))` и ограничение длины сообщения `char_length(message) between 3 and 2000`. Политика RLS разрешает **только `INSERT`** авторизованным пользователям (`auth.uid() = user_id`), чтение (`SELECT`) через клиентский API полностью закрыто.
   - В `healthcheck` разрешён только `SELECT` для ролей `anon` и `authenticated` (одна строка `id = 1`), чтобы GitHub Action мог поддерживать проект Supabase активным без доступа к данным пользователей.

---

## 5. Модель данных контента (Zod-схемы)

В `src/lib/content/schema.ts` закреплена строгая типизация всех сущностей:
- **Поддержка модулей 4–8 английского курса без переделки архитектуры:** В `course.json` (`CourseSchema`) каждая секция/модуль описывается объектом `CourseSectionSchema`, содержащим как список уже реализованных `units`, так и список запланированных тем `planned_topics` (из `duolingo_english_topics.md`) со статусом `"planned"` | `"ready"`. Когда в будущем появятся материалы модулей 4–8, достаточно будет сгенерировать JSON-файлы юнитов и перевести тему из `planned_topics` в `units`.
- **Строгое правило `review`:** Поле `review` принимает значения `"draft" | "claude_ok" | "needs_fix"`. На этапе сборки / загрузки контента функция фильтрации по умолчанию пропускает в production только `"claude_ok"`, а в режиме разработки (`NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT=true`) отображает и `"draft"`.
