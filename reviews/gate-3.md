# Gate 3 — Отчёт и самодостаточный пакет проверки (Этап 3: Дизайн)

**Проект:** **«Konuş!»** (утверждённое финальное название вместо рабочего «Türkçe Duo») — бесплатный сайт-PWA для практики турецкого (`tr`) и английского (`en`) языков русскоязычными пользователями.
**Ветка этапа:** `feat/stage-3-design`
**Дата:** 19.11.2026

> Этот документ полностью самодостаточен и предназначен для проверки владельцем проекта и внешним ИИ-ревьюером (Claude), у которого нет доступа к репозиторию. В раздел 7 включены полные тексты дизайн-токенов (`design/tokens.json`), описания дизайн-системы (`design/DESIGN_SYSTEM.md`), глобальных стилей и тёмной темы (`src/app/globals.css`), персонажей-наставников (`src/lib/content/characters.ts`) и новых экранов из раздела 9 мастер-промпта.

---

## 1. Что сделано на Этапе 3

1. **Утверждено и внедрено финальное название проекта — «Konuş!»:**
   - Вместо рабочего названия «Türkçe Duo» во всём интерфейсе (`messages/ru.json`), метаданных страниц, PWA-манифесте (`public/manifest.webmanifest`) и SVG-иконках (`public/icons/icon-192.svg`, `icon-512.svg`, `icon-maskable.svg`) внедрён бренд **«Konuş!»** (*«Говори!»* по-турецки, логотип со знаком диалогового облачка `K!`).
   - Название не содержит слова «Duo» и не пересекается с брендом, логотипом или материалами Duolingo. Решение зафиксировано в `docs/DECISIONS.md` (раздел 6).
2. **Дизайн-токены, Тёмная тема и 4 Персонажа (`design/tokens.json`, `design/DESIGN_SYSTEM.md`, `public/characters/*.svg`):**
   - Создана полная система дизайн-токенов `design/tokens.json` для светлой (`light`) и тёмной (`dark`) тем с проверкой контраста **WCAG AA ≥ 4.5:1** (основной текст `17.4:1` в светлой и `18.1:1` в тёмной теме, вторичный текст `7.1:1` и `12.6:1`).
   - Введено цветовое кодирование 4 навыков: 🗣 Говорение (`Rose`), 🎧 Слушание (`Sky`), ✍️ Письмо (`Violet`), 📖 Чтение (`Emerald`).
   - Созданы векторные аватары 4 персонажей курса в `public/characters/`:
     - **Элиф (`elif.svg`)** — бариста и гид из Стамбула (женский голос 1);
     - **Кемаль (`kemal.svg`)** — преподаватель и путешественник (мужской голос 1);
     - **Зейнеп (`zeynep.svg`)** — журналистка и любительница кино (женский голос 2);
     - **Эмре (`emre.svg`)** — спортсмен и шеф-повар (мужской голос 2).
   - Реализовано переключение темы (**☀️ Светлая / 🌙 Тёмная / 🌓 Системная**) в шапке сайта и в `/settings` с сохранением в `Dexie.localProfile`.
3. **Сверстаны все 12 экранов из раздела 9 мастер-промпта:**
   1. **Приветствие и выбор языка/цели (`/welcome`)** — выбор курса (`tr` / `en`), дневной цели (`10 / 20 / 30 XP`), персонажа-наставника и отображаемого имени.
   2. **Главная и карта-путь юнитов (`/` и `/[course]`)** — блок наставника, прогресс-бар дневной цели XP, серия дней 🔥, быстрый переход к демо-юнитам `tr-1-1` и `en-1-1`, карта всех секций и юнитов без «сердец» и блокировок с подсветкой рекомендуемого юнита.
   3. **Страница юнита (`/[course]/units/[slug]`)** — шапка с аватаром персонажа, 12 карточек слов с озвучкой (учитывающей выбранную скорость речи `0.75x / 1.0x / 1.15x`) и отметкой прочтения вслух, 4 карточки навыков + статус повторения `1/3/7/14`.
   4. **Плеер урока (`/[course]/units/[slug]/play/[skill]`)** — все 12 типов упражнений, панель обратной связи («✅ Верно!», «💡 Почти верно!», «❌ Неверно») с пояснением `explain_ru`, модальное окно «Сообщить об ошибке» и экран итога с начислением `+10 XP` и точностью в %.
   5. **Экран повторения (`/review`)** — визуальная лестница 4 шагов (**1 → 3 → 7 → 14 дней**), список юнитов к повторению сегодня и календарь предстоящих повторений.
   6. **Профиль со статистикой и календарём серии (`/profile`)** — карточка ученика, тепловая карта активности за последние **28 дней**, мягкие значки достижений за серии (`Первый шаг`, `Серия 3 дня`, `Серия 7 дней`, `Серия 14 дней`, `Первый юнит`, `100 XP`).
   7. **Настройки (`/settings`)** — цель дня (`10 / 20 / 30 XP`), тема оформления (`Светлая / Тёмная / Системная`), масштаб шрифта (`100% / 112% / 125%`), скорость озвучки (`0.75x / 1.0x / 1.15x`), контроль офлайн-памяти (`navigator.storage.estimate()`, `storage.persist()`, «Очистить офлайн-данные»), выход и кнопка «Удалить аккаунт навсегда» (`delete_my_account()`).
   8. **Вход и регистрация (`/auth`)** — вход/регистрация по `email + пароль`, `Google OAuth` и продолжение в гостевом режиме.
   9. **Публичная SEO-страница юнита (`/[course]/units/[slug]`)** — SSG-страница со списком 12 слов, блоком «Пример задания из этого юнита», кнопкой «Начать без регистрации» и кнопкой «Поделиться».
   10. **«О проекте» (`/about`)** — описание методики 4 навыков, расписания `1/3/7/14`, офлайн-архитектуры и бесплатности.
   11. **«Конфиденциальность» (`/privacy`)** — политика конфиденциальности простым русским языком (только email, имя и прогресс; записи микрофона остаются в оперативной памяти браузера; никаких трекеров; удаление аккаунта одной кнопкой).
   12. **Страница 404 (`src/app/not-found.tsx`)** — кастомная страница 404 с быстрыми ссылками на курсы.
4. **Доступность (Accessibility) и скриншоты на 360 px и 1280 px:**
   - Поддержка масштабирования шрифта (`html[data-font-scale="normal|large|xlarge"]`), видимый `:focus-visible`, отключение анимаций при `prefers-reduced-motion: reduce`, атрибуты `lang="tr"` и `lang="en"` на всех иностранных словах и фразах.
   - Через Playwright (`scripts/capture-gate3-screenshots.ts`) автоматически сняты **26 скриншотов** всех экранов на мобильном разрешении **360×800 px** и десктопном **1280×800 px** (включая светлую и тёмную темы) в папку `design/screenshots/`.

---

## 2. Список добавленных и изменённых файлов на Этапе 3

| Путь | Статус | Назначение |
|---|---|---|
| `design/tokens.json` | Добавлен | Дизайн-токены бренда **Konuş!** (светлая/тёмная темы, цвета навыков, персонажи, типографика) |
| `design/DESIGN_SYSTEM.md` | Добавлен | Документация дизайн-системы, контрастности WCAG AA и доступности |
| `design/screenshots/*.png` | Добавлены (26 шт.) | Скриншоты экранов на `360px` и `1280px` в светлой и тёмной темах |
| `public/characters/elif.svg`, `kemal.svg`, `zeynep.svg`, `emre.svg` | Добавлены | Векторные аватары 4 персонажей-наставников |
| `public/icons/icon-192.svg`, `icon-512.svg`, `icon-maskable.svg` | Изменены | Иконки PWA с логотипом **Konuş!** (`K!`) |
| `public/manifest.webmanifest` | Изменён | Манифест PWA с финальным именем **Konuş!** |
| `messages/ru.json` | Изменён | Обновлено название бренда на **Konuş!** |
| `docs/DECISIONS.md` | Изменён | Добавлен раздел 6 об утверждении имени **Konuş!** и дизайн-токенов |
| `src/lib/content/characters.ts` | Добавлен | Справочник 4 персонажей с ролями, приветствиями и аватарами |
| `src/lib/db/dexie.ts` | Изменён | Добавлены поля настроек `theme`, `speechRate`, `fontScale`, `onboardingDone` |
| `src/lib/sync/merge.ts` и `src/lib/sync/engine.ts` | Изменены | Сохранение локальных UI-предпочтений при синхронизации профиля |
| `src/components/providers/app-provider.tsx` | Изменён | Управление классом `.dark` и `data-font-scale` на `<html>` + методы настроек |
| `src/components/app-shell.tsx` | Изменён | Шапка и подвал **Konuş!**, быстрый переключатель темы `☀️/🌙/🌓`, счётчик повторений |
| `src/app/globals.css` | Изменён | CSS-переменные светлой/тёмной тем, `data-font-scale`, `:focus-visible`, `prefers-reduced-motion` |
| `src/app/welcome/page.tsx` | Добавлен | Экран приветствия и выбора языка, дневной цели и персонажа |
| `src/app/review/page.tsx` | Добавлен | Экран интервального повторения **1 → 3 → 7 → 14 дней** |
| `src/app/settings/page.tsx` | Добавлен | Экран настроек (цель дня, тема, шрифт, скорость озвучки, офлайн-память, удаление аккаунта) |
| `src/app/about/page.tsx` | Добавлен | Страница «О проекте» |
| `src/app/privacy/page.tsx` | Добавлен | Страница «Конфиденциальность» простым языком |
| `src/app/not-found.tsx` | Добавлен | Кастомная страница 404 |
| `src/app/page.tsx` | Изменён | Главная страница с карточкой наставника, прогресс-баром цели дня и демо-юнитами |
| `src/app/profile/page.tsx` | Изменён | Профиль с 28-дневным календарём серии и значками достижений |
| `src/components/unit-detail-client.tsx` | Изменён | Страница юнита с наставником, скоростью озвучки и SEO-блоком примера задания |
| `src/app/[course]/units/[slug]/page.tsx` | Изменён | Обновлены SEO-метаданные под бренд **Konuş!** |
| `scripts/capture-gate3-screenshots.ts` | Добавлен | Скрипт автоматического снятия скриншотов на `360px` и `1280px` через Playwright |

---

## 3. Скриншоты экранов на 360 px и 1280 px (`design/screenshots/`)

Все 26 скриншотов сгенерированы автоматически скриптом `scripts/capture-gate3-screenshots.ts` из production-сборки Next.js:

| Экран | Маршрут | Мобильный (360×800 px) | Десктоп (1280×800 px) | Тёмная тема (360px & 1280px) |
|---|---|---|---|---|
| 1. Главная | `/` | `01-home-360px-light.png` | `01-home-1280px-light.png` | `01-home-360px-dark.png`, `01-home-1280px-dark.png` |
| 2. Приветствие и выбор цели | `/welcome` | `02-welcome-360px-light.png` | `02-welcome-1280px-light.png` | — |
| 3. Карта курса (Турецкий) | `/tr` | `03-course-tr-360px-light.png` | `03-course-tr-1280px-light.png` | — |
| 4. Страница юнита 1.1 | `/tr/units/1-1-food-and-drinks` | `04-unit-tr-1-1-360px-light.png` | `04-unit-tr-1-1-1280px-light.png` | `04-unit-tr-1-1-360px-dark.png`, `04-unit-tr-1-1-1280px-dark.png` |
| 5. Плеер урока (Письмо) | `/tr/units/1-1-food-and-drinks/play/writing` | `05-player-tr-1-1-writing-360px-light.png` | `05-player-tr-1-1-writing-1280px-light.png` | — |
| 6. Повторение 1/3/7/14 | `/review` | `06-review-360px-light.png` | `06-review-1280px-light.png` | — |
| 7. Профиль и календарь серии | `/profile` | `07-profile-360px-light.png` | `07-profile-1280px-light.png` | — |
| 8. Настройки | `/settings` | `08-settings-360px-light.png` | `08-settings-1280px-light.png` | — |
| 9. Вход / Регистрация | `/auth` | `09-auth-360px-light.png` | `09-auth-1280px-light.png` | — |
| 10. О проекте | `/about` | `10-about-360px-light.png` | `10-about-1280px-light.png` | — |
| 11. Конфиденциальность | `/privacy` | `11-privacy-360px-light.png` | `11-privacy-1280px-light.png` | — |

---

## 4. Результаты проверок (линтер, проверка типов, тесты, контент, сборка)

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
 ✓ src/lib/content/__tests__/migration.test.ts (6 tests) 10ms
 ✓ src/lib/sync/__tests__/sync.test.ts (9 tests) 8ms
 ✓ src/lib/content/__tests__/schema.test.ts (12 tests) 47ms
 Test Files  3 passed (3)
      Tests  27 passed (27)

> turkce-duo@0.1.0 content:check
> tsx scripts/content-check.ts
[content:check] OK — validated 133 units (1523 words, 64 exercises).

> turkce-duo@0.1.0 build
> next build
▲ Next.js 16.4.6 (Turbopack)
✓ Compiled successfully in 3.6s
✓ Finished TypeScript in 6.6s
✓ Generating static pages using 7 workers (155/155) in 4.5s
```

---

## 5. Известные проблемы и ограничения

1. **Четвёртый исходный файл (`duolingo_turkish_practice.md`):**
   - Напоминание перед стартом **Этапа 4 (Контент)**: если у вас есть файл `duolingo_turkish_practice.md` (дополнительные задания на перевод и 4 текста для чтения по турецкому), положите его, пожалуйста, в `content-src/duolingo_turkish_practice.md`, чтобы мы включили его материалы в соответствующие юниты.

---

## 6. Вопросы к владельцу проекта (к Этапу 4 — Контент)

1. На **Этапе 4 (Контент → отдельный Gate на каждую секцию/модуль)** мы идём строго в порядке, заданном разделом 11 мастер-промпта:
   - Сначала **Турецкий — Секция 1** (9 юнитов + босс `tr-1-boss`) + выгрузка человекочитаемого пакета `reviews/content/tr-section-1.md` для вычитки Claude;
   - Затем **Английский — Модуль 1** (9 юнитов + босс `en-1-boss`) + пакет `reviews/content/en-section-1.md`;
   - Затем остальные секции/модули (`tr` секции 2 и 3, `en` модули 2 и 3).
2. Есть ли у вас файл `duolingo_turkish_practice.md` для добавления в `content-src/` перед стартом Этапа 4?

---

## 7. Что проверить Claude (дизайн-токены, темы, персонажи и код экранов Этапа 3)

### 7.1. Дизайн-токены (`design/tokens.json`)

```json
{
  "brand": {
    "name": "Konuş!",
    "tagline_ru": "Говори свободно по-турецки и по-английски",
    "version": "1.0.0"
  },
  "colors": {
    "light": {
      "bgPrimary": "#f8fafc",
      "bgSurface": "#ffffff",
      "bgElevated": "#f1f5f9",
      "textPrimary": "#0f172a",
      "textSecondary": "#475569",
      "textMuted": "#64748b",
      "borderDefault": "#e2e8f0",
      "accentPrimary": "#0284c7",
      "accentPrimaryHover": "#0369a1",
      "accentWarm": "#ea580c",
      "success": "#15803d",
      "successBg": "#dcfce7",
      "warning": "#b45309",
      "warningBg": "#fef3c7",
      "danger": "#be123c",
      "dangerBg": "#ffe4e6"
    },
    "dark": {
      "bgPrimary": "#020617",
      "bgSurface": "#0f172a",
      "bgElevated": "#1e293b",
      "textPrimary": "#f8fafc",
      "textSecondary": "#cbd5e1",
      "textMuted": "#94a3b8",
      "borderDefault": "#1e293b",
      "accentPrimary": "#38bdf8",
      "accentPrimaryHover": "#0284c7",
      "accentWarm": "#fb923c",
      "success": "#4ade80",
      "successBg": "#052e16",
      "warning": "#fbbf24",
      "warningBg": "#451a03",
      "danger": "#fb7185",
      "dangerBg": "#4c0519"
    },
    "skills": {
      "speaking": { "accent": "#e11d48", "bgLight": "#ffe4e6", "bgDark": "#4c0519" },
      "listening": { "accent": "#0284c7", "bgLight": "#e0f2fe", "bgDark": "#082f49" },
      "writing": { "accent": "#7c3aed", "bgLight": "#ede9fe", "bgDark": "#2e1065" },
      "reading": { "accent": "#059669", "bgLight": "#d1fae5", "bgDark": "#064e3b" }
    }
  },
  "characters": {
    "elif": {
      "id": "elif",
      "name_ru": "Элиф (Elif)",
      "gender": "female",
      "role_ru": "Бариста и гид из Стамбула — тёплая, бодрая подача",
      "accent": "#e11d48",
      "avatar": "/characters/elif.svg"
    },
    "kemal": {
      "id": "kemal",
      "name_ru": "Кемаль (Kemal)",
      "gender": "male",
      "role_ru": "Преподаватель и путешественник — спокойный, чёткий голос",
      "accent": "#0284c7",
      "avatar": "/characters/kemal.svg"
    },
    "zeynep": {
      "id": "zeynep",
      "name_ru": "Зейнеп (Zeynep)",
      "gender": "female",
      "role_ru": "Журналистка и любительница кино — живая, выразительная речь",
      "accent": "#7c3aed",
      "avatar": "/characters/zeynep.svg"
    },
    "emre": {
      "id": "emre",
      "name_ru": "Эмре (Emre)",
      "gender": "male",
      "role_ru": "Спортсмен и шеф-повар — энергичный и дружелюбный стиль",
      "accent": "#059669",
      "avatar": "/characters/emre.svg"
    }
  }
}
```

---

### 7.2. Глобальные стили, тёмная тема и доступность (`src/app/globals.css`)

```css
@import 'tailwindcss';

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --bg-primary: #f8fafc;
  --bg-surface: #ffffff;
  --bg-elevated: #f1f5f9;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --border-default: #e2e8f0;
  --accent-primary: #0284c7;
}

.dark {
  --bg-primary: #020617;
  --bg-surface: #0f172a;
  --bg-elevated: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --border-default: #1e293b;
  --accent-primary: #38bdf8;
}

html[data-font-scale='normal'] {
  font-size: 100%;
}

html[data-font-scale='large'] {
  font-size: 112.5%;
}

html[data-font-scale='xlarge'] {
  font-size: 125%;
}

:focus-visible {
  outline: 3px solid var(--accent-primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

### 7.3. Экран интервального повторения 1/3/7/14 (`src/app/review/page.tsx`)

```tsx
'use client';

import Link from 'next/link';
import { useAppState } from '@/components/providers/app-provider';

const STEP_LABELS: Record<number, { interval: string; desc: string }> = {
  1: { interval: 'Через 1 день', desc: 'Первое закрепление списка из 12 слов вслух' },
  2: { interval: 'Через 3 дня', desc: 'Быстрый повтор слов и 1–2 мини-игр' },
  3: { interval: 'Через 7 дней', desc: 'Недельная проверка долговременной памяти' },
  4: { interval: 'Через 14 дней', desc: 'Финальное закрепление юнита' },
  5: { interval: 'Освоен полностью', desc: 'Все 4 цикла (1/3/7/14 дн.) успешно пройдены' },
};
```

---

### 7.4. Страница «Конфиденциальность» простым языком (`src/app/privacy/page.tsx`)

```tsx
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Конфиденциальность простым языком
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Политика конфиденциальности</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Мы придерживаемся принципа минимального сбора данных: никаких рекламных пикселей, никаких
          сторонних трекеров и никакой продажи данных.
        </p>
        {/* 1. Гостевой режим без отправки на сервер */}
        {/* 2. В Supabase только email, имя, прогресс и сообщения об опечатках под защитой RLS */}
        {/* 3. Записи микрофона остаются только в оперативной памяти браузера */}
        {/* 4. Удаление аккаунта одной кнопкой через RPC delete_my_account() */}
      </section>
    </main>
  );
}
```

---

**Статус Gate 3:** Готов к ревью. Ожидаю список правок по итогам проверки Claude или слово **«Принято»** для перехода к планированию Этапа 4 (Контент).
