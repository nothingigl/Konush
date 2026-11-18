import { z } from 'zod';

/**
 * Supported course identifiers:
 * - 'tr': Turkish for Russian speakers (67 units + 3 bosses across 3 sections)
 * - 'en': English for Russian speakers (60 units + 3 bosses in modules 1-3; modules 4-8 planned)
 */
export const CourseIdSchema = z.enum(['tr', 'en']);
export type CourseId = z.infer<typeof CourseIdSchema>;

/**
 * Unit ID format:
 * - Regular unit: "<course>-<section>-<number>", e.g. "tr-1-1", "en-2-14"
 * - Boss unit:    "<course>-<section>-boss", e.g. "tr-1-boss", "en-3-boss"
 */
export const UnitIdSchema = z
  .string()
  .regex(
    /^(tr|en)-[1-8]-([1-9][0-9]*|boss)$/,
    'Unit ID must match "<course>-<section>-<order|boss>", e.g. "tr-1-1" or "tr-1-boss"',
  );

/**
 * URL-safe Latin slug in English, e.g. "1-1-food-and-drinks" or "1-boss-cafe-exam"
 */
export const UnitSlugSchema = z
  .string()
  .regex(
    /^[1-8]-([1-9][0-9]*|boss)-[a-z0-9]+(-[a-z0-9]+)*$/,
    'Unit slug must be lowercase Latin with hyphens, prefixed by "<section>-<order|boss>-"',
  );

/**
 * Review status controlling whether a unit is included in production builds.
 * Only units with status "claude_ok" are included in production unless
 * NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT="true" is set in development.
 */
export const ReviewStatusSchema = z.enum(['draft', 'claude_ok', 'needs_fix']);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

/**
 * Origin of an exercise:
 * - 'source': directly from the author's markdown files in content-src/
 * - 'derived': created to expand each skill session to 8-12 exercises using only current/prior vocabulary
 */
export const ExerciseOriginSchema = z.enum(['source', 'derived']);
export type ExerciseOrigin = z.infer<typeof ExerciseOriginSchema>;

/**
 * Vocabulary item within a unit.
 */
export const WordSchema = z.object({
  id: z
    .string()
    .regex(
      /^(tr|en)-[1-8]-[1-9][0-9]*-w(0[1-9]|1[0-2])$/,
      'Word ID must match "<course>-<section>-<unit>-w<01..12>"',
    ),
  text: z.string().min(1, 'Word text must not be empty'),
  ru: z.string().min(1, 'Russian translation must not be empty'),
  audio: z
    .string()
    .regex(
      /^(tr|en)\/[1-8]-[1-9][0-9]*\/w(0[1-9]|1[0-2])\.mp3$/,
      'Word audio path must match "<course>/<section>-<unit>/w<01..12>.mp3"',
    ),
});
export type Word = z.infer<typeof WordSchema>;

/**
 * Common fields shared across all 12 exercise types.
 */
const BaseExerciseFields = {
  id: z
    .string()
    .regex(
      /^(tr|en)-[1-8]-([1-9][0-9]*|boss)-(sp|ls|wr|rd|mx)-[0-9]{2}$/,
      'Exercise ID must match "<course>-<section>-<unit|boss>-<sp|ls|wr|rd|mx>-<NN>"',
    ),
  origin: ExerciseOriginSchema,
  prompt_ru: z.string().min(1),
  explain_ru: z.string().min(1).nullable(),
  audio: z.string().min(1).nullable(),
};

/**
 * 1. word_card: Introduction / flashcard drill for a word or phrase.
 */
export const WordCardExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('word_card'),
  target_text: z.string().min(1),
  translation_ru: z.string().min(1),
  example_text: z.string().min(1).nullable().optional(),
  example_ru: z.string().min(1).nullable().optional(),
});

/**
 * 2. match_pairs: Match target language items with Russian translations or reply pairs.
 */
export const MatchPairsExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('match_pairs'),
  pairs: z
    .array(
      z.object({
        left: z.string().min(1),
        right: z.string().min(1),
      }),
    )
    .min(2)
    .max(8),
});

/**
 * 3. multiple_choice: Choose the single right option from 2-4 choices.
 */
export const MultipleChoiceExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('multiple_choice'),
  question_text: z.string().min(1).nullable().optional(),
  options: z.array(z.string().min(1)).min(2).max(6),
  correct_index: z.number().int().min(0),
});

/**
 * 4. build_sentence: Assemble a sentence from word tiles ("Кубики").
 */
export const BuildSentenceExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('build_sentence'),
  source_text: z.string().min(1).nullable().optional(),
  bank: z.array(z.string().min(1)).min(2),
  accepted: z.array(z.string().min(1)).min(1),
});

/**
 * 5. type_answer: Free-text input (translation, fill-in-the-blank, suffix formation).
 */
export const TypeAnswerExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('type_answer'),
  source_text: z.string().min(1).nullable().optional(),
  accepted: z.array(z.string().min(1)).min(1),
});

/**
 * 6. fix_bug: Spot and fix the grammatical or lexical error ("Исправь баг").
 */
export const FixBugExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('fix_bug'),
  buggy_text: z.string().min(1),
  accepted: z.array(z.string().min(1)).min(1),
});

/**
 * 7. odd_one_out: Pick the item that does not belong to the group ("Найди лишнее").
 */
export const OddOneOutExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('odd_one_out'),
  items: z.array(z.string().min(1)).min(3).max(6),
  odd_index: z.number().int().min(0),
});

/**
 * 8. order_items: Put items/steps/seasons in chronological or logical order.
 */
export const OrderItemsExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('order_items'),
  items_shuffled: z.array(z.string().min(1)).min(3).max(8),
  correct_order: z.array(z.string().min(1)).min(3).max(8),
});

/**
 * 9. listen_choose: Listen to audio script and select the right answer.
 */
export const ListenChooseExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('listen_choose'),
  transcript: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  correct_index: z.number().int().min(0),
});

/**
 * 10. listen_type: Listen to audio script and type what was heard or the answer.
 */
export const ListenTypeExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('listen_type'),
  transcript: z.string().min(1),
  accepted: z.array(z.string().min(1)).min(1),
});

/**
 * 11. speak_repeat: Listen to reference audio, repeat aloud (with optional local recording), self-grade.
 */
export const SpeakRepeatExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('speak_repeat'),
  target_text: z.string().min(1),
  translation_ru: z.string().min(1).nullable().optional(),
});

/**
 * 12. read_comprehension: Short passage/dialogue followed by comprehension question(s).
 */
export const ReadComprehensionQuestionSchema = z.object({
  question_ru: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(5).optional(),
  correct_index: z.number().int().min(0).optional(),
  accepted: z.array(z.string().min(1)).min(1),
});

export const ReadComprehensionExerciseSchema = z.object({
  ...BaseExerciseFields,
  type: z.literal('read_comprehension'),
  passage: z.string().min(1),
  questions: z.array(ReadComprehensionQuestionSchema).min(1).max(5),
});

/**
 * Discriminated union of all 12 exercise types.
 */
export const ExerciseSchema = z.discriminatedUnion('type', [
  WordCardExerciseSchema,
  MatchPairsExerciseSchema,
  MultipleChoiceExerciseSchema,
  BuildSentenceExerciseSchema,
  TypeAnswerExerciseSchema,
  FixBugExerciseSchema,
  OddOneOutExerciseSchema,
  OrderItemsExerciseSchema,
  ListenChooseExerciseSchema,
  ListenTypeExerciseSchema,
  SpeakRepeatExerciseSchema,
  ReadComprehensionExerciseSchema,
]);
export type Exercise = z.infer<typeof ExerciseSchema>;
export type ExerciseType = Exercise['type'];

export const SkillBlockSchema = z.object({
  exercises: z.array(ExerciseSchema),
});

/**
 * Complete Unit JSON schema (content/courses/<course>/units/<unit-id>.json).
 * Enforces word counts (12 words for standard units, 11 for tr-2-3, 0 for boss units).
 */
export const UnitSchema = z
  .object({
    id: UnitIdSchema,
    course: CourseIdSchema,
    section: z.number().int().min(1).max(8),
    order: z.number().int().min(1).max(100),
    slug: UnitSlugSchema,
    title_ru: z.string().min(1),
    character: z.string().min(1),
    boss: z.boolean(),
    words: z.array(WordSchema),
    skills: z.object({
      speaking: SkillBlockSchema,
      listening: SkillBlockSchema,
      writing: SkillBlockSchema,
      reading: SkillBlockSchema,
    }),
    review: ReviewStatusSchema,
  })
  .superRefine((unit, ctx) => {
    if (!unit.id.startsWith(`${unit.course}-${unit.section}-`)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unit id "${unit.id}" does not match course "${unit.course}" and section ${unit.section}`,
        path: ['id'],
      });
    }

    if (unit.boss) {
      if (!unit.id.endsWith('-boss')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Boss unit "${unit.id}" must end with "-boss"`,
          path: ['id'],
        });
      }
      if (unit.words.length !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Boss unit "${unit.id}" must have 0 words (got ${unit.words.length})`,
          path: ['words'],
        });
      }
    } else {
      const expectedWordCount = unit.id === 'tr-2-3' ? 11 : 12;
      if (unit.words.length !== expectedWordCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unit "${unit.id}" must have exactly ${expectedWordCount} words (got ${unit.words.length})`,
          path: ['words'],
        });
      }
    }
  });
export type Unit = z.infer<typeof UnitSchema>;

/**
 * Planned topic entry (used especially for English modules 4-8 from duolingo_english_topics.md
 * so they can be added later without restructuring course.json).
 */
export const PlannedTopicSchema = z.object({
  unit_number: z.string().regex(/^[1-8]\.[1-9][0-9]*$/),
  title_ru: z.string().min(1),
  title_en: z.string().min(1),
  implemented_unit_id: UnitIdSchema.nullable(),
});
export type PlannedTopic = z.infer<typeof PlannedTopicSchema>;

export const CourseSectionSchema = z.object({
  section: z.number().int().min(1).max(8),
  title_ru: z.string().min(1),
  cefr: z.enum(['Intro', 'A1', 'A2', 'B1', 'B2']),
  description_ru: z.string().min(1),
  unit_ids: z.array(UnitIdSchema),
  planned_topics: z.array(PlannedTopicSchema).optional(),
});
export type CourseSection = z.infer<typeof CourseSectionSchema>;

/**
 * Course index file schema (content/courses/<course>/course.json).
 */
export const CourseSchema = z.object({
  id: CourseIdSchema,
  title_ru: z.string().min(1),
  description_ru: z.string().min(1),
  sections: z.array(CourseSectionSchema).min(1),
});
export type Course = z.infer<typeof CourseSchema>;

/**
 * Audio manifest entry (content/audio-manifest.json).
 * Hash is computed over (text + voice + style + model) for idempotent TTS generation.
 */
export const AudioClipEntrySchema = z.object({
  path: z.string().regex(/^(tr|en)\/[a-z0-9-]+\/[a-z0-9_-]+\.mp3$/),
  course: CourseIdSchema,
  unit_id: UnitIdSchema,
  text: z.string().min(1),
  voice: z.string().min(1),
  style: z.string().min(1),
  model: z.string().min(1),
  hash: z.string().regex(/^[a-f0-9]{64}$/, 'Hash must be a SHA-256 hex digest'),
  bytes: z.number().int().positive(),
});
export type AudioClipEntry = z.infer<typeof AudioClipEntrySchema>;

export const AudioManifestSchema = z.object({
  version: z.literal(1),
  updated_at: z.string().min(1),
  total_clips: z.number().int().min(0),
  total_bytes: z.number().int().min(0),
  clips: z.record(z.string(), AudioClipEntrySchema),
});
export type AudioManifest = z.infer<typeof AudioManifestSchema>;
