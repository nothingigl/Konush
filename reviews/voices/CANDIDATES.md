# Кандидаты голосов Gemini TTS для 4 персонажей курса «Konuş!»

В соответствии с разделом 7 мастер-промпта:
> *«Выбор голосов (начало этапа 4): сгенерируй одинаковые 3 фразы на турецком и 3 на английском разными кандидатами (минимум 8 голосов, 4 женских и 4 мужских) с разными эмоциями, сложи в `reviews/voices/`. Я выберу 4. Для каждого придумай характер и имя, я утверждаю.»*

---

## 1. Предлагаемые 4 персонажа (2 женских, 2 мужских) и 8 кандидатов голосов Gemini TTS

В модели **`gemini-2.5-flash-preview-tts`** (Google AI Studio) доступны выразительные мультиязычные голоса, поддерживающие эмоциональные инструкции в промпте (`say cheerfully:`, `say calmly:`, `say curiously:`, `say warmly:`):

### Женские кандидаты (выбрать 2 для Элиф и Зейнеп):

| # | Голос Gemini TTS | Предлагаемый персонаж | Характер и тембр | Эмоциональный стиль по умолчанию |
|---|---|---|---|---|
| **F1** | **`Aoede`** *(Рекомендуется для Элиф)* | **Элиф (Elif)** — бариста и гид из Стамбула | Тёплый, приветливый, мелодичный сопрано | `Say warmly and cheerfully:` |
| **F2** | **`Kore`** *(Рекомендуется для Зейнеп)* | **Зейнеп (Zeynep)** — журналистка и любительница кино | Чёткий, живой, энергичный молодой женский голос | `Say expressively and lively:` |
| **F3** | **`Leda`** *(Резервный женский 1)* | Кандидат на роль Элиф / Зейнеп | Мягкий, спокойный, обволакивающий тембр | `Say gently and clearly:` |
| **F4** | **`Zephyr`** *(Резервный женский 2)* | Кандидат на роль Элиф / Зейнеп | Светлый, бодрый, динамичный тембр | `Say brightly and enthusiastically:` |

### Мужские кандидаты (выбрать 2 для Кемаля и Эмре):

| # | Голос Gemini TTS | Предлагаемый персонаж | Характер и тембр | Эмоциональный стиль по умолчанию |
|---|---|---|---|---|
| **M1** | **`Charon`** *(Рекомендуется для Кемаля)* | **Кемаль (Kemal)** — преподаватель и путешественник | Спокойный, бархатный баритон с безупречной дикцией | `Say calmly and clearly, like a patient teacher:` |
| **M2** | **`Puck`** *(Рекомендуется для Эмре)* | **Эмре (Emre)** — спортсмен и шеф-повар | Игривый, дружелюбный, энергичный тенор | `Say energetically and friendly:` |
| **M3** | **`Fenrir`** *(Резервный мужской 1)* | Кандидат на роль Кемаля / Эмре | Глубокий, уверенный, насыщенный тембр | `Say confidently and warmly:` |
| **M4** | **`Orus`** *(Резервный мужской 2)* | Кандидат на роль Кемаля / Эмре | Ровный, размеренный, естественный разговорный голос | `Say naturally and clearly:` |

---

## 2. Тестовые фразы (3 на турецком и 3 на английском с разными эмоциями)

Скрипт `pnpm tts:sample-voices` (`scripts/tts/sample-voices.ts`) озвучивает каждым из 8 кандидатов (`Aoede`, `Kore`, `Leda`, `Zephyr`, `Charon`, `Puck`, `Fenrir`, `Orus`) одинаковый набор из 6 фраз:

### Турецкий язык (`tr`):
1. **`tr-01-cheerful`** (`Say cheerfully and warmly:`):
   *«Merhaba, hoş geldiniz! Günaydın! Ben sıcak çay ve taze ekmek istiyorum.»*
   *(Привет, добро пожаловать! Доброе утро! Я хочу горячий чай и свежий хлеб.)*
2. **`tr-02-curious`** (`Say with curiosity and surprise:`):
   *«Acaba bu kimin gözlüğü? Bu çanta çok güzel ama biraz pahalı!»*
   *(Интересно, чьи это очки? Эта сумка очень красивая, но немного дорогая!)*
3. **`tr-03-calm`** (`Say calmly and encouragingly:`):
   *«Merak etme, her şey yolunda. Hadi yarın birlikte parkta yürüyelim.»*
   *(Не волнуйся, всё в порядке. Давай завтра вместе прогуляемся в парке.)*

### Английский язык (`en`):
1. **`en-01-cheerful`** (`Say cheerfully and warmly:`):
   *«Good morning! Welcome to our cafe! Would you like some coffee or tea?»*
2. **`en-02-curious`** (`Say with curiosity and surprise:`):
   *«Excuse me, is this your new backpack? What an amazing and unusual story!»*
3. **`en-03-calm`** (`Say calmly and encouragingly:`):
   *«Do not be afraid of mistakes. Practice every day and you will make great progress.»*

---

## 3. Как сгенерировать аудио-сэмплы на вашем компьютере

1. Убедитесь, что в вашем локальном файле `.env.local` (не в Git!) прописан ключ:
   ```ini
   GEMINI_API_KEY=ваш-ключ-из-Google-AI-Studio
   ```
2. Запустите команду:
   ```powershell
   corepack.cmd pnpm tts:sample-voices
   ```
3. Скрипт сгенерирует 48 аудиофайлов (`8 голосов × 6 фраз`) в папку `reviews/voices/<Голос>/<id>.mp3` (или `.wav` при отсутствии `ffmpeg`).
