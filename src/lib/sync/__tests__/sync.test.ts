import { describe, expect, it } from 'vitest';
import type {
  LocalDailyActivityRecord,
  LocalProfileRecord,
  LocalReviewStateRecord,
  LocalUnitProgressRecord,
} from '../../db/dexie';
import {
  computeNextReviewSchedule,
  computeStreakDays,
  mergeDailyActivity,
  mergeProfile,
  mergeReviewState,
  mergeUnitProgress,
} from '../merge';

describe('Spaced Repetition Schedule (1 -> 3 -> 7 -> 14 days)', () => {
  const baseDate = new Date('2026-11-18T12:00:00.000Z');

  it('schedules step 1 for +1 day on initial completion', () => {
    const res = computeNextReviewSchedule(null, baseDate);
    expect(res.step).toBe(1);
    expect(res.dueAt).toBe('2026-11-19T12:00:00.000Z');
  });

  it('advances step 1 -> step 2 (+3 days)', () => {
    const res = computeNextReviewSchedule(1, baseDate);
    expect(res.step).toBe(2);
    expect(res.dueAt).toBe('2026-11-21T12:00:00.000Z');
  });

  it('advances step 2 -> step 3 (+7 days)', () => {
    const res = computeNextReviewSchedule(2, baseDate);
    expect(res.step).toBe(3);
    expect(res.dueAt).toBe('2026-11-25T12:00:00.000Z');
  });

  it('advances step 3 -> step 4 (+14 days)', () => {
    const res = computeNextReviewSchedule(3, baseDate);
    expect(res.step).toBe(4);
    expect(res.dueAt).toBe('2026-12-02T12:00:00.000Z');
  });
});

describe('Sync Conflict Resolution Rules', () => {
  it('merges profiles using Last-Write-Wins by updatedAt', () => {
    const older: LocalProfileRecord = {
      id: 'current',
      userId: 'u1',
      email: 'user@example.com',
      displayName: 'Старое имя',
      avatarKey: 'elif',
      uiLang: 'ru',
      preferredCourse: 'tr',
      dailyGoalXp: 10,
      updatedAt: '2026-11-18T10:00:00.000Z',
    };
    const newer: LocalProfileRecord = {
      ...older,
      displayName: 'Новое имя',
      preferredCourse: 'en',
      dailyGoalXp: 30,
      updatedAt: '2026-11-18T11:00:00.000Z',
    };

    expect(mergeProfile(older, newer).displayName).toBe('Новое имя');
    expect(mergeProfile(newer, older).displayName).toBe('Новое имя');
    expect(mergeProfile(older, newer).dailyGoalXp).toBe(30);
  });

  it('merges daily_activity by taking the maximum (xp, lessons, seconds)', () => {
    const deviceA: LocalDailyActivityRecord = {
      day: '2026-11-18',
      xp: 40,
      lessons: 2,
      seconds: 300,
      updatedAt: '2026-11-18T10:00:00.000Z',
    };
    const deviceB: LocalDailyActivityRecord = {
      day: '2026-11-18',
      xp: 25,
      lessons: 3,
      seconds: 450,
      updatedAt: '2026-11-18T12:00:00.000Z',
    };

    const merged = mergeDailyActivity(deviceA, deviceB);
    expect(merged).toEqual({
      day: '2026-11-18',
      xp: 40,
      lessons: 3,
      seconds: 450,
      updatedAt: '2026-11-18T12:00:00.000Z',
    });
  });

  it('merges unit_progress preserving best skill scores across guest and cloud devices', () => {
    const guestLocal: LocalUnitProgressRecord = {
      unitId: 'tr-1-1',
      courseId: 'tr',
      wordsDone: true,
      speakingBest: 100,
      listeningBest: 75,
      writingBest: null,
      readingBest: null,
      completedAt: null,
      updatedAt: '2026-11-18T10:00:00.000Z',
    };
    const cloudRemote: LocalUnitProgressRecord = {
      unitId: 'tr-1-1',
      courseId: 'tr',
      wordsDone: false,
      speakingBest: 80,
      listeningBest: 90,
      writingBest: 100,
      readingBest: 100,
      completedAt: '2026-11-18T11:00:00.000Z',
      updatedAt: '2026-11-18T11:00:00.000Z',
    };

    const merged = mergeUnitProgress(guestLocal, cloudRemote);
    expect(merged.wordsDone).toBe(true);
    expect(merged.speakingBest).toBe(100);
    expect(merged.listeningBest).toBe(90);
    expect(merged.writingBest).toBe(100);
    expect(merged.readingBest).toBe(100);
    expect(merged.completedAt).toBe('2026-11-18T11:00:00.000Z');
    expect(merged.updatedAt).toBe('2026-11-18T11:00:00.000Z');
  });

  it('merges review_state using Last-Write-Wins by updatedAt', () => {
    const localReview: LocalReviewStateRecord = {
      unitId: 'tr-1-1',
      courseId: 'tr',
      step: 2,
      dueAt: '2026-11-21T12:00:00.000Z',
      updatedAt: '2026-11-18T15:00:00.000Z',
    };
    const remoteReview: LocalReviewStateRecord = {
      unitId: 'tr-1-1',
      courseId: 'tr',
      step: 1,
      dueAt: '2026-11-19T12:00:00.000Z',
      updatedAt: '2026-11-18T09:00:00.000Z',
    };

    expect(mergeReviewState(localReview, remoteReview).step).toBe(2);
    expect(mergeReviewState(remoteReview, localReview).step).toBe(2);
  });
});

describe('Daily Streak Calculation', () => {
  it('computes consecutive active days ending today or yesterday', () => {
    const activities: LocalDailyActivityRecord[] = [
      { day: '2026-11-16', xp: 20, lessons: 2, seconds: 200, updatedAt: '' },
      { day: '2026-11-17', xp: 30, lessons: 3, seconds: 300, updatedAt: '' },
      { day: '2026-11-18', xp: 10, lessons: 1, seconds: 100, updatedAt: '' },
    ];
    expect(computeStreakDays(activities, '2026-11-18')).toBe(3);
    // Still alive on 2026-11-19 before today's lesson is completed
    expect(computeStreakDays(activities, '2026-11-19')).toBe(3);
    // Reset to 0 if a full day was missed
    expect(computeStreakDays(activities, '2026-11-20')).toBe(0);
  });
});
