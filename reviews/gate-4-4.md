# Gate 4.4 — Отчёт и пакет проверки (Этап 4.4: Контент — Английский, Модуль 2 — A1)

**Проект:** **«Konuş!»**
**Ветка этапа:** `feat/stage-4-4-en-module-2`
**Дата:** 21.11.2026

> **Важно для проверки Claude:**
> Полный пакет Модуля 2 английского курса (27 юнитов, 312 слов, 847 упражнений) выгружен в **`reviews/content/en-section-2.md`**, а также разбит на 3 ровных компактных файла по 9 юнитов для удобной вычитки Claude:
> - **`reviews/content/en-section-2-part-1.md`** (`en-2-1` … `en-2-9`: 9 юнитов, 108 слов, 288 упражнений)
> - **`reviews/content/en-section-2-part-2.md`** (`en-2-10` … `en-2-18`: 9 юнитов, 108 слов, 288 упражнений)
> - **`reviews/content/en-section-2-part-3.md`** (`en-2-19` … `en-2-26` + `en-2-boss`: 9 юнитов, 96 слов, 271 упражнение)

---

## 1. Что сделано на Этапе 4.4

1. **Наполнены все 26 регулярных юнитов Модуля 2 (A1) английского курса и босс-юнит (`en-2-1` … `en-2-26`, `en-2-boss`):**
   - `en-2-1` … `en-2-9` (Еда, Личная жизнь, Просьба о помощи, Интересы, Одежда, Расписание, Поездка, Бронь отеля, Большой город): 108 слов, 288 упражнений (8×4 на юнит).
   - `en-2-10` … `en-2-18` (Учёба, Свидание, Коллеги, Продукты, День рождения, Переезд, У врача, Пикник, Город и дорога): 108 слов, 288 упражнений (8×4 на юнит).
   - `en-2-19` … `en-2-26` (Отпуск, Покупки, Спорт, Работа, Животные, Музыка, Погода, Организуйте поездку): 96 слов, 256 упражнений (8×4 на юнит).
   - `en-2-boss` («Босс: Спланируйте поездку»): 0 новых слов, 15 итоговых упражнений на все 4 навыка Модуля 2 (`speaking: 4`, `listening: 4`, `writing: 4`, `reading: 3`).
2. **Пройдены все автоматические проверки качества (`scripts/content-check.ts`):**
   - **Zero-Trust:** все 312 слов совпадают с `content-src/duolingo_english_skills_words.md` буква в букву.
   - Все задания исходника включены с `"origin": "source"`.
   - Каждое из 312 слов (включая многословные фразы `live alone`, `free time`, `can you`, `could you`, `I don't know`, `interested in`, `wake up`, `single room`, `check in`, `check out`, `how much`, `happy birthday`, `move out`, `new home`, `post office`, `old town`, `turn left`, `turn right`, `try on`, `part-time`, `full-time`) встречается минимум в 4 упражнениях своего юнита (при норме ≥ 2).
   - Инварианты `build_sentence`, `accepted`, `match_pairs`, `fix_bug` и вариантов выбора — **0 нарушений**.
   - Статус `"review"` всех 27 юнитов оставлен `"draft"` до вашей явной команды.
3. **Экспортированы пакеты ревью:**
   - Командой `pnpm content:export-review --section=en-2 --chunk-size=9` созданы `en-section-2.md` и 3 равных файла по 9 юнитов.

---

## 2. Список добавленных и изменённых файлов

| Путь | Статус | Назначение |
|---|---|---|
| `content/courses/en/units/en-2-1.json` … `en-2-26.json` | Изменены | Полный контент 26 регулярных юнитов Модуля 2 (312 слов, 832 упр.) |
| `content/courses/en/units/en-2-boss.json` | Изменён | Полный контент босс-юнита Модуля 2 (0 слов, 15 упр.) |
| `reviews/content/en-section-2.md` | Добавлен | Полный человекочитаемый пакет Модуля 2 (27 юнитов, 312 слов, 847 упр.) |
| `reviews/content/en-section-2-part-1.md` | Добавлен | Часть 1/3 для ревью Claude (`en-2-1` … `en-2-9`, 288 упр.) |
| `reviews/content/en-section-2-part-2.md` | Добавлен | Часть 2/3 для ревью Claude (`en-2-10` … `en-2-18`, 288 упр.) |
| `reviews/content/en-section-2-part-3.md` | Добавлен | Часть 3/3 для ревью Claude (`en-2-19` … `en-2-26`, `en-2-boss`, 271 упр.) |
| `reviews/gate-4-4.md` | Добавлен | Настоящий отчёт Gate 4.4 |

---

## 3. Инструкция по локальному запуску и проверке

```powershell
# 1. Проверить схему, Zero-Trust, покрытие слов и инварианты качества по всем 133 юнитам
corepack.cmd pnpm content:check

# 2. Пересобрать пакеты ревью Модуля 2 (полный + 3 части по 9 юнитов)
corepack.cmd pnpm content:export-review --section=en-2 --chunk-size=9

# 3. Проверить линтер, типы, тесты, сборку и секреты
corepack.cmd pnpm lint
corepack.cmd pnpm typecheck
corepack.cmd pnpm test
corepack.cmd pnpm build
corepack.cmd pnpm secrets:check

# 4. Запустить локально и пройти юниты Модуля 2 английского курса в браузере
corepack.cmd pnpm dev
# Открыть http://localhost:3000/en — Модули 1 и 2 (37 юнитов) полностью играбельны
```

---

## 4. Результаты проверок

```text
> turkce-duo@0.1.0 content:check
> tsx scripts/content-check.ts
[content:check] OK — validated 133 units (1523 words, 2428 exercises).

> turkce-duo@0.1.0 content:export-review
> tsx scripts/content-export-review.ts "--section=en-2" "--chunk-size=9"
[content:export-review] Wrote reviews/content/en-section-2.md (27 units, 312 words, 847 exercises)
[content:export-review] Wrote reviews/content/en-section-2-part-1.md (9 units, 108 words, 288 exercises)
[content:export-review] Wrote reviews/content/en-section-2-part-2.md (9 units, 108 words, 288 exercises)
[content:export-review] Wrote reviews/content/en-section-2-part-3.md (9 units, 96 words, 271 exercises)

> turkce-duo@0.1.0 lint
> eslint . --max-warnings=0 && prettier --check "src/**/*.{ts,tsx,css}" "scripts/**/*.ts" "messages/**/*.json"
Checking formatting...
All matched files use Prettier code style!

> turkce-duo@0.1.0 typecheck
> tsc --noEmit
(0 errors)

> turkce-duo@0.1.0 test
> vitest run
 ✓ src/lib/content/__tests__/migration.test.ts (6 tests) 7ms
 ✓ src/lib/sync/__tests__/sync.test.ts (9 tests) 8ms
 ✓ src/lib/content/__tests__/schema.test.ts (12 tests) 51ms
 Test Files  3 passed (3) | Tests  27 passed (27)

> turkce-duo@0.1.0 build
> next build
▲ Next.js 16.4.6 (Turbopack)
✓ Compiled successfully in 2.0s
✓ Generating static pages using 7 workers (459/459)

> turkce-duo@0.1.0 secrets:check
> tsx scripts/secret-scan.ts
[secrets:check] OK — scanned 253 tracked files, 0 leaks found.
```

---

## 5. Известные проблемы и ограничения

- Аудиофайлы MP3 (`public/audio/en/2-*/`) будут сгенерированы на **Этапе 5 (Gemini TTS)**; до тех пор работает резервная озвучка браузера (`en-US`).
- Статус всех 27 юнитов Модуля 2 — `"review": "draft"` (перевод в `"claude_ok"` выполняется только после вашей явной команды).
- По контенту всего проекта готово **4 из 6 секций/модулей** (78 из 133 юнитов, **2 428 упражнений**); остались **Турецкий Секция 3** (Этап 4.5, 29 юнитов) и **Английский Модуль 3** (Этап 4.6, 26 юнитов).

---

## 6. Вопросы к владельцу проекта

1. Отправьте `en-section-2-part-1/2/3.md` (или `en-section-2.md`) на вычитку Claude. Когда будет готово — пришлите правки или напишите **«модуль 2 проверен»** и **«Принято»** для перехода к планированию **Этапа 4.5 (Турецкий, Секция 3)**.

---

## 7. Что проверить Claude

Основные объекты проверки:
- **`reviews/content/en-section-2-part-1.md`** (`en-2-1` … `en-2-9`)
- **`reviews/content/en-section-2-part-2.md`** (`en-2-10` … `en-2-18`)
- **`reviews/content/en-section-2-part-3.md`** (`en-2-19` … `en-2-26` + `en-2-boss`)

Просьба обратить внимание на:
1. **Грамматику и естественность английского A1:** `do/does`, `don't/doesn't`, предлоги `at/on/in`, `There is / There are`, `How much / How many`, исчисляемые/неисчисляемые (`luggage`, `furniture`, `traffic`, `homework`), артикли `a/an/the`, `Can/Could you`, `Let's`, `listen to`, `on the corner`, `What is the weather like?`.
2. **Точность русских переводов, формулировок заданий и пояснений** — отсутствие расхождений между заданием и ключом.
3. **Упражнения `fix_bug` и `build_sentence`** — наличие реальной грамматической ошибки в «баге» и точность сборки из кубиков.
