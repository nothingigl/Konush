# Gate 4.5 — Отчёт и пакет проверки (Этап 4.5: Контент — Турецкий, Секция 3 — A1)

**Проект:** **«Konuş!»**
**Ветка этапа:** `feat/stage-4-5-tr-section-3`
**Дата:** 21.11.2026

> **Важно для проверки Claude:**
> С этим этапом **весь турецкий курс полностью наполнен (70/70 юнитов: Секции 1, 2 и 3 + 3 босса)**.
> Пакет Секции 3 (29 юнитов, 336 слов, 911 упражнений) выгружен в **`reviews/content/tr-section-3.md`**, а также разбит на 3 компактных файла для удобной вычитки Claude:
> - **`reviews/content/tr-section-3-part-1.md`** (`tr-3-1` … `tr-3-10`: 10 юнитов, 120 слов, 320 упражнений)
> - **`reviews/content/tr-section-3-part-2.md`** (`tr-3-11` … `tr-3-20`: 10 юнитов, 120 слов, 320 упражнений)
> - **`reviews/content/tr-section-3-part-3.md`** (`tr-3-21` … `tr-3-28` + `tr-3-boss`: 9 юнитов, 96 слов, 271 упражнение)

---

## 1. Что сделано на Этапе 4.5

1. **Наполнены все 28 регулярных юнитов Секции 3 (A1) турецкого курса и босс-юнит (`tr-3-1` … `tr-3-28`, `tr-3-boss`):**
   - `tr-3-1` … `tr-3-10` (Отрицание наст./прош., «Ничего/никто/нигде», Запреты, «Давайте!» `-elim/-alım`, Приглашения, Согласиться и отказаться, Вежливые просьбы, Части тела, Симптомы): 120 слов, 320 упражнений (8×4).
   - `tr-3-11` … `tr-3-20` (В аптеке, У врача, Привычки в прошлом `-ardım/-erdim`, Привычки сейчас `-ır/-er`, Умения, Можно и нельзя, Нужно/надо/должен `-malı/-meli`, Советы, Спорт, Соревнования): 120 слов, 320 упражнений (8×4).
   - `tr-3-21` … `tr-3-28` (Природа, Погода и времена года, Возможность `-ebilir`, Страдательный залог `-ıl/-il/-ul/-ül`, Причастия `-an/-en` и `-dığı`, Причины и условия, Деепричастия и последовательность, Возвратные формы и «сам»): 96 слов, 256 упражнений (8×4).
   - `tr-3-boss` («Босс: Поликлиника-марафон»): 0 новых слов, 15 итоговых упражнений на все 4 навыка Секции 3 (`speaking: 4`, `listening: 4`, `writing: 4`, `reading: 3`).
2. **Новое правило TTS-чистоты в валидаторе (`scripts/content-check.ts`):**
   - В ходе глубокого аудита выявлены и очищены 36 скобочных русских подсказок, случайно попавших в озвучиваемые поля `target_text`/`transcript` (26 в `tr-3-*` и 10 в `tr-2-*`, которые мешали бы диктору Gemini TTS на Этапе 5).
   - В `scripts/content-check.ts` добавлена постоянная проверка: кириллица в `speak_repeat.target_text`, `listen_choose.transcript` и `listen_type.transcript` теперь автоматически блокируется валидатором.
   - Пакеты ревью `tr-section-2*.md` пересобраны с учётом очистки этих 10 реплик.
3. **Соблюдены все инварианты Zero-Trust и качества:**
   - Все 336 слов Секции 3 совпадают с `content-src/duolingo_turkish_skills_words.md` буква в букву.
   - Все задания исходника вошли с `"origin": "source"`.
   - Каждое из 336 слов (включая грамматические шаблоны `-mıyor`, `ne… ne de`, `-madım/-medim`, `-malı/-meli`, `-dığı için`, `-sa/-se`, `-erek`, `-ip`, `-ince`, `-ken`, `-dıktan sonra`, `-meden önce`, `-meden`) встречается минимум в 2 упражнениях юнита.
   - Статус `"review"` всех 29 юнитов Секции 3 оставлен `"draft"` до вашей явной команды.

---

## 2. Список добавленных и изменённых файлов

| Путь | Статус | Назначение |
|---|---|---|
| `content/courses/tr/units/tr-3-1.json` … `tr-3-28.json` | Изменены | Полный контент 28 регулярных юнитов Секции 3 (336 слов, 896 упр.) |
| `content/courses/tr/units/tr-3-boss.json` | Изменён | Полный контент босс-юнита Секции 3 (0 слов, 15 упр.) |
| `content/courses/tr/units/tr-2-*.json` (7 файлов) | Изменены | Удалены русские скобочные подсказки из 10 озвучиваемых реплик `target_text`/`transcript` |
| `scripts/content-check.ts` | Изменён | Добавлена постоянная проверка на отсутствие кириллицы в озвучиваемых полях TTS |
| `reviews/content/tr-section-3.md` + `part-1/2/3.md` | Добавлены | Полный пакет и 3 компактных файла Секции 3 для вычитки Claude |
| `reviews/content/tr-section-2.md` + `part-1.md` | Обновлены | Пересобраны после очистки 10 озвучиваемых реплик Секции 2 |
| `reviews/gate-4-5.md` | Добавлен | Настоящий отчёт Gate 4.5 |

---

## 3. Инструкция по локальному запуску и проверке

```powershell
# 1. Проверить схему, Zero-Trust, покрытие слов, TTS-чистоту и инварианты качества
corepack.cmd pnpm content:check

# 2. Пересобрать пакеты ревью Секции 3
corepack.cmd pnpm content:export-review --section=tr-3 --chunk-size=10

# 3. Проверить линтер, типы, тесты, сборку и секреты
corepack.cmd pnpm lint
corepack.cmd pnpm typecheck
corepack.cmd pnpm test
corepack.cmd pnpm build
corepack.cmd pnpm secrets:check
```

---

## 4. Результаты проверок

```text
> turkce-duo@0.1.0 content:check
> tsx scripts/content-check.ts
[content:check] OK — validated 133 units (1523 words, 3339 exercises).

> turkce-duo@0.1.0 content:export-review
> tsx scripts/content-export-review.ts "--section=tr-3" "--chunk-size=10"
[content:export-review] Wrote reviews/content/tr-section-3.md (29 units, 336 words, 911 exercises)
[content:export-review] Wrote reviews/content/tr-section-3-part-1.md (10 units, 120 words, 320 exercises)
[content:export-review] Wrote reviews/content/tr-section-3-part-2.md (10 units, 120 words, 320 exercises)
[content:export-review] Wrote reviews/content/tr-section-3-part-3.md (9 units, 96 words, 271 exercises)

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
✓ Generating static pages using 7 workers (575/575)

> turkce-duo@0.1.0 secrets:check
> tsx scripts/secret-scan.ts
[secrets:check] OK — scanned 258 tracked files, 0 leaks found.
```

---

## 5. Известные проблемы и ограничения

- Аудиофайлы MP3 будут сгенерированы на **Этапе 5 (Gemini TTS)**; до тех пор работает резервная озвучка браузера (`tr-TR`).
- Статус всех 29 юнитов Секции 3 — `"review": "draft"` (перевод в `"claude_ok"` только по вашей явной команде **«секция 3 проверена»**).
- По контенту всего проекта готово **5 из 6 секций/модулей** (107 из 133 юнитов, **3 339 упражнений**); остался последний контентный модуль — **Английский Модуль 3** (Этап 4.6, 26 юнитов).

---

## 6. Вопросы к владельцу проекта

1. Отправьте `tr-section-3-part-1/2/3.md` на вычитку Claude. Когда будет готово — пришлите правки или напишите **«секция 3 проверена»** и **«Принято»** для перехода к финальному контентному **Этапу 4.6 (Английский, Модуль 3)**.

---

## 7. Что проверить Claude

Основные объекты проверки:
- **`reviews/content/tr-section-3-part-1.md`** (`tr-3-1` … `tr-3-10`)
- **`reviews/content/tr-section-3-part-2.md`** (`tr-3-11` … `tr-3-20`)
- **`reviews/content/tr-section-3-part-3.md`** (`tr-3-21` … `tr-3-28` + `tr-3-boss`)

Просьба обратить внимание на:
1. **Сложную турецкую морфологию A1+:** отрицания `-mıyor` / `-madım`, императив `-ma/-me`, желательное `-elim/-alım`, аорист `-ır/-er` и привычное прошлое `-ardım/-erdim`, модальность `-ebilir` / `-malı/-meli`, страдательный залог `-ıl/-il/-ul/-ül`, причастия `-an/-en` и `-dığı`, условное `-sa/-se`, деепричастия `-erek`, `-ip`, `-ince`, `-ken`, `-dıktan sonra`, `-meden önce`, возвратные глаголы.
2. **Отсутствие русских вставок внутри турецких реплик для озвучки** (уже проверено автоматически).
3. **Точность переводов, ключей и `fix_bug` / `build_sentence`.**
