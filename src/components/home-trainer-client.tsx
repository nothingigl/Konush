'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CourseId, Unit } from '@/lib/content/schema';
import type { LocalUnitProgressRecord, SkillKey } from '@/lib/db/dexie';
import { LessonPlayerClient } from './lesson-player-client';
import { useAppState } from './providers/app-provider';

const SKILL_ORDER: SkillKey[] = ['writing', 'listening', 'speaking', 'reading'];

function pickNextSkill(progress: LocalUnitProgressRecord | undefined): SkillKey {
  if (!progress) return 'writing';
  if (progress.writingBest === null) return 'writing';
  if (progress.listeningBest === null) return 'listening';
  if (progress.speakingBest === null) return 'speaking';
  if (progress.readingBest === null) return 'reading';
  return 'writing';
}

export function HomeTrainerClient({
  starterUnits,
  courseUnitOrder,
}: {
  starterUnits: Record<CourseId, Unit>;
  courseUnitOrder: Record<CourseId, string[]>;
}) {
  const { profile, unitProgressMap } = useAppState();
  const activeCourse: CourseId = profile.preferredCourse === 'en' ? 'en' : 'tr';

  const [loadedUnits, setLoadedUnits] = useState<Record<string, Unit>>(() => ({
    [starterUnits.tr.id]: starterUnits.tr,
    [starterUnits.en.id]: starterUnits.en,
  }));

  const [manualSkill, setManualSkill] = useState<{
    course: CourseId;
    unitId: string;
    skill: SkillKey;
  } | null>(null);
  const [sessionNonce, setSessionNonce] = useState(0);

  const recommendedUnitId = useMemo(() => {
    const orderedIds = courseUnitOrder[activeCourse] ?? [];
    const nextUnfinished = orderedIds.find((id) => !unitProgressMap[id]?.completedAt);
    return nextUnfinished ?? starterUnits[activeCourse].id;
  }, [activeCourse, courseUnitOrder, starterUnits, unitProgressMap]);

  useEffect(() => {
    if (loadedUnits[recommendedUnitId]) return;

    let cancelled = false;
    fetch(`/api/units/${activeCourse}/${recommendedUnitId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Unit | null) => {
        if (!cancelled && data && data.id) {
          setLoadedUnits((prev) => ({ ...prev, [data.id]: data }));
        }
      })
      .catch(() => {
        // Offline or network error — gracefully fall back to starter unit
      });

    return () => {
      cancelled = true;
    };
  }, [activeCourse, loadedUnits, recommendedUnitId]);

  const activeUnit: Unit = loadedUnits[recommendedUnitId] ?? starterUnits[activeCourse];

  const activeSkill: SkillKey =
    manualSkill && manualSkill.course === activeCourse && manualSkill.unitId === activeUnit.id
      ? manualSkill.skill
      : pickNextSkill(unitProgressMap[activeUnit.id]);

  const handleSelectSkill = (skill: SkillKey) => {
    setManualSkill({ course: activeCourse, unitId: activeUnit.id, skill });
  };

  const handleContinueNext = () => {
    const currentIdx = SKILL_ORDER.indexOf(activeSkill);
    const nextSkill = SKILL_ORDER[(currentIdx + 1) % SKILL_ORDER.length]!;
    setManualSkill({ course: activeCourse, unitId: activeUnit.id, skill: nextSkill });
    setSessionNonce((n) => n + 1);
  };

  return (
    <LessonPlayerClient
      key={`${activeUnit.id}-${activeSkill}-${sessionNonce}`}
      unit={activeUnit}
      skill={activeSkill}
      embeddedOnHome
      onSelectSkill={handleSelectSkill}
      onContinueNext={handleContinueNext}
    />
  );
}
