import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { UnitDetailClient } from '@/components/unit-detail-client';
import { getAllUnitsForCourse, getUnitBySlug } from '@/lib/content/loader';
import { CourseIdSchema } from '@/lib/content/schema';

export function generateStaticParams() {
  const params: Array<{ course: string; slug: string }> = [];
  for (const courseId of ['tr', 'en'] as const) {
    const units = getAllUnitsForCourse(courseId);
    for (const unit of units) {
      params.push({ course: courseId, slug: unit.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string; slug: string }>;
}): Promise<Metadata> {
  const { course: rawCourse, slug } = await params;
  const parsed = CourseIdSchema.safeParse(rawCourse);
  if (!parsed.success) return {};

  const unit = getUnitBySlug(parsed.data, slug);
  if (!unit) return {};

  const langLabel = unit.course === 'tr' ? 'Турецкий язык' : 'Английский язык';
  const wordsPreview = unit.words
    .slice(0, 5)
    .map((w) => `${w.text} (${w.ru})`)
    .join(', ');

  return {
    title: `${unit.title_ru} — ${langLabel} | Türkçe Duo`,
    description: unit.boss
      ? `Босс-вызов секции ${unit.section} (${langLabel}): практика говорения, слушания, письма и чтения.`
      : `Урок «${unit.title_ru}» (${langLabel}): ${unit.words.length} слов (${wordsPreview}) и 4 мини-игры по навыкам.`,
  };
}

export default async function UnitPage({
  params,
}: {
  params: Promise<{ course: string; slug: string }>;
}) {
  const { course: rawCourse, slug } = await params;
  const parsed = CourseIdSchema.safeParse(rawCourse);
  if (!parsed.success) {
    notFound();
  }

  const unit = getUnitBySlug(parsed.data, slug);
  if (!unit) {
    notFound();
  }

  return <UnitDetailClient unit={unit} />;
}
