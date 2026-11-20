import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { CourseSchema, UnitSchema, type CourseId, type Unit } from '../../src/lib/content/schema';

export const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
export const DEFAULT_BITRATE = '36k';
export const DEFAULT_RPM = 10;

export const AUDIO_BUDGET_LIMITS = {
  wordMaxBytes: 15 * 1024, // 15 KB per single word clip
  phraseMaxBytes: 40 * 1024, // 40 KB per phrase/sentence clip
  unitMaxBytes: 1.5 * 1024 * 1024, // 1.5 MB per unit
  totalTargetBytes: 60 * 1024 * 1024, // 60 MB target for entire repo
  totalCeilingBytes: 100 * 1024 * 1024, // 100 MB hard ceiling
} as const;

export type CharacterId = 'elif' | 'zeynep' | 'kemal' | 'emre';
export type ClipKind = 'word' | 'speaking' | 'listening' | 'reading';

export interface VoiceProfile {
  character: CharacterId;
  voiceName: string;
  gender: 'female' | 'male';
  displayNameRu: string;
  temperamentPrompt: string;
}

/**
 * Approved 4-voice roster (2 female, 2 male) matching reviews/voices/CANDIDATES.md.
 */
export const VOICE_PROFILES: Record<CharacterId, VoiceProfile> = {
  elif: {
    character: 'elif',
    voiceName: 'Aoede',
    gender: 'female',
    displayNameRu: 'Элиф',
    temperamentPrompt: 'warmly and kindly',
  },
  zeynep: {
    character: 'zeynep',
    voiceName: 'Kore',
    gender: 'female',
    displayNameRu: 'Зейнеп',
    temperamentPrompt: 'brightly and clearly',
  },
  kemal: {
    character: 'kemal',
    voiceName: 'Charon',
    gender: 'male',
    displayNameRu: 'Кемаль',
    temperamentPrompt: 'calmly and steadily',
  },
  emre: {
    character: 'emre',
    voiceName: 'Puck',
    gender: 'male',
    displayNameRu: 'Эмре',
    temperamentPrompt: 'lively and expressively',
  },
};

export function resolveVoiceProfile(character: string): VoiceProfile {
  if (character in VOICE_PROFILES) {
    return VOICE_PROFILES[character as CharacterId];
  }
  return VOICE_PROFILES.elif;
}

/**
 * Generates an emotional TTS instruction tailored to the character, course language, clip kind,
 * and punctuation mood. Stored in `audio-manifest.json` (`style` field) and hashed for idempotency.
 */
export function buildClipStyle(params: {
  course: CourseId;
  character: string;
  kind: ClipKind;
  text: string;
}): string {
  const langName = params.course === 'tr' ? 'Turkish' : 'English';
  const profile = resolveVoiceProfile(params.character);
  const trimmed = params.text.trim();

  if (params.kind === 'word') {
    return `Pronounce this ${langName} vocabulary item clearly and distinctly at a learner-friendly pace (${profile.temperamentPrompt}):`;
  }

  if (params.kind === 'reading') {
    return `Read this short ${langName} passage naturally and clearly (${profile.temperamentPrompt}):`;
  }

  if (trimmed.includes('?')) {
    return `Say with natural curiosity in ${langName} (${profile.temperamentPrompt}):`;
  }

  if (trimmed.includes('!')) {
    return `Say cheerfully and expressively in ${langName} (${profile.temperamentPrompt}):`;
  }

  if (params.kind === 'speaking') {
    return `Say clearly and encouragingly in ${langName} (${profile.temperamentPrompt}):`;
  }

  return `Say naturally in conversational ${langName} (${profile.temperamentPrompt}):`;
}

/**
 * Deterministic SHA-256 hex hash over (text + voice + style + model).
 */
export function computeClipHash(params: {
  text: string;
  voice: string;
  style: string;
  model: string;
}): string {
  const payload = JSON.stringify([params.model, params.voice, params.style, params.text.trim()]);
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

export interface PlannedClip {
  path: string; // e.g. "tr/1-1/w01.mp3"
  course: CourseId;
  section: number;
  unitId: string;
  character: CharacterId;
  kind: ClipKind;
  text: string;
  voice: string;
  style: string;
  model: string;
  hash: string;
  estimatedSeconds: number;
  estimatedBytes: number;
}

export interface AudioPlanFilter {
  course?: CourseId;
  section?: number;
  unitId?: string;
  includeReading?: boolean;
  bitrateKbps?: number;
  contentRootDir?: string;
}

export interface AudioPlanSummary {
  clips: PlannedClip[];
  uniqueHashes: number;
  dedupSavings: number;
  estimatedTotalSeconds: number;
  estimatedTotalBytes: number;
  byCourse: Record<CourseId, { clips: number; estimatedBytes: number }>;
}

/**
 * Estimates spoken duration (seconds) from text length and clip kind.
 * Words average ~1.0s; sentences average ~12 chars/sec with a 1.1s floor.
 */
export function estimateClipDurationSeconds(text: string, kind: ClipKind): number {
  const len = text.trim().length;
  if (kind === 'word') {
    return Math.max(0.9, Math.min(2.4, 0.75 + len * 0.065));
  }
  return Math.max(1.2, 0.6 + len / 13.5);
}

/**
 * Collects the ordered list of all audio clips across selected units (default: all 133 units).
 */
export function collectAudioPlan(filter: AudioPlanFilter = {}): AudioPlanSummary {
  const contentDir = filter.contentRootDir ?? path.join(process.cwd(), 'content', 'courses');
  const bitrateKbps = filter.bitrateKbps ?? 36;
  const bytesPerSecond = (bitrateKbps * 1000) / 8;

  const courses: CourseId[] = filter.course ? [filter.course] : ['tr', 'en'];
  const seenPaths = new Set<string>();
  const clips: PlannedClip[] = [];

  for (const courseId of courses) {
    const coursePath = path.join(contentDir, courseId, 'course.json');
    const course = CourseSchema.parse(JSON.parse(fs.readFileSync(coursePath, 'utf8')));

    for (const sec of course.sections) {
      if (filter.section !== undefined && sec.section !== filter.section) continue;

      for (const uid of sec.unit_ids) {
        if (filter.unitId && uid !== filter.unitId) continue;

        const unitPath = path.join(contentDir, courseId, 'units', `${uid}.json`);
        const unit: Unit = UnitSchema.parse(JSON.parse(fs.readFileSync(unitPath, 'utf8')));
        const voiceProfile = resolveVoiceProfile(unit.character);

        const pushClip = (relPath: string, text: string, kind: ClipKind) => {
          const cleanText = text.trim();
          if (!relPath || !cleanText || seenPaths.has(relPath)) return;
          seenPaths.add(relPath);

          const style = buildClipStyle({
            course: courseId,
            character: voiceProfile.character,
            kind,
            text: cleanText,
          });
          const hash = computeClipHash({
            text: cleanText,
            voice: voiceProfile.voiceName,
            style,
            model: GEMINI_TTS_MODEL,
          });
          const estimatedSeconds = estimateClipDurationSeconds(cleanText, kind);
          const estimatedBytes = Math.round(estimatedSeconds * bytesPerSecond);

          clips.push({
            path: relPath,
            course: courseId,
            section: unit.section,
            unitId: unit.id,
            character: voiceProfile.character,
            kind,
            text: cleanText,
            voice: voiceProfile.voiceName,
            style,
            model: GEMINI_TTS_MODEL,
            hash,
            estimatedSeconds,
            estimatedBytes,
          });
        };

        // 1. Unit vocabulary words
        for (const word of unit.words) {
          pushClip(word.audio, word.text, 'word');
        }

        // 2. Speaking exercises
        for (const ex of unit.skills.speaking.exercises) {
          if (ex.type === 'speak_repeat' && ex.audio) {
            pushClip(ex.audio, ex.target_text, 'speaking');
          }
        }

        // 3. Listening exercises
        for (const ex of unit.skills.listening.exercises) {
          if ((ex.type === 'listen_choose' || ex.type === 'listen_type') && ex.audio) {
            pushClip(ex.audio, ex.transcript, 'listening');
          }
        }

        // 4. Optional reading passages (if audio path present or --include-reading enabled)
        if (filter.includeReading) {
          for (const ex of unit.skills.reading.exercises) {
            if (ex.type === 'read_comprehension') {
              const suffix = ex.id.replace(`${unit.id}-`, '');
              const shortUnit = unit.id.replace(`${courseId}-`, '');
              const audioPath = ex.audio ?? `${courseId}/${shortUnit}/${suffix}.mp3`;
              pushClip(audioPath, ex.passage, 'reading');
            }
          }
        }
      }
    }
  }

  const uniqueHashSet = new Set(clips.map((c) => c.hash));
  const byCourse: Record<CourseId, { clips: number; estimatedBytes: number }> = {
    tr: { clips: 0, estimatedBytes: 0 },
    en: { clips: 0, estimatedBytes: 0 },
  };
  let estimatedTotalSeconds = 0;
  let estimatedTotalBytes = 0;

  for (const clip of clips) {
    estimatedTotalSeconds += clip.estimatedSeconds;
    estimatedTotalBytes += clip.estimatedBytes;
    byCourse[clip.course].clips += 1;
    byCourse[clip.course].estimatedBytes += clip.estimatedBytes;
  }

  return {
    clips,
    uniqueHashes: uniqueHashSet.size,
    dedupSavings: clips.length - uniqueHashSet.size,
    estimatedTotalSeconds,
    estimatedTotalBytes,
    byCourse,
  };
}
