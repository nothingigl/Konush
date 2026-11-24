# Gate 5 — Отчёт и пакет проверки (Этап 5: Озвучка Gemini TTS)

**Проект:** **«Konuş!»**
**Ветка этапа:** `feat/stage-5-tts-audio`
**Дата:** 21.11.2026

---

## 1. Что сделано на Этапе 5

1. **Построен полный конвейер локальной генерации аудио на Gemini TTS (`scripts/tts/`):**
   - **`scripts/tts/config.ts`**:
     - Утверждённая четвёрка голосов Gemini TTS (`gemini-2.5-flash-preview-tts`, 2 женских + 2 мужских):
       - **Элиф (`elif`)** → **`Aoede`** (тёплый, дружелюбный);
       - **Зейнеп (`zeynep`)** → **`Kore`** (бодрый, чёткий);
       - **Кемаль (`kemal`)** → **`Charon`** (спокойный, размеренный);
       - **Эмре (`emre`)** → **`Puck`** (живой, энергичный).
     - Генератор эмоциональных инструкций `buildClipStyle()` под персонажа, язык (`Turkish` / `English`), тип клипа (`word` / `speaking` / `listening` / `reading`) и пунктуационную интонацию (`?`, `!`, `.`).
     - Детерминированный SHA-256 хэш от `(model, voice, style, text)` для идемпотентности и дедупликации.
     - Планировщик `collectAudioPlan()` с поддержкой фильтров по курсу, секции, юниту и флага `--include-reading`.
   - **`scripts/tts/generate.ts`** (`pnpm tts:generate`):
     - Возобновляемый, идемпотентный генератор MP3: пропускает уже сгенерированные файлы с совпадающим хэшем, копирует дубликаты по хэшу без лишнего API-вызова, сохраняет `content/audio-manifest.json` инкрементально (каждые 10 клипов + при `SIGINT`).
     - Обработка через `ffmpeg`: обрезка тишины по краям (`silenceremove`), нормализация громкости (`loudnorm=I=-16:TP=-1.5:LRA=11`), сжатие в **mono MP3, 24 kHz, 36 kbps**; сырые PCM-файлы пишутся только в `tmp/tts/` (в `.gitignore`) и сразу удаляются.
     - Защита от лимитов и сбоев: `--rpm=10`, экспоненциальный backoff при HTTP 429 / 5xx, лог ошибок отдельных клипов в `tmp/tts/tts-errors.json` без падения батча, жёсткий предохранитель бюджета `--max-mb=60`.
   - **`scripts/tts/budget.ts`** (`pnpm tts:budget`):
     - Аудит `content/audio-manifest.json` и `public/audio/` на покрытие клипов и лимиты (слово ≤ 15 КБ, фраза ≤ 40 КБ, юнит ≤ 1,5 МБ, всего ≤ 60 МБ / потолок 100 МБ).
2. **Улучшен клиентский аудиоплеер (`src/lib/audio/speech.ts` и `src/components/lesson-player-client.tsx`):**
   - Единый активный `HTMLAudioElement` с функцией `stopReferenceAudio()` — нажатие на новое слово/фразу или переход к следующему упражнению мгновенно останавливает предыдущий звук без наложения.
   - Пользовательская настройка скорости речи (`0.75x / 1.0x / 1.15x` из профиля) теперь применяется на всех упражнениях плеера (говорение, слушание, чтение).
   - Добавлена кнопка **«🔊 Прослушать текст»** в упражнениях `read_comprehension`.
   - Совместимость с iOS Safari (воспроизведение строго по жесту пользователя) и автоматический фоллбэк на Web Speech API (`tr-TR` / `en-US`), пока MP3-файл ещё не сгенерирован или отсутствует в офлайн-кэше.
   - Сайт в рантайме никогда не обращается к Gemini API.
3. **Покрытие юнит-тестами и документация:**
   - Добавлен файл `src/lib/audio/__tests__/tts-pipeline.test.ts` (6 тестов на голоса, стили, хэши, план всех 133 юнитов, бюджет ≤ 60 МБ, `--include-reading` и фильтрацию по юниту).
   - Зафиксированы решения в `docs/DECISIONS.md` (раздел 7) и подробная пошаговая инструкция установки `ffmpeg`, добавления `GEMINI_API_KEY` и запуска генерации в `docs/USER_ACTIONS.md` (Шаг 5.1).

---

## 2. Список добавленных и изменённых файлов

| Путь | Статус | Назначение |
|---|---|---|
| `scripts/tts/config.ts` | Добавлен | Конфиг 4 голосов Gemini TTS, эмоциональные стили, SHA-256 хэши и планировщик клипов |
| `scripts/tts/generate.ts` | Добавлен | Возобновляемый, дедуплицируемый генератор MP3 (`pnpm tts:generate`) с `ffmpeg` и защитой бюджета |
| `scripts/tts/budget.ts` | Добавлен | Скрипт аудита бюджета и покрытия аудио (`pnpm tts:budget`) |
| `src/lib/audio/speech.ts` | Изменён | Единый активный аудио-канал, `stopReferenceAudio()`, клампинг скорости, фоллбэк Web Speech |
| `src/components/lesson-player-client.tsx` | Изменён | Подключён `speechRate` профиля, `stopReferenceAudio()` при смене экрана и кнопка озвучки в `read_comprehension` |
| `src/lib/audio/__tests__/tts-pipeline.test.ts` | Добавлен | 6 юнит-тестов конвейера TTS и бюджета |
| `package.json` | Изменён | Добавлены скрипты `tts:generate` и `tts:budget` |
| `docs/DECISIONS.md` | Изменён | Раздел 7: решение по 4 голосам, формату 36 kbps mono 24 kHz и бюджету ≤ 60 МБ |
| `docs/USER_ACTIONS.md` | Изменён | Шаг 5.1: пошаговые команды установки `ffmpeg`, настройки `.env.local` и генерации MP3 |
| `reviews/gate-5.md` | Добавлен | Настоящий отчёт Gate 5 |

---

## 3. Инструкция по локальному запуску и генерации MP3

```powershell
# 1. Проверить план генерации без API-ключа и без траты квот:
corepack.cmd pnpm tts:generate --dry-run
corepack.cmd pnpm tts:budget

# 2. Запустить тесты, линтер, проверку типов, контента, секретов и сборку:
corepack.cmd pnpm test
corepack.cmd pnpm lint
corepack.cmd pnpm typecheck
corepack.cmd pnpm content:check --strict-exercises
corepack.cmd pnpm secrets:check
corepack.cmd pnpm build

# 3. Для живой генерации MP3 (см. docs/USER_ACTIONS.md, Шаг 5.1):
#    a) winget install Gyan.FFmpeg
#    b) Добавить GEMINI_API_KEY=... в локальный .env.local
#    c) Пилот на 1 юнит:  corepack.cmd pnpm tts:generate --unit=tr-1-1
#    d) Весь курс:        corepack.cmd pnpm tts:generate
```

---

## 4. Результаты проверок

```text
> turkce-duo@0.1.0 tts:generate "--dry-run"
=== Konuş! Gemini TTS Audio Generator ===
Model:          gemini-2.5-flash-preview-tts (mono 24 kHz MP3 @ 36k)
Planned clips:  3502 (TR: 1834, EN: 1668)
Unique hashes:  3443 (dedup savings: 59 API calls)
Up to date:     0
Pending now:    3502
Projected size: 40.77 MB (target <= 60.00 MB, hard guard <= 60.00 MB)

> turkce-duo@0.1.0 tts:generate "--dry-run" "--include-reading"
Planned clips:  3768 (TR: 1974, EN: 1794)
Unique hashes:  3709 (dedup savings: 59 API calls)
Projected size: 51.01 MB (target <= 60.00 MB, hard guard <= 60.00 MB)

> turkce-duo@0.1.0 tts:budget
Planned clips:      3502 (TR: 1834, EN: 1668)
Projected 100%:     40.77 MB @ 36 kbps mono 24 kHz
Budget target:      <= 60.00 MB (ceiling 100.00 MB)
[tts:budget] OK

> turkce-duo@0.1.0 test
 ✓ src/lib/content/__tests__/migration.test.ts (6 tests)
 ✓ src/lib/sync/__tests__/sync.test.ts (9 tests)
 ✓ src/lib/content/__tests__/schema.test.ts (12 tests)
 ✓ src/lib/audio/__tests__/tts-pipeline.test.ts (6 tests)
 Test Files  4 passed (4) | Tests  33 passed (33)

> turkce-duo@0.1.0 lint
Checking formatting... All matched files use Prettier code style! (0 warnings, 0 errors)

> turkce-duo@0.1.0 typecheck
(0 errors)

> turkce-duo@0.1.0 content:check "--strict-exercises"
[content:check] OK — validated 133 units (1523 words, 4154 exercises).

> turkce-duo@0.1.0 secrets:check
[secrets:check] OK — scanned 268 tracked files, 0 leaks found.

> turkce-duo@0.1.0 build
✓ Generating static pages using 7 workers (679/679)
```

---

## 5. Известные ограничения

- Файлы `public/audio/**/*.mp3` ещё не сгенерированы, так как на ПК пока не установлены `ffmpeg` и локальный `.env.local` с `GEMINI_API_KEY`. Приложение полностью работает уже сейчас за счёт автоматического фоллбэка на Web Speech API, а как только вы добавите ключ и установите `ffmpeg`, команда `corepack.cmd pnpm tts:generate` наполнит `public/audio/` и `content/audio-manifest.json` без каких-либо изменений кода.

---

## 6. Вопросы к владельцу проекта

1. Хотите запустить пилотную/полную генерацию MP3 сейчас (если готовы поставить `ffmpeg` и положить `GEMINI_API_KEY` в `.env.local`), или принимаем **Gate 5** («Принято») и идём дальше к **Этапу 6 (Сборка MVP: SEO, офлайн-скачивание секций, `keepalive.yml`)**, чтобы генерировать аудио параллельно?

---

## 7. Что проверить Claude

### Ключевой фрагмент `scripts/tts/config.ts` (голоса, стили и детерминированный SHA-256 хэш)

```ts
export const VOICE_PROFILES: Record<CharacterId, VoiceProfile> = {
  elif: { character: 'elif', voiceName: 'Aoede', gender: 'female', displayNameRu: 'Элиф', temperamentPrompt: 'warmly and kindly' },
  zeynep: { character: 'zeynep', voiceName: 'Kore', gender: 'female', displayNameRu: 'Зейнеп', temperamentPrompt: 'brightly and clearly' },
  kemal: { character: 'kemal', voiceName: 'Charon', gender: 'male', displayNameRu: 'Кемаль', temperamentPrompt: 'calmly and steadily' },
  emre: { character: 'emre', voiceName: 'Puck', gender: 'male', displayNameRu: 'Эмре', temperamentPrompt: 'lively and expressively' },
};

export function computeClipHash(params: { text: string; voice: string; style: string; model: string }): string {
  const payload = JSON.stringify([params.model, params.voice, params.style, params.text.trim()]);
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}
```

### Ключевой фрагмент `scripts/tts/generate.ts` (цепочка `ffmpeg`)

```ts
execFileSync('ffmpeg', [
  '-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', rawPcmPath,
  '-af', 'silenceremove=start_periods=1:start_duration=0.05:start_threshold=-45dB:detection=peak,areverse,silenceremove=start_periods=1:start_duration=0.05:start_threshold=-45dB:detection=peak,areverse,loudnorm=I=-16:TP=-1.5:LRA=11',
  '-codec:a', 'libmp3lame', '-ac', '1', '-ar', '24000', '-b:a', bitrate, outMp3Path,
], { stdio: 'ignore' });
```
