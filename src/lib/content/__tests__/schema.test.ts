import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkTypedAnswer, foldTurkishDiacritics, normalizeText } from '../normalize';
import { parseEnglishTopicsMarkdown, parseSkillsWordsMarkdown, parseWordsLine } from '../parser';
import {
  AudioManifestSchema,
  CourseSchema,
  ExerciseSchema,
  UnitSchema,
  WordSchema,
} from '../schema';

describe('Zod Content Schemas', () => {
  it('validates a well-formed WordSchema item', () => {
    const validWord = {
      id: 'tr-1-1-w01',
      text: 'su',
      ru: 'вода',
      audio: 'tr/1-1/w01.mp3',
    };
    expect(WordSchema.parse(validWord)).toEqual(validWord);
  });

  it('rejects a WordSchema item with mismatched audio path', () => {
    expect(() =>
      WordSchema.parse({
        id: 'tr-1-1-w01',
        text: 'su',
        ru: 'вода',
        audio: 'en/1-1/w01.wav',
      }),
    ).toThrow();
  });

  it('validates all 12 exercise types in ExerciseSchema', () => {
    const sampleExercises = [
      {
        id: 'tr-1-1-wr-01',
        type: 'word_card' as const,
        origin: 'source' as const,
        prompt_ru: 'Запомните слово',
        explain_ru: null,
        audio: 'tr/1-1/w01.mp3',
        target_text: 'su',
        translation_ru: 'вода',
      },
      {
        id: 'tr-1-1-wr-02',
        type: 'match_pairs' as const,
        origin: 'source' as const,
        prompt_ru: 'Найдите пары',
        explain_ru: null,
        audio: null,
        pairs: [
          { left: 'su', right: 'вода' },
          { left: 'çay', right: 'чай' },
        ],
      },
      {
        id: 'tr-1-1-wr-03',
        type: 'build_sentence' as const,
        origin: 'source' as const,
        prompt_ru: 'Соберите предложение',
        bank: ['istiyorum', 'portakal', 'ben', 'bir'],
        accepted: ['Ben bir portakal istiyorum.'],
        explain_ru: null,
        audio: null,
      },
      {
        id: 'tr-1-1-wr-04',
        type: 'fix_bug' as const,
        origin: 'source' as const,
        prompt_ru: 'Исправьте ошибку',
        buggy_text: 'Ben su istiyorsun',
        accepted: ['Ben su istiyorum.'],
        explain_ru: 'С местоимением Ben глагол оканчивается на -um.',
        audio: null,
      },
      {
        id: 'tr-1-1-wr-05',
        type: 'multiple_choice' as const,
        origin: 'derived' as const,
        prompt_ru: 'Выберите перевод слова «сыр»',
        options: ['peynir', 'ekmek', 'süt'],
        correct_index: 0,
        explain_ru: null,
        audio: null,
      },
      {
        id: 'tr-1-1-wr-06',
        type: 'type_answer' as const,
        origin: 'derived' as const,
        prompt_ru: 'Напишите по-турецки: «вода»',
        accepted: ['su'],
        explain_ru: null,
        audio: null,
      },
      {
        id: 'tr-1-1-wr-07',
        type: 'odd_one_out' as const,
        origin: 'source' as const,
        prompt_ru: 'Найдите лишнее',
        items: ['et', 'tavuk', 'balık', 'domates'],
        odd_index: 3,
        explain_ru: 'Domates (помидор) — овощ, остальное — мясо/рыба.',
        audio: null,
      },
      {
        id: 'tr-1-1-wr-08',
        type: 'order_items' as const,
        origin: 'source' as const,
        prompt_ru: 'Расставьте времена года по порядку',
        items_shuffled: ['kış', 'yaz', 'ilkbahar', 'sonbahar'],
        correct_order: ['ilkbahar', 'yaz', 'sonbahar', 'kış'],
        explain_ru: null,
        audio: null,
      },
      {
        id: 'tr-1-1-ls-01',
        type: 'listen_choose' as const,
        origin: 'source' as const,
        prompt_ru: 'Что заказали?',
        transcript: 'Çay, şeker ve süt lütfen.',
        options: ['чай, сахар, молоко', 'кофе и хлеб'],
        correct_index: 0,
        explain_ru: null,
        audio: 'tr/1-1/ls-01.mp3',
      },
      {
        id: 'tr-1-1-ls-02',
        type: 'listen_type' as const,
        origin: 'derived' as const,
        prompt_ru: 'Напишите услышанное',
        transcript: 'Çay lütfen.',
        accepted: ['Çay lütfen.'],
        explain_ru: null,
        audio: 'tr/1-1/ls-02.mp3',
      },
      {
        id: 'tr-1-1-sp-01',
        type: 'speak_repeat' as const,
        origin: 'source' as const,
        prompt_ru: 'Повторите вслух',
        target_text: 'Ben çay istiyorum.',
        translation_ru: 'Я хочу чай.',
        explain_ru: null,
        audio: 'tr/1-1/sp-01.mp3',
      },
      {
        id: 'tr-1-1-rd-01',
        type: 'read_comprehension' as const,
        origin: 'source' as const,
        prompt_ru: 'Прочитайте и ответьте на вопросы',
        passage: 'Ben elma istiyorum. Sen portakal istiyorsun. O çorba istiyor.',
        questions: [
          {
            question_ru: 'Кто хочет суп?',
            accepted: ['он', 'она', 'он/она', 'o'],
          },
        ],
        explain_ru: null,
        audio: null,
      },
    ];

    for (const ex of sampleExercises) {
      expect(() => ExerciseSchema.parse(ex)).not.toThrow();
    }
  });

  it('enforces 12 words for standard units and 11 words for tr-2-3', () => {
    const words11 = Array.from({ length: 11 }, (_, idx) => {
      const n = String(idx + 1).padStart(2, '0');
      return { id: `tr-2-3-w${n}`, text: `w${n}`, ru: `р${n}`, audio: `tr/2-3/w${n}.mp3` };
    });

    const validTr23 = {
      id: 'tr-2-3',
      course: 'tr' as const,
      section: 2,
      order: 3,
      slug: '2-3-questions',
      title_ru: 'Вопросы',
      character: 'elif',
      boss: false,
      words: words11,
      skills: {
        speaking: { exercises: [] },
        listening: { exercises: [] },
        writing: { exercises: [] },
        reading: { exercises: [] },
      },
      review: 'draft' as const,
    };

    expect(() => UnitSchema.parse(validTr23)).not.toThrow();

    // Standard unit with 11 words must fail
    const invalidTr11 = {
      ...validTr23,
      id: 'tr-1-1',
      section: 1,
      order: 1,
      slug: '1-1-food-and-drinks',
    };
    expect(() => UnitSchema.parse(invalidTr11)).toThrow(/must have exactly 12 words/);
  });

  it('validates AudioManifestSchema', () => {
    const manifest = {
      version: 1 as const,
      updated_at: '2026-11-18T00:00:00.000Z',
      total_clips: 1,
      total_bytes: 12345,
      clips: {
        'tr/1-1/w01.mp3': {
          path: 'tr/1-1/w01.mp3',
          course: 'tr' as const,
          unit_id: 'tr-1-1',
          text: 'su',
          voice: 'Aoede',
          style: 'say clearly:',
          model: 'gemini-2.5-flash-preview-tts',
          hash: 'a'.repeat(64),
          bytes: 12345,
        },
      },
    };
    expect(() => AudioManifestSchema.parse(manifest)).not.toThrow();
  });
});

describe('Source Markdown Parser & Zero-Trust Verification', () => {
  it('parses a words line accurately', () => {
    const line =
      '**Слова (12):** su — вода · çay — чай · kahve — кофе · süt — молоко · ekmek — хлеб · peynir — сыр · yumurta — яйцо · elma — яблоко · portakal — апельсин · çorba — суп · tuz — соль · şeker — сахар';
    const words = parseWordsLine(line, 'tr', 1, 1);
    expect(words).toHaveLength(12);
    expect(words[0]).toEqual({
      id: 'tr-1-1-w01',
      text: 'su',
      ru: 'вода',
      audio: 'tr/1-1/w01.mp3',
    });
    expect(words[11]).toEqual({
      id: 'tr-1-1-w12',
      text: 'şeker',
      ru: 'сахар',
      audio: 'tr/1-1/w12.mp3',
    });
  });

  it('parses all 70 Turkish units (67 regular + 3 bosses) and 63 English units (60 regular + 3 bosses)', () => {
    const root = process.cwd();
    const trMd = fs.readFileSync(
      path.join(root, 'content-src', 'duolingo_turkish_skills_words.md'),
      'utf8',
    );
    const enMd = fs.readFileSync(
      path.join(root, 'content-src', 'duolingo_english_skills_words.md'),
      'utf8',
    );
    const topicsMd = fs.readFileSync(
      path.join(root, 'content-src', 'duolingo_english_topics.md'),
      'utf8',
    );

    const topics = parseEnglishTopicsMarkdown(topicsMd);
    expect(topics.byUnitNumber.size).toBe(295);

    const trParsed = parseSkillsWordsMarkdown(trMd, 'tr');
    expect(CourseSchema.parse(trParsed.course)).toBeTruthy();
    expect(trParsed.units).toHaveLength(70); // 67 units + 3 bosses
    for (const u of trParsed.units) {
      expect(() => UnitSchema.parse(u)).not.toThrow();
    }

    const enParsed = parseSkillsWordsMarkdown(enMd, 'en', topics);
    expect(CourseSchema.parse(enParsed.course)).toBeTruthy();
    expect(enParsed.units).toHaveLength(63); // 60 units + 3 bosses
    for (const u of enParsed.units) {
      expect(() => UnitSchema.parse(u)).not.toThrow();
    }
  });
});

describe('Turkish & English Normalization (toLocaleLowerCase("tr-TR") & diacritics)', () => {
  it('handles Turkish dotless ı and dotted İ properly with tr-TR locale', () => {
    expect(normalizeText('IŞIK', 'tr')).toBe('ışık');
    expect(normalizeText('İstanbul!', 'tr')).toBe('istanbul');
  });

  it('folds Turkish diacritics to ASCII', () => {
    expect(foldTurkishDiacritics('çorba şeker süt ğ ı ö')).toBe('corba seker sut g i o');
  });

  it('grades exact match (ignoring punctuation and case) as correct', () => {
    const res = checkTypedAnswer(
      '  ben bir portakal istiyorum! ',
      ['Ben bir portakal istiyorum.'],
      'tr',
    );
    expect(res.status).toBe('correct');
    expect(res.hint_ru).toBeNull();
  });

  it('grades Turkish input without Turkish letters as almost_correct with a hint', () => {
    const res = checkTypedAnswer(
      'Ben corba ve sut istiyorum',
      ['Ben çorba ve süt istiyorum.'],
      'tr',
    );
    expect(res.status).toBe('almost_correct');
    expect(res.hint_ru).toContain('Ben çorba ve süt istiyorum.');
  });

  it('grades wrong answer as incorrect', () => {
    const res = checkTypedAnswer('Ben kahve istiyorum', ['Ben su istiyorum.'], 'tr');
    expect(res.status).toBe('incorrect');
  });
});
