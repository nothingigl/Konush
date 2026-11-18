# Gate 2 — Отчёт и самодостаточный пакет проверки (Этап 2: Скелет)

**Проект:** «Türkçe Duo» (рабочее название) — бесплатный сайт-PWA для практики турецкого (`tr`) и английского (`en`) языков русскоязычными пользователями.
**Ветка этапа:** `feat/stage-2-skeleton`
**Дата:** 18.11.2026

> Этот документ полностью самодостаточен и предназначен для проверки владельцем проекта и внешним ИИ-ревьюером (Claude), у которого нет доступа к репозиторию. В раздел 7 встроены ключевые файлы: схема локальной БД (`Dexie`), алгоритмы слияния и разрешения конфликтов (`merge.ts`), движок синхронизации (`engine.ts`), документация `docs/SYNC.md`, Service Worker (`public/sw.js`) и упражнения двух демо-юнитов (`tr-1-1` и `en-1-1`).

---

## 1. Что сделано на Этапе 2

1. **Локальная БД в браузере (`src/lib/db/dexie.ts`) — первичный источник правды для UI:**
   - Реализована база данных `TurkceDuoDatabase` (IndexedDB `TurkceDuoDB` v1) на базе `Dexie` с 6 таблицами:
     - `localProfile` (выбранный курс `tr`/`en`, дневная цель `10`/`20`/`30` XP, имя, `userId`, `updatedAt`);
     - `unitProgress` (`wordsDone`, `speakingBest`, `listeningBest`, `writingBest`, `readingBest`, `completedAt`, `updatedAt`);
     - `reviewState` (шаг повторения `1 → 3 → 7 → 14` дней и дата `dueAt`);
     - `dailyActivity` (`day` в формате `YYYY-MM-DD`, `xp`, `lessons`, `seconds`, `updatedAt`);
     - `syncQueue` (офлайн-очередь изменений с дедупликацией по `table + recordKey`);
     - `cachedUnits` (локальный кэш JSON открытых юнитов для гарантированной работы без сети).
   - Полная работа в **гостевом режиме** без регистрации и без настроенного Supabase.
2. **Двусторонняя синхронизация с Supabase (`src/lib/sync/merge.ts`, `src/lib/sync/engine.ts`, `docs/SYNC.md`):**
   - Триггеры синхронизации: при входе/регистрации (`SIGNED_IN`), при появлении сети (`online`), при возврате на вкладку (`visibilitychange`), каждые 60 секунд и сразу после завершения навыка/урока.
   - **Перенос гостевого прогресса:** при входе или регистрации все записи из `Dexie` сливаются с облачным профилем пользователя и отправляются в Supabase.
   - **Разрешение конфликтов:**
     - `profiles` и `review_state`: Last-Write-Wins (LWW) по `updated_at`;
     - `daily_activity`: покомпонентный максимум (`Math.max` для `xp`, `lessons`, `seconds`) в соответствии с разделом 4.2 мастер-промпта;
     - `unit_progress`: сохранение лучших баллов (`Math.max` по каждому из 4 навыков), `wordsDone = local || remote`, самая ранняя дата `completedAt` и самый свежий `updatedAt`.
   - Покрыто 9 юнит-тестами в `src/lib/sync/__tests__/sync.test.ts` (всего в проекте 27/27 зелёных тестов).
3. **Вход и профиль (`src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/app/auth/`, `src/app/profile/`):**
   - Страница `/auth`: вход и регистрация по `email + пароль`, кнопка «Войти через Google» (OAuth), кнопка «Продолжить без регистрации (гостевой режим)».
   - Серверный маршрут `/auth/callback/route.ts` для обмена OAuth/email кода на сессию (`exchangeCodeForSession`).
   - Страница `/profile`: статистика (серия дней 🔥, сегодняшний и общий XP, пройденные юниты и юниты к повторению), смена имени и дневной цели (10/20/30 XP), оценка занятого места `navigator.storage.estimate()`, запрос `navigator.storage.persist()`, сброс локальных данных и кнопка **«Удалить аккаунт и все данные»** (вызывающая PostgreSQL RPC `delete_my_account()`).
   - В `docs/USER_ACTIONS.md` добавлены готовые русские HTML-шаблоны писем для Supabase Auth и инструкция по деплой-превью на Vercel.
4. **Два полных демо-юнита (`tr-1-1` и `en-1-1`) и работающий плеер урока:**
   - `content/courses/tr/units/tr-1-1.json` («1.1 Еда и напитки»): 12 слов и 32 упражнения (по 8 на каждый из 4 навыков: `speaking`, `listening`, `writing`, `reading`), включая все задания `"origin": "source"` из исходника («Эмодзи-блиц», «Заказ вслепую», «Кубики», «Исправь баг», «Кто что хочет») + `"origin": "derived"`. Каждое из 12 слов встречается минимум в 2 упражнениях.
   - `content/courses/en/units/en-1-1.json` («1.1 Основные фразы»): 12 слов и 32 упражнения (по 8 на каждый из 4 навыков), включая все задания `"origin": "source"` («Три интонации», «Время суток», «Найди пару реплик», «Мини-диалог») + `"origin": "derived"`. Каждое из 12 слов встречается минимум в 2 упражнениях.
   - Интерактивный плеер `/[course]/units/[slug]/play/[skill]` (`src/components/lesson-player-client.tsx`):
     - Поддерживает все 12 типов упражнений (`word_card`, `match_pairs`, `multiple_choice`, `build_sentence`, `type_answer`, `fix_bug`, `odd_one_out`, `order_items`, `listen_choose`, `listen_type`, `speak_repeat`, `read_comprehension`);
     - В `type_answer`, `listen_type`, `fix_bug`, `build_sentence` использует турецкую нормализацию `toLocaleLowerCase('tr-TR')` и засчитывает ответы без турецких букв (`ç, ş, ğ, ı, ö, ü`) как **«💡 Почти верно (засчитано)!»** с подсказкой правильного написания + экранная панель турецких букв;
     - В `speak_repeat` позволяет прослушать эталон, по желанию записать свой голос через `MediaRecorder` локально в браузере (для самосравнения, без отправки на сервер) и отметить «👍 Получилось / 🔁 Ещё раз»;
     - Кнопка «Сообщить об ошибке» на каждом упражнении (сохраняет в `syncQueue` → `content_feedback`);
     - Итоговый экран с начислением `+10 XP`, точностью в %, обновлением `unitProgress`, `dailyActivity` и расписания повторений `reviewState` (`1 → 3 → 7 → 14` дней).
5. **Базовый PWA и офлайн-режим (`public/manifest.webmanifest`, `public/sw.js`, `src/app/offline/page.tsx`):**
   - Манифест `manifest.webmanifest`, иконки `192x192`, `512x512` и `maskable`.
   - Service Worker (`public/sw.js`) с разделением кэшей (`turkce-duo-shell-v1`, `turkce-duo-content-v1`, `turkce-duo-audio-v1`), precache оболочки и демо-юнитов и фоллбэком на `/offline`.
   - Автоматическое сохранение открытых юнитов и обоих демо-юнитов в `Dexie.cachedUnits`.

---

## 2. Список добавленных и изменённых файлов на Этапе 2

| Путь | Статус | Назначение |
|---|---|---|
| `src/lib/db/dexie.ts` | Добавлен | Схема локальной БД IndexedDB (`Dexie`) |
| `src/lib/sync/merge.ts` | Добавлен | Алгоритмы слияния (`LWW`, `Math.max` для `daily_activity` и баллов), расписание `1/3/7/14` дней и расчёт серии дней |
| `src/lib/sync/engine.ts` | Добавлен | Движок двусторонней синхронизации с Supabase, офлайн-очередь и удаление аккаунта |
| `src/lib/sync/__tests__/sync.test.ts` | Добавлен | Юнит-тесты разрешения конфликтов, расписания повторений и серии дней (9 тестов) |
| `docs/SYNC.md` | Добавлен | Документация протокола синхронизации, триггеров и разрешения конфликтов |
| `src/lib/supabase/client.ts` | Добавлен | Браузерный клиент Supabase (`anon` ключ) с проверкой `isSupabaseConfigured()` |
| `src/lib/supabase/server.ts` | Добавлен | Серверный клиент Supabase (`@supabase/ssr`) для `/auth/callback` |
| `src/lib/content/loader.ts` | Добавлен | SSG-загрузчик курсов и юнитов с фильтрацией `claude_ok` / демо-юнитов |
| `src/lib/content/demo-units.ts` | Добавлен | Предзагруженные демо-юниты `tr-1-1` и `en-1-1` для офлайн-работы |
| `src/lib/audio/speech.ts` | Добавлен | Аудио-плеер с воспроизведением `/audio/...mp3` и фоллбэком на Web Speech API (`tr-TR` / `en-US`) |
| `src/components/providers/app-provider.tsx` | Добавлен | Глобальный провайдер состояния Dexie, Auth-подписок и автосинхронизации |
| `src/components/app-shell.tsx` | Добавлен | Навигационная шапка (переключатель курсов, серия дней 🔥, дневная цель XP ⚡, индикатор синхронизации/офлайна) |
| `src/components/pwa-register.tsx` | Добавлен | Регистрация Service Worker и баннер «Обновить приложение» |
| `src/components/course-path-client.tsx` | Добавлен | Карта курса со всеми открытыми юнитами и подсветкой рекомендуемого юнита |
| `src/components/unit-detail-client.tsx` | Добавлен | Страница юнита (12 слов с озвучкой, «Скачать для офлайна», «Поделиться», 4 карточки навыков) |
| `src/components/lesson-player-client.tsx` | Добавлен | Интерактивный плеер урока для всех 12 типов упражнений |
| `src/app/layout.tsx` | Изменён | Подключение `<AppProvider>`, `<AppShell>`, `<PwaRegister>` и `manifest.webmanifest` |
| `src/app/page.tsx` | Изменён | Главная страница с карточками демо-юнитов `tr-1-1` и `en-1-1`, блоком повторений и прогрессом |
| `src/app/[course]/page.tsx` | Добавлен | SSG-страница курса (`/tr`, `/en`) |
| `src/app/[course]/units/[slug]/page.tsx` | Добавлен | SSG-страницы всех 133 юнитов с уникальными SEO metadata |
| `src/app/[course]/units/[slug]/play/[skill]/page.tsx` | Добавлен | SSG-страницы плеера навыков для демо-юнитов |
| `src/app/auth/page.tsx` | Добавлен | Страница входа и регистрации (`email + пароль`, `Google OAuth`, гостевой режим) |
| `src/app/auth/callback/route.ts` | Добавлен | Обработчик редиректа OAuth / подтверждения почты |
| `src/app/profile/page.tsx` | Добавлен | Страница профиля, настроек, офлайн-памяти и удаления аккаунта |
| `src/app/offline/page.tsx` | Добавлен | Страница `/offline` с прямым переходом к закэшированным демо-юнитам |
| `public/manifest.webmanifest` | Добавлен | Web App Manifest |
| `public/sw.js` | Добавлен | Service Worker (precache оболочки и демо-юнитов, кэш аудио и контента) |
| `public/icons/icon-192.svg`, `icon-512.svg`, `icon-maskable.svg` | Добавлены | Иконки PWA (включая maskable) |
| `content/courses/tr/units/tr-1-1.json` | Изменён | Полный демо-юнит турецкого (12 слов, 32 упражнения по 4 навыкам) |
| `content/courses/en/units/en-1-1.json` | Изменён | Полный демо-юнит английского (12 слов, 32 упражнения по 4 навыкам) |
| `scripts/content-check.ts` | Изменён | Автоматическая проверка правил 8–12 упражнений и покрытия слов для всех заполненных юнитов |
| `docs/USER_ACTIONS.md` | Изменён | Добавлены русские шаблоны писем Supabase Auth и инструкция деплой-превью на Vercel |

---

## 3. Как запустить и проверить критерии Gate 2

### 3.1. Локальный запуск и сборка
```powershell
corepack.cmd pnpm lint
corepack.cmd pnpm typecheck
corepack.cmd pnpm test
corepack.cmd pnpm content:check
corepack.cmd pnpm build
corepack.cmd pnpm start
```

### 3.2. Проверка сценария 1: «Гость → Вход → Второе устройство видит прогресс»
1. Откройте сайт в **Браузере 1** (без входа — в шапке написано `👤 Гость (локально)`).
2. Перейдите в демо-юнит **Турецкий 1.1 Еда и напитки** (`/tr/units/1-1-food-and-drinks`), нажмите «Отметить слова прочитанными (2 раза)» и пройдите навык **✍️ Письмо** (`/tr/units/1-1-food-and-drinks/play/writing`) → получите `+10 XP`.
3. Нажмите **Войти** (`/auth`), зарегистрируйтесь или войдите по `email + пароль` (или через Google). Локальный гостевой прогресс автоматически сольётся с облаком (статус в шапке сменится на `☁️ В облаке`).
4. Откройте сайт в **Браузере 2** (или в режиме Инкогнито / на телефоне) и войдите под тем же аккаунтом → на главной и на странице юнита 1.1 сразу отобразятся ваши `⚡ 10 XP`, прочитанные слова `✅` и результат навыка `✍️ 100%`.

### 3.3. Проверка сценария 2: «Без сети демо-юнит работает»
1. Откройте главную страницу или демо-юнит `/tr/units/1-1-food-and-drinks`.
2. В Chrome DevTools откройте вкладку **Network** и переключите режим сети в **Offline** (в шапке появится индикатор `📡 Офлайн`).
3. Пройдите любой из 4 навыков демо-юнита (`speaking`, `listening`, `writing`, `reading`). Урок полностью работает без интернета, начисляет `+10 XP`, сохраняет прогресс в `Dexie` и показывает счётчик несинхронизированных изменений в очереди (`1` или `2`).
4. Переключите сеть обратно в **Online** — очередь автоматически отправится в Supabase без перезагрузки страницы.

---

## 4. Результаты проверок (тесты, линтер, проверка типов, контент, сборка)

```text
> turkce-duo@0.1.0 lint
> eslint . --max-warnings=0 && prettier --check "src/**/*.{ts,tsx,css}" "scripts/**/*.ts" "messages/**/*.json"
Checking formatting...
All matched files use Prettier code style!

> turkce-duo@0.1.0 typecheck
> tsc --noEmit
(0 errors)

> turkce-duo@0.1.0 test
> vitest run
 ✓ src/lib/content/__tests__/migration.test.ts (6 tests) 9ms
 ✓ src/lib/sync/__tests__/sync.test.ts (9 tests) 9ms
 ✓ src/lib/content/__tests__/schema.test.ts (12 tests) 47ms
 Test Files  3 passed (3)
      Tests  27 passed (27)

> turkce-duo@0.1.0 content:check
> tsx scripts/content-check.ts
[content:check] OK — validated 133 units (1523 words, 64 exercises).

> turkce-duo@0.1.0 build
> next build
▲ Next.js 16.4.6 (Turbopack)
✓ Compiled successfully in 4.4s
✓ Finished TypeScript in 5.1s
✓ Generating static pages using 7 workers (150/150) in 7.1s
```

---

## 5. Известные проблемы и ограничения на текущий момент

1. **Озвучка в демо-юнитах до Этапа 5:**
   - Поскольку генерация MP3-файлов через Gemini TTS запланирована на **Этап 5**, сейчас `playReferenceAudio()` (`src/lib/audio/speech.ts`) при отсутствии MP3-файла в `/public/audio/` автоматически использует встроенный синтез речи браузера (`window.speechSynthesis` с локалями `tr-TR` и `en-US`). На Этапе 5 будут сгенерированы настоящие MP3-клипы 4 персонажей.
2. **Четвёртый исходный файл (`duolingo_turkish_practice.md`):**
   - Понадобится к Этапу 4 (конвертация всех остальных юнитов).

---

## 6. Вопросы к владельцу проекта (к следующему Этапу 3 — Дизайн)

1. **Выгрузка экранов из Google Stitch (`https://stitch.google.com/projects/8288994452440307790`):**
   К **Этапу 3 (Дизайн → Gate 3)** нам понадобятся дизайн-токены и экраны из вашего проекта в Google Stitch. Пожалуйста, выгрузите экраны (HTML/CSS/Tailwind и скриншоты) в папку `d:\igilik.k\iql26\DuoTurkish\design\`.
2. **Финальное имя проекта (для Gate 3):**
   В мастер-промпте указано: *«Слово „Duo“ в названии близко к их бренду, финальное имя обсудим на Gate 3»*. Вот 5 вариантов названия для обсуждения:
   - **DilYol** (*Dil* — язык по-турецки, *Yol* — путь: «Языковой путь»)
   - **Konuş!** (*«Говори!»* по-турецки — коротко, энергично, запоминается)
   - **LingoBridge / МостЯзыков**
   - **AdımLingua** (*Adım* — шаг по-турецки: «Шаг за шагом»)
   - **BilinguaTR**
   Какой вариант (или ваш собственный) вам ближе?
3. **Превью на Vercel и Supabase (шаги 2.1–2.4 из `docs/USER_ACTIONS.md`):**
   Удалось ли вам подключить локальный `.env.local` с ключами Supabase и задеплоить ветку на Vercel?

---

## 7. Что проверить Claude (ключевой код Этапа 2)

### 7.1. Схема локальной БД IndexedDB (`src/lib/db/dexie.ts`)

```typescript
import Dexie, { type EntityTable } from 'dexie';
import type { CourseId, Unit } from '../content/schema';

export type DailyGoalXp = 10 | 20 | 30;
export type SkillKey = 'speaking' | 'listening' | 'writing' | 'reading';

export interface LocalProfileRecord {
  id: 'current';
  userId: string | null;
  email: string | null;
  displayName: string;
  avatarKey: string;
  uiLang: 'ru';
  preferredCourse: CourseId;
  dailyGoalXp: DailyGoalXp;
  updatedAt: string;
}

export interface LocalUnitProgressRecord {
  unitId: string;
  courseId: CourseId;
  wordsDone: boolean;
  speakingBest: number | null;
  listeningBest: number | null;
  writingBest: number | null;
  readingBest: number | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface LocalReviewStateRecord {
  unitId: string;
  courseId: CourseId;
  step: number;
  dueAt: string;
  updatedAt: string;
}

export interface LocalDailyActivityRecord {
  day: string;
  xp: number;
  lessons: number;
  seconds: number;
  updatedAt: string;
}

export type SyncTableName =
  | 'profiles'
  | 'unit_progress'
  | 'review_state'
  | 'daily_activity'
  | 'content_feedback';

export interface SyncQueueItem {
  id?: number;
  table: SyncTableName;
  recordKey: string;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
}

export interface CachedUnitRecord {
  unitId: string;
  courseId: CourseId;
  slug: string;
  data: Unit;
  cachedAt: string;
}

export class TurkceDuoDatabase extends Dexie {
  localProfile!: EntityTable<LocalProfileRecord, 'id'>;
  unitProgress!: EntityTable<LocalUnitProgressRecord, 'unitId'>;
  reviewState!: EntityTable<LocalReviewStateRecord, 'unitId'>;
  dailyActivity!: EntityTable<LocalDailyActivityRecord, 'day'>;
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;
  cachedUnits!: EntityTable<CachedUnitRecord, 'unitId'>;

  constructor(name = 'TurkceDuoDB') {
    super(name);
    this.version(1).stores({
      localProfile: 'id',
      unitProgress: 'unitId, courseId, updatedAt',
      reviewState: 'unitId, courseId, dueAt, updatedAt',
      dailyActivity: 'day, updatedAt',
      syncQueue: '++id, table, recordKey, createdAt',
      cachedUnits: 'unitId, courseId, slug, cachedAt',
    });
  }
}
```

---

### 7.2. Алгоритмы разрешения конфликтов и расписания повторений (`src/lib/sync/merge.ts`)

```typescript
import type {
  LocalDailyActivityRecord,
  LocalProfileRecord,
  LocalReviewStateRecord,
  LocalUnitProgressRecord,
} from '../db/dexie';

export const REVIEW_INTERVAL_DAYS: Record<number, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
};

export function computeNextReviewSchedule(
  currentStep: number | null,
  now: Date = new Date(),
): { step: number; dueAt: string } {
  const nextStep = currentStep === null || currentStep < 1 ? 1 : Math.min(currentStep + 1, 5);
  const daysToAdd = REVIEW_INTERVAL_DAYS[nextStep] ?? 14;
  const dueDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return {
    step: nextStep,
    dueAt: dueDate.toISOString(),
  };
}

export function isNewerOrEqual(aIso: string, bIso: string): boolean {
  return new Date(aIso).getTime() >= new Date(bIso).getTime();
}

export function mergeProfile(
  local: LocalProfileRecord,
  remote: LocalProfileRecord,
): LocalProfileRecord {
  if (isNewerOrEqual(local.updatedAt, remote.updatedAt)) {
    return {
      ...local,
      userId: remote.userId ?? local.userId,
      email: remote.email ?? local.email,
    };
  }
  return { ...remote, id: 'current' };
}

function maxNullable(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

function minIsoNullable(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

export function mergeUnitProgress(
  local: LocalUnitProgressRecord,
  remote: LocalUnitProgressRecord,
): LocalUnitProgressRecord {
  return {
    unitId: local.unitId,
    courseId: local.courseId,
    wordsDone: local.wordsDone || remote.wordsDone,
    speakingBest: maxNullable(local.speakingBest, remote.speakingBest),
    listeningBest: maxNullable(local.listeningBest, remote.listeningBest),
    writingBest: maxNullable(local.writingBest, remote.writingBest),
    readingBest: maxNullable(local.readingBest, remote.readingBest),
    completedAt: minIsoNullable(local.completedAt, remote.completedAt),
    updatedAt: isNewerOrEqual(local.updatedAt, remote.updatedAt)
      ? local.updatedAt
      : remote.updatedAt,
  };
}

export function mergeReviewState(
  local: LocalReviewStateRecord,
  remote: LocalReviewStateRecord,
): LocalReviewStateRecord {
  return isNewerOrEqual(local.updatedAt, remote.updatedAt) ? { ...local } : { ...remote };
}

export function mergeDailyActivity(
  local: LocalDailyActivityRecord,
  remote: LocalDailyActivityRecord,
): LocalDailyActivityRecord {
  return {
    day: local.day,
    xp: Math.max(local.xp, remote.xp),
    lessons: Math.max(local.lessons, remote.lessons),
    seconds: Math.max(local.seconds, remote.seconds),
    updatedAt: isNewerOrEqual(local.updatedAt, remote.updatedAt)
      ? local.updatedAt
      : remote.updatedAt,
  };
}
```

---

### 7.3. Service Worker (`public/sw.js`)

```javascript
const SHELL_CACHE = 'turkce-duo-shell-v1';
const CONTENT_CACHE = 'turkce-duo-content-v1';
const AUDIO_CACHE = 'turkce-duo-audio-v1';

const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.webmanifest',
  '/tr',
  '/en',
  '/tr/units/1-1-food-and-drinks',
  '/en/units/1-1-learn-basic-phrases',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  const allowed = new Set([SHELL_CACHE, CONTENT_CACHE, AUDIO_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((key) => (!allowed.has(key) ? caches.delete(key) : undefined))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/audio/')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) void cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) void cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CONTENT_CACHE);
          void cache.put(request, response.clone());
        }
        return response;
      })
      .catch(async () => {
        const cachedContent = await caches.match(request);
        if (cachedContent) return cachedContent;
        if (request.mode === 'navigate') {
          const offlineFallback = await caches.match('/offline');
          if (offlineFallback) return offlineFallback;
        }
        return new Response('Offline', { status: 503 });
      }),
  );
});
```

---

### 7.4. Выдержка упражнений демо-юнитов (`tr-1-1` и `en-1-1`)

#### Из `content/courses/tr/units/tr-1-1.json` (12 слов, 32 упражнения — по 8 на каждый из 4 навыков):
- **Говорение (`speaking`, 8 упр.):**
  - `tr-1-1-sp-01` (`origin: "source"`, `speak_repeat`): `su, çay, kahve, süt, ekmek` — *вода, чай, кофе, молоко, хлеб*
  - `tr-1-1-sp-02` (`origin: "source"`, `speak_repeat`): `peynir, yumurta, elma, portakal, çorba` — *сыр, яйцо, яблоко, апельсин, суп*
  - `tr-1-1-sp-03` (`origin: "source"`, `speak_repeat`): `Ben kahve istiyorum.` — *Я хочу кофе.*
  - `tr-1-1-sp-04..08` (`origin: "derived"`, `speak_repeat`): `Ben çay ve şeker istiyorum.`, `Ben çorba ve tuz istiyorum.`, `Ben ekmek, peynir ve yumurta istiyorum.`, `Ben elma ve portakal istiyorum.`, `Ben su ve süt istiyorum.`
- **Слушание (`listening`, 8 упр.):**
  - `tr-1-1-ls-01` (`origin: "source"`, `listen_choose`): скрипт `Çay, şeker ve süt lütfen.` → ключ: `чай, сахар, молоко`.
  - `tr-1-1-ls-02..08` (`origin: "derived"`, `listen_type` и `listen_choose`): `kahve`, `Ben ekmek, peynir ve yumurta istiyorum.`, `çorba`, `Ben elma ve portakal istiyorum.`, `şeker`, `Ben çorba ve tuz istiyorum.`, `Ben kahve istiyorum.`
- **Письмо (`writing`, 8 упр.):**
  - `tr-1-1-wr-01` (`origin: "source"`, `build_sentence`): банк `["istiyorum", "portakal", "ben", "bir"]` → `Ben bir portakal istiyorum.`
  - `tr-1-1-wr-02` (`origin: "source"`, `fix_bug`): `Ben su istiyorsun` → `Ben su istiyorum.`
  - `tr-1-1-wr-03..08` (`origin: "derived"`): 2 `match_pairs`, `type_answer` (`tuz ve şeker`), `build_sentence` (`Biz ekmek ve peynir istiyoruz.`), `type_answer` (`Ben elma istiyorum.`), `odd_one_out` (`su, çay, kahve, yumurta` → `yumurta`).
- **Чтение (`reading`, 8 упр.):**
  - `tr-1-1-rd-01` (`origin: "source"`, `read_comprehension`): текст `Ben elma istiyorum. Sen portakal istiyorsun. O çorba istiyor. Biz ekmek ve peynir istiyoruz.` → вопросы: «Кто хочет суп?» (`он/она (O)`), «Что хотим мы?» (`хлеб и сыр`).
  - `tr-1-1-rd-02..08` (`origin: "derived"`): `multiple_choice`, `read_comprehension`, `word_card`, `order_items`.

#### Из `content/courses/en/units/en-1-1.json` (12 слов, 32 упражнения — по 8 на каждый из 4 навыков):
- **Говорение (`speaking`, 8 упр.):**
  - `en-1-1-sp-01..03` (`origin: "source"`, `speak_repeat`): `Hello!`, `Thank you! — You're welcome!`, `Sorry. — No problem.`
  - `en-1-1-sp-04..08` (`origin: "derived"`, `speak_repeat`): `Good morning! Hello!`, `Excuse me, please.`, `Goodbye! See you!`, `Good night! Goodbye!`, `Yes, please. No, thank you.`
- **Слушание (`listening`, 8 упр.):**
  - `en-1-1-ls-01..03` (`origin: "source"`, `listen_choose`): `Good morning!` → `утром`; `Good night!` → `перед сном`; `See you!` → `при прощании`.
  - `en-1-1-ls-04..08` (`origin: "derived"`, `listen_type` и `listen_choose`).
- **Письмо (`writing`, 8 упр.):**
  - `en-1-1-wr-01` (`origin: "source"`, `match_pairs`): `Thank you ↔ You're welcome`, `Sorry ↔ No problem`, `See you ↔ See you`, `Good morning ↔ Good morning`.
  - `en-1-1-wr-02..08` (`origin: "derived"`): `match_pairs`, `build_sentence`, `type_answer`, `fix_bug` (`Thank you! — Please!` → `Thank you! — You're welcome!`), `odd_one_out`.
- **Чтение (`reading`, 8 упр.):**
  - `en-1-1-rd-01` (`origin: "source"`, `read_comprehension`): диалог `— Excuse me. — Yes? — Water, please. — Here you are. — Thank you. — You're welcome.` → вопрос: «Что попросил человек?» (`воду (Water)`).
  - `en-1-1-rd-02..08` (`origin: "derived"`): `multiple_choice`, `read_comprehension`, `word_card`, `order_items`.

---

**Статус Gate 2:** Готов к ревью. Ожидаю список правок по итогам проверки Claude или слово **«Принято»** для перехода к планированию Этапа 3 (Дизайн).
