# Gate 4.3 — Отчёт и пакет проверки (Этап 4.3: Контент — Турецкий, Секция 2 — A1)

**Проект:** **«Konuş!»**
**Ветка этапа:** `feat/stage-4-3-tr-section-2`
**Дата:** 20.11.2026

> **Важно для проверки Claude:**
> Полный пакет Секции 2 турецкого курса (31 юнит, 359 слов, 975 упражнений) выгружен в **`reviews/content/tr-section-2.md`**, а также разбит на 3 компактных файла по ~10 юнитов для удобной вычитки Claude без обрезки контекста:
> - **`reviews/content/tr-section-2-part-1.md`** (`tr-2-1` … `tr-2-10`: 10 юнитов, 119 слов, 320 упражнений)
> - **`reviews/content/tr-section-2-part-2.md`** (`tr-2-11` … `tr-2-20`: 10 юнитов, 120 слов, 320 упражнений)
> - **`reviews/content/tr-section-2-part-3.md`** (`tr-2-21` … `tr-2-30` + `tr-2-boss`: 11 юнитов, 120 слов, 335 упражнений)

---

## 1. Что сделано на Этапе 4.3

1. **Наполнены все 30 регулярных юнитов Секции 2 (A1) турецкого курса и босс-юнит (`tr-2-1` … `tr-2-30`, `tr-2-boss`):**
   - `tr-2-1` … `tr-2-10` (Профессии, Косвенные дополнения, Вопросы [11 слов], Места, Числа, Одежда, Что происходит сейчас, Время суток и дни, Исходный падеж `-dan/-den`, Цвета): 119 слов, 320 упражнений (8×4 на юнит).
   - `tr-2-11` … `tr-2-20` (Дательный падеж `-a/-e`, Который час?, Где что находится?, Описание людей, Сложные предложения, Вопросы (2): мнения и уверенность, Семья, Местоимения, Наречия, «Чего нет»): 120 слов, 320 упражнений (8×4 на юнит).
   - `tr-2-21` … `tr-2-30` (Откуда человек родом, Инфинитивы, Поездки, Люди, Порядковые числительные, Что происходит прямо сейчас, Предметы в доме, Прошедшие события, Описание предметов (3), Будущее): 120 слов, 320 упражнений (8×4 на юнит).
   - `tr-2-boss` («Босс: Город-квест»): 0 новых слов, 15 итоговых упражнений на все 4 навыка Секции 2 (`speaking: 4`, `listening: 4`, `writing: 4`, `reading: 3`).
2. **Усилен автоматический валидатор контента (`scripts/content-check.ts`):**
   - Встроены все инварианты качества из внешнего ревью Gate 4.1:
     - строгая проверка совпадения кубиков `bank` и ключей `accepted` в `build_sentence` (и запрет «висячей» пунктуации в `accepted`, отсутствующей в `bank`);
     - запрет дубликатов в `accepted`, отличающихся только пунктуацией и регистром;
     - запрет тождественных левых/правых элементов в `match_pairs`;
     - запрет ведущих тире (`— `) в вариантах ответа (`multiple_choice`, `listen_choose`, `read_comprehension`).
3. **Улучшен экспортёр ревью (`scripts/content-export-review.ts`):**
   - Добавлен опциональный флаг `--chunk-size=10` для автоматической разбивки больших секций на компактные файлы `*-part-1/2/3.md` рядом с полным файлом секции.
4. **Соблюдены все правила Zero-Trust и орфографии:**
   - Ни одно слово исходника `content-src/duolingo_turkish_skills_words.md` не изменено (0 нарушений Zero-Trust).
   - Все задания исходника включены с `"origin": "source"`.
   - Каждое из 359 слов встречается минимум в 2 упражнениях своего юнита.
   - В `tr-2-6` пропуск в исходном упражнении «Допиши буквы» оформлен корректно для `pantolon` (вместо опечатки исходника `pan_alon`).
   - Статус `"review"` всех 31 юнита Секции 2 оставлен `"draft"` до вашей явной команды.

---

## 2. Список добавленных и изменённых файлов

| Путь | Статус | Назначение |
|---|---|---|
| `content/courses/tr/units/tr-2-1.json` … `tr-2-30.json` | Изменены | Полный контент 30 регулярных юнитов Секции 2 (359 слов, 960 упр.) |
| `content/courses/tr/units/tr-2-boss.json` | Изменён | Полный контент босс-юнита Секции 2 (0 слов, 15 упр.) |
| `scripts/content-check.ts` | Изменён | Добавлены автоматические проверки качества упражнений из Gate 4.1 |
| `scripts/content-export-review.ts` | Изменён | Поддержка `--chunk-size=N` для разбивки больших секций на части |
| `scripts/tts/sample-voices.ts` | Изменён | Выравнивание форматирования Prettier |
| `reviews/content/tr-section-2.md` | Добавлен | Полный человекочитаемый пакет Секции 2 (31 юнит, 359 слов, 975 упр.) |
| `reviews/content/tr-section-2-part-1.md` | Добавлен | Часть 1/3 для ревью Claude (`tr-2-1` … `tr-2-10`, 320 упр.) |
| `reviews/content/tr-section-2-part-2.md` | Добавлен | Часть 2/3 для ревью Claude (`tr-2-11` … `tr-2-20`, 320 упр.) |
| `reviews/content/tr-section-2-part-3.md` | Добавлен | Часть 3/3 для ревью Claude (`tr-2-21` … `tr-2-30`, `tr-2-boss`, 335 упр.) |
| `reviews/gate-4-3.md` | Добавлен | Настоящий отчёт Gate 4.3 |

---

## 3. Инструкция по локальному запуску и проверке

```powershell
# 1. Проверить схему, Zero-Trust, покрытие слов и инварианты качества по всем 133 юнитам
corepack.cmd pnpm content:check

# 2. Пересобрать пакеты ревью Секции 2 (полный + 3 части по 10 юнитов)
corepack.cmd pnpm content:export-review --section=tr-2 --chunk-size=10

# 3. Проверить линтер, типы, тесты, сборку и секреты
corepack.cmd pnpm lint
corepack.cmd pnpm typecheck
corepack.cmd pnpm test
corepack.cmd pnpm build
corepack.cmd pnpm secrets:check

# 4. Запустить локально и пройти юниты Секции 2 турецкого курса в браузере
corepack.cmd pnpm dev
# Открыть http://localhost:3000/tr — все 10 юнитов Секции 1 и все 31 юнит Секции 2 полностью играбельны
```

---

## 4. Результаты проверок

```text
> turkce-duo@0.1.0 content:export-review
> tsx scripts/content-export-review.ts "--section=tr-2" "--chunk-size=10"
[content:export-review] Wrote reviews/content/tr-section-2.md (31 units, 359 words, 975 exercises)
[content:export-review] Wrote reviews/content/tr-section-2-part-1.md (10 units, 119 words, 320 exercises)
[content:export-review] Wrote reviews/content/tr-section-2-part-2.md (10 units, 120 words, 320 exercises)
[content:export-review] Wrote reviews/content/tr-section-2-part-3.md (11 units, 120 words, 335 exercises)

> turkce-duo@0.1.0 content:check
> tsx scripts/content-check.ts
[content:check] OK — validated 133 units (1523 words, 1581 exercises).

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
 ✓ src/lib/sync/__tests__/sync.test.ts (9 tests) 14ms
 ✓ src/lib/content/__tests__/schema.test.ts (12 tests) 69ms
 Test Files  3 passed (3) | Tests  27 passed (27)

> turkce-duo@0.1.0 build
> next build
▲ Next.js 16.4.6 (Turbopack)
✓ Compiled successfully in 1824ms
✓ Generating static pages using 7 workers (351/351) in 10.1s

> turkce-duo@0.1.0 secrets:check
> tsx scripts/secret-scan.ts
[secrets:check] OK — scanned 248 tracked files, 0 leaks found.
```

---

## 5. Известные проблемы и ограничения

- Аудиофайлы MP3 (`public/audio/tr/2-*/`) будут сгенерированы на **Этапе 5 (Gemini TTS)**; до тех пор тренажёр использует резервный Web Speech API (`tr-TR`).
- Статус всех 31 юнита Секции 2 — `"review": "draft"` (перевод в `"claude_ok"` выполняется только после вашей явной команды **«секция 2 проверена»**).
- Юниты английского Модуля 1 (`en-1-1` … `en-1-boss`) также остаются в `"draft"` до вашей команды **«модуль 1 проверен»** (или правок от Claude).

---

## 6. Вопросы к владельцу проекта

1. Пожалуйста, отправьте пакеты **`reviews/content/tr-section-2-part-1.md`**, **`part-2.md`** и **`part-3.md`** (или общий `tr-section-2.md`) на вычитку Claude. Когда будет готово, пришлите правки или команду **«секция 2 проверена»** и **«Принято»** для перехода к планированию **Этапа 4.4 (Английский, Модуль 2)**.
2. Есть ли правки или подтверждение **«модуль 1 проверен»** по английскому Модулю 1 (`reviews/content/en-section-1.md`)?

---

## 7. Что проверить Claude

Основные объекты проверки:
- **`reviews/content/tr-section-2-part-1.md`** (`tr-2-1` … `tr-2-10`)
- **`reviews/content/tr-section-2-part-2.md`** (`tr-2-11` … `tr-2-20`)
- **`reviews/content/tr-section-2-part-3.md`** (`tr-2-21` … `tr-2-30` + `tr-2-boss`)

Просьба обратить внимание на:
1. **Турецкую грамматику и орфографию A1:** гармония гласных (2- и 4-вариантная), падежи (`-a/-e`, `-dan/-den/-tan/-ten`, `-da/-de/-ta/-te`), личные аффиксы (`-ım/-im/-um/-üm`), настоящее длительное (`-iyor`), прошедшее (`-di/-tı`), будущее (`-ecek/-acak` + `k→ğ`), изафет и послелоги (`masanın üstünde`, `kapının önünde`), апострофы после имён собственных и чисел (`1995'te`, `2020'de`, `Rusya'danım`, `Ali'ye`).
2. **Точность русских переводов, формулировок заданий и пояснений** — соответствие между заданием и ключом.
3. **Упражнения `fix_bug` и `build_sentence`** — наличие реальной ошибки в «баге» и естественность собираемых фраз.

### Фрагмент нового валидатора (`scripts/content-check.ts`)

```ts
function checkExerciseQuality(ex: Exercise, locale: string, errors: string[]): void {
  if (ex.type === 'build_sentence') {
    const bankHasTrailingPunct = ex.bank.some((b) => /[.!?]$/.test(b));
    const bankTokens = ex.bank
      .flatMap((b) => b.split(/\s+/))
      .map((t) => normalizeForDupCheck(t, locale))
      .filter(Boolean)
      .sort()
      .join('|');
    for (const acc of ex.accepted) {
      if (/[.!?]$/.test(acc) && !bankHasTrailingPunct && !APPROVED_BUILD_SENTENCE_PUNCT_IDS.has(ex.id)) {
        errors.push(`Quality violation in ${ex.id}: build_sentence accepted "${acc}" ends with punctuation absent from bank`);
      }
      const accTokens = acc.split(/\s+/).map((t) => normalizeForDupCheck(t, locale)).filter(Boolean).sort().join('|');
      if (accTokens !== bankTokens) {
        errors.push(`Quality violation in ${ex.id}: build_sentence accepted "${acc}" does not match bank tokens`);
      }
    }
  }
  // + duplicate accepted check, identical match_pairs check, leading dash in options check
}
```
