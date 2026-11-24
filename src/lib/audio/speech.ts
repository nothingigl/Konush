'use client';

import type { CourseId } from '../content/schema';

let activeAudio: HTMLAudioElement | null = null;

function clampRate(rate: number | undefined): number {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) return 1.0;
  return Math.min(2.0, Math.max(0.5, rate));
}

/**
 * Stops any currently playing reference MP3 or browser Web Speech utterance.
 * Safe to call on exercise transitions and component unmount.
 */
export function stopReferenceAudio(): void {
  if (typeof window === 'undefined') return;

  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {
      // Ignore media cleanup errors
    }
    activeAudio = null;
  }

  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore speech synthesis errors on unsupported platforms
    }
  }
}

/**
 * Plays reference audio for a word or exercise:
 * 1. Cancels any currently playing audio so overlapping clicks never clash.
 * 2. If `audioRelPath` is provided, tries to play `/audio/${audioRelPath}` (works offline once cached).
 * 3. If the MP3 does not exist yet or fails to play (e.g. offline uncached), falls back to the
 *    browser's native Web Speech API (`speechSynthesis`) with `tr-TR` or `en-US`.
 * Must be invoked from a direct user gesture (click/tap) for iOS Safari compatibility.
 */
export async function playReferenceAudio(params: {
  text: string;
  course: CourseId;
  audioRelPath?: string | null;
  rate?: number;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  stopReferenceAudio();
  const rate = clampRate(params.rate);

  if (params.audioRelPath) {
    try {
      const audio = new Audio(`/audio/${params.audioRelPath}`);
      audio.preload = 'auto';
      audio.playbackRate = rate;
      activeAudio = audio;
      audio.addEventListener(
        'ended',
        () => {
          if (activeAudio === audio) activeAudio = null;
        },
        { once: true },
      );
      await audio.play();
      return;
    } catch {
      activeAudio = null;
      // Fallback to Web Speech API below
    }
  }

  if ('speechSynthesis' in window && params.text.trim()) {
    try {
      const utterance = new SpeechSynthesisUtterance(params.text);
      utterance.lang = params.course === 'tr' ? 'tr-TR' : 'en-US';
      utterance.rate = rate;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synthesis errors on unsupported platforms
    }
  }
}
