import type { Course, CourseId, PlannedTopic, Unit, Word } from './schema';

/**
 * Deterministic English Latin slugs for the 67 Turkish units + 3 bosses.
 * Matches Section 6 requirement: "<section>-<order>-<english-slug>", e.g. "1-1-food-and-drinks".
 */
export const TURKISH_UNIT_SLUGS: Record<string, string> = {
  // Section 1 (9 units + boss)
  '1.1': '1-1-food-and-drinks',
  '1.2': '1-2-common-phrases',
  '1.3': '1-3-describing-objects',
  '1.4': '1-4-food-2',
  '1.5': '1-5-accusative-case',
  '1.6': '1-6-animals',
  '1.7': '1-7-plural-nouns',
  '1.8': '1-8-describing-objects-2',
  '1.9': '1-9-possession',
  '1.boss': '1-boss-cafe',
  // Section 2 (30 units + boss)
  '2.1': '2-1-professions',
  '2.2': '2-2-indirect-objects-dative',
  '2.3': '2-3-questions',
  '2.4': '2-4-places',
  '2.5': '2-5-numbers',
  '2.6': '2-6-clothes',
  '2.7': '2-7-present-continuous',
  '2.8': '2-8-times-of-day-and-days',
  '2.9': '2-9-ablative-case',
  '2.10': '2-10-colors',
  '2.11': '2-11-dative-case',
  '2.12': '2-12-telling-time',
  '2.13': '2-13-locations-and-positions',
  '2.14': '2-14-describing-people',
  '2.15': '2-15-complex-sentences',
  '2.16': '2-16-questions-opinions',
  '2.17': '2-17-family',
  '2.18': '2-18-pronouns',
  '2.19': '2-19-adverbs',
  '2.20': '2-20-existence-and-absence',
  '2.21': '2-21-countries-and-origins',
  '2.22': '2-22-infinitives',
  '2.23': '2-23-travel',
  '2.24': '2-24-people',
  '2.25': '2-25-ordinal-numbers',
  '2.26': '2-26-weather-right-now',
  '2.27': '2-27-household-items',
  '2.28': '2-28-past-events',
  '2.29': '2-29-materials-and-shapes',
  '2.30': '2-30-future-tense',
  '2.boss': '2-boss-city-quest',
  // Section 3 (28 units + boss)
  '3.1': '3-1-present-negation',
  '3.2': '3-2-past-negation',
  '3.3': '3-3-nothing-nobody-nowhere',
  '3.4': '3-4-prohibitions',
  '3.5': '3-5-lets-optative',
  '3.6': '3-6-invitations',
  '3.7': '3-7-accepting-and-declining',
  '3.8': '3-8-polite-requests',
  '3.9': '3-9-body-parts',
  '3.10': '3-10-symptoms',
  '3.11': '3-11-at-the-pharmacy',
  '3.12': '3-12-at-the-doctor',
  '3.13': '3-13-past-habits',
  '3.14': '3-14-present-habits-aorist',
  '3.15': '3-15-abilities',
  '3.16': '3-16-permission-and-rules',
  '3.17': '3-17-obligation-and-necessity',
  '3.18': '3-18-giving-advice',
  '3.19': '3-19-sports',
  '3.20': '3-20-competitions',
  '3.21': '3-21-nature',
  '3.22': '3-22-weather-and-seasons',
  '3.23': '3-23-possibility',
  '3.24': '3-24-passive-voice',
  '3.25': '3-25-participles',
  '3.26': '3-26-reasons-and-conditions',
  '3.27': '3-27-gerunds-and-sequence',
  '3.28': '3-28-reflexive-and-self',
  '3.boss': '3-boss-clinic-marathon',
};

const CHARACTERS = ['elif', 'kemal', 'zeynep', 'emre'] as const;

/**
 * Converts an English topic title into a clean URL slug segment.
 */
export function slugifyEnglishTopic(unitKey: string, englishTitle: string): string {
  const prefix = unitKey.replace('.', '-');
  const cleaned = englishTitle
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${prefix}-${cleaned}`;
}

export interface ParsedTopicMap {
  byUnitNumber: Map<string, PlannedTopic>;
  bySection: Map<number, PlannedTopic[]>;
}

/**
 * Parses `content-src/duolingo_english_topics.md` (all 295 topics across 8 modules).
 */
export function parseEnglishTopicsMarkdown(markdown: string): ParsedTopicMap {
  const byUnitNumber = new Map<string, PlannedTopic>();
  const bySection = new Map<number, PlannedTopic[]>();

  const lines = markdown.split(/\r?\n/);
  const topicRegex = /^- ☐ ([1-8]\.[1-9][0-9]*)\s+(.+?)\s+—\s+(.+)$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = topicRegex.exec(line);
    if (!match) continue;

    const unitNumber = match[1]!;
    const titleRu = match[2]!.trim();
    const titleEn = match[3]!
      .replace(/\s*\(часть\s*\d+\)\s*$/i, (m) => {
        const partNum = /\d+/.exec(m)?.[0] ?? '2';
        return ` part ${partNum}`;
      })
      .trim();

    const section = Number.parseInt(unitNumber.split('.')[0]!, 10);
    const order = Number.parseInt(unitNumber.split('.')[1]!, 10);
    const implementedUnitId = section <= 3 ? `en-${section}-${order}` : null;

    const topic: PlannedTopic = {
      unit_number: unitNumber,
      title_ru: titleRu,
      title_en: titleEn,
      implemented_unit_id: implementedUnitId,
    };

    byUnitNumber.set(unitNumber, topic);
    const list = bySection.get(section) ?? [];
    list.push(topic);
    bySection.set(section, list);
  }

  return { byUnitNumber, bySection };
}

/**
 * Parses a `**Слова (N):** word — translation · ...` line into structured `Word[]`.
 */
export function parseWordsLine(
  line: string,
  course: CourseId,
  section: number,
  unitOrder: number,
): Word[] {
  const prefixMatch = /^\*\*Слова\s*\(\d+\):\*\*\s*(.+)$/.exec(line.trim());
  if (!prefixMatch) {
    throw new Error(`Invalid words line format in ${course}-${section}-${unitOrder}: "${line}"`);
  }

  const rawPairs = prefixMatch[1]!
    .split('·')
    .map((item) => item.trim())
    .filter(Boolean);
  return rawPairs.map((pair, idx) => {
    const dashIndex = pair.indexOf(' — ');
    if (dashIndex === -1) {
      throw new Error(
        `Missing " — " separator in word pair "${pair}" (${course}-${section}-${unitOrder})`,
      );
    }
    const text = pair.slice(0, dashIndex).trim();
    const ru = pair.slice(dashIndex + 3).trim();
    const numStr = String(idx + 1).padStart(2, '0');
    return {
      id: `${course}-${section}-${unitOrder}-w${numStr}`,
      text,
      ru,
      audio: `${course}/${section}-${unitOrder}/w${numStr}.mp3`,
    };
  });
}

export interface ParsedCourseResult {
  course: Course;
  units: Unit[];
}

/**
 * Deterministically parses a course skills/words markdown file into `Course` + `Unit[]` skeletons.
 */
export function parseSkillsWordsMarkdown(
  markdown: string,
  courseId: CourseId,
  englishTopics?: ParsedTopicMap,
): ParsedCourseResult {
  const lines = markdown.split(/\r?\n/);
  const units: Unit[] = [];
  const sectionUnits = new Map<number, string[]>();

  let currentSection = 0;
  let orderInSection = 0;
  let globalIndex = 0;

  const regularHeadingRegex = /^###\s+([1-8])\.([1-9][0-9]*)\s+(.+?)\s*☐\s*$/;
  const bossHeadingRegex = /^###\s+🏆\s+Босс\s+(?:секции|модуля)\s+([1-8]):\s+(.+?)\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();

    const regularMatch = regularHeadingRegex.exec(line);
    if (regularMatch) {
      const section = Number.parseInt(regularMatch[1]!, 10);
      const unitNum = Number.parseInt(regularMatch[2]!, 10);
      const titleRu = regularMatch[3]!.trim();

      if (section !== currentSection) {
        currentSection = section;
        orderInSection = 0;
      }
      orderInSection += 1;

      const unitKey = `${section}.${unitNum}`;
      const unitId = `${courseId}-${section}-${unitNum}`;

      // Look ahead for the **Слова (...):** line
      let wordsLine: string | null = null;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j]!.trim().startsWith('**Слова')) {
          wordsLine = lines[j]!.trim();
          break;
        }
      }
      if (!wordsLine) {
        throw new Error(`Missing "**Слова" line for unit ${unitId}`);
      }

      const words = parseWordsLine(wordsLine, courseId, section, unitNum);

      let slug: string;
      if (courseId === 'tr') {
        const mapped = TURKISH_UNIT_SLUGS[unitKey];
        if (!mapped) {
          throw new Error(`Missing slug mapping for Turkish unit ${unitKey}`);
        }
        slug = mapped;
      } else {
        const topic = englishTopics?.byUnitNumber.get(unitKey);
        const enTitle = topic?.title_en ?? `unit-${unitNum}`;
        slug = slugifyEnglishTopic(unitKey, enTitle);
      }

      const character = CHARACTERS[globalIndex % CHARACTERS.length]!;
      globalIndex += 1;

      const unit: Unit = {
        id: unitId,
        course: courseId,
        section,
        order: orderInSection,
        slug,
        title_ru: titleRu,
        character,
        boss: false,
        words,
        skills: {
          speaking: { exercises: [] },
          listening: { exercises: [] },
          writing: { exercises: [] },
          reading: { exercises: [] },
        },
        review: 'draft',
      };

      units.push(unit);
      const secList = sectionUnits.get(section) ?? [];
      secList.push(unitId);
      sectionUnits.set(section, secList);
      continue;
    }

    const bossMatch = bossHeadingRegex.exec(line);
    if (bossMatch) {
      const section = Number.parseInt(bossMatch[1]!, 10);
      const rawBossTitle = bossMatch[2]!.trim();
      const titleRu = `Босс: ${rawBossTitle}`;
      orderInSection += 1;

      const unitKey = `${section}.boss`;
      const unitId = `${courseId}-${section}-boss`;

      const englishBossSlugs: Record<string, string> = {
        '1.boss': '1-boss-first-day-in-english',
        '2.boss': '2-boss-big-trip',
        '3.boss': '3-boss-story-about-the-past',
      };

      const slug =
        courseId === 'tr'
          ? (TURKISH_UNIT_SLUGS[unitKey] ?? `${section}-boss-challenge`)
          : (englishBossSlugs[unitKey] ?? `${section}-boss-challenge`);

      const character = CHARACTERS[globalIndex % CHARACTERS.length]!;
      globalIndex += 1;

      const unit: Unit = {
        id: unitId,
        course: courseId,
        section,
        order: orderInSection,
        slug,
        title_ru: titleRu,
        character,
        boss: true,
        words: [],
        skills: {
          speaking: { exercises: [] },
          listening: { exercises: [] },
          writing: { exercises: [] },
          reading: { exercises: [] },
        },
        review: 'draft',
      };

      units.push(unit);
      const secList = sectionUnits.get(section) ?? [];
      secList.push(unitId);
      sectionUnits.set(section, secList);
    }
  }

  const course: Course =
    courseId === 'tr'
      ? {
          id: 'tr',
          title_ru: 'Турецкий язык с нуля (A1)',
          description_ru:
            'Практический курс турецкого языка для русскоязычных: 67 юнитов и 3 босс-вызова по 4 навыкам (говорение, слушание, письмо, чтение).',
          sections: [
            {
              section: 1,
              title_ru: 'Секция 1 — Вводная',
              cefr: 'Intro',
              description_ru:
                'Базовые слова, вежливые фразы, описание предметов и винительный падеж.',
              unit_ids: sectionUnits.get(1) ?? [],
            },
            {
              section: 2,
              title_ru: 'Секция 2 — Основы общения (A1)',
              cefr: 'A1',
              description_ru: 'Профессии, падежи, числа, настоящее, прошедшее и будущее время.',
              unit_ids: sectionUnits.get(2) ?? [],
            },
            {
              section: 3,
              title_ru: 'Секция 3 — Уверенный базовый уровень (A1+)',
              cefr: 'A1',
              description_ru:
                'Отрицание, приглашения, здоровье, привычки, модальность, страдательный залог и причастия.',
              unit_ids: sectionUnits.get(3) ?? [],
            },
          ],
        }
      : {
          id: 'en',
          title_ru: 'Английский язык для русскоязычных',
          description_ru:
            'Практический курс английского языка: 60 активных юнитов и 3 босс-вызова (Intro + A1) с полной картой тем до уровня B2 (295 юнитов).',
          sections: [
            {
              section: 1,
              title_ru: 'Модуль 1 — Intro',
              cefr: 'Intro',
              description_ru: 'Основные фразы и простая грамматика.',
              unit_ids: sectionUnits.get(1) ?? [],
              planned_topics: englishTopics?.bySection.get(1),
            },
            {
              section: 2,
              title_ru: 'Модуль 2 — Начальный A1',
              cefr: 'A1',
              description_ru: 'Простые разговорные слова, фразы и конструкции.',
              unit_ids: sectionUnits.get(2) ?? [],
              planned_topics: englishTopics?.bySection.get(2),
            },
            {
              section: 3,
              title_ru: 'Модуль 3 — Базовый A1',
              cefr: 'A1',
              description_ru: 'Больше основ для общения на базовом уровне.',
              unit_ids: sectionUnits.get(3) ?? [],
              planned_topics: englishTopics?.bySection.get(3),
            },
            {
              section: 4,
              title_ru: 'Модуль 4 — Повседневные темы (A2)',
              cefr: 'A2',
              description_ru:
                'Используйте предложения в разговорах на повседневные темы (в разработке).',
              unit_ids: [],
              planned_topics: englishTopics?.bySection.get(4),
            },
            {
              section: 5,
              title_ru: 'Модуль 5 — Разнообразные темы (B1)',
              cefr: 'B1',
              description_ru: 'Составляйте предложения на разнообразные темы (в разработке).',
              unit_ids: [],
              planned_topics: englishTopics?.bySection.get(5),
            },
            {
              section: 6,
              title_ru: 'Модуль 6 — Более сложные темы (B1+)',
              cefr: 'B1',
              description_ru: 'Обсуждайте более сложные темы (в разработке).',
              unit_ids: [],
              planned_topics: englishTopics?.bySection.get(6),
            },
            {
              section: 7,
              title_ru: 'Модуль 7 — Абстрактные чувства и мнения (B2)',
              cefr: 'B2',
              description_ru: 'Говорите об абстрактных чувствах и мнениях (в разработке).',
              unit_ids: [],
              planned_topics: englishTopics?.bySection.get(7),
            },
            {
              section: 8,
              title_ru: 'Модуль 8 — Уверенное общение (B2+)',
              cefr: 'B2',
              description_ru: 'Уверенно общайтесь даже на более узкие темы (в разработке).',
              unit_ids: [],
              planned_topics: englishTopics?.bySection.get(8),
            },
          ],
        };

  return { course, units };
}
