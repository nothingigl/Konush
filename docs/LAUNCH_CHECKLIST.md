# Чек-лист запуска и продвижения «Konuş!» (LAUNCH_CHECKLIST.md)

Этот чек-лист фиксирует финальные шаги перед и сразу после публикации проекта в продакшн на бесплатных тарифах (**$0**: Vercel Hobby + Supabase Free + GitHub Free).

---

## 1. Проверка готовности кода и контента (до деплоя)

- [x] **Весь контент обоих курсов наполнен:** 133/133 юнита (70 турецких + 63 английских), 1 523 слова, 4 154 упражнения.
- [x] **Валидаторы и CI зелёные:**
  - `corepack.cmd pnpm content:check --strict-exercises`
  - `corepack.cmd pnpm lint`
  - `corepack.cmd pnpm typecheck`
  - `corepack.cmd pnpm test` (38 юнит-тестов)
  - `corepack.cmd pnpm test:e2e` (сквозные Playwright E2E-тесты)
  - `corepack.cmd pnpm audit:mobile` (слабый Android 4× CPU / Slow 4G + JS gzip)
  - `corepack.cmd pnpm secrets:check` (0 утечек)
  - `corepack.cmd pnpm build` (682 статические страницы)
- [ ] **Вычитка оставшихся секций контента в Claude:**
  - `tr-section-1` — уже `claude_ok` ✅
  - `en-section-1`, `tr-section-2`, `en-section-2`, `tr-section-3`, `en-section-3` — перевести в `claude_ok` после вычитки пакетов в `reviews/content/`.
  - *Пока часть секций в `draft`, на превью в Vercel оставьте `NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT=true`. Когда все 6 секций станут `claude_ok`, переключите переменную в `false`.*

---

## 2. Инфраструктура ($0): Supabase, Vercel, GitHub

Подробные скриншотные/кнопочные инструкции — в `docs/USER_ACTIONS.md`.

- [ ] **GitHub:** репозиторий создан, ветка `main` запушена, GitHub Actions CI (`ci.yml`) прошёл зелёным.
- [ ] **GitHub Secrets для Keepalive:** в `Settings → Secrets and variables → Actions` добавлены `SUPABASE_URL` и `SUPABASE_ANON_KEY`, проверен ручной запуск workflow **Supabase Keepalive** (`keepalive.yml`).
- [ ] **Supabase Free:**
  - Применена миграция `supabase/migrations/0001_initial_schema.sql`.
  - В `Table Editor` на всех 6 таблицах включён **RLS**.
  - В `Authentication → URL Configuration` указаны `Site URL` (`https://<ваш-домен>.vercel.app`) и `Redirect URLs` (`https://<ваш-домен>.vercel.app/**`, `http://localhost:3000/**`).
  - Включён вход по Email (+ Google OAuth по желанию) и русифицированы шаблоны писем (см. `docs/USER_ACTIONS.md`, Шаг 2.3).
  - **Ручная проверка RLS вживую:** зарегистрировать тестового Пользователя A (пройти 1 урок), выйти, зарегистрировать Пользователя B — убедиться, что Пользователь B видит 0 XP и не видит прогресс A; затем удалить тестовые аккаунты кнопкой «Удалить аккаунт навсегда» в `/settings`.
- [ ] **Vercel Hobby:**
  - Прописаны `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT`.
  - **Проверка секретов:** `GEMINI_API_KEY` и `SUPABASE_SERVICE_ROLE_KEY` **отсутствуют** в Vercel и в GitHub.

---

## 3. Озвучка Gemini TTS (локально на ПК)

- [ ] Установлен `ffmpeg` (`winget install Gyan.FFmpeg`) и добавлен `GEMINI_API_KEY` только в локальный `.env.local`.
- [ ] Выполнен пилотный прогон `corepack.cmd pnpm tts:generate --unit=tr-1-1` и прослушаны клипы.
- [ ] Выполнен полный прогон `corepack.cmd pnpm tts:generate` (возобновляемо, ~40,77 МБ, ≤ 60 МБ).
- [ ] Проверены `corepack.cmd pnpm tts:budget --strict` и `corepack.cmd pnpm content:check --strict-exercises --check-audio`.
- [ ] Папка `public/audio/` и обновлённый `content/audio-manifest.json` закоммичены в Git (без Git LFS и без `tmp/`).

---

## 4. Базовое SEO-продвижение и проверка превью (после деплоя на Vercel)

- [ ] **Проверить публичные эндпоинты на продакшн-домене:**
  - `https://<домен>/sitemap.xml` (139 публичных URL);
  - `https://<домен>/robots.txt` (закрыты `/profile`, `/settings`, `/auth`, `/review`, `/offline`);
  - `https://<домен>/opengraph-image` (картинка `1200×630` PNG «Konuş!»);
  - `https://<домен>/tr/units/1-1-food-and-drinks` (проверить разметку `LearningResource` в [Rich Results Test](https://search.google.com/test/rich-results)).
- [ ] **Добавить сайт в поисковики:**
  - [Google Search Console](https://search.google.com/search-console) → подтвердить домен → отправить карту `sitemap.xml`.
  - [Яндекс.Вебмастер](https://webmaster.yandex.ru) → подтвердить домен → добавить `sitemap.xml`.
- [ ] **Проверить превью ссылок в соцсетях и мессенджерах:**
  - Отправить ссылку на главную и на `/tr/units/1-1-food-and-drinks` в Telegram (при необходимости обновить кэш через `@WebpageBot`), проверить превью в VK и X/Twitter.
- [ ] **Проверить установку PWA на реальном телефоне:**
  - Android Chrome: «Установить приложение» → запустить без сети, пройти скачанный юнит.
  - iOS Safari: «Поделиться → На экран «Домой»» → проверить запуск звука по тапу.
