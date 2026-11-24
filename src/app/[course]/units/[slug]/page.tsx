import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { UnitDetailClient } from '@/components/unit-detail-client';
import { getAllUnitsForCourse, getCourseData, getUnitBySlug } from '@/lib/content/loader';
import { CourseIdSchema } from '@/lib/content/schema';
import { buildUnitJsonLd, getCourseLanguageLabel, SITE_NAME } from '@/lib/seo/site';

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

  const langLabel = getCourseLanguageLabel(unit.course);
  const wordsPreview = unit.words
    .slice(0, 5)
    .map((w) => `${w.text} (${w.ru})`)
    .join(', ');

  const canonical = `/${unit.course}/units/${unit.slug}`;
  const title = `${unit.title_ru} — ${langLabel}`;
  const description = unit.boss
    ? `Босс-вызов секции ${unit.section} (${langLabel}): практика говорения, слушания, письма и чтения в ${SITE_NAME}.`
    : `Урок «${unit.title_ru}» (${langLabel}): ${unit.words.length} слов (${wordsPreview}) и 4 мини-игры по навыкам бесплатно в ${SITE_NAME}.`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'article',
      locale: 'ru_RU',
      url: canonical,
      title: `${title} | ${SITE_NAME}`,
      description,
    },
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

  const course = getCourseData(parsed.data);
  const sectionCefr = course.sections.find((s) => s.section === unit.section)?.cefr ?? 'A1';
  const jsonLd = buildUnitJsonLd(unit, sectionCefr);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <UnitDetailClient unit={unit} />
    </>
  );
}
