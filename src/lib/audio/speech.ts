'use client';

import type { CourseId } from '../content/schema';

/**
 * Plays reference audio for a word or exercise:
 * 1. If `audioRelPath` is provided, tries to play `/audio/${audioRelPath}`.
 * 2. If the MP3 file does not exist yet (before Stage 5 TTS generation) or fails to load,
 *    falls back to the browser's native Web Speech API (`speechSynthesis`) with `tr-TR` or `en-US`.
 */
export async function playReferenceAudio(params: {
  text: string;
  course: CourseId;
  audioRelPath?: string | null;
  rate?: number;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const rate = params.rate ?? 1.0;

  if (params.audioRelPath) {
    try {
      const audio = new Audio(`/audio/${params.audioRelPath}`);
      audio.playbackRate = rate;
      await audio.play();
      return;
    } catch {
      // Fallback to Web Speech API below
    }
  }

  if ('speechSynthesis' in window && params.text.trim()) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(params.text);
      utterance.lang = params.course === 'tr' ? 'tr-TR' : 'en-US';
      utterance.rate = rate;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synthesis errors on unsupported platforms
    }
  }
}
