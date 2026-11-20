# Gate 4.6 — Отчёт и пакет проверки (Этап 4.6: Контент — Английский, Модуль 3 — A1 · Финал Этапа 4)

**Проект:** **«Konuş!»**
**Ветка этапа:** `feat/stage-4-6-en-module-3`
**Дата:** 21.11.2026

> **Веха проекта:** с завершением Этапа 4.6 **весь контент обоих курсов (133 из 133 юнитов: 70 турецких + 63 английских, 1 523 слова, 4 154 упражнения)** полностью наполнен и проходит строгую валидацию `content:check --strict-exercises` с 0 ошибками!
>
> **Файлы для вычитки Claude:**
> - **`reviews/content/en-section-3-part-1.md`** (`en-3-1` … `en-3-9`: 9 юнитов, 108 слов, 288 упражнений)
> - **`reviews/content/en-section-3-part-2.md`** (`en-3-10` … `en-3-18`: 9 юнитов, 108 слов, 288 упражнений)
> - **`reviews/content/en-section-3-part-3.md`** (`en-3-19` … `en-3-25` + `en-3-boss`: 8 юнитов, 84 слова, 239 упражнений)
> - **`reviews/content/en-section-3.md`** (весь Модуль 3 целиком: 26 юнитов, 300 слов, 815 упражнений)

---

## 1. Что сделано на Этапе 4.6

1. **Наполнены все 25 регулярных юнитов Модуля 3 (A1) английского курса и босс-юнит (`en-3-1` … `en-3-25`, `en-3-boss`):**
   - `en-3-1` … `en-3-9` (Соседи, Языки, Документы, Семья ч. 2, Отпуск в прошедшем времени, Подготовка к празднику, Кино, Перелёт, Выходные): 108 слов, 288 упражнений (8×4).
   - `en-3-10` … `en-3-18` (Еда ч. 2: вкус, Детство, Где вы живёте, Как дела, Новости, Театр, Прошлое, Достижения, Предпочтения): 108 слов, 288 упражнений (8×4).
   - `en-3-19` … `en-3-25` (Необычное, Личная жизнь ч. 2, Уборка, Знаменитости, Летний лагерь, Рецепт, Изучение языков): 84 слова, 224 упражнения (8×4).
   - `en-3-boss` («Босс: Рассказ о прошлом»): 0 новых слов, 15 итоговых упражнений на все 4 навыка Модуля 3 (`speaking: 4`, `listening: 4`, `writing: 4`, `reading: 3`).
2. **Уточнения по кубикам из исходного Markdown (списки слов не менялись):**
   - `en-3-7-wr-02`: в исходнике `[cinema] [to] [go] [let's] [the] [to]` был лишний повтор `to`; использован корректный банк из 5 кубиков `["cinema", "to", "go", "let's", "the"]` под ключ `Let's go to the cinema`.
   - `en-3-4-wr-02`: в исходнике `[oldest] [is] [brother] [my]` для ключа `My brother is the oldest` отсутствовал кубик `the`; добавлен в `bank: ["oldest", "is", "brother", "my", "the"]`, чтобы задание решалось точно.
3. **Пройдена сквозная строгая валидация всех 133 юнитов:**
   - `content:check --strict-exercises`: **133/133 юнита**, **1 523 слова**, **4 154 упражнения**, **0 ошибок** (Zero-Trust, покрытие слов ≥ 2, `build_sentence`, `accepted`, `match_pairs`, `fix_bug`, TTS-чистота без кириллицы в озвучиваемых полях).
   - Глобальный глубокий аудит по всем 133 юнитам — **0 замечаний**.
   - Статус `"review"` всех 26 юнитов Модуля 3 оставлен `"draft"` до вашей явной команды.

---

## 2. Итоговая сводка Этапа 4 (Весь контент обоих курсов)

| Секция / модуль | Юниты | Слова | Упражнения | Статус `review` | Файлы ревью |
|---|---:|---:|---:|---|---|
| 🇹🇷 Турецкий — Секция 1 | 10 | 108 | 303 | `claude_ok` ✅ | `tr-section-1.md` |
| 🇹🇷 Турецкий — Секция 2 | 31 | 359 | 975 | `draft` | `tr-section-2.md` + `part-1..3` |
| 🇹🇷 Турецкий — Секция 3 | 29 | 336 | 911 | `draft` | `tr-section-3.md` + `part-1..3` |
| 🇬🇧 Английский — Модуль 1 | 10 | 108 | 303 | `draft` | `en-section-1.md` |
| 🇬🇧 Английский — Модуль 2 | 27 | 312 | 847 | `draft` | `en-section-2.md` + `part-1..3` |
| 🇬🇧 Английский — Модуль 3 | 26 | 300 | 815 | `draft` | `en-section-3.md` + `part-1..3` |
| **ИТОГО** | **133** | **1 523** | **4 154** | **1/6 `claude_ok`** | **Полностью готово** |

---

## 3. Список добавленных и изменённых файлов

| Путь | Статус | Назначение |
|---|---|---|
| `content/courses/en/units/en-3-1.json` … `en-3-25.json` | Изменены | Полный контент 25 регулярных юнитов Модуля 3 (300 слов, 800 упр.) |
| `content/courses/en/units/en-3-boss.json` | Изменён | Полный контент босс-юнита Модуля 3 (0 слов, 15 упр.) |
| `reviews/content/en-section-3.md` + `part-1/2/3.md` | Добавлены | Полный пакет и 3 компактных файла Модуля 3 для вычитки Claude |
| `reviews/gate-4-6.md` | Добавлен | Настоящий отчёт Gate 4.6 |

---

## 4. Инструкция по локальному запуску и проверке

```powershell
# 1. Строгая проверка всех 133 юнитов (ни одного пустого юнита!)
corepack.cmd pnpm content:check --strict-exercises

# 2. Пересобрать пакеты ревью Модуля 3
corepack.cmd pnpm content:export-review --section=en-3 --chunk-size=9

# 3. Проверить линтер, типы, тесты, сборку и секреты
corepack.cmd pnpm lint
corepack.cmd pnpm typecheck
corepack.cmd pnpm test
corepack.cmd pnpm build
corepack.cmd pnpm secrets:check
```

---

## 5. Результаты проверок

```text
> turkce-duo@0.1.0 content:check
> tsx scripts/content-check.ts "--strict-exercises"
[content:check] OK — validated 133 units (1523 words, 4154 exercises).

> turkce-duo@0.1.0 content:export-review
> tsx scripts/content-export-review.ts "--section=en-3" "--chunk-size=9"
[content:export-review] Wrote reviews/content/en-section-3.md (26 units, 300 words, 815 exercises)
[content:export-review] Wrote reviews/content/en-section-3-part-1.md (9 units, 108 words, 288 exercises)
[content:export-review] Wrote reviews/content/en-section-3-part-2.md (9 units, 108 words, 288 exercises)
[content:export-review] Wrote reviews/content/en-section-3-part-3.md (8 units, 84 words, 239 exercises)

> Global deep audit:
Total: 133 units, 1523 words, 4154 exercises | Global deep audit issues: 0

> turkce-duo@0.1.0 lint
> eslint . --max-warnings=0 && prettier --check "src/**/*.{ts,tsx,css}" "scripts/**/*.ts" "messages/**/*.json"
Checking formatting...
All matched files use Prettier code style!

> turkce-duo@0.1.0 typecheck
> tsc --noEmit
(0 errors)

> turkce-duo@0.1.0 test
> vitest run
 ✓ src/lib/content/__tests__/migration.test.ts (6 tests)
 ✓ src/lib/sync/__tests__/sync.test.ts (9 tests)
 ✓ src/lib/content/__tests__/schema.test.ts (12 tests)
 Test Files  3 passed (3) | Tests  27 passed (27)

> turkce-duo@0.1.0 build
> next build
▲ Next.js 16.4.6 (Turbopack)
✓ Generating static pages using 7 workers (679/679)

> turkce-duo@0.1.0 secrets:check
> tsx scripts/secret-scan.ts
[secrets:check] OK — scanned 263 tracked files, 0 leaks found.
```

---

## 6. Вопросы к владельцу проекта перед Этапом 5 (Озвучка Gemini TTS)

1. Пришлите правки от Claude или команды подтверждения по оставшимся секциям (`модуль 1 проверен`, `секция 2 проверена`, `модуль 2 проверен`, `секция 3 проверена`, `модуль 3 проверен`) и **«Принято»** для перехода к **Этапу 5 (Озвучка Gemini TTS)**.
2. Для Этапа 5 подтвердите, пожалуйста, четвёрку голосов Gemini TTS из `reviews/voices/CANDIDATES.md`:
   - По умолчанию: **Элиф — `Aoede`**, **Зейнеп — `Kore`**, **Кемаль — `Charon`**, **Эмре — `Puck`** (либо сначала сгенерируем и прослушаем 48 сэмплов через `pnpm tts:sample-voices`).
3. По объёму генерации MP3 на Этапе 5: начинаем со всех 6 секций (или сначала Секция 1 обоих курсов для быстрого релиза, а 2–3 догенерируем следом)?

---

## 7. Что проверить Claude

Основные объекты проверки:
- **`reviews/content/en-section-3-part-1.md`** (`en-3-1` … `en-3-9`)
- **`reviews/content/en-section-3-part-2.md`** (`en-3-10` … `en-3-18`)
- **`reviews/content/en-section-3-part-3.md`** (`en-3-19` … `en-3-25` + `en-3-boss`)

Просьба обратить внимание на:
1. **Грамматику A1+:** Past Simple (неправильные глаголы `went/swam/took/had/won/got/told/slept/ate/sat/grew`), `used to`, `borrow vs lend`, `prefer A to B`, `would rather` без `to`, `proud of`, `make progress` (неисчисляемое), `surprised vs surprising`, `either/neither/both`, порядок слов в вопросах и с наречиями частоты.
2. **Точность переводов, ключей и отсутствие кириллицы в озвучиваемых полях.**
