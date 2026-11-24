import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import robots from '../../../app/robots';
import sitemap from '../../../app/sitemap';
import { getAllUnitsForCourse, getCourseData, getUnitById } from '../../content/loader';
import { collectUnitOfflineUrls } from '../../pwa/offline';
import { buildCourseJsonLd, buildUnitJsonLd, SITE_NAME } from '../site';

describe('Stage 6 MVP SEO, JSON-LD, keepalive, and offline helpers', () => {
  it('generates sitemap with all 133 public unit URLs and zero private routes', () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);

    // 6 core public pages + 70 Turkish units + 63 English units = 139 URLs
    expect(entries.length).toBe(139);
    expect(urls.some((u) => u.endsWith('/tr'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/en'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/tr/units/1-1-food-and-drinks'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/en/units/3-boss-story-about-the-past'))).toBe(true);

    // Private routes must never appear in sitemap.xml
    for (const forbidden of ['/profile', '/settings', '/auth', '/review', '/offline']) {
      expect(urls.some((u) => u.endsWith(forbidden))).toBe(false);
    }
  });

  it('configures robots.txt to disallow private routes and publish sitemap URL', () => {
    const r = robots();
    expect(r.sitemap).toMatch(/\/sitemap\.xml$/);
    const rule = Array.isArray(r.rules) ? r.rules[0]! : r.rules;
    const disallowed = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
    expect(disallowed).toEqual(
      expect.arrayContaining(['/profile', '/settings', '/auth', '/review', '/offline']),
    );
  });

  it('builds valid Schema.org Course and LearningResource JSON-LD', () => {
    const trCourse = getCourseData('tr');
    const trUnits = getAllUnitsForCourse('tr');
    const courseLd = buildCourseJsonLd(trCourse, trUnits.length);

    expect(courseLd['@type']).toBe('Course');
    expect(courseLd.isAccessibleForFree).toBe(true);
    expect(courseLd.provider.name).toBe(SITE_NAME);
    expect(courseLd.inLanguage).toContain('tr');

    const unit = getUnitById('tr', 'tr-1-1')!;
    const unitLd = buildUnitJsonLd(unit, 'Intro');
    expect(unitLd['@type']).toBe('LearningResource');
    expect(unitLd.isAccessibleForFree).toBe(true);
    expect(unitLd.educationalLevel).toBe('Intro');
    expect(unitLd.teaches.length).toBe(12);
  });

  it('collects unit page, all 4 skill routes, and deduplicated audio URLs for offline caching', () => {
    const unit = getUnitById('tr', 'tr-1-1')!;
    const { pageUrls, audioUrls } = collectUnitOfflineUrls(unit);

    expect(pageUrls).toEqual([
      '/tr/units/1-1-food-and-drinks',
      '/tr/units/1-1-food-and-drinks/play/speaking',
      '/tr/units/1-1-food-and-drinks/play/listening',
      '/tr/units/1-1-food-and-drinks/play/writing',
      '/tr/units/1-1-food-and-drinks/play/reading',
    ]);
    expect(audioUrls.length).toBeGreaterThanOrEqual(20);
    expect(audioUrls.every((u) => u.startsWith('/audio/tr/1-1/'))).toBe(true);
  });

  it('defines scheduled Supabase keepalive workflow using only anon key and healthcheck table', () => {
    const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'keepalive.yml');
    const yaml = fs.readFileSync(workflowPath, 'utf8');
    expect(yaml).toContain('schedule:');
    expect(yaml).toContain('rest/v1/healthcheck');
    expect(yaml).toContain('SUPABASE_ANON_KEY');
    expect(yaml).not.toContain('SERVICE_ROLE');
  });
});
