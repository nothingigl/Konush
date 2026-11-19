import fs from 'node:fs';
import path from 'node:path';
import { parseEnglishTopicsMarkdown, parseSkillsWordsMarkdown } from '../src/lib/content/parser';
import {
  AudioManifestSchema,
  CourseSchema,
  UnitSchema,
  type CourseId,
  type Exercise,
  type Unit,
} from '../src/lib/content/schema';

const ROOT_DIR = process.cwd();
const CONTENT_SRC_DIR = path.join(ROOT_DIR, 'content-src');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const PUBLIC_AUDIO_DIR = path.join(ROOT_DIR, 'public', 'audio');
const MAX_UNIT_JSON_BYTES = 40 * 1024; // 40 KB ceiling per unit JSON

/**
 * Approved Russian translation clarifications explicitly logged in docs/CONTENT_CHANGELOG.md.
 * Any other deviation from content-src/*.md fails Zero-Trust validation.
 */
const APPROVED_WORD_RU_OVERRIDES: Record<string, string> = {
  'tr-1-5-w08': 'брать; покупать',
  'tr-1-8-w03': 'горячий (о погоде: жаркий)',
};

function collectExerciseText(ex: Exercise): string {
  const parts: string[] = [ex.prompt_ru];
  if (ex.explain_ru) parts.push(ex.explain_ru);

  switch (ex.type) {
    case 'word_card':
      parts.push(ex.target_text, ex.translation_ru);
      if (ex.example_text) parts.push(ex.example_text);
      if (ex.example_ru) parts.push(ex.example_ru);
      break;
    case 'match_pairs':
      for (const p of ex.pairs) parts.push(p.left, p.right);
      break;
    case 'multiple_choice':
      if (ex.question_text) parts.push(ex.question_text);
      parts.push(...ex.options);
      break;
    case 'build_sentence':
      if (ex.source_text) parts.push(ex.source_text);
      parts.push(...ex.bank, ...ex.accepted);
      break;
    case 'type_answer':
      if (ex.source_text) parts.push(ex.source_text);
      parts.push(...ex.accepted);
      break;
    case 'fix_bug':
      parts.push(ex.buggy_text, ...ex.accepted);
      break;
    case 'odd_one_out':
      parts.push(...ex.items);
      break;
    case 'order_items':
      parts.push(...ex.items_shuffled, ...ex.correct_order);
      break;
    case 'listen_choose':
      parts.push(ex.transcript, ...ex.options);
      break;
    case 'listen_type':
      parts.push(ex.transcript, ...ex.accepted);
      break;
    case 'speak_repeat':
      parts.push(ex.target_text);
      if (ex.translation_ru) parts.push(ex.translation_ru);
      break;
    case 'read_comprehension':
      parts.push(ex.passage);
      for (const q of ex.questions) {
        parts.push(q.question_ru, ...q.accepted);
        if (q.options) parts.push(...q.options);
      }
      break;
  }

  return parts.join(' ');
}

function main(): void {
  const strictExercises = process.argv.includes('--strict-exercises');
  const checkAudioFiles = process.argv.includes('--check-audio');
  const errors: string[] = [];

  // 1. Validate audio-manifest.json
  const manifestPath = path.join(CONTENT_DIR, 'audio-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    errors.push('Missing content/audio-manifest.json (run `pnpm content:init` first)');
  } else {
    try {
      const rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      AudioManifestSchema.parse(rawManifest);
    } catch (err) {
      errors.push(`Invalid content/audio-manifest.json: ${(err as Error).message}`);
    }
  }

  // 2. Parse source markdown files to verify Zero-Trust word correspondence
  const trSkillsPath = path.join(CONTENT_SRC_DIR, 'duolingo_turkish_skills_words.md');
  const enSkillsPath = path.join(CONTENT_SRC_DIR, 'duolingo_english_skills_words.md');
  const enTopicsPath = path.join(CONTENT_SRC_DIR, 'duolingo_english_topics.md');

  const enTopics = parseEnglishTopicsMarkdown(fs.readFileSync(enTopicsPath, 'utf8'));
  const sourceUnitsByCourse: Record<CourseId, Map<string, Unit>> = {
    tr: new Map(
      parseSkillsWordsMarkdown(fs.readFileSync(trSkillsPath, 'utf8'), 'tr').units.map((u) => [
        u.id,
        u,
      ]),
    ),
    en: new Map(
      parseSkillsWordsMarkdown(fs.readFileSync(enSkillsPath, 'utf8'), 'en', enTopics).units.map(
        (u) => [u.id, u],
      ),
    ),
  };

  const globalUnitIds = new Set<string>();
  const globalWordIds = new Set<string>();
  const globalExerciseIds = new Set<string>();
  let totalValidatedUnits = 0;

  for (const courseId of ['tr', 'en'] as const) {
    const coursePath = path.join(CONTENT_DIR, 'courses', courseId, 'course.json');
    if (!fs.existsSync(coursePath)) {
      errors.push(`Missing ${coursePath}`);
      continue;
    }

    const course = CourseSchema.parse(JSON.parse(fs.readFileSync(coursePath, 'utf8')));
    const courseSlugs = new Set<string>();

    const expectedUnitIds = course.sections.flatMap((sec) => sec.unit_ids);
    const sourceMap = sourceUnitsByCourse[courseId];

    if (expectedUnitIds.length !== sourceMap.size) {
      errors.push(
        `Course "${courseId}" has ${expectedUnitIds.length} unit_ids in course.json, expected ${sourceMap.size} from markdown source`,
      );
    }

    for (const unitId of expectedUnitIds) {
      const unitPath = path.join(CONTENT_DIR, 'courses', courseId, 'units', `${unitId}.json`);
      if (!fs.existsSync(unitPath)) {
        errors.push(`Missing unit file: ${unitPath}`);
        continue;
      }

      const stat = fs.statSync(unitPath);
      if (stat.size > MAX_UNIT_JSON_BYTES) {
        errors.push(
          `Unit file ${unitId}.json exceeds 40 KB limit (${stat.size} bytes > ${MAX_UNIT_JSON_BYTES} bytes)`,
        );
      }

      let unit: Unit;
      try {
        unit = UnitSchema.parse(JSON.parse(fs.readFileSync(unitPath, 'utf8')));
      } catch (err) {
        errors.push(`Schema validation failed for ${unitId}.json: ${(err as Error).message}`);
        continue;
      }

      if (globalUnitIds.has(unit.id)) {
        errors.push(`Duplicate unit ID: ${unit.id}`);
      }
      globalUnitIds.add(unit.id);

      if (courseSlugs.has(unit.slug)) {
        errors.push(`Duplicate slug "${unit.slug}" in course "${courseId}"`);
      }
      courseSlugs.add(unit.slug);

      // Verify exact word correspondence with content-src/*.md
      const sourceUnit = sourceMap.get(unit.id);
      if (!sourceUnit) {
        errors.push(`Unit "${unit.id}" does not exist in content-src markdown`);
      } else {
        if (unit.words.length !== sourceUnit.words.length) {
          errors.push(
            `Word count mismatch in ${unit.id}: got ${unit.words.length}, source has ${sourceUnit.words.length}`,
          );
        } else {
          for (let i = 0; i < unit.words.length; i++) {
            const w = unit.words[i]!;
            const srcW = sourceUnit.words[i]!;
            const expectedRu = APPROVED_WORD_RU_OVERRIDES[w.id] ?? srcW.ru;
            if (w.text !== srcW.text || w.ru !== expectedRu) {
              errors.push(
                `Zero-Trust violation in ${unit.id} word #${i + 1}: JSON has "${w.text} — ${w.ru}", expected "${srcW.text} — ${expectedRu}"`,
              );
            }
          }
        }
      }

      for (const word of unit.words) {
        if (globalWordIds.has(word.id)) {
          errors.push(`Duplicate word ID: ${word.id}`);
        }
        globalWordIds.add(word.id);

        if (checkAudioFiles) {
          const audioFullPath = path.join(PUBLIC_AUDIO_DIR, word.audio);
          if (!fs.existsSync(audioFullPath)) {
            errors.push(`Missing word audio file: public/audio/${word.audio}`);
          }
        }
      }

      const allExercises: Exercise[] = [
        ...unit.skills.speaking.exercises,
        ...unit.skills.listening.exercises,
        ...unit.skills.writing.exercises,
        ...unit.skills.reading.exercises,
      ];

      for (const ex of allExercises) {
        if (globalExerciseIds.has(ex.id)) {
          errors.push(`Duplicate exercise ID: ${ex.id}`);
        }
        globalExerciseIds.add(ex.id);

        if (checkAudioFiles && ex.audio) {
          const audioFullPath = path.join(PUBLIC_AUDIO_DIR, ex.audio);
          if (!fs.existsSync(audioFullPath)) {
            errors.push(`Missing exercise audio file: public/audio/${ex.audio}`);
          }
        }
      }

      // Enforce exercise session rules on claude_ok units, units with exercises populated, or when --strict-exercises is passed
      if (unit.review === 'claude_ok' || allExercises.length > 0 || strictExercises) {
        if (unit.boss) {
          if (allExercises.length !== 15) {
            errors.push(
              `Boss unit ${unit.id} must have 15 exercises across skills (got ${allExercises.length})`,
            );
          }
        } else {
          for (const skillKey of ['speaking', 'listening', 'writing', 'reading'] as const) {
            const skillExercises = unit.skills[skillKey].exercises;
            if (skillExercises.length < 8 || skillExercises.length > 12) {
              errors.push(
                `Unit ${unit.id} skill "${skillKey}" must have 8..12 exercises (got ${skillExercises.length})`,
              );
            }
            const hasSource = skillExercises.some((e) => e.origin === 'source');
            if (!hasSource) {
              errors.push(
                `Unit ${unit.id} skill "${skillKey}" must include at least one exercise with origin="source"`,
              );
            }
          }

          // Check that each of the 12 words appears in at least 2 exercises
          const locale = courseId === 'tr' ? 'tr-TR' : 'en-US';
          const exerciseBlobs = allExercises.map((ex) =>
            collectExerciseText(ex).toLocaleLowerCase(locale),
          );

          for (const word of unit.words) {
            const needle = word.text
              .toLocaleLowerCase(locale)
              .replace(/^-+|-+$/g, '')
              .trim();
            let occurrences = 0;
            for (const blob of exerciseBlobs) {
              if (blob.includes(needle)) {
                occurrences += 1;
              }
            }
            if (occurrences < 2) {
              errors.push(
                `Word "${word.text}" (${word.id}) in unit ${unit.id} appears in ${occurrences} exercises (minimum required: 2)`,
              );
            }
          }
        }
      }

      totalValidatedUnits += 1;
    }
  }

  if (errors.length > 0) {
    console.error(`[content:check] FAILED with ${errors.length} error(s):`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(
    `[content:check] OK — validated ${totalValidatedUnits} units (${globalWordIds.size} words, ${globalExerciseIds.size} exercises).`,
  );
}

main();
