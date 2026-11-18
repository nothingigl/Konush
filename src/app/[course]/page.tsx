import { notFound } from 'next/navigation';
import { CoursePathClient, type CourseUnitSummary } from '@/components/course-path-client';
import { getAllUnitsForCourse, getCourseData } from '@/lib/content/loader';
import { CourseIdSchema } from '@/lib/content/schema';

export function generateStaticParams() {
  return [{ course: 'tr' }, { course: 'en' }];
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

  return <CoursePathClient course={course} units={summaries} />;
}
