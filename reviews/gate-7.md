# Gate 7 — Финальный отчёт и пакет проверки (Этап 7: Тест и запуск)

**Проект:** **«Konuş!»**
**Ветка этапа:** `feat/stage-7-e2e-audit-launch`
**Дата:** 24.11.2026

---

## 1. Что сделано на Этапе 7

1. **Сквозные E2E-тесты Playwright (`playwright.config.ts`, `e2e/core-flows.spec.ts`):**
   - Автоматизированы все ключевые пользовательские сценарии на собранном production-сервере (`next start`) сразу в двух профилях — **Desktop Chromium (`1280×800`)** и **Mobile Android (`360×800`)** (итого **10/10** проходов):
     1. Гостевой онбординг (`/welcome`) → турецкий юнит `tr-1-1` → отметка слов → полное прохождение навыка Говорение (8 упражнений) → начисление `+10 XP` и сохранение в IndexedDB после перезагрузки (`/profile`).
     2. Смена языка курса (`tr` ↔ `en`), проверка всех 4 навыков английского юнита `en-1-1`, атрибутов `lang="tr"`/`lang="en"` и кнопки озвучки чтения.
     3. Офлайн PWA: скачивание юнита для офлайна, отключение сети (`setOffline(true)`), работа кэшированного юнита и резервной страницы `/offline`.
     4. Настройки (`/settings`), вход (`/auth`), конфиденциальность (`/privacy`), о проекте (`/about`), повторение (`/review`) + контроль отсутствия горизонтального скролла на `360px` и `1280px`.
     5. SEO-эндпоинты (`/sitemap.xml`, `/robots.txt`, `/opengraph-image`), JSON-LD `LearningResource`, `canonical` и `noindex` на приватных страницах.
2. **Обнаружены и исправлены 3 реальных продакшн-бага (благодаря E2E и аудиту):**
   - **React `#418` hydration mismatch:** в `AppProvider` инициализация `isOnline` выровнена с SSR (`true` + синхронизация `navigator.onLine` в `useEffect`).
   - **Лишняя перезагрузка при первом визите:** в `PwaRegister` перезагрузка по `controllerchange` теперь срабатывает только при реальном обновлении существующего Service Worker (`hadController === true`), а не при первичной установке.
   - **Горизонтальный скролл на `/privacy` (`360px`):** исправлена типографика `<h1>` (`break-words text-2xl sm:text-3xl`).
3. **Оптимизация стартового JS-бандла (−105 КБ gzip):**
   - Удалены ненужные статические импорты `Zod` и демо-JSON из `AppProvider`, а `@supabase/ssr` переведён на ленивый динамический `await import('@supabase/ssr')` только при настроенном Supabase (`src/lib/supabase/client.ts`).
   - Стартовый JS на страницах курса и юнитов уменьшен с **326,6 КБ** до **213,6 КБ gzip** (при этом собственный код приложения + `Dexie` занимает ~53 КБ gzip поверх ~160 КБ базового рантайма Next.js 16 + React 19).
   - Исправлена строка с битой кодировкой в сообщении об ошибке `deleteAccountAndLocalData` (`src/lib/sync/engine.ts`).
4. **Мобильный аудит Lighthouse и слабого Android (`scripts/audit-mobile.ts`):**
   - **Lighthouse Mobile (`/`):** Performance **100** · Accessibility **96** · Best Practices **96** · SEO **100**.
   - **Lighthouse Mobile (`/tr/units/1-1-food-and-drinks`):** Performance **100** · Accessibility **96** · Best Practices **96** · SEO **100**.
   - **Эмуляция слабого Android (`360×800`, 4× CPU, Slow 4G, `prefers-reduced-motion: reduce`):** FCP **928–1152 мс**, 0 ошибок, 0 горизонтального скролла, валидные `h1`, `lang="ru"`, `alt`, `manifest`.
5. **Усилен CI и подготовлен чек-лист запуска:**
   - В `.github/workflows/ci.yml` проверка контента переведена на строгий флаг `pnpm content:check --strict-exercises`.
   - Создан финальный чек-лист деплоя и продвижения **`docs/LAUNCH_CHECKLIST.md`** (Supabase, RLS, Vercel, Gemini TTS, Google Search Console, Яндекс.Вебмастер, проверка OG-превью).

---

## 2. Список добавленных и изменённых файлов

| Путь | Статус | Назначение |
|---|---|---|
| `playwright.config.ts` | Добавлен | Конфигурация Playwright E2E (Desktop + Mobile Android) |
| `e2e/core-flows.spec.ts` | Добавлен | 5 сквозных E2E-сценариев × 2 профиля (10 тестов) |
| `scripts/audit-mobile.ts` | Добавлен | Аудит слабого Android (4× CPU, Slow 4G), JS gzip и a11y/PWA |
| `src/lib/supabase/client.ts` | Изменён | Ленивый `import('@supabase/ssr')` для снижения стартового JS |
| `src/lib/sync/engine.ts` | Изменён | Асинхронный вызов `getSupabaseBrowserClient()` + исправление кодировки |
| `src/components/providers/app-provider.tsx` | Изменён | Убраны `Zod`/демо-JSON из root bundle + исправление гидратации `#418` |
| `src/app/auth/page.tsx` | Изменён | Асинхронный вызов `getSupabaseBrowserClient()` |
| `src/components/pwa-register.tsx` | Изменён | Исправление перезагрузки при первой установке SW |
| `src/app/privacy/page.tsx` | Изменён | Устранён горизонтальный скролл на `360px` |
| `.github/workflows/ci.yml` | Изменён | Перевод `content:check` на `--strict-exercises` |
| `eslint.config.mjs` | Изменён | Добавлены `playwright-report/**` и `test-results/**` в ignores |
| `package.json` | Изменён | Добавлены скрипты `test:e2e` и `audit:mobile` |
| `docs/DECISIONS.md` | Изменён | Раздел 8: оптимизация стартового JS и итоги мобильного аудита |
| `docs/LAUNCH_CHECKLIST.md` | Добавлен | Полный чек-лист запуска, RLS-проверки, TTS и SEO-продвижения |
| `reviews/gate-7.md` | Добавлен | Настоящий финальный отчёт Gate 7 |

---

## 3. Инструкция по локальному запуску и проверке

```powershell
corepack.cmd pnpm lint
corepack.cmd pnpm typecheck
corepack.cmd pnpm test
corepack.cmd pnpm content:check --strict-exercises
corepack.cmd pnpm secrets:check
corepack.cmd pnpm build
corepack.cmd pnpm test:e2e
corepack.cmd pnpm audit:mobile
```

---

## 4. Результаты проверок

```text
> turkce-duo@0.1.0 test (Vitest)
 Test Files  5 passed (5) | Tests  38 passed (38)

> turkce-duo@0.1.0 lint
Checking formatting... All matched files use Prettier code style! (0 warnings, 0 errors)

> turkce-duo@0.1.0 typecheck
(0 errors)

> turkce-duo@0.1.0 content:check "--strict-exercises"
[content:check] OK — validated 133 units (1523 words, 4154 exercises).

> turkce-duo@0.1.0 secrets:check
[secrets:check] OK — scanned 286+ tracked files, 0 leaks found.

> turkce-duo@0.1.0 build
✓ Generating static pages using 7 workers (682/682) in 26.3s

> turkce-duo@0.1.0 test:e2e (Playwright: desktop-chromium + mobile-android)
  10 passed (22.0s)

> turkce-duo@0.1.0 audit:mobile (360x800, 4x CPU, Slow 4G, reduced-motion)
[/]                                  load=2600ms | FCP=1152ms | JS(gzip)=221.7 KB | overflow=false | errors=0
[/tr]                                load=2597ms | FCP=1052ms | JS(gzip)=213.6 KB | overflow=false | errors=0
[/tr/units/1-1-food-and-drinks]      load=2553ms | FCP=988ms  | JS(gzip)=213.6 KB | overflow=false | errors=0
[/en/units/1-1-learn-basic-phrases]  load=2568ms | FCP=928ms  | JS(gzip)=213.6 KB | overflow=false | errors=0
[audit:mobile] OK — all weak-Android, PWA & a11y checks passed!

> Lighthouse Mobile (Chrome headless, реальный прогон против next start)
LIGHTHOUSE MOBILE [home]: {"performance":100,"accessibility":96,"best-practices":96,"seo":100}
LIGHTHOUSE MOBILE [unit]: {"performance":100,"accessibility":96,"best-practices":96,"seo":100}
```

---

## 5. Известные ограничения и следующие ручные шаги владельца

Все ручные действия вынесены в **`docs/USER_ACTIONS.md`** и **`docs/LAUNCH_CHECKLIST.md`**:
1. Подключить GitHub-репозиторий, создать проект Supabase Free (применить `0001_initial_schema.sql`), задеплоить на Vercel Hobby и добавить 2 секрета для `keepalive.yml`.
2. Установить `ffmpeg` + добавить `GEMINI_API_KEY` в локальный `.env.local` и сгенерировать MP3 (`corepack.cmd pnpm tts:generate`, прогноз ~40,77 МБ ≤ 60 МБ).
3. Перевести оставшиеся 5 секций контента из `draft` в `claude_ok` после вычитки пакетов в `reviews/content/` и переключить `NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT=false`.

---

## 6. Вопросы к владельцу проекта

1. Принимаете финальный **Gate 7** (**«Принято»**) для слияния `feat/stage-7-e2e-audit-launch` в `main` и завершения разработки MVP **«Konuş!»**?

---

## 7. Что проверить Claude

### Ленивая загрузка Supabase (`src/lib/supabase/client.ts`)

```ts
export async function getSupabaseBrowserClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!browserClient) {
    const { createBrowserClient } = await import('@supabase/ssr');
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}
```

### Исправление `PwaRegister` (`src/components/pwa-register.tsx`)

```ts
const hadController = Boolean(navigator.serviceWorker.controller);
let refreshing = false;
const handleControllerChange = () => {
  if (!hadController || refreshing) return;
  refreshing = true;
  window.location.reload();
};
```
