# Действия владельца проекта (USER_ACTIONS.md)

Я (агент) не имею доступа к вашим веб-кабинетам GitHub, Supabase, Vercel и Google AI Studio. В этом файле собраны пошаговые инструкции: **что сделать, где нажать и что вставить**, привязанные к этапам разработки.

---

## К Этапу 1 (Фундамент)

### Шаг 1.1. Проверьте 4-й исходный файл (`duolingo_turkish_practice.md`)
1. Сейчас в папке `content-src/` лежат 3 файла:
   - `duolingo_turkish_skills_words.md`
   - `duolingo_english_skills_words.md`
   - `duolingo_english_topics.md`
2. Если у вас есть четвёртый файл **`duolingo_turkish_practice.md`**, скопируйте его в папку `d:\igilik.k\iql26\DuoTurkish\content-src\duolingo_turkish_practice.md` без переименования.

### Шаг 1.2. Создайте пустой репозиторий на GitHub и привяжите `origin`
1. Откройте [https://github.com/new](https://github.com/new).
2. Укажите имя репозитория (например, `turkce-duo`), выберите **Public** (на публичных репозиториях минуты GitHub Actions бесплатны без лимитов) или **Private** (2 000 бесплатных минут в месяц).
3. **Не ставьте** галочки «Add a README file», «Add .gitignore», «Choose a license» (они уже созданы в проекте).
4. Нажмите **Create repository**.
5. Выполните в папке `d:\igilik.k\iql26\DuoTurkish`:
   ```powershell
   git remote add origin https://github.com/<ваш-логин>/turkce-duo.git
   git push -u origin main
   git push -u origin feat/stage-2-skeleton
   ```

### Шаг 1.3. Создайте бесплатный проект Supabase и примените миграцию v1
1. Откройте [https://supabase.com/dashboard](https://supabase.com/dashboard) и войдите в аккаунт.
2. Нажмите **New project**:
   - **Name:** `turkce-duo`
   - **Database Password:** сгенерируйте надёжный пароль и сохраните его у себя в менеджере паролей (в код проекта он **не** добавляется).
   - **Region:** выберите ближайший европейский регион, например **Central EU (Frankfurt)** (`eu-central-1`).
   - **Pricing Plan:** **Free ($0/month)**.
3. Дождитесь завершения создания проекта (~1–2 минуты).
4. **Применение миграции `0001_initial_schema.sql`**:
   - В левом меню панели Supabase откройте **SQL Editor** → нажмите **New query**.
   - Скопируйте весь текст файла `supabase/migrations/0001_initial_schema.sql` из нашего репозитория, вставьте в редактор и нажмите **Run**.
   - Убедитесь, что внизу появилось сообщение `Success. No rows returned`.
   - Перейдите в **Table Editor** — вы должны увидеть 6 таблиц (`profiles`, `unit_progress`, `review_state`, `daily_activity`, `content_feedback`, `healthcheck`) со значком замка (**RLS enabled**).

---

## К Этапу 2 (Скелет, вход, синхронизация и превью на Vercel — сейчас)

### Шаг 2.1. Получите публичные ключи Supabase для `.env.local`
1. В панели Supabase откройте **Project Settings** → **API** (или **Data API**).
2. Скопируйте:
   - **Project URL** (`https://xxxx.supabase.co`) → `NEXT_PUBLIC_SUPABASE_URL`.
   - **Project API Keys → `anon` `public`** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - ⚠️ **Никогда не копируйте `service_role` ключ!**
3. Создайте локально файл `.env.local` (скопировав `.env.example`) и вставьте туда значения:
   ```ini
   NEXT_PUBLIC_SUPABASE_URL=https://ваш-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш-anon-ключ
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT=true
   ```

### Шаг 2.2. Настройте URL-адреса и провайдеры входа в Supabase Auth
1. В панели Supabase откройте **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000` (после деплоя на Vercel замените на `https://<ваш-проект>.vercel.app`).
   - **Redirect URLs:** нажмите **Add URL** и добавьте:
     - `http://localhost:3000/**`
     - `https://*.vercel.app/**`
2. Откройте **Authentication → Providers → Email**:
   - Убедитесь, что **Enable Email provider** включён.
   - **По лимитам почты:**
     - Если вы пока **не** подключаете внешний SMTP (Brevo/Resend), **отключите** переключатель **Confirm email** и нажмите **Save**. Тогда регистрация по `email + пароль` будет работать мгновенно для любых пользователей без лимита 2 письма/час.
     - Если вы подключили бесплатный Custom SMTP (например, Brevo Free — 300 писем/день бесплатно), оставьте `Confirm email` включённым и перейдите к **Шагу 2.3** для русификации писем.
3. *(Рекомендуется)* **Вход через Google (бесплатно):**
   - В [Google Cloud Console](https://console.cloud.google.com/apis/credentials) создайте **OAuth 2.0 Client ID** (тип: Web application).
   - В **Authorized redirect URIs** укажите `https://<ваш-id>.supabase.co/auth/v1/callback`.
   - Скопируйте `Client ID` и `Client Secret` в Supabase: **Authentication → Providers → Google** → включите тумблер и нажмите **Save**.

### Шаг 2.3. Русифицируйте шаблоны писем в Supabase Auth
Откройте в панели Supabase **Authentication → Email Templates** и вставьте русские шаблоны:

1. **Confirm signup (Подтверждение регистрации):**
   - **Subject:** `Подтвердите регистрацию в Konuş!`
   - **Body (HTML):**
     ```html
     <h2>Добро пожаловать в Konuş!</h2>
     <p>Нажмите на кнопку ниже, чтобы подтвердить вашу почту и сохранить прогресс обучения в облаке:</p>
     <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:10px 20px;background:#0284c7;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Подтвердить почту</a></p>
     <p>Если вы не регистрировались на сайте, просто проигнорируйте это письмо.</p>
     ```
2. **Reset Password (Сброс пароля):**
   - **Subject:** `Восстановление пароля в Konuş!`
   - **Body (HTML):**
     ```html
     <h2>Сброс пароля</h2>
     <p>Вы запросили восстановление пароля в Konuş!. Перейдите по ссылке ниже, чтобы задать новый пароль:</p>
     <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:10px 20px;background:#0284c7;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Задать новый пароль</a></p>
     ```

### Шаг 2.4. Подключите репозиторий к Vercel (Hobby) для деплой-превью
1. Откройте [https://vercel.com/new](https://vercel.com/new) и импортируйте ваш GitHub-репозиторий.
2. В разделе **Environment Variables** добавьте:
   - `NEXT_PUBLIC_SUPABASE_URL` = ваш URL проекта Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = ваш публичный `anon`-ключ
   - `NEXT_PUBLIC_SITE_URL` = `https://<ваш-проект>.vercel.app`
   - `NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT` = `true` (на время превью до завершения Этапа 4)
3. Нажмите **Deploy**. Vercel автоматически создаст Preview-ссылку для ветки `feat/stage-2-skeleton` и Production-ссылку для `main`.

---

## К Этапу 3 (Дизайн по Google Stitch)

### Шаг 3.1. Выгрузите экраны из Google Stitch
1. Откройте ваш проект в Google Stitch: [https://stitch.google.com/projects/8288994452440307790](https://stitch.google.com/projects/8288994452440307790).
2. Выгрузите сгенерированные экраны (HTML/CSS/Tailwind-код и скриншоты) в папку `d:\igilik.k\iql26\DuoTurkish\design\`.

---

## К Этапу 5 (Озвучка через Gemini TTS)

### Шаг 5.1. Установите `ffmpeg`, добавьте `GEMINI_API_KEY` и запустите генерацию MP3
1. **Установите `ffmpeg` (один раз на Windows):**
   ```powershell
   winget install Gyan.FFmpeg
   ```
   После установки откройте новое окно PowerShell и убедитесь, что команда `ffmpeg -version` работает.
2. **Получите бесплатный ключ Gemini API:**
   - Откройте [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) и нажмите **Create API key**.
   - Добавьте ключ **только** в локальный файл `.env.local` в корне проекта *(ни в коем случае не в Vercel и не в GitHub!)*:
     ```ini
     GEMINI_API_KEY=ваш-ключ-из-ai-studio
     ```
3. **Проверьте план без траты квот (`--dry-run`):**
   ```powershell
   corepack.cmd pnpm tts:generate --dry-run
   ```
4. **Сделайте пилотный прогон на одном юните (`tr-1-1`, 28 клипов ~3 минуты) и послушайте результат:**
   ```powershell
   corepack.cmd pnpm tts:generate --unit=tr-1-1
   corepack.cmd pnpm tts:budget
   ```
5. **Запустите генерацию всего курса (возобновляемо — можно прервать `Ctrl+C` и продолжить в любой день):**
   ```powershell
   # Базовый набор: все 133 юнита (3 502 файла, ~35–42 МБ)
   corepack.cmd pnpm tts:generate

   # При желании также озвучить 266 текстов чтения (~46–52 МБ суммарно):
   corepack.cmd pnpm tts:generate --include-reading
   ```
6. **После завершения проверьте бюджет и целостность файлов:**
   ```powershell
   corepack.cmd pnpm tts:budget --strict
   corepack.cmd pnpm content:check --strict-exercises --check-audio
   ```

---

## К Этапу 6 (Сборка MVP и Keepalive)

### Шаг 6.1. Добавьте секреты для GitHub Action Keepalive
1. В вашем репозитории на GitHub откройте **Settings → Secrets and variables → Actions → New repository secret**.
2. Добавьте два секрета:
   - `SUPABASE_URL` = ваш `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_ANON_KEY` = ваш `NEXT_PUBLIC_SUPABASE_ANON_KEY`
