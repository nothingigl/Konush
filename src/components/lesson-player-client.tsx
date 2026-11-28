'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { playReferenceAudio, stopReferenceAudio } from '@/lib/audio/speech';
import { getCharacterPersona } from '@/lib/content/characters';
import { checkTypedAnswer } from '@/lib/content/normalize';
import type { Exercise, Unit } from '@/lib/content/schema';
import type { SkillKey } from '@/lib/db/dexie';
import { useAppState } from './providers/app-provider';

const SKILL_META: Array<{ key: SkillKey; emoji: string; shortRu: string }> = [
  { key: 'writing', emoji: '✍️', shortRu: 'Письмо' },
  { key: 'listening', emoji: '🎧', shortRu: 'Слух' },
  { key: 'speaking', emoji: '🗣', shortRu: 'Речь' },
  { key: 'reading', emoji: '📖', shortRu: 'Чтение' },
];

const SKILL_TITLES: Record<SkillKey, string> = {
  speaking: '🗣 Говорение',
  listening: '🎧 Слушание',
  writing: '✍️ Письмо',
  reading: '📖 Чтение',
};

const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function LessonPlayerClient({
  unit,
  skill,
  embeddedOnHome = false,
  onSelectSkill,
  onContinueNext,
}: {
  unit: Unit;
  skill: SkillKey;
  embeddedOnHome?: boolean;
  onSelectSkill?: (skill: SkillKey) => void;
  onContinueNext?: () => void;
}) {
  const { profile, unitProgressMap, completeSkillSession, submitFeedback } = useAppState();
  const speechRate = profile.speechRate;
  const exercises = unit.skills[skill].exercises;
  const persona = getCharacterPersona(unit.character);
  const unitProgress = unitProgressMap[unit.id];

  useEffect(() => {
    return () => {
      stopReferenceAudio();
    };
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
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
  const isTr = unit.course === 'tr';

  const getSkillDone = (sk: SkillKey): boolean => {
    if (!unitProgress) return false;
    switch (sk) {
      case 'speaking':
        return unitProgress.speakingBest !== null;
      case 'listening':
        return unitProgress.listeningBest !== null;
      case 'writing':
        return unitProgress.writingBest !== null;
      case 'reading':
        return unitProgress.readingBest !== null;
    }
  };

  if (!currentExercise && !finished) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
        <div className="text-4xl">🚧</div>
        <h1 className="text-xl font-black">В этом навыке пока нет упражнений</h1>
        <Link
          href={`/${unit.course}`}
          className="btn-3d rounded-2xl border-b-4 border-sky-700 bg-sky-500 px-5 py-3 text-sm font-black text-white hover:bg-sky-600"
        >
          🗺 Открыть карту курса
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

  const canCheck = (() => {
    if (!currentExercise || feedback) return false;
    switch (currentExercise.type) {
      case 'word_card':
      case 'order_items':
        return true;
      case 'speak_repeat':
        return speakSelfGrade !== null;
      case 'multiple_choice':
      case 'listen_choose':
      case 'odd_one_out':
        return selectedChoice !== null;
      case 'match_pairs':
        return completedPairs.length >= currentExercise.pairs.length;
      case 'build_sentence':
        return selectedTiles.length > 0;
      case 'type_answer':
      case 'listen_type':
      case 'fix_bug':
        return textInput.trim().length > 0;
      case 'read_comprehension':
        return currentExercise.questions.every((_, qIdx) => readingAnswers[qIdx] !== undefined);
    }
  })();

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
        detail = speakSelfGrade === 'retry' ? 'Отличная практика — повтори ещё раз вслух!' : null;
        break;
      }
      case 'multiple_choice':
      case 'listen_choose': {
        if (selectedChoice === null) return;
        status = selectedChoice === ex.correct_index ? 'correct' : 'incorrect';
        if (status === 'incorrect') {
          detail = `Правильно: ${ex.options[ex.correct_index]}`;
        }
        break;
      }
      case 'odd_one_out': {
        if (selectedChoice === null) return;
        status = selectedChoice === ex.odd_index ? 'correct' : 'incorrect';
        if (status === 'incorrect') {
          detail = `Лишнее: ${ex.items[ex.odd_index]}`;
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
              ? `Правильно: ${ex.accepted[0]}`
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
              ? `Правильно: ${ex.accepted[0]}`
              : null;
        break;
      }
      case 'order_items': {
        const isExactOrder =
          orderedList.length === ex.correct_order.length &&
          orderedList.every((item, idx) => item === ex.correct_order[idx]);
        status = isExactOrder ? 'correct' : 'incorrect';
        if (!isExactOrder) {
          detail = `${ex.correct_order.join(' → ')}`;
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
      setCombo((prev) => prev + 1);
    } else {
      setCombo(0);
    }

    const title =
      status === 'correct' ? '🎉 Супер!' : status === 'almost_correct' ? '✨ Почти!' : '💡 Запомни';

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
      stopReferenceAudio();
      setReadingAnswers({});
      setFeedback(null);
      setRecordedAudioUrl(null);
      setIsRecording(false);
      setOrderedList(nextExercise?.type === 'order_items' ? [...nextExercise.items_shuffled] : []);
      setCurrentIndex(nextIdx);
      return;
    }

    stopReferenceAudio();

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
    setReportStatus('Спасибо! Отправлено.');
    setReportText('');
    setTimeout(() => {
      setShowReportModal(false);
      setReportStatus(null);
    }, 1300);
  };

  if (finished) {
    const accuracy =
      exercises.length > 0 ? Math.round((correctCount / exercises.length) * 100) : 100;
    return (
      <main className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-10 text-center">
        <div className="animate-float flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 text-5xl shadow-lg shadow-orange-500/25">
          🏆
        </div>

        <div>
          <h1 className="text-3xl font-black tracking-tight">Урок пройден!</h1>
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
            {unit.title_ru} · {SKILL_TITLES[skill]}
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100/70 p-4 dark:border-amber-700/70 dark:from-amber-950/70 dark:to-amber-950/40">
            <div className="text-xs font-extrabold uppercase text-amber-700 dark:text-amber-300">
              Опыт
            </div>
            <div className="mt-1 text-3xl font-black text-amber-600 dark:text-amber-300">
              +10 ⚡
            </div>
          </div>
          <div className="rounded-3xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50 to-emerald-100/70 p-4 dark:border-emerald-700/70 dark:from-emerald-950/70 dark:to-emerald-950/40">
            <div className="text-xs font-extrabold uppercase text-emerald-700 dark:text-emerald-300">
              Точность
            </div>
            <div className="mt-1 text-3xl font-black text-emerald-600 dark:text-emerald-300">
              {accuracy}%
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2.5 pt-2">
          {onContinueNext ? (
            <button
              type="button"
              onClick={onContinueNext}
              className="btn-3d w-full rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 py-3.5 text-base font-black text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600"
            >
              Следующий раунд →
            </button>
          ) : (
            <Link
              href={`/${unit.course}/units/${unit.slug}`}
              className="btn-3d w-full rounded-2xl border-b-4 border-sky-700 bg-sky-500 py-3.5 text-center text-base font-black text-white shadow-md shadow-sky-500/20 hover:bg-sky-600"
            >
              К навыкам юнита →
            </Link>
          )}
          <Link
            href={`/${unit.course}`}
            className="btn-3d w-full rounded-2xl border-2 border-b-4 border-slate-200 bg-white py-3 text-center text-sm font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
          >
            🗺 Карта курса
          </Link>
        </div>
      </main>
    );
  }

  const ex = currentExercise!;
  const progressPct = Math.max(
    6,
    Math.round(((currentIndex + (feedback ? 1 : 0)) / exercises.length) * 100),
  );

  return (
    <main
      className={`mx-auto flex w-full max-w-xl flex-col justify-between px-3 sm:px-4 ${
        embeddedOnHome ? 'min-h-[calc(100vh-8.5rem)] py-3 sm:py-4' : 'min-h-screen py-4 sm:py-6'
      }`}
    >
      {/* Top compact game bar */}
      <header className="space-y-2.5">
        {embeddedOnHome ? (
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/${unit.course}`}
              className="btn-3d inline-flex min-w-0 items-center gap-1.5 rounded-xl border border-b-2 border-slate-200 bg-white px-2.5 py-1.5 text-xs font-extrabold text-slate-800 hover:border-sky-400 dark:border-slate-700/80 dark:bg-[#131b2e] dark:text-slate-100"
            >
              <span>🗺</span>
              <span className="truncate">
                {unit.section}.{unit.order} {unit.title_ru}
              </span>
            </Link>

            {onSelectSkill && (
              <div className="flex shrink-0 items-center gap-1" role="tablist" aria-label="Навыки">
                {SKILL_META.map((item) => {
                  const active = item.key === skill;
                  const done = getSkillDone(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      title={item.shortRu}
                      onClick={() => onSelectSkill(item.key)}
                      className={`btn-3d relative flex h-8 w-8 items-center justify-center rounded-xl border border-b-2 text-sm transition ${
                        active
                          ? isTr
                            ? 'border-sky-600 bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                            : 'border-violet-600 bg-violet-500 text-white shadow-sm shadow-violet-500/30'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#131b2e] dark:text-slate-200'
                      }`}
                    >
                      <span>{item.emoji}</span>
                      {done && !active && (
                        <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/${unit.course}/units/${unit.slug}`}
              aria-label="Выйти из урока"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200/70 text-sm font-black text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            >
              ✕
            </Link>
            <div className="truncate text-xs font-extrabold text-slate-600 dark:text-slate-300">
              {unit.title_ru} · {SKILL_TITLES[skill]}
            </div>
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              aria-label="Сообщить об ошибке"
              title="Сообщить об ошибке"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-xs text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              🚩
            </button>
          </div>
        )}

        {/* Animated Gradient Progress Bar + Combo */}
        <div className="flex items-center gap-2.5">
          <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-slate-200/90 p-0.5 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isTr
                  ? 'bg-gradient-to-r from-cyan-400 via-sky-500 to-emerald-400'
                  : 'bg-gradient-to-r from-indigo-400 via-violet-500 to-fuchsia-400'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <span className="shrink-0 text-xs font-black tabular-nums text-slate-500 dark:text-slate-400">
            {currentIndex + 1}/{exercises.length}
          </span>

          {combo >= 2 && (
            <span className="animate-pop shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 text-[11px] font-black text-white shadow-sm">
              🔥 x{combo}
            </span>
          )}

          {embeddedOnHome && (
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              aria-label="Сообщить об ошибке"
              title="Сообщить об ошибке"
              className="shrink-0 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              🚩
            </button>
          )}
        </div>
      </header>

      {/* Main Playful Exercise Stage */}
      <section className="my-4 flex-1">
        {/* Mentor Speech Bubble */}
        <div className="mb-4 flex items-center gap-3">
          <div className="shrink-0 rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 p-1 shadow-xs dark:from-sky-950/80 dark:to-indigo-950/80">
            <Image
              src={persona.avatar}
              alt={persona.name_ru}
              width={48}
              height={48}
              className="rounded-xl"
            />
          </div>
          <div className="relative flex-1 rounded-2xl border-2 border-slate-200/90 bg-white px-4 py-2.5 shadow-xs dark:border-slate-700/80 dark:bg-[#131b2e]">
            <h1 className="text-base font-extrabold leading-snug sm:text-lg">{ex.prompt_ru}</h1>
          </div>
        </div>

        {/* Exercise Interactive Card */}
        <div className="rounded-3xl border-2 border-slate-200/80 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-[#131b2e]">
          {/* 1. word_card */}
          {ex.type === 'word_card' && (
            <div className="space-y-4 rounded-2xl bg-gradient-to-br from-sky-50 via-cyan-50 to-indigo-50 p-6 text-center dark:from-sky-950/50 dark:via-slate-900 dark:to-indigo-950/50">
              <div
                lang={unit.course}
                className="text-4xl font-black tracking-tight text-sky-700 dark:text-sky-300"
              >
                {ex.target_text}
              </div>
              <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                {ex.translation_ru}
              </div>
              {ex.example_text && (
                <div className="rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                  <span lang={unit.course} className="font-bold text-slate-900 dark:text-white">
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
                    rate: speechRate,
                  })
                }
                className="btn-3d inline-flex items-center gap-2 rounded-2xl border-b-4 border-sky-700 bg-sky-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-sky-500/25 hover:bg-sky-600"
              >
                <span className="text-lg">🔊</span>
                <span>Слушать</span>
              </button>
            </div>
          )}

          {/* 2. speak_repeat */}
          {ex.type === 'speak_repeat' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-rose-50 via-orange-50/70 to-amber-50 p-5 text-center dark:from-rose-950/40 dark:via-slate-900 dark:to-amber-950/30">
                <div
                  lang={unit.course}
                  className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white"
                >
                  {ex.target_text}
                </div>
                {ex.translation_ru && (
                  <div className="mt-1.5 text-sm font-bold text-slate-500 dark:text-slate-400">
                    {ex.translation_ru}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      void playReferenceAudio({
                        text: ex.target_text,
                        course: unit.course,
                        audioRelPath: ex.audio,
                        rate: speechRate,
                      })
                    }
                    className="btn-3d inline-flex items-center gap-2 rounded-2xl border-b-4 border-sky-700 bg-sky-500 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-sky-500/20 hover:bg-sky-600"
                  >
                    <span>🔊</span>
                    <span>Слушать</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleToggleRecording()}
                    className={`btn-3d inline-flex items-center gap-2 rounded-2xl border-2 border-b-4 px-4 py-2.5 text-sm font-black ${
                      isRecording
                        ? 'border-rose-700 bg-rose-500 text-white'
                        : 'border-slate-200 border-b-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <span>{isRecording ? '⏹' : '🎙'}</span>
                    <span>{isRecording ? 'Стоп' : 'Запись'}</span>
                  </button>
                </div>

                {recordedAudioUrl && (
                  <audio controls src={recordedAudioUrl} className="mt-4 h-9 w-full" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={Boolean(feedback)}
                  onClick={() => setSpeakSelfGrade('ok')}
                  className={`btn-3d rounded-2xl border-2 border-b-4 py-3 text-sm font-black ${
                    speakSelfGrade === 'ok'
                      ? 'border-emerald-600 bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : 'border-slate-200 border-b-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200'
                  }`}
                >
                  👍 Получилось
                </button>
                <button
                  type="button"
                  disabled={Boolean(feedback)}
                  onClick={() => setSpeakSelfGrade('retry')}
                  className={`btn-3d rounded-2xl border-2 border-b-4 py-3 text-sm font-black ${
                    speakSelfGrade === 'retry'
                      ? 'border-amber-600 bg-amber-500 text-white shadow-md shadow-amber-500/20'
                      : 'border-slate-200 border-b-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200'
                  }`}
                >
                  🔁 Ещё раз
                </button>
              </div>
            </div>
          )}

          {/* 3. listen_choose & multiple_choice */}
          {(ex.type === 'listen_choose' || ex.type === 'multiple_choice') && (
            <div className="space-y-4">
              {ex.type === 'listen_choose' ? (
                <div className="flex items-center justify-center gap-3 py-2">
                  <button
                    type="button"
                    onClick={() =>
                      void playReferenceAudio({
                        text: ex.transcript,
                        course: unit.course,
                        audioRelPath: ex.audio,
                        rate: speechRate,
                      })
                    }
                    className="btn-3d flex h-16 items-center gap-2.5 rounded-2xl border-b-4 border-sky-700 bg-gradient-to-b from-sky-400 to-sky-500 px-6 text-base font-black text-white shadow-lg shadow-sky-500/30 hover:brightness-105"
                  >
                    <span className="text-2xl">🔊</span>
                    <span>Слушать</span>
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
                    title="Медленно"
                    className="btn-3d flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-50 text-2xl hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                  >
                    🐢
                  </button>
                </div>
              ) : (
                ex.question_text && (
                  <div
                    lang={unit.course}
                    className="rounded-2xl bg-slate-100/90 px-4 py-3.5 text-center text-xl font-black text-slate-900 dark:bg-slate-800/80 dark:text-white"
                  >
                    {ex.question_text}
                  </div>
                )
              )}

              <div className="grid gap-2.5">
                {ex.options.map((opt, idx) => {
                  const isSelected = selectedChoice === idx;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() => setSelectedChoice(idx)}
                      className={`btn-3d flex items-center gap-3 rounded-2xl border-2 border-b-4 px-3.5 py-3 text-left text-sm font-extrabold transition ${
                        isSelected
                          ? 'border-sky-500 border-b-sky-600 bg-sky-50 text-sky-950 dark:bg-sky-950/70 dark:text-sky-100'
                          : 'border-slate-200 border-b-slate-300 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:border-b-slate-900 dark:bg-slate-800/60 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                          isSelected
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {CHOICE_LETTERS[idx] ?? idx + 1}
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. odd_one_out */}
          {ex.type === 'odd_one_out' && (
            <div className="grid grid-cols-2 gap-3">
              {ex.items.map((item, idx) => {
                const isSelected = selectedChoice === idx;
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={Boolean(feedback)}
                    onClick={() => setSelectedChoice(idx)}
                    lang={unit.course}
                    className={`btn-3d rounded-2xl border-2 border-b-4 p-4 text-center text-base font-black transition ${
                      isSelected
                        ? 'border-sky-500 border-b-sky-600 bg-sky-50 text-sky-950 dark:bg-sky-950/70 dark:text-sky-100'
                        : 'border-slate-200 border-b-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:border-b-slate-900 dark:bg-slate-800/60'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          )}

          {/* 5. build_sentence ("Кубики") */}
          {ex.type === 'build_sentence' && (
            <div className="space-y-4">
              {ex.source_text && (
                <div className="rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 px-4 py-3 text-center text-base font-black text-slate-800 dark:from-sky-950/50 dark:to-indigo-950/50 dark:text-slate-100">
                  {ex.source_text}
                </div>
              )}

              <div className="min-h-16 rounded-2xl border-2 border-dashed border-sky-300/80 bg-slate-50/80 p-3 dark:border-sky-800/70 dark:bg-slate-900/60">
                {selectedTiles.length === 0 ? (
                  <div className="flex h-10 items-center justify-center text-xs font-bold text-slate-400">
                    Нажимай на слова ниже ✨
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedTiles.map((bankIdx, pos) => (
                      <button
                        key={`${bankIdx}-${pos}`}
                        type="button"
                        disabled={Boolean(feedback)}
                        onClick={() => setSelectedTiles((prev) => prev.filter((_, i) => i !== pos))}
                        lang={unit.course}
                        className="btn-3d animate-pop rounded-xl border-b-4 border-sky-700 bg-sky-500 px-3.5 py-2 text-sm font-black text-white shadow-xs"
                      >
                        {ex.bank[bankIdx]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {ex.bank.map((word, idx) => {
                  const used = selectedTiles.includes(idx);
                  return (
                    <button
                      key={`${word}-${idx}`}
                      type="button"
                      disabled={used || Boolean(feedback)}
                      onClick={() => setSelectedTiles((prev) => [...prev, idx])}
                      lang={unit.course}
                      className={`btn-3d rounded-xl border-2 border-b-4 px-4 py-2 text-sm font-extrabold transition ${
                        used
                          ? 'border-slate-200 bg-slate-100 text-transparent dark:border-slate-800 dark:bg-slate-800/50'
                          : 'border-slate-200 border-b-slate-300 bg-white text-slate-800 hover:border-sky-400 dark:border-slate-700 dark:border-b-slate-900 dark:bg-slate-800 dark:text-slate-100'
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
            <div className="space-y-4">
              {ex.type === 'listen_type' && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      void playReferenceAudio({
                        text: ex.transcript,
                        course: unit.course,
                        audioRelPath: ex.audio,
                        rate: speechRate,
                      })
                    }
                    className="btn-3d inline-flex items-center gap-2 rounded-2xl border-b-4 border-sky-700 bg-sky-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-sky-500/25"
                  >
                    <span className="text-lg">🔊</span>
                    <span>Слушать</span>
                  </button>
                </div>
              )}

              {ex.type === 'fix_bug' && (
                <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/80 px-4 py-3 text-center text-base font-extrabold text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200">
                  <span className="mr-2">🐛</span>
                  <span lang={unit.course} className="line-through decoration-2">
                    {ex.buggy_text}
                  </span>
                </div>
              )}

              <div>
                <input
                  type="text"
                  lang={unit.course}
                  disabled={Boolean(feedback)}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canCheck && !feedback) {
                      handleCheckAnswer();
                    }
                  }}
                  placeholder={isTr ? 'Введи по-турецки...' : 'Введи по-английски...'}
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold focus:border-sky-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:focus:border-sky-400"
                />

                {isTr && (
                  <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                    {['ç', 'ğ', 'ı', 'İ', 'ö', 'ş', 'ü'].map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        disabled={Boolean(feedback)}
                        onClick={() => setTextInput((prev) => `${prev}${ch}`)}
                        className="btn-3d rounded-xl border border-b-2 border-slate-200 border-b-slate-300 bg-white px-3 py-1.5 text-sm font-black hover:border-sky-400 dark:border-slate-700 dark:border-b-slate-900 dark:bg-slate-800"
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2.5">
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
                      className={`btn-3d w-full rounded-2xl border-2 border-b-4 px-3 py-3 text-center text-sm font-black transition ${
                        done
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 opacity-55 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : active
                            ? 'border-sky-500 border-b-sky-600 bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-200'
                            : 'border-slate-200 border-b-slate-300 bg-white dark:border-slate-700 dark:border-b-slate-900 dark:bg-slate-800/70'
                      }`}
                    >
                      {done ? `✓ ${p.left}` : p.left}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2.5">
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
                      className={`btn-3d w-full rounded-2xl border-2 border-b-4 px-3 py-3 text-center text-sm font-bold transition ${
                        done
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 opacity-55 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'border-slate-200 border-b-slate-300 bg-white hover:border-sky-400 dark:border-slate-700 dark:border-b-slate-900 dark:bg-slate-800/70'
                      }`}
                    >
                      {done ? `✓ ${p.right}` : p.right}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 8. order_items */}
          {ex.type === 'order_items' && (
            <div className="space-y-2">
              {orderedList.map((item, idx) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-2xl border-2 border-slate-200 bg-slate-50/80 px-3.5 py-2.5 dark:border-slate-700/80 dark:bg-slate-800/60"
                >
                  <span lang={unit.course} className="text-sm font-extrabold">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-xs font-black text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                      {idx + 1}
                    </span>
                    {item}
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
                      className="btn-3d rounded-xl border border-b-2 border-slate-300 bg-white px-2.5 py-1 text-xs font-black disabled:opacity-35 dark:border-slate-600 dark:bg-slate-900"
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
                      className="btn-3d rounded-xl border border-b-2 border-slate-300 bg-white px-2.5 py-1 text-xs font-black disabled:opacity-35 dark:border-slate-600 dark:bg-slate-900"
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
            <div className="space-y-4">
              <div className="space-y-3 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-sky-50/70 p-4 dark:from-emerald-950/30 dark:to-sky-950/30">
                <div
                  lang={unit.course}
                  className="whitespace-pre-line text-base font-bold leading-relaxed"
                >
                  {ex.passage}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void playReferenceAudio({
                      text: ex.passage,
                      course: unit.course,
                      audioRelPath: ex.audio,
                      rate: speechRate,
                    })
                  }
                  className="btn-3d inline-flex items-center gap-1.5 rounded-xl border border-b-2 border-sky-300 bg-white px-3 py-1.5 text-xs font-extrabold text-sky-700 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-300"
                >
                  🔊 Слушать
                </button>
              </div>

              {ex.questions.map((q, qIdx) => (
                <div key={q.question_ru} className="space-y-2">
                  <div className="text-sm font-extrabold">{q.question_ru}</div>
                  {q.options && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {q.options.map((opt, optIdx) => (
                        <button
                          key={opt}
                          type="button"
                          disabled={Boolean(feedback)}
                          onClick={() => setReadingAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))}
                          className={`btn-3d rounded-xl border-2 border-b-4 px-3.5 py-2.5 text-left text-xs font-extrabold ${
                            readingAnswers[qIdx] === optIdx
                              ? 'border-sky-500 border-b-sky-600 bg-sky-50 text-sky-950 dark:bg-sky-950 dark:text-sky-100'
                              : 'border-slate-200 border-b-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800/70'
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
        </div>
      </section>

      {/* Bottom Check & Feedback Action Bar */}
      <footer className="space-y-3 pt-1">
        {feedback && (
          <div
            role="status"
            className={`animate-pop rounded-2xl border-2 p-3.5 ${
              feedback.status === 'correct'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-100'
                : feedback.status === 'almost_correct'
                  ? 'border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-100'
                  : 'border-rose-400 bg-rose-50 text-rose-950 dark:border-rose-700 dark:bg-rose-950/70 dark:text-rose-100'
            }`}
          >
            <div className="text-base font-black">{feedback.title}</div>
            {feedback.detail && <div className="mt-0.5 text-sm font-bold">{feedback.detail}</div>}
            {feedback.explain && (
              <div className="mt-0.5 text-xs font-medium opacity-85">{feedback.explain}</div>
            )}
          </div>
        )}

        {!feedback ? (
          <button
            type="button"
            disabled={!canCheck}
            onClick={handleCheckAnswer}
            className={`btn-3d w-full rounded-2xl border-b-4 py-3.5 text-base font-black tracking-wide transition ${
              canCheck
                ? isTr
                  ? 'border-sky-700 bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/25 hover:brightness-105'
                  : 'border-violet-700 bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-violet-500/25 hover:brightness-105'
                : 'cursor-not-allowed border-slate-300 bg-slate-200 text-slate-400 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-500'
            }`}
          >
            Проверить
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleNext()}
            className={`btn-3d w-full rounded-2xl border-b-4 py-3.5 text-base font-black text-white shadow-lg transition ${
              feedback.status === 'incorrect'
                ? 'border-rose-700 bg-rose-500 shadow-rose-500/25 hover:bg-rose-600'
                : 'border-emerald-700 bg-emerald-500 shadow-emerald-500/25 hover:bg-emerald-600'
            }`}
          >
            {currentIndex + 1 < exercises.length ? 'Дальше →' : 'Забрать +10 XP ⚡'}
          </button>
        )}
      </footer>

      {/* Report an issue modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="animate-pop w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#131b2e]">
            <h2 className="text-lg font-black">🚩 Сообщить об ошибке</h2>
            <p className="mt-1 text-xs text-slate-500">
              Задание: <code>{ex.id}</code>
            </p>
            <form onSubmit={(e) => void handleSubmitReport(e)} className="mt-4 space-y-3">
              <textarea
                required
                minLength={3}
                rows={3}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Что нужно поправить?"
                className="w-full rounded-2xl border-2 border-slate-200 p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              {reportStatus && <p className="text-xs font-bold text-emerald-600">{reportStatus}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold dark:border-slate-700"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn-3d rounded-xl border-b-2 border-sky-700 bg-sky-500 px-4 py-2 text-xs font-black text-white"
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
