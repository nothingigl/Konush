import fs from 'node:fs';
import path from 'node:path';
import { parseEnglishTopicsMarkdown, parseSkillsWordsMarkdown } from '../src/lib/content/parser';
import {
  AudioManifestSchema,
  CourseSchema,
  UnitSchema,
  type AudioManifest,
  type Unit,
} from '../src/lib/content/schema';

const ROOT_DIR = process.cwd();
const CONTENT_SRC_DIR = path.join(ROOT_DIR, 'content-src');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');

function writeJsonPretty(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function main(): void {
  const forceOverwrite = process.argv.includes('--force');

  const trSkillsPath = path.join(CONTENT_SRC_DIR, 'duolingo_turkish_skills_words.md');
  const enSkillsPath = path.join(CONTENT_SRC_DIR, 'duolingo_english_skills_words.md');
  const enTopicsPath = path.join(CONTENT_SRC_DIR, 'duolingo_english_topics.md');
  const trPracticePath = path.join(CONTENT_SRC_DIR, 'duolingo_turkish_practice.md');

  for (const requiredFile of [trSkillsPath, enSkillsPath, enTopicsPath]) {
    if (!fs.existsSync(requiredFile)) {
      throw new Error(`Missing required source file: ${requiredFile}`);
    }
  }

  if (!fs.existsSync(trPracticePath)) {
    console.warn(
      '[content:init] Note: optional 4th file content-src/duolingo_turkish_practice.md is not present yet.',
    );
  }

  const trMarkdown = fs.readFileSync(trSkillsPath, 'utf8');
  const enMarkdown = fs.readFileSync(enSkillsPath, 'utf8');
  const enTopicsMarkdown = fs.readFileSync(enTopicsPath, 'utf8');

  const englishTopics = parseEnglishTopicsMarkdown(enTopicsMarkdown);
  const trParsed = parseSkillsWordsMarkdown(trMarkdown, 'tr');
  const enParsed = parseSkillsWordsMarkdown(enMarkdown, 'en', englishTopics);

  for (const parsed of [trParsed, enParsed]) {
    const validatedCourse = CourseSchema.parse(parsed.course);
    const courseDir = path.join(CONTENT_DIR, 'courses', validatedCourse.id);
    const unitsDir = path.join(courseDir, 'units');
    fs.mkdirSync(unitsDir, { recursive: true });

    writeJsonPretty(path.join(courseDir, 'course.json'), validatedCourse);

    let createdCount = 0;
    let skippedCount = 0;

    for (const unit of parsed.units) {
      const validatedUnit = UnitSchema.parse(unit);
      const unitPath = path.join(unitsDir, `${validatedUnit.id}.json`);

      if (fs.existsSync(unitPath) && !forceOverwrite) {
        const existingRaw = JSON.parse(fs.readFileSync(unitPath, 'utf8')) as Unit;
        // Preserve already authored exercises or reviewed units
        const hasExercises =
          existingRaw.skills.speaking.exercises.length > 0 ||
          existingRaw.skills.listening.exercises.length > 0 ||
          existingRaw.skills.writing.exercises.length > 0 ||
          existingRaw.skills.reading.exercises.length > 0;
        if (existingRaw.review === 'claude_ok' || hasExercises) {
          skippedCount += 1;
          continue;
        }
      }

      writeJsonPretty(unitPath, validatedUnit);
      createdCount += 1;
    }

    console.log(
      `[content:init] Course "${validatedCourse.id}": ${parsed.units.length} total units (${createdCount} written, ${skippedCount} preserved).`,
    );
  }

  const manifestPath = path.join(CONTENT_DIR, 'audio-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    const initialManifest: AudioManifest = AudioManifestSchema.parse({
      version: 1,
      updated_at: new Date().toISOString(),
      total_clips: 0,
      total_bytes: 0,
      clips: {},
    });
    writeJsonPretty(manifestPath, initialManifest);
    console.log('[content:init] Initialized content/audio-manifest.json');
  }
}

main();
