import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CoursePathClient, type CourseUnitSummary } from '@/components/course-path-client';
import { getAllUnitsForCourse, getCourseData } from '@/lib/content/loader';
import { CourseIdSchema } from '@/lib/content/schema';
import { buildCourseJsonLd, getCourseLanguageLabel, SITE_NAME } from '@/lib/seo/site';

export function generateStaticParams() {
  return [{ course: 'tr' }, { course: 'en' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string }>;
}): Promise<Metadata> {
  const { course: rawCourse } = await params;
  const parsed = CourseIdSchema.safeParse(rawCourse);
  if (!parsed.success) return {};

  const courseId = parsed.data;
  const course = getCourseData(courseId);
  const allUnits = getAllUnitsForCourse(courseId);
  const langLabel = getCourseLanguageLabel(courseId);
  const canonical = `/${courseId}`;

  return {
    title: `${course.title_ru} (${allUnits.length} юнитов)`,
    description: `${course.description_ru} Все ${allUnits.length} юнитов открыты бесплатно: говорение, слушание, письмо, чтение и повторения 1→3→7→14 дней.`,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'website',
      locale: 'ru_RU',
      url: canonical,
      title: `${course.title_ru} — ${langLabel} | ${SITE_NAME}`,
      description: course.description_ru,
    },
  };
}

export default async function CoursePage({ params }: { params: Promise<{ course: string }> }) {
  const { course: rawCourse } = await params;
  const parsed = CourseIdSchema.safeParse(rawCourse);
  if (!parsed.success) {
    notFound();
  }

  const courseId = parsed.data;
  const course = getCourseData(courseId);
  const allUnits = getAllUnitsForCourse(courseId);

  const summaries: CourseUnitSummary[] = allUnits.map((u) => ({
    id: u.id,
    section: u.section,
    order: u.order,
    slug: u.slug,
    title_ru: u.title_ru,
    boss: u.boss,
    wordCount: u.words.length,
    exerciseCount:
      u.skills.speaking.exercises.length +
      u.skills.listening.exercises.length +
      u.skills.writing.exercises.length +
      u.skills.reading.exercises.length,
  }));

  const jsonLd = buildCourseJsonLd(course, allUnits.length);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CoursePathClient course={course} units={summaries} />
    </>
  );
}
