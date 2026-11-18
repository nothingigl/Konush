'use client';

import Link from 'next/link';
import React, { useRef, useState } from 'react';
import { playReferenceAudio } from '@/lib/audio/speech';
import { checkTypedAnswer } from '@/lib/content/normalize';
import type { Exercise, Unit } from '@/lib/content/schema';
import type { SkillKey } from '@/lib/db/dexie';
import { useAppState } from './providers/app-provider';

const SKILL_TITLES: Record<SkillKey, string> = {
  speaking: '🗣 Говорение',
  listening: '🎧 Слушание',
  writing: '✍️ Письмо',
  reading: '📖 Чтение',
};

export function LessonPlayerClient({ unit, skill }: { unit: Unit; skill: SkillKey }) {
  const { completeSkillSession, submitFeedback } = useAppState();
  const exercises = unit.skills[skill].exercises;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTimeMs] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);

  // Per-exercise interaction state
  const [textInput, setTextInput] = useState('');
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]);
  const [orderedList, setOrderedList] = useState<string[]>(() => {
    const first = exercises[0];
    return first?.type === 'order_items' ? [...first.items_shuffled] : [];
  });
  const [matchedLeftIndex, setMatchedLeftIndex] = useState<number | null>(null);
  const [completedPairs, setCompletedPairs] = useState<number[]>([]);
  const [speakSelfGrade, setSpeakSelfGrade] = useState<'ok' | 'retry' | null>(null);
  const [readingAnswers, setReadingAnswers] = useState<Record<number, number>>({});

  // Local-only microphone recording state for speak_repeat
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Feedback banner state
  const [feedback, setFeedback] = useState<{
    status: 'correct' | 'almost_correct' | 'incorrect';
    title: string;
    detail: string | null;
    explain: string | null;
  } | null>(null);

  // "Report an issue" state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  const currentExercise: Exercise | undefined = exercises[currentIndex];

  if (!currentExercise && !finished) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-xl font-bold">В этом навыке пока нет упражнений</h1>
        <Link
          href={`/${unit.course}/units/${unit.slug}`}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white"
        >
          Вернуться к юниту
        </Link>
      </main>
    );
  }

  const handleToggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
        for (const track of stream.getTracks()) track.stop();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      // User declined microphone permission; speaking still works via self-evaluation
    }
  };

  const handleCheckAnswer = () => {
    if (!currentExercise || feedback) return;

    const ex = currentExercise;
    let status: 'correct' | 'almost_correct' | 'incorrect' = 'incorrect';
    let detail: string | null = null;

    switch (ex.type) {
      case 'word_card': {
        status = 'correct';
        break;
      }
      case 'speak_repeat': {
        status = speakSelfGrade === 'retry' ? 'almost_correct' : 'correct';
        detail =
          speakSelfGrade === 'retry'
            ? 'Продолжайте повторять вслух — произношение закрепляется практикой!'
            : null;
        break;
      }
      case 'multiple_choice':
      case 'listen_choose': {
        if (selectedChoice === null) return;
        status = selectedChoice === ex.correct_index ? 'correct' : 'incorrect';
        if (status === 'incorrect') {
          detail = `Правильный ответ: ${ex.options[ex.correct_index]}`;
        }
        break;
      }
      case 'odd_one_out': {
        if (selectedChoice === null) return;
        status = selectedChoice === ex.odd_index ? 'correct' : 'incorrect';
        if (status === 'incorrect') {
          detail = `Лишнее слово: ${ex.items[ex.odd_index]}`;
        }
        break;
      }
      case 'match_pairs': {
        if (completedPairs.length < ex.pairs.length) return;
        status = 'correct';
        break;
      }
      case 'build_sentence': {
        if (selectedTiles.length === 0) return;
        const assembled = selectedTiles.map((idx) => ex.bank[idx]!).join(' ');
        const check = checkTypedAnswer(assembled, ex.accepted, unit.course);
        status = check.status;
        detail =
          check.status === 'almost_correct'
            ? check.hint_ru
            : check.status === 'incorrect'
              ? `Правильный вариант: ${ex.accepted[0]}`
              : null;
        break;
      }
      case 'type_answer':
      case 'listen_type':
      case 'fix_bug': {
        if (!textInput.trim()) return;
        const check = checkTypedAnswer(textInput, ex.accepted, unit.course);
        status = check.status;
        detail =
          check.status === 'almost_correct'
            ? check.hint_ru
            : check.status === 'incorrect'
              ? `Правильный ответ: ${ex.accepted[0]}`
              : null;
        break;
      }
      case 'order_items': {
        const isExactOrder =
          orderedList.length === ex.correct_order.length &&
          orderedList.every((item, idx) => item === ex.correct_order[idx]);
        status = isExactOrder ? 'correct' : 'incorrect';
        if (!isExactOrder) {
          detail = `Правильный порядок: ${ex.correct_order.join(' → ')}`;
        }
        break;
      }
      case 'read_comprehension': {
        const allAnswered = ex.questions.every((_, qIdx) => readingAnswers[qIdx] !== undefined);
        if (!allAnswered) return;
        const allCorrect = ex.questions.every(
          (q, qIdx) => readingAnswers[qIdx] === (q.correct_index ?? 0),
        );
        status = allCorrect ? 'correct' : 'incorrect';
        if (!allCorrect) {
          detail = `Ключ: ${ex.questions.map((q) => q.accepted[0]).join('; ')}`;
        }
        break;
      }
    }

    if (status === 'correct' || status === 'almost_correct') {
      setCorrectCount((prev) => prev + 1);
    }

    const title =
      status === 'correct'
        ? '✅ Верно!'
        : status === 'almost_correct'
          ? '💡 Почти верно (засчитано)!'
          : '❌ Неверно';

    setFeedback({
      status,
      title,
      detail,
      explain: ex.explain_ru,
    });
  };

  const handleNext = async () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx < exercises.length) {
      const nextExercise = exercises[nextIdx];
      setTextInput('');
      setSelectedChoice(null);
      setSelectedTiles([]);
      setMatchedLeftIndex(null);
      setCompletedPairs([]);
      setSpeakSelfGrade(null);
      setReadingAnswers({});
      setFeedback(null);
      setRecordedAudioUrl(null);
      setIsRecording(false);
      setOrderedList(nextExercise?.type === 'order_items' ? [...nextExercise.items_shuffled] : []);
      setCurrentIndex(nextIdx);
      return;
    }

    // Lesson finished — save to Dexie and sync
    const total = exercises.length;
    const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 100;
    const durationSeconds = Math.max(5, Math.round((Date.now() - startTimeMs) / 1000));

    await completeSkillSession({
      unitId: unit.id,
      courseId: unit.course,
      skill,
      scorePercent,
      xpEarned: 10,
      durationSeconds,
      isBoss: unit.boss,
    });

    setFinished(true);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExercise || reportText.trim().length < 3) return;
    await submitFeedback({
      courseId: unit.course,
      unitId: unit.id,
      exerciseId: currentExercise.id,
      message: reportText,
    });
    setReportStatus('Спасибо! Сообщение сохранено и будет отправлено.');
    setReportText('');
    setTimeout(() => {
      setShowReportModal(false);
      setReportStatus(null);
    }, 1500);
  };

  if (finished) {
    const accuracy =
      exercises.length > 0 ? Math.round((correctCount / exercises.length) * 100) : 100;
    return (
      <main className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-14 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-4xl dark:bg-emerald-950">
          🎉
        </div>
        <h1 className="text-3xl font-extrabold">Навык пройден!</h1>
        <p className="text-slate-600 dark:text-slate-300">
          {unit.title_ru} · {SKILL_TITLES[skill]}
        </p>

        <div className="grid w-full grid-cols-2 gap-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/60">
            <div className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
              Получено опыта
            </div>
            <div className="mt-1 text-2xl font-black text-emerald-900 dark:text-white">+10 XP</div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/60">
            <div className="text-xs font-semibold uppercase text-sky-700 dark:text-sky-300">
              Точность
            </div>
            <div className="mt-1 text-2xl font-black text-sky-900 dark:text-white">{accuracy}%</div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Прогресс мгновенно сохранён в локальной БД браузера (IndexedDB) и поставлен в очередь
          синхронизации с облаком.
        </p>

        <div className="flex w-full flex-col gap-2.5 sm:flex-row">
          <Link
            href={`/${unit.course}/units/${unit.slug}`}
            className="flex-1 rounded-xl bg-sky-600 py-3 font-bold text-white hover:bg-sky-700"
          >
            К навыкам юнита →
          </Link>
          <Link
            href={`/${unit.course}`}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Карта курса
          </Link>
        </div>
      </main>
    );
  }

  const ex = currentExercise!;
  const progressPct = Math.round(((currentIndex + (feedback ? 1 : 0)) / exercises.length) * 100);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-between px-4 py-6">
      {/* Top progress bar */}
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/${unit.course}/units/${unit.slug}`}
            aria-label="Выйти из урока"
            className="rounded-lg px-2.5 py-1 text-sm font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            ✕ Выйти
          </Link>
          <div className="text-xs font-bold text-slate-500">
            {unit.title_ru} · {SKILL_TITLES[skill]} ({currentIndex + 1} / {exercises.length})
          </div>
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="text-xs font-medium text-slate-500 underline hover:text-slate-800 dark:hover:text-slate-200"
          >
            Сообщить об ошибке
          </button>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-sky-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* Exercise body */}
      <section className="my-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {ex.origin === 'source' ? 'Задание курса' : 'Практика'} · {ex.type}
          </span>
        </div>

        <h1 className="mt-3 text-lg font-bold sm:text-xl">{ex.prompt_ru}</h1>

        {/* 1. word_card */}
        {ex.type === 'word_card' && (
          <div className="mt-5 space-y-4 rounded-xl border border-sky-200 bg-sky-50/50 p-5 text-center dark:border-sky-900 dark:bg-sky-950/40">
            <div
              lang={unit.course}
              className="text-3xl font-extrabold text-sky-900 dark:text-sky-200"
            >
              {ex.target_text}
            </div>
            <div className="text-lg font-semibold text-slate-700 dark:text-slate-300">
              {ex.translation_ru}
            </div>
            {ex.example_text && (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <span lang={unit.course} className="font-semibold">
                  {ex.example_text}
                </span>{' '}
                — {ex.example_ru}
              </div>
            )}
            <button
              type="button"
              onClick={() =>
                void playReferenceAudio({
                  text: ex.target_text,
                  course: unit.course,
                  audioRelPath: ex.audio,
                })
              }
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
            >
              🔊 Прослушать
            </button>
          </div>
        )}

        {/* 2. speak_repeat */}
        {ex.type === 'speak_repeat' && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div lang={unit.course} className="text-xl font-bold">
                {ex.target_text}
              </div>
              {ex.translation_ru && (
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {ex.translation_ru}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void playReferenceAudio({
                      text: ex.target_text,
                      course: unit.course,
                      audioRelPath: ex.audio,
                    })
                  }
                  className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700"
                >
                  🔊 Слушать эталон
                </button>

                <button
                  type="button"
                  onClick={() => void handleToggleRecording()}
                  className={`rounded-xl border px-4 py-2 text-xs font-bold ${
                    isRecording
                      ? 'border-rose-500 bg-rose-600 text-white'
                      : 'border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  {isRecording ? '⏹ Остановить запись' : '🎙 Записать себя для сравнения'}
                </button>
              </div>

              {recordedAudioUrl && (
                <div className="mt-3">
                  <div className="text-xs text-slate-500">
                    Ваша запись (хранится только в браузере, никуда не отправляется):
                  </div>
                  <audio controls src={recordedAudioUrl} className="mt-1 h-9 w-full" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-slate-500">
                Произнесите вслух и оцените себя:
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSpeakSelfGrade('ok')}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-bold ${
                    speakSelfGrade === 'ok'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  👍 Получилось
                </button>
                <button
                  type="button"
                  onClick={() => setSpeakSelfGrade('retry')}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-bold ${
                    speakSelfGrade === 'retry'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  🔁 Ещё раз
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. listen_choose & multiple_choice */}
        {(ex.type === 'listen_choose' || ex.type === 'multiple_choice') && (
          <div className="mt-5 space-y-4">
            {ex.type === 'listen_choose' ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    void playReferenceAudio({
                      text: ex.transcript,
                      course: unit.course,
                      audioRelPath: ex.audio,
                    })
                  }
                  className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700"
                >
                  🔊 Прослушать аудио-скрипт
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void playReferenceAudio({
                      text: ex.transcript,
                      course: unit.course,
                      audioRelPath: ex.audio,
                      rate: 0.75,
                    })
                  }
                  className="rounded-2xl border border-slate-300 px-3.5 py-3 text-xs font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  🐢 Медленно
                </button>
              </div>
            ) : (
              ex.question_text && (
                <div
                  lang={unit.course}
                  className="rounded-xl bg-slate-100 p-3.5 text-lg font-bold dark:bg-slate-800"
                >
                  {ex.question_text}
                </div>
              )
            )}

            <div className="grid gap-2.5">
              {ex.options.map((opt, idx) => (
                <button
                  key={opt}
                  type="button"
                  disabled={Boolean(feedback)}
                  onClick={() => setSelectedChoice(idx)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    selectedChoice === idx
                      ? 'border-sky-600 bg-sky-50 text-sky-950 dark:bg-sky-950 dark:text-sky-100'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. odd_one_out */}
        {ex.type === 'odd_one_out' && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            {ex.items.map((item, idx) => (
              <button
                key={item}
                type="button"
                disabled={Boolean(feedback)}
                onClick={() => setSelectedChoice(idx)}
                lang={unit.course}
                className={`rounded-xl border p-4 text-center text-base font-bold transition ${
                  selectedChoice === idx
                    ? 'border-sky-600 bg-sky-50 text-sky-950 dark:bg-sky-950 dark:text-sky-100'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        )}

        {/* 5. build_sentence ("Кубики") */}
        {ex.type === 'build_sentence' && (
          <div className="mt-5 space-y-4">
            {ex.source_text && (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Исходная фраза: <strong>{ex.source_text}</strong>
              </div>
            )}

            <div className="min-h-14 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              {selectedTiles.length === 0 ? (
                <span className="text-xs text-slate-400">
                  Нажимайте на кубики слов ниже, чтобы собрать предложение...
                </span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedTiles.map((bankIdx, pos) => (
                    <button
                      key={`${bankIdx}-${pos}`}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() => setSelectedTiles((prev) => prev.filter((_, i) => i !== pos))}
                      lang={unit.course}
                      className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-bold text-white"
                    >
                      {ex.bank[bankIdx]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {ex.bank.map((word, idx) => {
                const used = selectedTiles.includes(idx);
                return (
                  <button
                    key={`${word}-${idx}`}
                    type="button"
                    disabled={used || Boolean(feedback)}
                    onClick={() => setSelectedTiles((prev) => [...prev, idx])}
                    lang={unit.course}
                    className={`rounded-lg border px-3.5 py-2 text-sm font-bold transition ${
                      used
                        ? 'border-slate-200 bg-slate-100 text-slate-400 opacity-40 dark:border-slate-800 dark:bg-slate-800'
                        : 'border-slate-300 bg-white hover:border-sky-500 dark:border-slate-700 dark:bg-slate-800'
                    }`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. type_answer, listen_type, fix_bug */}
        {(ex.type === 'type_answer' || ex.type === 'listen_type' || ex.type === 'fix_bug') && (
          <div className="mt-5 space-y-4">
            {ex.type === 'listen_type' && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    void playReferenceAudio({
                      text: ex.transcript,
                      course: unit.course,
                      audioRelPath: ex.audio,
                    })
                  }
                  className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700"
                >
                  🔊 Прослушать аудио
                </button>
              </div>
            )}

            {ex.type === 'fix_bug' && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-sm dark:border-rose-900 dark:bg-rose-950/40">
                Фраза с ошибкой:{' '}
                <strong lang={unit.course} className="line-through">
                  {ex.buggy_text}
                </strong>
              </div>
            )}

            <div>
              <input
                type="text"
                lang={unit.course}
                disabled={Boolean(feedback)}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={
                  unit.course === 'tr'
                    ? 'Введите ответ по-турецки...'
                    : 'Введите ответ по-английски...'
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base font-medium dark:border-slate-700 dark:bg-slate-950"
              />

              {unit.course === 'tr' && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['ç', 'ğ', 'ı', 'İ', 'ö', 'ş', 'ü'].map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() => setTextInput((prev) => `${prev}${ch}`)}
                      className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-bold hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800"
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. match_pairs */}
        {ex.type === 'match_pairs' && (
          <div className="mt-5 space-y-3">
            <p className="text-xs text-slate-500">
              Выберите элемент слева, затем нажмите подходящую пару справа:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                {ex.pairs.map((p, idx) => {
                  const done = completedPairs.includes(idx);
                  const active = matchedLeftIndex === idx;
                  return (
                    <button
                      key={`left-${p.left}-${idx}`}
                      type="button"
                      disabled={done || Boolean(feedback)}
                      onClick={() => setMatchedLeftIndex(idx)}
                      lang={unit.course}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-bold ${
                        done
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 opacity-60 dark:border-emerald-800 dark:bg-emerald-950'
                          : active
                            ? 'border-sky-600 bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-200'
                            : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {done ? `✓ ${p.left}` : p.left}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                {ex.pairs.map((p, idx) => {
                  const done = completedPairs.includes(idx);
                  return (
                    <button
                      key={`right-${p.right}-${idx}`}
                      type="button"
                      disabled={done || Boolean(feedback)}
                      onClick={() => {
                        if (matchedLeftIndex === idx) {
                          setCompletedPairs((prev) => [...prev, idx]);
                          setMatchedLeftIndex(null);
                        } else if (matchedLeftIndex !== null) {
                          setMatchedLeftIndex(null);
                        }
                      }}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-medium ${
                        done
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 opacity-60 dark:border-emerald-800 dark:bg-emerald-950'
                          : 'border-slate-200 hover:border-sky-400 dark:border-slate-800'
                      }`}
                    >
                      {done ? `✓ ${p.right}` : p.right}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 8. order_items */}
        {ex.type === 'order_items' && (
          <div className="mt-5 space-y-2">
            <p className="text-xs text-slate-500">
              Используйте кнопки ↑ и ↓, чтобы выставить правильный порядок:
            </p>
            {orderedList.map((item, idx) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <span lang={unit.course} className="text-sm font-bold">
                  {idx + 1}. {item}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={idx === 0 || Boolean(feedback)}
                    onClick={() => {
                      setOrderedList((prev) => {
                        const copy = [...prev];
                        const tmp = copy[idx - 1]!;
                        copy[idx - 1] = copy[idx]!;
                        copy[idx] = tmp;
                        return copy;
                      });
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={idx === orderedList.length - 1 || Boolean(feedback)}
                    onClick={() => {
                      setOrderedList((prev) => {
                        const copy = [...prev];
                        const tmp = copy[idx + 1]!;
                        copy[idx + 1] = copy[idx]!;
                        copy[idx] = tmp;
                        return copy;
                      });
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 9. read_comprehension */}
        {ex.type === 'read_comprehension' && (
          <div className="mt-5 space-y-4">
            <div
              lang={unit.course}
              className="whitespace-pre-line rounded-xl border border-slate-200 bg-slate-50 p-4 text-base font-semibold leading-relaxed dark:border-slate-800 dark:bg-slate-800/50"
            >
              {ex.passage}
            </div>

            {ex.questions.map((q, qIdx) => (
              <div key={q.question_ru} className="space-y-2">
                <div className="text-sm font-bold">{q.question_ru}</div>
                {q.options && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt, optIdx) => (
                      <button
                        key={opt}
                        type="button"
                        disabled={Boolean(feedback)}
                        onClick={() => setReadingAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))}
                        className={`rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold ${
                          readingAnswers[qIdx] === optIdx
                            ? 'border-sky-600 bg-sky-50 text-sky-950 dark:bg-sky-950 dark:text-sky-100'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom check & feedback panel */}
      <footer className="space-y-3">
        {feedback && (
          <div
            role="status"
            className={`rounded-2xl border p-4 ${
              feedback.status === 'correct'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-100'
                : feedback.status === 'almost_correct'
                  ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-100'
                  : 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/70 dark:text-rose-100'
            }`}
          >
            <div className="text-base font-extrabold">{feedback.title}</div>
            {feedback.detail && <div className="mt-1 text-sm font-semibold">{feedback.detail}</div>}
            {feedback.explain && (
              <div className="mt-1 text-xs opacity-90">Пояснение: {feedback.explain}</div>
            )}
          </div>
        )}

        {!feedback ? (
          <button
            type="button"
            onClick={handleCheckAnswer}
            className="w-full rounded-2xl bg-sky-600 py-3.5 text-base font-extrabold text-white hover:bg-sky-700"
          >
            Проверить
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleNext()}
            className="w-full rounded-2xl bg-emerald-600 py-3.5 text-base font-extrabold text-white hover:bg-emerald-700"
          >
            {currentIndex + 1 < exercises.length ? 'Далее →' : 'Завершить урок и получить XP →'}
          </button>
        )}
      </footer>

      {/* Report an issue modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="text-lg font-bold">Сообщить об ошибке в упражнении</h2>
            <p className="mt-1 text-xs text-slate-500">
              Упражнение: <code>{ex.id}</code>
            </p>
            <form onSubmit={(e) => void handleSubmitReport(e)} className="mt-4 space-y-3">
              <textarea
                required
                minLength={3}
                rows={3}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Опишите опечатку или неточность..."
                className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              {reportStatus && (
                <p className="text-xs font-semibold text-emerald-600">{reportStatus}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white"
                >
                  Отправить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
