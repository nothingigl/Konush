import fs from 'node:fs';
import path from 'node:path';
import {
  CourseSchema,
  UnitSchema,
  type CourseId,
  type Exercise,
  type Unit,
} from '../src/lib/content/schema';

const ROOT_DIR = process.cwd();
const CONTENT_DIR = path.join(ROOT_DIR, 'content', 'courses');
const REVIEWS_CONTENT_DIR = path.join(ROOT_DIR, 'reviews', 'content');

const SKILL_HEADERS = [
  { key: 'speaking' as const, label: '🗣 Навык 1: Говорение (Speaking)' },
  { key: 'listening' as const, label: '🎧 Навык 2: Слушание (Listening)' },
  { key: 'writing' as const, label: '✍️ Навык 3: Письмо (Writing)' },
  { key: 'reading' as const, label: '📖 Навык 4: Чтение (Reading)' },
];

function formatExerciseMarkdown(ex: Exercise, index: number): string {
  const lines: string[] = [];
  lines.push(`#### ${index}. \`${ex.id}\` — тип: \`${ex.type}\` | источник: \`${ex.origin}\``);
  lines.push(`- **Задание (RU):** ${ex.prompt_ru}`);

  switch (ex.type) {
    case 'word_card':
      lines.push(`- **Слово/фраза:** \`${ex.target_text}\` — **Перевод:** ${ex.translation_ru}`);
      if (ex.example_text) {
        lines.push(`- **Пример:** *${ex.example_text}* (${ex.example_ru ?? ''})`);
      }
      break;
    case 'speak_repeat':
      lines.push(`- **Эталон для произношения:** *${ex.target_text}*`);
      if (ex.translation_ru) {
        lines.push(`- **Перевод:** ${ex.translation_ru}`);
      }
      break;
    case 'listen_choose':
      lines.push(`- **Аудио-скрипт:** *${ex.transcript}*`);
      lines.push(
        `- **Варианты:** ${ex.options.map((o, i) => (i === ex.correct_index ? `**[${o}]**` : o)).join(' · ')}`,
      );
      lines.push(`- **Ключ (→):** ${ex.options[ex.correct_index]}`);
      break;
    case 'listen_type':
      lines.push(`- **Аудио-скрипт:** *${ex.transcript}*`);
      lines.push(`- **Ключ (→):** ${ex.accepted.join(' / ')}`);
      break;
    case 'multiple_choice':
      if (ex.question_text) {
        lines.push(`- **Текст вопроса:** *${ex.question_text}*`);
      }
      lines.push(
        `- **Варианты:** ${ex.options.map((o, i) => (i === ex.correct_index ? `**[${o}]**` : o)).join(' · ')}`,
      );
      lines.push(`- **Ключ (→):** ${ex.options[ex.correct_index]}`);
      break;
    case 'build_sentence':
      if (ex.source_text) {
        lines.push(`- **Исходная фраза:** ${ex.source_text}`);
      }
      lines.push(`- **Кубики (bank):** ${ex.bank.map((b) => `[${b}]`).join(' ')}`);
      lines.push(`- **Ключ (→):** *${ex.accepted.join(' / ')}*`);
      break;
    case 'type_answer':
      if (ex.source_text) {
        lines.push(`- **Исходный текст:** ${ex.source_text}`);
      }
      lines.push(`- **Ключ (→):** *${ex.accepted.join(' / ')}*`);
      break;
    case 'fix_bug':
      lines.push(`- **Фраза с багом:** ~~${ex.buggy_text}~~`);
      lines.push(`- **Ключ (→):** *${ex.accepted.join(' / ')}*`);
      break;
    case 'match_pairs':
      lines.push(`- **Пары (→):** ${ex.pairs.map((p) => `${p.left} ↔ ${p.right}`).join(' · ')}`);
      break;
    case 'odd_one_out':
      lines.push(`- **Ряд слов:** ${ex.items.join(' – ')}`);
      lines.push(`- **Лишнее (→):** *${ex.items[ex.odd_index]}*`);
      break;
    case 'order_items':
      lines.push(`- **Дано вразброс:** ${ex.items_shuffled.join(', ')}`);
      lines.push(`- **Правильный порядок (→):** *${ex.correct_order.join(' → ')}*`);
      break;
    case 'read_comprehension':
      lines.push(`- **Текст для чтения:**\n  > ${ex.passage.replace(/\n/g, '\n  > ')}`);
      for (const [qIdx, q] of ex.questions.entries()) {
        lines.push(`- **Вопрос ${qIdx + 1}:** ${q.question_ru}`);
        if (q.options) {
          lines.push(
            `  - **Варианты:** ${q.options.map((o, i) => (i === (q.correct_index ?? 0) ? `**[${o}]**` : o)).join(' · ')}`,
          );
        }
        lines.push(`  - **Ключ (→):** ${q.accepted.join(' / ')}`);
      }
      break;
  }

  if (ex.explain_ru) {
    lines.push(`- **Пояснение:** ${ex.explain_ru}`);
  }

  return lines.join('\n');
}

function exportSectionReview(courseId: CourseId, sectionNum: number): void {
  const coursePath = path.join(CONTENT_DIR, courseId, 'course.json');
  const course = CourseSchema.parse(JSON.parse(fs.readFileSync(coursePath, 'utf8')));
  const section = course.sections.find((s) => s.section === sectionNum);
  if (!section) {
    throw new Error(`Section ${sectionNum} not found in course "${courseId}"`);
  }

  const units: Unit[] = section.unit_ids.map((uid) => {
    const uPath = path.join(CONTENT_DIR, courseId, 'units', `${uid}.json`);
    return UnitSchema.parse(JSON.parse(fs.readFileSync(uPath, 'utf8')));
  });

  const totalWords = units.reduce((acc, u) => acc + u.words.length, 0);
  const totalExercises = units.reduce(
    (acc, u) =>
      acc +
      u.skills.speaking.exercises.length +
      u.skills.listening.exercises.length +
      u.skills.writing.exercises.length +
      u.skills.reading.exercises.length,
    0,
  );

  const mdLines: string[] = [];
  mdLines.push(
    `# Пакет проверки контента: Курс \`${courseId}\` — ${section.title_ru} (Уровень ${section.cefr})`,
  );
  mdLines.push('');
  mdLines.push(
    `> **Назначение файла:** Самодостаточный пакет всех слов и упражнений секции для вычитки грамматики, естественности фраз, переводов и ключей внешним ревьюером (Claude) и владельцем проекта.`,
  );
  mdLines.push(
    `> **Статистика секции:** Юнитов: **${units.length}** (включая босс-юнит) · Слов: **${totalWords}** · Упражнений: **${totalExercises}**.`,
  );
  mdLines.push('');
  mdLines.push('---');

  for (const unit of units) {
    mdLines.push('');
    mdLines.push(
      `## Юнит \`${unit.id}\` — ${unit.title_ru} (слаг: \`${unit.slug}\`, персонаж: \`${unit.character}\`, статус: \`${unit.review}\`)`,
    );
    mdLines.push('');

    if (!unit.boss) {
      mdLines.push(`### Слова юнита (${unit.words.length})`);
      mdLines.push('');
      mdLines.push('| # | ID | Слово | Перевод (RU) | Аудио |');
      mdLines.push('|---|---|---|---|---|');
      unit.words.forEach((w, idx) => {
        mdLines.push(`| ${idx + 1} | \`${w.id}\` | **${w.text}** | ${w.ru} | \`${w.audio}\` |`);
      });
      mdLines.push('');
    } else {
      mdLines.push(
        '*Босс-юнит секции: новых слов нет (0 слов), 15 итоговых упражнений на все 4 навыка.*',
      );
      mdLines.push('');
    }

    for (const sk of SKILL_HEADERS) {
      const exList = unit.skills[sk.key].exercises;
      mdLines.push(`### ${sk.label} (${exList.length} упр.)`);
      mdLines.push('');
      exList.forEach((ex, idx) => {
        mdLines.push(formatExerciseMarkdown(ex, idx + 1));
        mdLines.push('');
      });
    }

    mdLines.push('---');
  }

  fs.mkdirSync(REVIEWS_CONTENT_DIR, { recursive: true });
  const outPath = path.join(REVIEWS_CONTENT_DIR, `${courseId}-section-${sectionNum}.md`);
  fs.writeFileSync(outPath, `${mdLines.join('\n')}\n`, 'utf8');
  console.log(
    `[content:export-review] Wrote ${outPath} (${units.length} units, ${totalWords} words, ${totalExercises} exercises)`,
  );
}

function main(): void {
  const arg = process.argv.find((a) => a.startsWith('--section='))?.split('=')[1] ?? 'tr-1';
  const [courseRaw, secRaw] = arg.split('-');
  const courseId = (courseRaw === 'en' ? 'en' : 'tr') as CourseId;
  const sectionNum = Number.parseInt(secRaw ?? '1', 10);
  exportSectionReview(courseId, sectionNum);
}

main();
