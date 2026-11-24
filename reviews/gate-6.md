# Gate 6 — Отчёт и пакет проверки (Этап 6: Сборка MVP)

**Проект:** **«Konuş!»**
**Ветка этапа:** `feat/stage-6-mvp-assembly`
**Дата:** 24.11.2026

---

## 1. Что сделано на Этапе 6

1. **Полное SEO, Open Graph и структурированные данные (Раздел 10 мастер-промпта):**
   - **`src/lib/seo/site.ts`**: единый резолвер `NEXT_PUBLIC_SITE_URL`, бренд «Konuş!», генераторы JSON-LD `buildCourseJsonLd()` (`schema.org/Course`) и `buildUnitJsonLd()` (`schema.org/LearningResource` с `inLanguage`, `educationalLevel`, `isAccessibleForFree: true`, списком изучаемых слов).
   - **`src/app/layout.tsx`**: настроены `metadataBase`, шаблон заголовка `%s | Konuş!`, `alternates.canonical`, `openGraph` (`ru_RU`) и `twitter` (`summary_large_image`).
   - **`src/app/opengraph-image.tsx`**: динамическая фирменная OG-картинка `1200×630` PNG через `next/og`.
   - **`src/app/sitemap.ts`**: генерирует `sitemap.xml` на **139 публичных URL** (6 основных страниц + 70 турецких юнитов + 63 английских юнита; 0 приватных страниц).
   - **`src/app/robots.ts`**: открывает индексацию публичных страниц, запрещает `/profile`, `/settings`, `/auth`, `/review`, `/offline` и ссылается на `/sitemap.xml`.
   - **`src/app/[course]/page.tsx` и `src/app/[course]/units/[slug]/page.tsx`**: уникальные `title`, `description`, `canonical`, `openGraph` + встроенный JSON-LD (`Course` и `LearningResource`).
   - **Приватные маршруты (`/profile`, `/settings`, `/auth`, `/review`, `/offline`)**: добавлены `layout.tsx` с `robots: { index: false, follow: false }`.
2. **Офлайн-загрузки секций и юнитов, управление памятью и обновление PWA (Раздел 8 мастер-промпта):**
   - **`public/sw.js`**: кэши переведены на фирменный бренд (`konus-shell-v2`, `konus-content-v2`, `konus-audio-v2`, старые `turkce-duo-*` очищаются автоматически), добавлено ограничение размера аудио-кэша (до 800 клипов с вытеснением старых), безопасная обработка `QuotaExceededError` и обработчик `SKIP_WAITING` для обновления без потери кэша.
   - **`src/components/pwa-register.tsx`**: кнопка «Обновить приложение» отправляет `SKIP_WAITING` ожидающему Service Worker и мягко перезагружает страницу по `controllerchange`.
   - **`src/lib/pwa/offline.ts`**:
     - `collectUnitOfflineUrls()` и `downloadUnitForOffline()` — сохраняют страницу юнита, все 4 игровых маршрута (`/play/speaking|listening|writing|reading`) и MP3-аудио в отдельные кэши с обработкой нехватки места;
     - `downloadSectionForOffline()` — последовательная загрузка всей секции с индикатором прогресса;
     - `getOfflineCacheBreakdown()` и `clearOfflineMediaCacheOnly()` — подсчёт страниц/аудио и очистка медиа-кэша **без удаления прогресса XP и серии**.
   - **Обновлён UI:**
     - `src/components/course-path-client.tsx`: убрана устаревшая подпись `(Демо готов)`, добавлена кнопка **«📥 Скачать секцию для офлайна»** с живым прогрессом в заголовке каждой секции;
     - `src/components/unit-detail-client.tsx`: кнопка «Скачать для офлайна» теперь кэширует все 4 навыка и аудио юнита;
     - `src/app/settings/page.tsx`: детализация кэша (страницы + аудиоклипы), предупреждение при нехватке места (> 85% квоты) и раздельные кнопки очистки кэша и сброса локального прогресса.
3. **Защита бесплатного Supabase от паузы (Раздел 4.2 мастер-промпта):**
   - **`.github/workflows/keepalive.yml`**: запускается каждые 4 дня по расписанию (`cron: '0 6 */4 * *'`) и вручную (`workflow_dispatch`), обращается только к публичной таблице `healthcheck` по `SUPABASE_ANON_KEY` (без `service_role`) и мягко пропускает шаг, если секреты ещё не добавлены.
4. **Тесты и чистка брендинга:**
   - **`src/lib/seo/__tests__/mvp-assembly.test.ts`**: +5 юнит-тестов на `sitemap()`, `robots()`, JSON-LD `Course`/`LearningResource`, `collectUnitOfflineUrls()` и `keepalive.yml`.
   - **`docs/USER_ACTIONS.md`**: в шаблонах писем Supabase заменено рабочее название `Türkçe Duo` на **«Konuş!»**.

---

## 2. Список добавленных и изменённых файлов

| Путь | Статус | Назначение |
|---|---|---|
| `src/lib/seo/site.ts` | Добавлен | URL-хелперы и генераторы JSON-LD (`Course`, `LearningResource`) |
| `src/app/sitemap.ts` | Добавлен | Динамический `sitemap.xml` (139 публичных URL) |
| `src/app/robots.ts` | Добавлен | `robots.txt` с запретом приватных маршрутов и ссылкой на sitemap |
| `src/app/opengraph-image.tsx` | Добавлен | Фирменная OG-картинка `1200×630` PNG |
| `src/app/layout.tsx` | Изменён | `metadataBase`, Open Graph, Twitter Card, `canonical` |
| `src/app/[course]/page.tsx` | Изменён | `generateMetadata` + JSON-LD `Course` |
| `src/app/[course]/units/[slug]/page.tsx` | Изменён | `canonical`, Open Graph + JSON-LD `LearningResource` |
| `src/app/{profile,settings,auth,review,offline}/layout.tsx` | Добавлены (5) | `robots: { index: false, follow: false }` на приватных страницах |
| `src/lib/pwa/offline.ts` | Добавлен | Офлайн-загрузка юнитов/секций, учёт квоты и детализация кэша |
| `public/sw.js` | Изменён | Кэши `konus-*-v2`, лимит аудио-кэша, защита квоты и `SKIP_WAITING` |
| `src/components/pwa-register.tsx` | Изменён | Безопасное применение обновления SW по кнопке «Обновить приложение» |
| `src/components/course-path-client.tsx` | Изменён | Кнопка «Скачать секцию для офлайна» и снятие метки `(Демо готов)` |
| `src/components/unit-detail-client.tsx` | Изменён | Полная офлайн-загрузка юнита (4 навыка + аудио) |
| `src/app/settings/page.tsx` | Изменён | Детализация кэша, предупреждение о квоте, раздельная очистка кэша |
| `.github/workflows/keepalive.yml` | Добавлен | Плановый пинг `healthcheck` раз в 4 дня для Supabase Free |
| `src/lib/seo/__tests__/mvp-assembly.test.ts` | Добавлен | 5 юнит-тестов SEO, офлайн-URL и `keepalive.yml` |
| `docs/USER_ACTIONS.md` | Изменён | Обновлено имя «Konuş!» в шаблонах писем Supabase |
| `reviews/gate-6.md` | Добавлен | Настоящий отчёт Gate 6 |

---

## 3. Инструкция по локальному запуску и проверке

```powershell
# 1. Запустить все проверки и сборку
corepack.cmd pnpm test
corepack.cmd pnpm lint
corepack.cmd pnpm typecheck
corepack.cmd pnpm content:check --strict-exercises
corepack.cmd pnpm secrets:check
corepack.cmd pnpm build

# 2. Запустить локальный продакшн-сервер и проверить SEO-маршруты
corepack.cmd pnpm start
# Проверить в браузере:
#   http://localhost:3000/sitemap.xml
#   http://localhost:3000/robots.txt
#   http://localhost:3000/opengraph-image
#   http://localhost:3000/tr (кнопка «Скачать секцию для офлайна»)
#   http://localhost:3000/settings (детализация офлайн-кэша)
```

---

## 4. Результаты проверок

```text
> turkce-duo@0.1.0 test
 ✓ src/lib/content/__tests__/migration.test.ts (6 tests)
 ✓ src/lib/sync/__tests__/sync.test.ts (9 tests)
 ✓ src/lib/content/__tests__/schema.test.ts (12 tests)
 ✓ src/lib/audio/__tests__/tts-pipeline.test.ts (6 tests)
 ✓ src/lib/seo/__tests__/mvp-assembly.test.ts (5 tests)
 Test Files  5 passed (5) | Tests  38 passed (38)

> turkce-duo@0.1.0 lint
Checking formatting... All matched files use Prettier code style! (0 warnings, 0 errors)

> turkce-duo@0.1.0 typecheck
(0 errors)

> turkce-duo@0.1.0 content:check "--strict-exercises"
[content:check] OK — validated 133 units (1523 words, 4154 exercises).

> turkce-duo@0.1.0 secrets:check
[secrets:check] OK — scanned 273+ tracked files, 0 leaks found.

> turkce-duo@0.1.0 build
✓ Compiled & generated static pages including /sitemap.xml, /robots.txt, /opengraph-image and all 679+ pages
```

---

## 5. Известные ограничения

- В production-сборке (`NODE_ENV=production` без `NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT=true`) доступность уроков управляется полем `review: "claude_ok"` (сейчас `claude_ok` выставлено на турецкой Секции 1; остальные 5 секций можно перевести в `claude_ok` в любой момент по вашей команде после вычитки Claude, а на время превью в Vercel достаточно переменной `NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT=true`).
- Финальный E2E-прогон Playwright, аудит Lighthouse ≥ 90 и проверка на слабом устройстве запланированы на **Этап 7 (Тест и запуск)**.

---

## 6. Вопросы к владельцу проекта

1. Принимаете **Gate 6** (**«Принято»**) для слияния ветки `feat/stage-6-mvp-assembly` в `main` и составления плана финального **Этапа 7 (Playwright E2E, Lighthouse ≥ 90, чек-лист запуска)**?

---

## 7. Что проверить Claude

### Фрагмент `.github/workflows/keepalive.yml`

```yaml
on:
  schedule:
    - cron: '0 6 */4 * *'
  workflow_dispatch:
jobs:
  ping-healthcheck:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase public healthcheck table
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
            echo "SUPABASE_URL or SUPABASE_ANON_KEY secret is not configured yet — skipping keepalive."
            exit 0
          fi
          HTTP_CODE=$(curl -sS -o /tmp/healthcheck.json -w "%{http_code}" \
            "${SUPABASE_URL}/rest/v1/healthcheck?select=id&limit=1" \
            -H "apikey: ${SUPABASE_ANON_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")
          [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]
```

### Фрагмент `src/app/robots.ts`

```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/tr', '/en', '/tr/units/', '/en/units/', '/about', '/privacy', '/welcome'],
        disallow: ['/profile', '/settings', '/auth', '/review', '/offline'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
```
