import { notFound } from 'next/navigation';
import { LessonPlayerClient } from '@/components/lesson-player-client';
import { getAllUnitsForCourse, getUnitBySlug, unitHasExercises } from '@/lib/content/loader';
import { CourseIdSchema } from '@/lib/content/schema';
import type { SkillKey } from '@/lib/db/dexie';

const VALID_SKILLS: ReadonlySet<string> = new Set(['speaking', 'listening', 'writing', 'reading']);

export function generateStaticParams() {
  const params: Array<{ course: string; slug: string; skill: string }> = [];
  for (const courseId of ['tr', 'en'] as const) {
    const units = getAllUnitsForCourse(courseId);
    for (const unit of units) {
      if (unitHasExercises(unit)) {
        for (const skill of ['speaking', 'listening', 'writing', 'reading']) {
          params.push({ course: courseId, slug: unit.slug, skill });
        }
      }
    }
  }
  return params;
}

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ course: string; slug: string; skill: string }>;
}) {
  const { course: rawCourse, slug, skill } = await params;
  const parsedCourse = CourseIdSchema.safeParse(rawCourse);
  if (!parsedCourse.success || !VALID_SKILLS.has(skill)) {
    notFound();
  }

  const unit = getUnitBySlug(parsedCourse.data, slug);
  if (!unit) {
    notFound();
  }

  return <LessonPlayerClient unit={unit} skill={skill as SkillKey} />;
}
