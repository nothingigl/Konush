import type { Course, CourseId, Unit } from '../content/schema';

export const SITE_NAME = 'Konuş!';
export const SITE_TAGLINE_RU = 'Турецкий и английский на 4 навыках — бесплатно и офлайн';

/**
 * Returns normalized public site origin without trailing slash.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw && /^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
}

export function absoluteUrl(pathname: string): string {
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${getSiteUrl()}${cleanPath}`;
}

export function getCourseLanguageLabel(course: CourseId): string {
  return course === 'tr' ? 'Турецкий язык' : 'Английский язык';
}

export function getCourseIsoLang(course: CourseId): string {
  return course === 'tr' ? 'tr' : 'en';
}

/**
 * Schema.org Course JSON-LD for /[course] pages.
 */
export function buildCourseJsonLd(course: Course, totalUnits: number) {
  const url = absoluteUrl(`/${course.id}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `${course.title_ru} — ${SITE_NAME}`,
    description: course.description_ru,
    url,
    inLanguage: ['ru', getCourseIsoLang(course.id)],
    isAccessibleForFree: true,
    educationalLevel: 'Intro - A1',
    numberOfCredits: totalUnits,
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: getSiteUrl(),
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'RUB',
      category: 'Free',
    },
  };
}

/**
 * Schema.org LearningResource JSON-LD for /[course]/units/[slug] public pages.
 */
export function buildUnitJsonLd(unit: Unit, sectionCefr: string) {
  const url = absoluteUrl(`/${unit.course}/units/${unit.slug}`);
  const langLabel = getCourseLanguageLabel(unit.course);
  const wordTerms = unit.words.map((w) => `${w.text} (${w.ru})`);

  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: `${unit.title_ru} — ${langLabel} | ${SITE_NAME}`,
    description: unit.boss
      ? `Босс-вызов секции ${unit.section} (${langLabel}): итоговая практика 4 навыков.`
      : `Бесплатный урок «${unit.title_ru}» (${langLabel}): ${unit.words.length} слов и 4 навыка (говорение, слушание, письмо, чтение).`,
    url,
    inLanguage: ['ru', getCourseIsoLang(unit.course)],
    educationalLevel: sectionCefr,
    learningResourceType: unit.boss ? 'Assessment' : 'Interactive Lesson',
    isAccessibleForFree: true,
    teaches: wordTerms.length > 0 ? wordTerms : [`Итоговая проверка секции ${unit.section}`],
    isPartOf: {
      '@type': 'Course',
      name: `${langLabel} — ${SITE_NAME}`,
      url: absoluteUrl(`/${unit.course}`),
    },
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: getSiteUrl(),
    },
  };
}
