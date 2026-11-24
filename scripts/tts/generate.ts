import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  AudioManifestSchema,
  type AudioClipEntry,
  type AudioManifest,
  type CourseId,
} from '../../src/lib/content/schema';
import {
  AUDIO_BUDGET_LIMITS,
  collectAudioPlan,
  DEFAULT_BITRATE,
  DEFAULT_RPM,
  GEMINI_TTS_MODEL,
  type PlannedClip,
} from './config';

const ROOT_DIR = process.cwd();
const PUBLIC_AUDIO_DIR = path.join(ROOT_DIR, 'public', 'audio');
const MANIFEST_PATH = path.join(ROOT_DIR, 'content', 'audio-manifest.json');
const TMP_TTS_DIR = path.join(ROOT_DIR, 'tmp', 'tts');
const ERRORS_LOG_PATH = path.join(TMP_TTS_DIR, 'tts-errors.json');

interface CliOptions {
  dryRun: boolean;
  course?: CourseId;
  section?: number;
  unitId?: string;
  limit?: number;
  rpm: number;
  bitrate: string;
  bitrateKbps: number;
  maxMb: number;
  includeReading: boolean;
}

function parseCliArgs(argv: string[]): CliOptions {
  const getVal = (prefix: string): string | undefined =>
    argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);

  const courseRaw = getVal('--course=');
  const course = courseRaw === 'tr' || courseRaw === 'en' ? courseRaw : undefined;
  const sectionRaw = getVal('--section=');
  const section = sectionRaw ? Number.parseInt(sectionRaw, 10) : undefined;
  const unitId = getVal('--unit=');
  const limitRaw = getVal('--limit=');
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
  const rpmRaw = getVal('--rpm=');
  const rpm = rpmRaw ? Math.max(1, Number.parseInt(rpmRaw, 10)) : DEFAULT_RPM;
  const bitrate = getVal('--bitrate=') ?? DEFAULT_BITRATE;
  const bitrateKbps = Number.parseInt(bitrate.replace(/k$/i, ''), 10) || 36;
  const maxMbRaw = getVal('--max-mb=');
  const maxMb = maxMbRaw ? Number.parseFloat(maxMbRaw) : 60;

  return {
    dryRun: argv.includes('--dry-run'),
    course,
    section: Number.isFinite(section) ? section : undefined,
    unitId,
    limit: Number.isFinite(limit) ? limit : undefined,
    rpm,
    bitrate,
    bitrateKbps,
    maxMb: Number.isFinite(maxMb) ? maxMb : 60,
    includeReading: argv.includes('--include-reading'),
  };
}

function loadGeminiApiKey(): string | null {
  if (process.env.GEMINI_API_KEY?.trim()) return process.env.GEMINI_API_KEY.trim();
  const envLocalPath = path.join(ROOT_DIR, '.env.local');
  if (!fs.existsSync(envLocalPath)) return null;
  const content = fs.readFileSync(envLocalPath, 'utf8');
  const match = /^\s*GEMINI_API_KEY\s*=\s*([^\s#]+)/m.exec(content);
  return match?.[1]?.replace(/^["']|["']$/g, '') ?? null;
}

function checkFfmpegAvailable(): boolean {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function loadManifest(): AudioManifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return {
      version: 1,
      updated_at: new Date().toISOString(),
      total_clips: 0,
      total_bytes: 0,
      clips: {},
    };
  }
  return AudioManifestSchema.parse(JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')));
}

function saveManifest(manifest: AudioManifest): void {
  const entries = Object.values(manifest.clips);
  manifest.total_clips = entries.length;
  manifest.total_bytes = entries.reduce((sum, e) => sum + e.bytes, 0);
  manifest.updated_at = new Date().toISOString();

  // Sort clip keys deterministically so diffs stay clean
  const sortedClips: Record<string, AudioClipEntry> = {};
  for (const key of Object.keys(manifest.clips).sort()) {
    sortedClips[key] = manifest.clips[key]!;
  }
  manifest.clips = sortedClips;

  AudioManifestSchema.parse(manifest);
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function convertPcmToMp3(pcmBuffer: Buffer, outMp3Path: string, bitrate: string): number {
  fs.mkdirSync(TMP_TTS_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(outMp3Path), { recursive: true });
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pcm`;
  const rawPcmPath = path.join(TMP_TTS_DIR, safeName);
  fs.writeFileSync(rawPcmPath, pcmBuffer);

  try {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-f',
        's16le',
        '-ar',
        '24000',
        '-ac',
        '1',
        '-i',
        rawPcmPath,
        '-af',
        'silenceremove=start_periods=1:start_duration=0.05:start_threshold=-45dB:detection=peak,areverse,silenceremove=start_periods=1:start_duration=0.05:start_threshold=-45dB:detection=peak,areverse,loudnorm=I=-16:TP=-1.5:LRA=11',
        '-codec:a',
        'libmp3lame',
        '-ac',
        '1',
        '-ar',
        '24000',
        '-b:a',
        bitrate,
        outMp3Path,
      ],
      { stdio: 'ignore' },
    );
    return fs.statSync(outMp3Path).size;
  } finally {
    if (fs.existsSync(rawPcmPath)) {
      fs.unlinkSync(rawPcmPath);
    }
  }
}

async function fetchGeminiTtsPcm(
  apiKey: string,
  clip: PlannedClip,
  maxAttempts = 4,
): Promise<Buffer> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent?key=${apiKey}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${clip.style} ${clip.text}` }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: clip.voice,
              },
            },
          },
        },
      }),
    });

    if (response.ok) {
      const json = (await response.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ inlineData?: { data?: string } }> };
        }>;
      };
      const b64 = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) {
        throw new Error('Gemini TTS returned no audio inlineData');
      }
      return Buffer.from(b64, 'base64');
    }

    const errText = await response.text();
    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < maxAttempts) {
      const backoffMs = Math.min(60_000, 3_000 * 2 ** (attempt - 1));
      console.warn(
        `[tts:generate] HTTP ${response.status} on ${clip.path} (attempt ${attempt}/${maxAttempts}), retrying in ${Math.round(backoffMs / 1000)}s...`,
      );
      await new Promise((r) => setTimeout(r, backoffMs));
      continue;
    }

    throw new Error(`HTTP ${response.status}: ${errText.slice(0, 300)}`);
  }

  throw new Error('Unreachable retry loop end');
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main(): Promise<void> {
  const opts = parseCliArgs(process.argv.slice(2));
  const plan = collectAudioPlan({
    course: opts.course,
    section: opts.section,
    unitId: opts.unitId,
    includeReading: opts.includeReading,
    bitrateKbps: opts.bitrateKbps,
  });

  const manifest = loadManifest();

  // Build lookup of already-generated clips by content hash for instant deduplication
  const existingByHash = new Map<string, string>();
  for (const entry of Object.values(manifest.clips)) {
    const fullPath = path.join(PUBLIC_AUDIO_DIR, entry.path);
    if (fs.existsSync(fullPath)) {
      existingByHash.set(entry.hash, fullPath);
    }
  }

  const pending: PlannedClip[] = [];
  let alreadyUpToDate = 0;

  for (const clip of plan.clips) {
    const fullPath = path.join(PUBLIC_AUDIO_DIR, clip.path);
    const existing = manifest.clips[clip.path];
    if (existing && existing.hash === clip.hash && fs.existsSync(fullPath)) {
      alreadyUpToDate += 1;
    } else {
      pending.push(clip);
    }
  }

  const scopedPending = opts.limit !== undefined ? pending.slice(0, opts.limit) : pending;
  const maxBytes = Math.round(opts.maxMb * 1024 * 1024);

  console.log('=== Konuş! Gemini TTS Audio Generator ===');
  console.log(`Model:          ${GEMINI_TTS_MODEL} (mono 24 kHz MP3 @ ${opts.bitrate})`);
  console.log(
    `Planned clips:  ${plan.clips.length} (TR: ${plan.byCourse.tr.clips}, EN: ${plan.byCourse.en.clips})`,
  );
  console.log(
    `Unique hashes:  ${plan.uniqueHashes} (dedup savings: ${plan.dedupSavings} API calls)`,
  );
  console.log(`Up to date:     ${alreadyUpToDate}`);
  console.log(
    `Pending now:    ${scopedPending.length}${opts.limit !== undefined ? ` (limited from ${pending.length})` : ''}`,
  );
  console.log(
    `Projected size: ${formatMb(plan.estimatedTotalBytes)} (target <= ${formatMb(AUDIO_BUDGET_LIMITS.totalTargetBytes)}, hard guard <= ${formatMb(maxBytes)})`,
  );

  if (opts.dryRun) {
    console.log('\n[tts:generate] Dry-run complete — no API calls made, no files written.');
    return;
  }

  const apiKey = loadGeminiApiKey();
  if (!apiKey) {
    console.error(
      '\n[tts:generate] ERROR: GEMINI_API_KEY is not set in environment or .env.local.\n' +
        'See docs/USER_ACTIONS.md (Step 5.1) to create your free Google AI Studio key and add it to .env.local.',
    );
    process.exit(1);
  }

  if (!checkFfmpegAvailable()) {
    console.error(
      '\n[tts:generate] ERROR: ffmpeg is not installed or not on PATH.\n' +
        'Install on Windows via: winget install Gyan.FFmpeg\n' +
        'Then restart your terminal and re-run `corepack.cmd pnpm tts:generate`.',
    );
    process.exit(1);
  }

  let interrupted = false;
  const onSigInt = () => {
    if (interrupted) return;
    interrupted = true;
    console.log('\n[tts:generate] SIGINT received — saving manifest and stopping cleanly...');
    saveManifest(manifest);
  };
  process.on('SIGINT', onSigInt);

  const delayMs = Math.ceil(60_000 / opts.rpm) + 250;
  let generatedCount = 0;
  let dedupCopiedCount = 0;
  const failedClips: Array<{ path: string; unitId: string; error: string }> = [];

  for (let i = 0; i < scopedPending.length; i++) {
    if (interrupted) break;

    const currentTotalBytes = Object.values(manifest.clips).reduce((sum, e) => sum + e.bytes, 0);
    if (currentTotalBytes >= maxBytes) {
      console.warn(
        `\n[tts:generate] Budget guard reached (${formatMb(currentTotalBytes)} >= ${formatMb(maxBytes)}). Stopping cleanly.`,
      );
      break;
    }

    const clip = scopedPending[i]!;
    const outPath = path.join(PUBLIC_AUDIO_DIR, clip.path);

    // 1. Check hash-based deduplication
    const cachedSource = existingByHash.get(clip.hash);
    if (cachedSource && fs.existsSync(cachedSource)) {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.copyFileSync(cachedSource, outPath);
      const bytes = fs.statSync(outPath).size;
      manifest.clips[clip.path] = {
        path: clip.path,
        course: clip.course,
        unit_id: clip.unitId,
        text: clip.text,
        voice: clip.voice,
        style: clip.style,
        model: clip.model,
        hash: clip.hash,
        bytes,
      };
      dedupCopiedCount += 1;
      if ((generatedCount + dedupCopiedCount) % 10 === 0) {
        saveManifest(manifest);
      }
      continue;
    }

    // 2. Call Gemini TTS API and transcode via ffmpeg
    try {
      const pcm = await fetchGeminiTtsPcm(apiKey, clip);
      const bytes = convertPcmToMp3(pcm, outPath, opts.bitrate);

      const perClipWarn =
        clip.kind === 'word'
          ? AUDIO_BUDGET_LIMITS.wordMaxBytes
          : AUDIO_BUDGET_LIMITS.phraseMaxBytes;
      if (bytes > perClipWarn) {
        console.warn(
          `[tts:generate] Size notice: ${clip.path} is ${(bytes / 1024).toFixed(1)} KB (guideline <= ${Math.round(perClipWarn / 1024)} KB)`,
        );
      }

      manifest.clips[clip.path] = {
        path: clip.path,
        course: clip.course,
        unit_id: clip.unitId,
        text: clip.text,
        voice: clip.voice,
        style: clip.style,
        model: clip.model,
        hash: clip.hash,
        bytes,
      };
      existingByHash.set(clip.hash, outPath);
      generatedCount += 1;

      if (generatedCount % 10 === 0 || i === scopedPending.length - 1) {
        saveManifest(manifest);
      }

      console.log(
        `[tts:generate] [${i + 1}/${scopedPending.length}] ${clip.path} (${clip.voice}, ${(bytes / 1024).toFixed(1)} KB)`,
      );

      if (i < scopedPending.length - 1 && !interrupted) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    } catch (err) {
      const msg = (err as Error).message;
      console.error(`[tts:generate] FAILED ${clip.path}: ${msg}`);
      failedClips.push({ path: clip.path, unitId: clip.unitId, error: msg });
    }
  }

  saveManifest(manifest);
  process.off('SIGINT', onSigInt);

  if (failedClips.length > 0) {
    fs.mkdirSync(TMP_TTS_DIR, { recursive: true });
    fs.writeFileSync(ERRORS_LOG_PATH, `${JSON.stringify(failedClips, null, 2)}\n`, 'utf8');
  }

  console.log('\n=== Generation Summary ===');
  console.log(`Generated via API:  ${generatedCount}`);
  console.log(`Copied via dedup:   ${dedupCopiedCount}`);
  console.log(
    `Failed clips:       ${failedClips.length}${failedClips.length > 0 ? ` (see ${path.relative(ROOT_DIR, ERRORS_LOG_PATH)})` : ''}`,
  );
  console.log(
    `Manifest total:     ${manifest.total_clips} clips (${formatMb(manifest.total_bytes)})`,
  );
}

main().catch((err) => {
  console.error('[tts:generate] Fatal error:', err);
  process.exit(1);
});
