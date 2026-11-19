import fs from 'node:fs';
import path from 'node:path';
import { CourseSchema, UnitSchema, type Course, type CourseId, type Unit } from './schema';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'courses');

/**
 * Demo units that are always playable during Stage 2 / MVP preview
 * even before full section review on Stage 4.
 */
export const DEMO_UNIT_IDS = new Set<string>(['tr-1-1', 'en-1-1']);

export function isUnitPlayableInCurrentEnv(unit: Unit): boolean {
  if (unit.review === 'claude_ok') return true;
  if (DEMO_UNIT_IDS.has(unit.id)) return true;
  if (process.env.NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT === 'true') return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
}

export function getCourseData(courseId: CourseId): Course {
  const filePath = path.join(CONTENT_DIR, courseId, 'course.json');
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return CourseSchema.parse(raw);
}

export function getUnitById(courseId: CourseId, unitId: string): Unit | null {
  const filePath = path.join(CONTENT_DIR, courseId, 'units', `${unitId}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return UnitSchema.parse(raw);
}

export function getAllUnitsForCourse(courseId: CourseId): Unit[] {
  const course = getCourseData(courseId);
  const units: Unit[] = [];
  for (const section of course.sections) {
    for (const unitId of section.unit_ids) {
      const unit = getUnitById(courseId, unitId);
      if (unit) {
        units.push(unit);
      }
    }
  }
  return units;
}

export function getUnitBySlug(courseId: CourseId, slug: string): Unit | null {
  const units = getAllUnitsForCourse(courseId);
  return units.find((u) => u.slug === slug) ?? null;
}

export function unitHasExercises(unit: Unit): boolean {
  return (
    unit.skills.speaking.exercises.length > 0 &&
    unit.skills.listening.exercises.length > 0 &&
    unit.skills.writing.exercises.length > 0 &&
    unit.skills.reading.exercises.length > 0
  );
}
