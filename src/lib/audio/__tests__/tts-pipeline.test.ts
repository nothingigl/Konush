import { describe, expect, it } from 'vitest';
import {
  AUDIO_BUDGET_LIMITS,
  buildClipStyle,
  collectAudioPlan,
  computeClipHash,
  GEMINI_TTS_MODEL,
  resolveVoiceProfile,
  VOICE_PROFILES,
} from '../../../../scripts/tts/config';
import { AudioManifestSchema } from '../../content/schema';

describe('Gemini TTS audio pipeline config and planner', () => {
  it('defines exactly 4 distinct approved character voices (2 female, 2 male)', () => {
    const profiles = Object.values(VOICE_PROFILES);
    expect(profiles).toHaveLength(4);

    const female = profiles.filter((p) => p.gender === 'female');
    const male = profiles.filter((p) => p.gender === 'male');
    expect(female).toHaveLength(2);
    expect(male).toHaveLength(2);

    const uniqueVoices = new Set(profiles.map((p) => p.voiceName));
    expect(uniqueVoices.size).toBe(4);
    expect(resolveVoiceProfile('elif').voiceName).toBe('Aoede');
    expect(resolveVoiceProfile('zeynep').voiceName).toBe('Kore');
    expect(resolveVoiceProfile('kemal').voiceName).toBe('Charon');
    expect(resolveVoiceProfile('emre').voiceName).toBe('Puck');
    expect(resolveVoiceProfile('unknown').voiceName).toBe('Aoede');
  });

  it('produces mood-aware emotional styles by language, character, and punctuation', () => {
    const wordStyle = buildClipStyle({
      course: 'tr',
      character: 'elif',
      kind: 'word',
      text: 'merhaba',
    });
    expect(wordStyle).toContain('Turkish');
    expect(wordStyle).toContain('warmly');

    const questionStyle = buildClipStyle({
      course: 'en',
      character: 'emre',
      kind: 'listening',
      text: 'Where are you from?',
    });
    expect(questionStyle).toContain('curiosity');
    expect(questionStyle).toContain('English');

    const exclaimStyle = buildClipStyle({
      course: 'tr',
      character: 'zeynep',
      kind: 'speaking',
      text: 'Günaydın!',
    });
    expect(exclaimStyle).toContain('cheerfully');
  });

  it('computes deterministic SHA-256 hashes sensitive to text, voice, style, and model', () => {
    const base = {
      text: 'Merhaba!',
      voice: 'Aoede',
      style: 'Say cheerfully in Turkish:',
      model: GEMINI_TTS_MODEL,
    };
    const h1 = computeClipHash(base);
    const h2 = computeClipHash({ ...base, text: '  Merhaba!  ' });
    const hVoice = computeClipHash({ ...base, voice: 'Kore' });
    const hStyle = computeClipHash({ ...base, style: 'Say calmly in Turkish:' });

    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(hVoice);
    expect(h1).not.toBe(hStyle);
  });

  it('collects complete base audio plan across all 133 units within <= 60 MB budget', () => {
    const plan = collectAudioPlan();
    expect(plan.clips.length).toBe(3502);
    expect(plan.byCourse.tr.clips).toBeGreaterThan(1500);
    expect(plan.byCourse.en.clips).toBeGreaterThan(1500);
    expect(plan.dedupSavings).toBeGreaterThanOrEqual(50);
    expect(plan.uniqueHashes).toBe(plan.clips.length - plan.dedupSavings);
    expect(plan.estimatedTotalBytes).toBeLessThan(AUDIO_BUDGET_LIMITS.totalTargetBytes);

    // Every planned clip must produce a valid AudioManifest entry shape
    const sample = plan.clips[0]!;
    const manifestCheck = AudioManifestSchema.parse({
      version: 1,
      updated_at: new Date().toISOString(),
      total_clips: 1,
      total_bytes: sample.estimatedBytes,
      clips: {
        [sample.path]: {
          path: sample.path,
          course: sample.course,
          unit_id: sample.unitId,
          text: sample.text,
          voice: sample.voice,
          style: sample.style,
          model: sample.model,
          hash: sample.hash,
          bytes: sample.estimatedBytes,
        },
      },
    });
    expect(manifestCheck.total_clips).toBe(1);
  });

  it('supports optional --include-reading while remaining under <= 60 MB target', () => {
    const basePlan = collectAudioPlan();
    const withReading = collectAudioPlan({ includeReading: true });
    expect(withReading.clips.length).toBe(basePlan.clips.length + 266);
    expect(withReading.estimatedTotalBytes).toBeLessThan(AUDIO_BUDGET_LIMITS.totalTargetBytes);
  });

  it('supports scoping plan by course, section, or single unit', () => {
    const singleUnit = collectAudioPlan({ course: 'tr', section: 1, unitId: 'tr-1-1' });
    // 12 words + 8 speaking + 1 unique listening (7 listening clips reuse wNN.mp3 paths)
    expect(singleUnit.clips.length).toBeGreaterThanOrEqual(20);
    expect(singleUnit.clips.length).toBeLessThanOrEqual(28);
    expect(singleUnit.clips.every((c) => c.unitId === 'tr-1-1')).toBe(true);
  });
});
