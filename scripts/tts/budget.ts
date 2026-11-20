import fs from 'node:fs';
import path from 'node:path';
import { AudioManifestSchema } from '../../src/lib/content/schema';
import { AUDIO_BUDGET_LIMITS, collectAudioPlan } from './config';

const ROOT_DIR = process.cwd();
const PUBLIC_AUDIO_DIR = path.join(ROOT_DIR, 'public', 'audio');
const MANIFEST_PATH = path.join(ROOT_DIR, 'content', 'audio-manifest.json');

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function main(): void {
  const includeReading = process.argv.includes('--include-reading');
  const strict = process.argv.includes('--strict');
  const plan = collectAudioPlan({ includeReading });

  const manifest = AudioManifestSchema.parse(JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')));

  let presentFiles = 0;
  let actualTotalBytes = 0;
  const unitBytes = new Map<string, number>();
  const oversizeWords: Array<{ path: string; bytes: number }> = [];
  const oversizePhrases: Array<{ path: string; bytes: number }> = [];
  const missingFiles: string[] = [];

  for (const clip of plan.clips) {
    const fullPath = path.join(PUBLIC_AUDIO_DIR, clip.path);
    if (!fs.existsSync(fullPath)) {
      missingFiles.push(clip.path);
      continue;
    }

    const bytes = fs.statSync(fullPath).size;
    presentFiles += 1;
    actualTotalBytes += bytes;
    unitBytes.set(clip.unitId, (unitBytes.get(clip.unitId) ?? 0) + bytes);

    if (clip.kind === 'word' && bytes > AUDIO_BUDGET_LIMITS.wordMaxBytes) {
      oversizeWords.push({ path: clip.path, bytes });
    } else if (clip.kind !== 'word' && bytes > AUDIO_BUDGET_LIMITS.phraseMaxBytes) {
      oversizePhrases.push({ path: clip.path, bytes });
    }
  }

  const oversizeUnits = [...unitBytes.entries()].filter(
    ([, bytes]) => bytes > AUDIO_BUDGET_LIMITS.unitMaxBytes,
  );
  const coveragePct =
    plan.clips.length > 0 ? ((presentFiles / plan.clips.length) * 100).toFixed(1) : '0.0';

  console.log('=== Konuş! Audio Budget Report ===');
  console.log(
    `Planned clips:      ${plan.clips.length} (TR: ${plan.byCourse.tr.clips}, EN: ${plan.byCourse.en.clips})`,
  );
  console.log(`Unique hashes:      ${plan.uniqueHashes} (dedup savings: ${plan.dedupSavings})`);
  console.log(`Manifest entries:   ${manifest.total_clips} (${formatMb(manifest.total_bytes)})`);
  console.log(`Present on disk:    ${presentFiles}/${plan.clips.length} (${coveragePct}%)`);
  console.log(`Actual disk size:   ${formatMb(actualTotalBytes)}`);
  console.log(`Projected 100%:     ${formatMb(plan.estimatedTotalBytes)} @ 36 kbps mono 24 kHz`);
  console.log(
    `Budget target:      <= ${formatMb(AUDIO_BUDGET_LIMITS.totalTargetBytes)} (ceiling ${formatMb(AUDIO_BUDGET_LIMITS.totalCeilingBytes)})`,
  );
  console.log(
    `Outliers:           words>${Math.round(AUDIO_BUDGET_LIMITS.wordMaxBytes / 1024)}KB: ${oversizeWords.length}, phrases>${Math.round(AUDIO_BUDGET_LIMITS.phraseMaxBytes / 1024)}KB: ${oversizePhrases.length}, units>1.5MB: ${oversizeUnits.length}`,
  );

  if (actualTotalBytes > AUDIO_BUDGET_LIMITS.totalCeilingBytes) {
    console.error('[tts:budget] FAILED: Audio exceeds 100 MB hard ceiling!');
    process.exit(1);
  }

  if (strict && missingFiles.length > 0) {
    console.error(`[tts:budget] FAILED (--strict): ${missingFiles.length} audio files missing.`);
    process.exit(1);
  }

  console.log('[tts:budget] OK');
}

main();
