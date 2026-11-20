# Gate 4.2 — Отчёт и пакет проверки (Этап 4.2: Контент — Английский, Модуль 1 — Intro)

**Проект:** **«Konuş!»**
**Ветка этапа:** `feat/stage-4-2-en-module-1`
**Дата:** 20.11.2026

> **Важно для проверки Claude:**
> Полный человекочитаемый пакет всех 10 юнитов Модуля 1 английского курса (108 слов и 303 упражнения с переводом, вариантами, кубиками, ключом и пояснениями) выгружен в отдельный файл **`reviews/content/en-section-1.md`**.

---

## 1. Что сделано на Этапе 4.2

1. **Наполнены и вычитаны все 9 юнитов Модуля 1 (Intro) английского курса и босс-юнит (`en-1-1` … `en-1-9`, `en-1-boss`):**
   - `en-1-1` («1.1 Основные фразы»): 12 слов, 32 упражнения (8×4 навыка) — доработан по итогам замечаний внешнего ревью Gate 4.1 (исправлены пары `en-1-1-wr-01`, удалён дубль по пунктуации в `en-1-1-ls-07`, очищен `en-1-1-wr-06`);
   - `en-1-2` («1.2 Откуда вы»): 12 слов, 32 упражнения (8×4 навыка);
   - `en-1-3` («1.3 Представьтесь»): 12 слов, 32 упражнения (8×4 навыка);
   - `en-1-4` («1.4 Семья»): 12 слов, 32 упражнения (8×4 навыка);
   - `en-1-5` («1.5 Места»): 12 слов, 32 упражнения (8×4 навыка);
   - `en-1-6` («1.6 Друзья»): 12 слов, 32 упражнения (8×4 навыка);
   - `en-1-7` («1.7 Увлечения»): 12 слов, 32 упражнения (8×4 навыка);
   - `en-1-8` («1.8 Еда и напитки»): 12 слов, 32 упражнения (8×4 навыка);
   - `en-1-9` («1.9 Питомцы»): 12 слов, 32 упражнения (8×4 навыка);
   - `en-1-boss` («Босс: Первый день на английском»): 0 новых слов, 15 итоговых упражнений на все 4 навыка Модуля 1 (`speaking: 4`, `listening: 4`, `writing: 4`, `reading: 3`).
2. **Учтены все правила качества из внешнего ревью Gate 4.1:**
   - Все задания из исходника `content-src/duolingo_english_skills_words.md` вошли с пометкой `"origin": "source"`.
   - Дополнительные упражнения `"origin": "derived"` используют только лексику текущего и предыдущих юнитов Модуля 1.
   - Каждое из 108 слов Модуля 1 встречается минимум в 2 упражнениях своего юнита (проверено `content:check`).
   - В `build_sentence` ключи (`accepted`) не содержат лишней пунктуации, отсутствующей в `bank`, и строго совпадают с набором кубиков.
   - В `accepted` нет дубликатов, отличающихся только пунктуацией.
   - В `match_pairs` нет одинаковых левых и правых значений.
   - В вариантах `multiple_choice` / `listen_choose` / `read_comprehension` нет лишних ведущих тире (`— `).
   - Ни одно слово исходника не изменено (0 расхождений с `content-src/duolingo_english_skills_words.md`).
   - Статус `"review"` всех 10 юнитов оставлен `"draft"` до вашей явной команды.
3. **Экспортирован пакет контента для ревью:**
   - Командой `pnpm content:export-review --section=en-1` создан файл **`reviews/content/en-section-1.md`** (10 юнитов, 108 слов, 303 упражнения).

---

## 2. Список добавленных и изменённых файлов

| Путь | Статус | Назначение |
|---|---|---|
| `content/courses/en/units/en-1-1.json` | Изменён | Полировка упражнений `en-1-1` по стандартам Gate 4.1 |
| `content/courses/en/units/en-1-2.json` | Изменён | Полный контент юнита 1.2 «Откуда вы» (12 слов, 32 упр.) |
| `content/courses/en/units/en-1-3.json` | Изменён | Полный контент юнита 1.3 «Представьтесь» (12 слов, 32 упр.) |
| `content/courses/en/units/en-1-4.json` | Изменён | Полный контент юнита 1.4 «Семья» (12 слов, 32 упр.) |
| `content/courses/en/units/en-1-5.json` | Изменён | Полный контент юнита 1.5 «Места» (12 слов, 32 упр.) |
| `content/courses/en/units/en-1-6.json` | Изменён | Полный контент юнита 1.6 «Друзья» (12 слов, 32 упр.) |
| `content/courses/en/units/en-1-7.json` | Изменён | Полный контент юнита 1.7 «Увлечения» (12 слов, 32 упр.) |
| `content/courses/en/units/en-1-8.json` | Изменён | Полный контент юнита 1.8 «Еда и напитки» (12 слов, 32 упр.) |
| `content/courses/en/units/en-1-9.json` | Изменён | Полный контент юнита 1.9 «Питомцы» (12 слов, 32 упр.) |
| `content/courses/en/units/en-1-boss.json` | Изменён | Полный контент босса Модуля 1 (0 слов, 15 упр.) |
| `reviews/content/en-section-1.md` | Добавлен | Человекочитаемый пакет всех 108 слов и 303 упражнений Модуля 1 для Claude |
| `reviews/gate-4-2.md` | Добавлен | Настоящий отчёт Gate 4.2 |

---

## 3. Инструкция по локальному запуску и проверке

```powershell
# 1. Проверить схему, инварианты и покрытие слов по всем 133 юнитам
corepack.cmd pnpm content:check

# 2. Пересобрать пакет ревью английского Модуля 1 (при необходимости)
corepack.cmd pnpm content:export-review --section=en-1

# 3. Проверить линтер, типы, тесты, сборку и секреты
corepack.cmd pnpm lint
corepack.cmd pnpm typecheck
corepack.cmd pnpm test
corepack.cmd pnpm build
corepack.cmd pnpm secrets:check

# 4. Запустить локально и пройти юниты Модуля 1 английского в браузере
corepack.cmd pnpm dev
# Открыть http://localhost:3000/en — все 10 юнитов Модуля 1 (1.1–1.9 и Босс) полностью играбельны
```

---

## 4. Результаты проверок

```text
> turkce-duo@0.1.0 content:export-review
> tsx scripts/content-export-review.ts "--section=en-1"
[content:export-review] Wrote reviews/content/en-section-1.md (10 units, 108 words, 303 exercises)

> turkce-duo@0.1.0 content:check
> tsx scripts/content-check.ts
[content:check] OK — validated 133 units (1523 words, 606 exercises).

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
 ✓ src/lib/sync/__tests__/sync.test.ts (9 tests) 10ms
 ✓ src/lib/content/__tests__/schema.test.ts (12 tests) 49ms
 Test Files  3 passed (3) | Tests  27 passed (27)

> turkce-duo@0.1.0 build
> next build
▲ Next.js 16.4.6 (Turbopack)
✓ Compiled successfully in 1812ms
✓ Generating static pages using 7 workers (227/227) in 8.1s

> turkce-duo@0.1.0 secrets:check
> tsx scripts/secret-scan.ts
[secrets:check] OK — scanned 246 tracked files, 0 leaks found.
```

---

## 5. Известные проблемы и ограничения

- Аудиофайлы MP3 (`public/audio/en/1-*/`) будут сгенерированы на **Этапе 5 (Озвучка Gemini TTS)**; до тех пор тренажёр использует встроенный Web Speech API (`en-US`) как резервный вариант.
- Статус всех 10 юнитов Модуля 1 — `"review": "draft"` (по правилу `AGENTS.md` перевод в `"claude_ok"` выполняется только после явной команды владельца после вычитки).
- Юниты `tr-1-1` … `tr-1-boss` после правок Gate 4.1 также пока остаются в `"draft"` (ожидают явной команды «секция 1 проверена»).

---

## 6. Вопросы к владельцу проекта

1. Пожалуйста, отправьте файл **`reviews/content/en-section-1.md`** на вычитку Claude. После проверки напишите список правок (если будут) или подтвердите: **«модуль 1 проверен»** (чтобы перевести `en-1-1` … `en-1-boss` в `"claude_ok"`) и **«Принято»** для перехода к планированию **Этапа 4.3 (Турецкий, Секция 2)**.
2. Нужно ли уже сейчас перевести турецкую Секцию 1 (`tr-1-1` … `tr-1-boss`, правки A1–A12 и B1–B3 внесены на Gate 4.1) в статус `"review": "claude_ok"`? Если да — напишите **«секция 1 проверена»**.

---

## 7. Что проверить Claude

Основной объект проверки — полный файл **`reviews/content/en-section-1.md`** (10 юнитов, 108 слов, 303 упражнения).

Просьба обратить внимание на:
1. **Естественность и грамматику английского языка** (артикли `a/an/the`, окончание `-s` в 3-м лице ед. ч., `have/has`, `am/is/are`, `I would like`, множественное число `fish`, `cats`, `dogs`, `birds`, `horses`).
2. **Точность русских переводов, заданий и пояснений** — нет ли двусмысленностей, противоречий между формулировкой задания и ключом, или слов из более поздних модулей без пояснения.
3. **Упражнения на сборку (`build_sentence`) и исправление бага (`fix_bug`)** — кубики точно складываются в ключ, а «баг» действительно содержит грамматическую ошибку.
4. **Согласованность босс-юнита (`en-1-boss`)** с пройденной лексикой юнитов `en-1-1` … `en-1-9`.

### Пример структуры (фрагмент `en-1-boss`)

```json
{
  "id": "en-1-boss-wr-01",
  "type": "type_answer",
  "origin": "source",
  "prompt_ru": "Переведите на английский (1/3): «Меня зовут Али. Я из Турции.»",
  "source_text": "Меня зовут Али. Я из Турции.",
  "accepted": ["My name is Ali. I am from Turkey."],
  "explain_ru": "My name is Ali (1.3) + I am from Turkey (1.2).",
  "audio": null
}
```

```json
{
  "id": "en-1-boss-rd-01",
  "type": "read_comprehension",
  "origin": "source",
  "prompt_ru": "Прочитайте рассказ о семье и ответьте на вопросы (driver — водитель):",
  "passage": "This is my family. My mother is a teacher. My father is a driver. We have a dog. Its name is Max.",
  "questions": [
    {
      "question_ru": "Кто водитель?",
      "options": ["папа", "мама", "брат", "дедушка"],
      "correct_index": 0,
      "accepted": ["папа", "отец", "father"]
    },
    {
      "question_ru": "Как зовут собаку?",
      "options": ["Макс", "Сэм", "Том", "Али"],
      "correct_index": 0,
      "accepted": ["Макс", "Max"]
    }
  ],
  "explain_ru": "My father is a driver — Мой папа водитель; Its name is Max — Его зовут Макс.",
  "audio": null
}
```
