import { HomeTrainerClient } from '@/components/home-trainer-client';
import { getAllUnitsForCourse, getUnitById } from '@/lib/content/loader';
import type { CourseId, Unit } from '@/lib/content/schema';

export default function HomePage() {
  const trStarter = getUnitById('tr', 'tr-1-1');
  const enStarter = getUnitById('en', 'en-1-1');

  const trUnits = getAllUnitsForCourse('tr');
  const enUnits = getAllUnitsForCourse('en');

  const starterUnits: Record<CourseId, Unit> = {
    tr: trStarter ?? trUnits[0]!,
    en: enStarter ?? enUnits[0]!,
  };

  const courseUnitOrder: Record<CourseId, string[]> = {
    tr: trUnits.map((u) => u.id),
    en: enUnits.map((u) => u.id),
  };

  return <HomeTrainerClient starterUnits={starterUnits} courseUnitOrder={courseUnitOrder} />;
}
