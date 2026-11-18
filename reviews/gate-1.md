# Gate 1 — Отчёт и самодостаточный пакет проверки (Этап 1: Фундамент)

**Проект:** «Türkçe Duo» (рабочее название) — бесплатный сайт-PWA для практики турецкого (`tr`) и английского (`en`) языков русскоязычными пользователями.
**Ветка этапа:** `feat/stage-1-foundation`
**Дата:** 18.11.2026

> Этот документ полностью самодостаточен и предназначен для проверки владельцем проекта и внешним ИИ-ревьюером (Claude), у которого нет прямого доступа к файлам репозитория. В раздел 7 включены полные тексты ключевых файлов: SQL-миграция Supabase v1 с RLS, Zod-схемы контента, нормализатор турецких/английских ответов, парсер и валидатор контента, CI-конфигурация и примеры сгенерированных JSON-юнитов.

---

## 1. Что сделано на Этапе 1

1. **Изолированный Git-репозиторий и структура каталогов:**
   - В рабочей директории `DuoTurkish/` инициализирован собственный Git-репозиторий (`main` → рабочая ветка `feat/stage-1-foundation`).
   - Исходные `.md` файлы без переименования и без изменения текста перенесены в `content-src/`:
     - `content-src/duolingo_turkish_skills_words.md` (67 юнитов + 3 босса)
     - `content-src/duolingo_english_skills_words.md` (60 юнитов + 3 босса, модули 1–3)
     - `content-src/duolingo_english_topics.md` (карта 295 юнитов по 8 модулям)
   - Создана полная структура папок по разделу 4.1 мастер-промпта: `src/`, `public/audio/{tr,en}`, `public/characters/`, `content/courses/{tr,en}/units/`, `scripts/`, `supabase/migrations/`, `design/`, `docs/`, `reviews/`, `.github/workflows/`.
   - Настроены `.gitignore`, `.env.example` (без секретов), `.gitleaks.toml` и pre-commit хук.
2. **Правила и документация (`AGENTS.md`, `docs/*`):**
   - `AGENTS.md` — правила работы между сессиями (процесс Gate, запрет пуша в `main`, языковая политика, разделение GitHub vs Supabase vs Vercel, правило нулевого доверия к учебному тексту).
   - `docs/LIMITS.md` — проверенные по официальной документации на 18.11.2026 лимиты бесплатных тарифов Vercel Hobby, Supabase Free, GitHub Free и Gemini API / TTS.
   - `docs/DECISIONS.md` — зафиксированные точные версии пакетов, архитектурное решение проблемы лимита встроенного SMTP Supabase (2 письма/час и только для членов команды), обоснование схемы БД v1 и поддержки модулей 4–8 английского курса.
   - `docs/USER_ACTIONS.md` — пошаговое руководство для владельца проекта по этапам 1–6 (создание GitHub-репозитория, создание проекта Supabase в регионе Europe, применение миграции, настройка Auth/SMTP/Google OAuth, подключение Vercel и получение ключа Gemini).
   - `docs/CONTENT_CHANGELOG.md` — журнал любых изменений учебного текста относительно исходников (на Этапе 1 изменений 0).
3. **Zod-схемы контента, нормализатор и конвейер (`src/lib/content/*`, `scripts/*`):**
   - `src/lib/content/schema.ts` — строгие Zod-схемы для курсов (`CourseSchema`), секций и запланированных тем (`CourseSectionSchema`, `PlannedTopicSchema`), слов (`WordSchema`), юнитов (`UnitSchema` с проверкой 12 слов для обычных юнитов, 11 слов для `tr-2-3` и 0 слов для боссов), всех 12 типов упражнений (`ExerciseSchema` как discriminated union) и манифеста озвучки (`AudioManifestSchema`).
   - `src/lib/content/normalize.ts` — нормализация ответов для `type_answer` и `listen_type` с учётом турецкой локали `toLocaleLowerCase('tr-TR')` (`I → ı`, `İ → i`), игнорированием пунктуации и фоллбэком турецких диакритиков (`ı→i, ş→s, ğ→g, ç→c, ö→o, ü→u`) в статус `"almost_correct"` («Почти верно!») с подсказкой правильного написания.
   - `src/lib/content/parser.ts` + `scripts/content-init.ts` (`pnpm content:init`) — детерминированный парсер исходных `.md` файлов, сгенерировавший:
     - `content/courses/tr/course.json` и 70 заготовок юнитов (`tr-1-1.json` … `tr-3-boss.json`, 803 слова);
     - `content/courses/en/course.json` (включая `planned_topics` для всех 295 юнитов модулей 1–8) и 63 заготовки юнитов (`en-1-1.json` … `en-3-boss.json`, 720 слов);
     - `content/audio-manifest.json`.
   - `scripts/content-check.ts` (`pnpm content:check`) — проверка всех 133 юнитов (1 523 слова) по схемам Zod, проверка размера JSON (≤ 40 КБ), глобальной уникальности ID и слагов, а также пословная сверка с исходными `.md` файлами в `content-src/` (правило нулевого доверия) и проверка покрытия слов в упражнениях для `claude_ok` юнитов.
4. **Миграция Supabase v1 с RLS (`supabase/migrations/0001_initial_schema.sql`):**
   - Таблицы: `public.profiles`, `public.unit_progress`, `public.review_state`, `public.daily_activity`, `public.content_feedback`, `public.healthcheck`.
   - Индексы по `user_id`, `(user_id, course_id)`, `(user_id, due_at)`, `(user_id, day desc)`.
   - На всех 6 таблицах включён **RLS**:
     - Пользовательские таблицы доступны только владельцу (`auth.uid() = user_id` / `id = auth.uid()`).
     - `content_feedback` открыта только на `INSERT` для `authenticated` (`SELECT`/`UPDATE`/`DELETE` запрещены).
     - `healthcheck` открыта только на `SELECT` для `anon` и `authenticated` (одна строка `id = 1`).
   - Триггер `on_auth_user_created` → `public.handle_new_user()` (`security definer set search_path = public`).
   - RPC `public.delete_my_account()` (`security definer set search_path = public, auth`) для самообслуживаемого удаления аккаунта без использования `service_role` на клиенте.
5. **CI / GitHub Actions и защита секретов (`.github/workflows/ci.yml`, `scripts/secret-scan.ts`):**
   - Workflow проверяет: Gitleaks, `pnpm secrets:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm content:check`, `pnpm build`.

---

## 2. Список добавленных файлов

| Путь | Назначение |
|---|---|
| `AGENTS.md` | Правила работы ИИ-агента между сессиями |
| `.gitignore` | Исключение `.env*` (кроме `.env.example`), `tmp/`, `*.wav`, `*.pcm`, `node_modules/`, `.next/` |
| `.env.example` | Шаблон переменных окружения без секретных значений |
| `.gitleaks.toml` | Конфигурация сканера секретов Gitleaks |
| `.prettierrc` | Правила форматирования Prettier |
| `.github/workflows/ci.yml` | CI-пайплайн GitHub Actions |
| `package.json` | Зависимости с точными фиксированными версиями и npm-скрипты |
| `pnpm-lock.yaml` | Lock-файл зависимостей `pnpm` |
| `tsconfig.json` | Конфигурация TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`) |
| `next.config.ts` | Конфигурация Next.js 16 (App Router) |
| `postcss.config.mjs` | Конфигурация PostCSS (`@tailwindcss/postcss`) |
| `eslint.config.mjs` | Конфигурация ESLint 9 (Flat Config для Next.js + TypeScript) |
| `vitest.config.mts` | Конфигурация тестового раннера Vitest |
| `messages/ru.json` | Русские строки интерфейса (базовый словарь) |
| `src/app/globals.css` | Подключение Tailwind CSS v4 |
| `src/app/layout.tsx` | Корневой layout (`lang="ru"`) |
| `src/app/page.tsx` | Стартовая страница-заглушка Этапа 1 |
| `src/lib/content/schema.ts` | Zod-схемы курсов, юнитов, слов, 12 типов упражнений и аудио-манифеста |
| `src/lib/content/normalize.ts` | Нормализация ответов (`tr-TR`, фоллбэк турецких букв в «почти верно») |
| `src/lib/content/parser.ts` | Детерминированный парсер исходных `.md` файлов |
| `src/lib/content/__tests__/schema.test.ts` | Юнит-тесты Zod-схем, парсера исходников и турецкой нормализации (12 тестов) |
| `src/lib/content/__tests__/migration.test.ts` | Автотесты безопасности SQL-миграции и RLS-политик (6 тестов) |
| `scripts/content-init.ts` | Скрипт первичной генерации JSON-каркаса из `content-src/*.md` |
| `scripts/content-check.ts` | Валидатор контента (Zod, лимит 40 КБ, уникальность ID, Zero-Trust сверка слов) |
| `scripts/secret-scan.ts` | Локальный и CI-сканер утечек секретов и запрещённых файлов |
| `scripts/install-hooks.ts` | Установщик Git pre-commit хука |
| `supabase/migrations/0001_initial_schema.sql` | Миграция БД Supabase v1 с таблицами, индексами, RLS, триггером и RPC |
| `docs/LIMITS.md` | Сводка лимитов бесплатных тарифов Vercel, Supabase, GitHub, Gemini |
| `docs/DECISIONS.md` | Архитектурные решения и компромиссы Этапа 1 |
| `docs/USER_ACTIONS.md` | Пошаговая инструкция ручных действий владельца проекта |
| `docs/CONTENT_CHANGELOG.md` | Журнал изменений учебного текста относительно исходников |
| `content-src/duolingo_turkish_skills_words.md` | Исходный файл турецкого курса (67 юнитов + 3 босса) |
| `content-src/duolingo_english_skills_words.md` | Исходный файл английского курса (60 юнитов + 3 босса) |
| `content-src/duolingo_english_topics.md` | Исходная карта тем английского курса (295 юнитов, модули 1–8) |
| `content/audio-manifest.json` | Пустой валидный манифест аудио v1 |
| `content/courses/tr/course.json` + `units/*.json` | Индекс турецкого курса и 70 JSON-каркасов юнитов (`review: "draft"`) |
| `content/courses/en/course.json` + `units/*.json` | Индекс английского курса (с `planned_topics` 1–8) и 63 JSON-каркаса юнитов |

---

## 3. Как запустить и проверить локально

```powershell
# 1. Установка зависимостей (также автоматически ставит pre-commit хук)
corepack pnpm install --frozen-lockfile

# 2. Первичная инициализация заготовок контента из content-src/*.md (идемпотентна)
corepack pnpm content:init

# 3. Валидация контента (Zod-схемы, лимит 40 КБ, Zero-Trust сверка 1523 слов)
corepack pnpm content:check

# 4. Проверка на отсутствие секретов в отслеживаемых файлах
corepack pnpm secrets:check

# 5. Линтер (ESLint + Prettier)
corepack pnpm lint

# 6. Строгая проверка типов TypeScript
corepack pnpm typecheck

# 7. Юнит-тесты (Vitest)
corepack pnpm test

# 8. Production-сборка Next.js
corepack pnpm build
```

---

## 4. Результаты проверок (тесты, линтер, проверка типов, контент, сборка)

### 4.1. `pnpm content:init` и `pnpm content:check`
```text
> turkce-duo@0.1.0 content:init
> tsx scripts/content-init.ts

[content:init] Note: optional 4th file content-src/duolingo_turkish_practice.md is not present yet.
[content:init] Course "tr": 70 total units (70 written, 0 preserved).
[content:init] Course "en": 63 total units (63 written, 0 preserved).
[content:init] Initialized content/audio-manifest.json

> turkce-duo@0.1.0 content:check
> tsx scripts/content-check.ts

[content:check] OK — validated 133 units (1523 words, 0 exercises).
```

### 4.2. `pnpm lint` и `pnpm typecheck`
```text
> turkce-duo@0.1.0 lint
> eslint . --max-warnings=0 && prettier --check "src/**/*.{ts,tsx,css}" "scripts/**/*.ts" "messages/**/*.json"

Checking formatting...
All matched files use Prettier code style!

> turkce-duo@0.1.0 typecheck
> tsc --noEmit
(exit code 0, 0 errors)
```

### 4.3. `pnpm test` (Vitest)
```text
> turkce-duo@0.1.0 test
> vitest run

 RUN  v5.1.1 D:/igilik.k/iql26/DuoTurkish

 ✓ src/lib/content/__tests__/migration.test.ts (6 tests) 9ms
 ✓ src/lib/content/__tests__/schema.test.ts (12 tests) 66ms

 Test Files  2 passed (2)
      Tests  18 passed (18)
   Duration  1.28s
```

### 4.4. `pnpm build` (Next.js 16.4.6)
```text
> turkce-duo@0.1.0 build
> next build

▲ Next.js 16.4.6 (Turbopack)
✓ Compiled successfully in 3.4s
✓ Finished TypeScript in 3.5s
✓ Generating static pages using 4 workers (3/3) in 1083ms

Route (app)
┌ ○ /
└ ○ /_not-found

○  (Static)  prerendered as static content
```

---

## 5. Известные проблемы и ограничения на текущий момент

1. **Отсутствует 4-й исходный файл `content-src/duolingo_turkish_practice.md`:**
   - В рабочей папке при старте присутствовали 3 файла (`duolingo_turkish_skills_words.md`, `duolingo_english_skills_words.md`, `duolingo_english_topics.md`).
   - Скрипт `pnpm content:init` успешно создал все 70 юнитов турецкого и 63 юнита английского курса и выводит информационное предупреждение об отсутствии `duolingo_turkish_practice.md`. Этот файл понадобится до старта Этапа 4 (наполнение упражнений турецкого курса дополнительными заданиями на перевод и 4 текстами для чтения).
2. **PowerShell Execution Policy на Windows:**
   - В локальном окружении Windows запрещён запуск `.ps1`-обёрток (`npm.ps1`), поэтому в терминале PowerShell рекомендуется вызывать `corepack.cmd pnpm <команда>` или `npm.cmd`.

---

## 6. Вопросы к владельцу проекта

1. **Файл `duolingo_turkish_practice.md`:** Есть ли у вас этот 4-й файл? Если да — положите его, пожалуйста, в `content-src/duolingo_turkish_practice.md`.
2. **Настройка почты в Supabase Auth к Этапу 2 (см. `docs/DECISIONS.md` раздел 3 и `docs/USER_ACTIONS.md` шаг 2.2):**
   Поскольку встроенный SMTP Supabase на бесплатном тарифе отправляет максимум 2 письма в час и **только участникам команды проекта**, какой вариант выбираем для Этапа 2:
   - **Вариант А:** Вы подключаете бесплатный внешний SMTP (например, Brevo Free — 300 писем/день бесплатно без необходимости покупать домен, или Resend Free) + включаем подтверждение почты и русские шаблоны писем;
   - **Вариант Б:** На старте отключаем тумблер `Confirm email` в Supabase Auth (чтобы регистрация по `email + пароль` работала мгновенно без отправки писем для любых пользователей) + добавляем вход через Google OAuth?
3. **Применение миграции Supabase v1 (`docs/USER_ACTIONS.md`, шаг 1.3):**
   Удалось ли создать бесплатный проект Supabase и выполнить `supabase/migrations/0001_initial_schema.sql` в SQL Editor без ошибок?

---

## 7. Что проверить Claude (ключевые артефакты, схемы и код)

Ниже приведены полные тексты ключевых файлов Этапа 1 для ревью архитектуры, безопасности БД, RLS и валидации контента.

### 7.1. SQL-миграция Supabase v1 (`supabase/migrations/0001_initial_schema.sql`)

```sql
-- =============================================================================
-- Migration: 0001_initial_schema.sql
-- Project:   Türkçe Duo (working title) — Free Turkish & English PWA
-- Purpose:   User-owned data tables, indexes, Row Level Security (RLS),
--            automatic profile creation trigger, and self-service account
--            deletion RPC without requiring service_role on the client.
-- =============================================================================

create extension if not exists "pgcrypto";

-- 1. Helper trigger function for automatic updated_at maintenance
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. Table: public.profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  avatar_key text check (avatar_key is null or char_length(avatar_key) <= 64),
  ui_lang text not null default 'ru' check (ui_lang in ('ru')),
  preferred_course text not null default 'tr' check (preferred_course in ('tr', 'en')),
  daily_goal_xp int not null default 20 check (daily_goal_xp in (10, 20, 30)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 3. Table: public.unit_progress
create table if not exists public.unit_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id text not null check (char_length(unit_id) between 3 and 64),
  course_id text not null check (course_id in ('tr', 'en')),
  words_done boolean not null default false,
  speaking_best smallint check (speaking_best is null or (speaking_best between 0 and 100)),
  listening_best smallint check (listening_best is null or (listening_best between 0 and 100)),
  writing_best smallint check (writing_best is null or (writing_best between 0 and 100)),
  reading_best smallint check (reading_best is null or (reading_best between 0 and 100)),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, unit_id)
);

create index if not exists idx_unit_progress_user_id
  on public.unit_progress (user_id);

create index if not exists idx_unit_progress_user_course
  on public.unit_progress (user_id, course_id);

drop trigger if exists trg_unit_progress_updated_at on public.unit_progress;
create trigger trg_unit_progress_updated_at
  before update on public.unit_progress
  for each row execute function public.set_updated_at();

-- 4. Table: public.review_state (1 -> 3 -> 7 -> 14 days)
create table if not exists public.review_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id text not null check (char_length(unit_id) between 3 and 64),
  course_id text not null check (course_id in ('tr', 'en')),
  step smallint not null default 1 check (step between 0 and 5),
  due_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, unit_id)
);

create index if not exists idx_review_state_user_id
  on public.review_state (user_id);

create index if not exists idx_review_state_user_due
  on public.review_state (user_id, due_at);

drop trigger if exists trg_review_state_updated_at on public.review_state;
create trigger trg_review_state_updated_at
  before update on public.review_state
  for each row execute function public.set_updated_at();

-- 5. Table: public.daily_activity
create table if not exists public.daily_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  xp int not null default 0 check (xp >= 0 and xp <= 100000),
  lessons int not null default 0 check (lessons >= 0 and lessons <= 10000),
  seconds int not null default 0 check (seconds >= 0 and seconds <= 86400),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists idx_daily_activity_user_id
  on public.daily_activity (user_id);

create index if not exists idx_daily_activity_user_day_desc
  on public.daily_activity (user_id, day desc);

drop trigger if exists trg_daily_activity_updated_at on public.daily_activity;
create trigger trg_daily_activity_updated_at
  before update on public.daily_activity
  for each row execute function public.set_updated_at();

-- 6. Table: public.content_feedback (Write-only for authenticated users)
create table if not exists public.content_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete set null,
  course_id text not null default 'tr' check (course_id in ('tr', 'en')),
  unit_id text not null check (char_length(unit_id) between 3 and 64),
  exercise_id text not null check (char_length(exercise_id) between 3 and 96),
  message text not null check (char_length(trim(message)) between 3 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_content_feedback_user_id
  on public.content_feedback (user_id);

-- 7. Table: public.healthcheck (Single row, public read-only)
create table if not exists public.healthcheck (
  id int primary key check (id = 1),
  status text not null default 'ok',
  checked_at timestamptz not null default now()
);

insert into public.healthcheck (id, status, checked_at)
values (1, 'ok', now())
on conflict (id) do nothing;

-- 8. Row Level Security (RLS) Policies
alter table public.profiles enable row level security;
alter table public.unit_progress enable row level security;
alter table public.review_state enable row level security;
alter table public.daily_activity enable row level security;
alter table public.content_feedback enable row level security;
alter table public.healthcheck enable row level security;

-- profiles policies
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete to authenticated using (id = auth.uid());

-- unit_progress policies
drop policy if exists "unit_progress_select_own" on public.unit_progress;
create policy "unit_progress_select_own" on public.unit_progress for select to authenticated using (user_id = auth.uid());
drop policy if exists "unit_progress_insert_own" on public.unit_progress;
create policy "unit_progress_insert_own" on public.unit_progress for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "unit_progress_update_own" on public.unit_progress;
create policy "unit_progress_update_own" on public.unit_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "unit_progress_delete_own" on public.unit_progress;
create policy "unit_progress_delete_own" on public.unit_progress for delete to authenticated using (user_id = auth.uid());

-- review_state policies
drop policy if exists "review_state_select_own" on public.review_state;
create policy "review_state_select_own" on public.review_state for select to authenticated using (user_id = auth.uid());
drop policy if exists "review_state_insert_own" on public.review_state;
create policy "review_state_insert_own" on public.review_state for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "review_state_update_own" on public.review_state;
create policy "review_state_update_own" on public.review_state for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "review_state_delete_own" on public.review_state;
create policy "review_state_delete_own" on public.review_state for delete to authenticated using (user_id = auth.uid());

-- daily_activity policies
drop policy if exists "daily_activity_select_own" on public.daily_activity;
create policy "daily_activity_select_own" on public.daily_activity for select to authenticated using (user_id = auth.uid());
drop policy if exists "daily_activity_insert_own" on public.daily_activity;
create policy "daily_activity_insert_own" on public.daily_activity for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "daily_activity_update_own" on public.daily_activity;
create policy "daily_activity_update_own" on public.daily_activity for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "daily_activity_delete_own" on public.daily_activity;
create policy "daily_activity_delete_own" on public.daily_activity for delete to authenticated using (user_id = auth.uid());

-- content_feedback: ONLY INSERT for authenticated
drop policy if exists "content_feedback_insert_own" on public.content_feedback;
create policy "content_feedback_insert_own" on public.content_feedback for insert to authenticated with check (user_id = auth.uid());

-- healthcheck: SELECT for anon and authenticated
drop policy if exists "healthcheck_select_all" on public.healthcheck;
create policy "healthcheck_select_all" on public.healthcheck for select to anon, authenticated using (true);

-- 9. Trigger: Automatic profile creation on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), '')
  );

  if v_display_name is not null and char_length(v_display_name) > 80 then
    v_display_name := left(v_display_name, 80);
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, v_display_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 10. RPC: Self-service account deletion (delete_my_account)
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
```

---

### 7.2. Zod-схемы контента (`src/lib/content/schema.ts`)

```typescript
import { z } from 'zod';

export const CourseIdSchema = z.enum(['tr', 'en']);
export type CourseId = z.infer<typeof CourseIdSchema>;

export const UnitIdSchema = z
  .string()
  .regex(
    /^(tr|en)-[1-8]-([1-9][0-9]*|boss)$/,
    'Unit ID must match "<course>-<section>-<order|boss>", e.g. "tr-1-1" or "tr-1-boss"',
  );

export const UnitSlugSchema = z
  .string()
  .regex(
    /^[1-8]-([1-9][0-9]*|boss)-[a-z0-9]+(-[a-z0-9]+)*$/,
    'Unit slug must be lowercase Latin with hyphens, prefixed by "<section>-<order|boss>-"',
  );

export const ReviewStatusSchema = z.enum(['draft', 'claude_ok', 'needs_fix']);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const ExerciseOriginSchema = z.enum(['source', 'derived']);
export type ExerciseOrigin = z.infer<typeof ExerciseOriginSchema>;

export const WordSchema = z.object({
  id: z
    .string()
    .regex(
      /^(tr|en)-[1-8]-[1-9][0-9]*-w(0[1-9]|1[0-2])$/,
      'Word ID must match "<course>-<section>-<unit>-w<01..12>"',
    ),
  text: z.string().min(1, 'Word text must not be empty'),
  ru: z.string().min(1, 'Russian translation must not be empty'),
  audio: z
    .string()
    .regex(
      /^(tr|en)\/[1-8]-[1-9][0-9]*\/w(0[1-9]|1[0-2])\.mp3$/,
      'Word audio path must match "<course>/<section>-<unit>/w<01..12>.mp3"',
    ),
});
export type Word = z.infer<typeof WordSchema>;

const BaseExerciseFields = {
  id: z
    .string()
    .regex(
      /^(tr|en)-[1-8]-([1-9][0-9]*|boss)-(sp|ls|wr|rd|mx)-[0-9]{2}$/,
      'Exercise ID must match "<course>-<section>-<unit|boss>-<sp|ls|wr|rd|mx>-<NN>"',
    ),
  origin: ExerciseOriginSchema,
  prompt_ru: z.string().min(1),
  explain_ru: z.string().min(1).nullable(),
  audio: z.string().min(1).nullable(),
};

export const WordCardExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('word_card'),
  target_text: z.string().min(1),
  translation_ru: z.string().min(1),
  example_text: z.string().min(1).nullable().optional(),
  example_ru: z.string().min(1).nullable().optional(),
});

export const MatchPairsExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('match_pairs'),
  pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).min(2).max(8),
});

export const MultipleChoiceExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('multiple_choice'),
  question_text: z.string().min(1).nullable().optional(),
  options: z.array(z.string().min(1)).min(2).max(6),
  correct_index: z.number().int().min(0),
});

export const BuildSentenceExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('build_sentence'),
  source_text: z.string().min(1).nullable().optional(),
  bank: z.array(z.string().min(1)).min(2),
  accepted: z.array(z.string().min(1)).min(1),
});

export const TypeAnswerExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('type_answer'),
  source_text: z.string().min(1).nullable().optional(),
  accepted: z.array(z.string().min(1)).min(1),
});

export const FixBugExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('fix_bug'),
  buggy_text: z.string().min(1),
  accepted: z.array(z.string().min(1)).min(1),
});

export const OddOneOutExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('odd_one_out'),
  items: z.array(z.string().min(1)).min(3).max(6),
  odd_index: z.number().int().min(0),
});

export const OrderItemsExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('order_items'),
  items_shuffled: z.array(z.string().min(1)).min(3).max(8),
  correct_order: z.array(z.string().min(1)).min(3).max(8),
});

export const ListenChooseExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('listen_choose'),
  transcript: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  correct_index: z.number().int().min(0),
});

export const ListenTypeExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('listen_type'),
  transcript: z.string().min(1),
  accepted: z.array(z.string().min(1)).min(1),
});

export const SpeakRepeatExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('speak_repeat'),
  target_text: z.string().min(1),
  translation_ru: z.string().min(1).nullable().optional(),
});

export const ReadComprehensionQuestionSchema = z.object({
  question_ru: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(5).optional(),
  correct_index: z.number().int().min(0).optional(),
  accepted: z.array(z.string().min(1)).min(1),
});

export const ReadComprehensionExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('read_comprehension'),
  passage: z.string().min(1),
  questions: z.array(ReadComprehensionQuestionSchema).min(1).max(5),
});

export const ExerciseSchema = z.discriminatedUnion('type', [
  WordCardExerciseSchema,
  MatchPairsExerciseSchema,
  MultipleChoiceExerciseSchema,
  BuildSentenceExerciseSchema,
  TypeAnswerExerciseSchema,
  FixBugExerciseSchema,
  OddOneOutExerciseSchema,
  OrderItemsExerciseSchema,
  ListenChooseExerciseSchema,
  ListenTypeExerciseSchema,
  SpeakRepeatExerciseSchema,
  ReadComprehensionExerciseSchema,
]);
export type Exercise = z.infer<typeof ExerciseSchema>;
export type ExerciseType = Exercise['type'];

export const SkillBlockSchema = z.object({
  exercises: z.array(ExerciseSchema),
});

export const UnitSchema = z
  .object({
    id: UnitIdSchema,
    course: CourseIdSchema,
    section: z.number().int().min(1).max(8),
    order: z.number().int().min(1).max(100),
    slug: UnitSlugSchema,
    title_ru: z.string().min(1),
    character: z.string().min(1),
    boss: z.boolean(),
    words: z.array(WordSchema),
    skills: z.object({
      speaking: SkillBlockSchema,
      listening: SkillBlockSchema,
      writing: SkillBlockSchema,
      reading: SkillBlockSchema,
    }),
    review: ReviewStatusSchema,
  })
  .superRefine((unit, ctx) => {
    if (!unit.id.startsWith(`${unit.course}-${unit.section}-`)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unit id "${unit.id}" does not match course "${unit.course}" and section ${unit.section}`,
        path: ['id'],
      });
    }
    if (unit.boss) {
      if (!unit.id.endsWith('-boss')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Boss unit "${unit.id}" must end with "-boss"`,
          path: ['id'],
        });
      }
      if (unit.words.length !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Boss unit "${unit.id}" must have 0 words (got ${unit.words.length})`,
          path: ['words'],
        });
      }
    } else {
      const expectedWordCount = unit.id === 'tr-2-3' ? 11 : 12;
      if (unit.words.length !== expectedWordCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unit "${unit.id}" must have exactly ${expectedWordCount} words (got ${unit.words.length})`,
          path: ['words'],
        });
      }
    }
  });
export type Unit = z.infer<typeof UnitSchema>;

export const PlannedTopicSchema = z.object({
  unit_number: z.string().regex(/^[1-8]\.[1-9][0-9]*$/),
  title_ru: z.string().min(1),
  title_en: z.string().min(1),
  implemented_unit_id: UnitIdSchema.nullable(),
});
export type PlannedTopic = z.infer<typeof PlannedTopicSchema>;

export const CourseSectionSchema = z.object({
  section: z.number().int().min(1).max(8),
  title_ru: z.string().min(1),
  cefr: z.enum(['Intro', 'A1', 'A2', 'B1', 'B2']),
  description_ru: z.string().min(1),
  unit_ids: z.array(UnitIdSchema),
  planned_topics: z.array(PlannedTopicSchema).optional(),
});
export type CourseSection = z.infer<typeof CourseSectionSchema>;

export const CourseSchema = z.object({
  id: CourseIdSchema,
  title_ru: z.string().min(1),
  description_ru: z.string().min(1),
  sections: z.array(CourseSectionSchema).min(1),
});
export type Course = z.infer<typeof CourseSchema>;

export const AudioClipEntrySchema = z.object({
  path: z.string().regex(/^(tr|en)\/[a-z0-9-]+\/[a-z0-9_-]+\.mp3$/),
  course: CourseIdSchema,
  unit_id: UnitIdSchema,
  text: z.string().min(1),
  voice: z.string().min(1),
  style: z.string().min(1),
  model: z.string().min(1),
  hash: z.string().regex(/^[a-f0-9]{64}$/, 'Hash must be a SHA-256 hex digest'),
  bytes: z.number().int().positive(),
});

export const AudioManifestSchema = z.object({
  version: z.literal(1),
  updated_at: z.string().min(1),
  total_clips: z.number().int().min(0),
  total_bytes: z.number().int().min(0),
  clips: z.record(z.string(), AudioClipEntrySchema),
});
```

---

### 7.3. Нормализация ответов (`src/lib/content/normalize.ts`)

```typescript
import type { CourseId } from './schema';

const TURKISH_ASCII_MAP: Record<string, string> = {
  ı: 'i',
  ş: 's',
  ğ: 'g',
  ç: 'c',
  ö: 'o',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
};

export function normalizeText(input: string, lang: CourseId | 'ru' = 'tr'): string {
  const locale = lang === 'tr' ? 'tr-TR' : lang === 'en' ? 'en-US' : 'ru-RU';
  return input
    .toLocaleLowerCase(locale)
    .replace(/[.,!?;:«»"“”'’()[\]{}—–-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function foldTurkishDiacritics(normalized: string): string {
  let out = '';
  for (const ch of normalized) {
    out += TURKISH_ASCII_MAP[ch] ?? ch;
  }
  return out;
}

export interface AnswerCheckResult {
  status: 'correct' | 'almost_correct' | 'incorrect';
  matchedAccepted: string | null;
  hint_ru: string | null;
}

export function checkTypedAnswer(
  userInput: string,
  acceptedList: readonly string[],
  lang: CourseId | 'ru' = 'tr',
): AnswerCheckResult {
  const normalizedUser = normalizeText(userInput, lang);
  if (!normalizedUser) {
    return { status: 'incorrect', matchedAccepted: null, hint_ru: null };
  }

  for (const candidate of acceptedList) {
    const normalizedCandidate = normalizeText(candidate, lang);
    if (normalizedUser === normalizedCandidate) {
      return {
        status: 'correct',
        matchedAccepted: candidate,
        hint_ru: null,
      };
    }
  }

  if (lang === 'tr') {
    const foldedUser = foldTurkishDiacritics(normalizedUser);
    for (const candidate of acceptedList) {
      const normalizedCandidate = normalizeText(candidate, 'tr');
      const foldedCandidate = foldTurkishDiacritics(normalizedCandidate);
      if (foldedUser === foldedCandidate) {
        return {
          status: 'almost_correct',
          matchedAccepted: candidate,
          hint_ru: `Почти верно! Обратите внимание на турецкие буквы: «${candidate}»`,
        };
      }
    }
  }

  return {
    status: 'incorrect',
    matchedAccepted: acceptedList[0] ?? null,
    hint_ru: null,
  };
}
```

---

### 7.4. Примеры сгенерированных JSON-каркасов юнитов (`tr-1-1.json` и `en-1-1.json`)

#### `content/courses/tr/units/tr-1-1.json`:
```json
{
  "id": "tr-1-1",
  "course": "tr",
  "section": 1,
  "order": 1,
  "slug": "1-1-food-and-drinks",
  "title_ru": "Еда и напитки",
  "character": "elif",
  "boss": false,
  "words": [
    { "id": "tr-1-1-w01", "text": "su", "ru": "вода", "audio": "tr/1-1/w01.mp3" },
    { "id": "tr-1-1-w02", "text": "çay", "ru": "чай", "audio": "tr/1-1/w02.mp3" },
    { "id": "tr-1-1-w03", "text": "kahve", "ru": "кофе", "audio": "tr/1-1/w03.mp3" },
    { "id": "tr-1-1-w04", "text": "süt", "ru": "молоко", "audio": "tr/1-1/w04.mp3" },
    { "id": "tr-1-1-w05", "text": "ekmek", "ru": "хлеб", "audio": "tr/1-1/w05.mp3" },
    { "id": "tr-1-1-w06", "text": "peynir", "ru": "сыр", "audio": "tr/1-1/w06.mp3" },
    { "id": "tr-1-1-w07", "text": "yumurta", "ru": "яйцо", "audio": "tr/1-1/w07.mp3" },
    { "id": "tr-1-1-w08", "text": "elma", "ru": "яблоко", "audio": "tr/1-1/w08.mp3" },
    { "id": "tr-1-1-w09", "text": "portakal", "ru": "апельсин", "audio": "tr/1-1/w09.mp3" },
    { "id": "tr-1-1-w10", "text": "çorba", "ru": "суп", "audio": "tr/1-1/w10.mp3" },
    { "id": "tr-1-1-w11", "text": "tuz", "ru": "соль", "audio": "tr/1-1/w11.mp3" },
    { "id": "tr-1-1-w12", "text": "şeker", "ru": "сахар", "audio": "tr/1-1/w12.mp3" }
  ],
  "skills": {
    "speaking": { "exercises": [] },
    "listening": { "exercises": [] },
    "writing": { "exercises": [] },
    "reading": { "exercises": [] }
  },
  "review": "draft"
}
```

#### `content/courses/en/units/en-1-1.json`:
```json
{
  "id": "en-1-1",
  "course": "en",
  "section": 1,
  "order": 1,
  "slug": "1-1-learn-basic-phrases",
  "title_ru": "Основные фразы",
  "character": "elif",
  "boss": false,
  "words": [
    { "id": "en-1-1-w01", "text": "hello", "ru": "привет", "audio": "en/1-1/w01.mp3" },
    { "id": "en-1-1-w02", "text": "goodbye", "ru": "до свидания", "audio": "en/1-1/w02.mp3" },
    { "id": "en-1-1-w03", "text": "please", "ru": "пожалуйста (просьба)", "audio": "en/1-1/w03.mp3" },
    { "id": "en-1-1-w04", "text": "thank you", "ru": "спасибо", "audio": "en/1-1/w04.mp3" },
    { "id": "en-1-1-w05", "text": "you're welcome", "ru": "пожалуйста (в ответ)", "audio": "en/1-1/w05.mp3" },
    { "id": "en-1-1-w06", "text": "yes", "ru": "да", "audio": "en/1-1/w06.mp3" },
    { "id": "en-1-1-w07", "text": "no", "ru": "нет", "audio": "en/1-1/w07.mp3" },
    { "id": "en-1-1-w08", "text": "sorry", "ru": "извините", "audio": "en/1-1/w08.mp3" },
    { "id": "en-1-1-w09", "text": "excuse me", "ru": "простите (чтобы обратиться)", "audio": "en/1-1/w09.mp3" },
    { "id": "en-1-1-w10", "text": "good morning", "ru": "доброе утро", "audio": "en/1-1/w10.mp3" },
    { "id": "en-1-1-w11", "text": "good night", "ru": "спокойной ночи", "audio": "en/1-1/w11.mp3" },
    { "id": "en-1-1-w12", "text": "see you", "ru": "увидимся", "audio": "en/1-1/w12.mp3" }
  ],
  "skills": {
    "speaking": { "exercises": [] },
    "listening": { "exercises": [] },
    "writing": { "exercises": [] },
    "reading": { "exercises": [] }
  },
  "review": "draft"
}
```

---

### 7.5. Конфигурация CI (`.github/workflows/ci.yml`) и `package.json`

#### `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: ['main']

permissions:
  contents: read

jobs:
  quality:
    name: Secret Scan, Lint, Typecheck, Test, Content & Build
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Gitleaks secret scanner
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies (frozen lockfile)
        run: pnpm install --frozen-lockfile

      - name: Run local secret check script
        run: pnpm secrets:check

      - name: Lint & formatting check
        run: pnpm lint

      - name: TypeScript strict typecheck
        run: pnpm typecheck

      - name: Unit tests (Vitest)
        run: pnpm test

      - name: Content schema & Zero-Trust check
        run: pnpm content:check

      - name: Next.js production build
        run: pnpm build
```

#### `package.json`:
```json
{
  "name": "turkce-duo",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@10.11.0",
  "engines": {
    "node": ">=22.0.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --max-warnings=0 && prettier --check \"src/**/*.{ts,tsx,css}\" \"scripts/**/*.ts\" \"messages/**/*.json\"",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\" \"scripts/**/*.ts\" \"messages/**/*.json\"",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "content:init": "tsx scripts/content-init.ts",
    "content:check": "tsx scripts/content-check.ts",
    "secrets:check": "tsx scripts/secret-scan.ts",
    "prepare": "tsx scripts/install-hooks.ts"
  },
  "dependencies": {
    "@supabase/ssr": "0.12.7",
    "@supabase/supabase-js": "2.119.1",
    "dexie": "4.4.7",
    "next": "16.4.6",
    "react": "19.3.1",
    "react-dom": "19.3.1",
    "zod": "4.6.7"
  },
  "devDependencies": {
    "@playwright/test": "1.65.1",
    "@tailwindcss/postcss": "4.3.5",
    "@types/node": "24.19.2",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "eslint": "9.27.0",
    "eslint-config-next": "16.4.6",
    "postcss": "8.5.6",
    "prettier": "3.10.1",
    "tailwindcss": "4.3.5",
    "tsx": "4.23.15",
    "typescript": "5.9.3",
    "vitest": "5.1.1"
  }
}
```

---

**Статус Gate 1:** Готов к ревью. Ожидаю список правок по итогам проверки Claude или слово **«Принято»** для перехода к планированию Этапа 2.
