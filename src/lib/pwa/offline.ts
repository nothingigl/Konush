import type { CourseId, Unit } from '../content/schema';

export const SHELL_CACHE_NAME = 'konus-shell-v2';
export const CONTENT_CACHE_NAME = 'konus-content-v2';
export const AUDIO_CACHE_NAME = 'konus-audio-v2';

export interface UnitOfflineUrls {
  pageUrls: string[];
  audioUrls: string[];
}

export interface OfflineDownloadResult {
  pagesCached: number;
  audioCached: number;
  quotaExceeded: boolean;
  messageRu: string;
}

export interface OfflineCacheBreakdown {
  supported: boolean;
  contentEntries: number;
  audioEntries: number;
  usedMb: number;
  quotaMb: number;
  quotaLow: boolean;
}

/**
 * Returns every page and audio URL required for a unit to work completely offline.
 */
export function collectUnitOfflineUrls(unit: Unit): UnitOfflineUrls {
  const base = `/${unit.course}/units/${unit.slug}`;
  const pageUrls = [
    base,
    `${base}/play/speaking`,
    `${base}/play/listening`,
    `${base}/play/writing`,
    `${base}/play/reading`,
  ];

  const audioSet = new Set<string>();
  for (const w of unit.words) {
    if (w.audio) audioSet.add(`/audio/${w.audio}`);
  }
  for (const skillKey of ['speaking', 'listening', 'writing', 'reading'] as const) {
    for (const ex of unit.skills[skillKey].exercises) {
      if (ex.audio) audioSet.add(`/audio/${ex.audio}`);
    }
  }

  return {
    pageUrls,
    audioUrls: [...audioSet],
  };
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === 'QuotaExceededError' || /quota|storage full|ns_error_dom_quota/i.test(err.message)
  );
}

/**
 * Caches all pages (unit overview + 4 skill players) and available MP3 audio clips
 * for a single unit into dedicated browser caches. Never throws on missing MP3 (404)
 * or QuotaExceededError — returns a clear Russian status message.
 */
export async function downloadUnitForOffline(unit: Unit): Promise<OfflineDownloadResult> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return {
      pagesCached: 0,
      audioCached: 0,
      quotaExceeded: false,
      messageRu: 'Юнит сохранён в локальной базе (кэш страниц не поддерживается этим браузером).',
    };
  }

  const { pageUrls, audioUrls } = collectUnitOfflineUrls(unit);
  let pagesCached = 0;
  let audioCached = 0;
  let quotaExceeded = false;

  try {
    const contentCache = await caches.open(CONTENT_CACHE_NAME);
    for (const url of pageUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          await contentCache.put(url, res.clone());
          pagesCached += 1;
        }
      } catch (err) {
        if (isQuotaError(err)) {
          quotaExceeded = true;
          break;
        }
      }
    }

    if (!quotaExceeded && audioUrls.length > 0) {
      const audioCache = await caches.open(AUDIO_CACHE_NAME);
      for (const audioUrl of audioUrls) {
        try {
          const existing = await audioCache.match(audioUrl);
          if (existing) {
            audioCached += 1;
            continue;
          }
          const res = await fetch(audioUrl);
          if (res.ok) {
            await audioCache.put(audioUrl, res.clone());
            audioCached += 1;
          }
        } catch (err) {
          if (isQuotaError(err)) {
            quotaExceeded = true;
            break;
          }
        }
      }
    }
  } catch (err) {
    if (isQuotaError(err)) {
      quotaExceeded = true;
    }
  }

  if (quotaExceeded) {
    return {
      pagesCached,
      audioCached,
      quotaExceeded: true,
      messageRu:
        'Недостаточно места в памяти браузера для полного скачивания. Освободите офлайн-кэш в Настройках — уроки и прогресс продолжат работать.',
    };
  }

  return {
    pagesCached,
    audioCached,
    quotaExceeded: false,
    messageRu:
      audioCached > 0
        ? `Юнит готов к офлайну (страниц: ${pagesCached}, аудио: ${audioCached}).`
        : `Юнит и все 4 навыка сохранены для офлайна (страниц: ${pagesCached}).`,
  };
}

/**
 * Downloads all units of a course section (overview + 4 skill routes per unit) sequentially,
 * reporting progress so the UI can show a live counter without overloading mobile networks.
 */
export async function downloadSectionForOffline(params: {
  courseId: CourseId;
  unitSlugs: string[];
  onProgress?: (completed: number, total: number) => void;
}): Promise<OfflineDownloadResult> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return {
      pagesCached: 0,
      audioCached: 0,
      quotaExceeded: false,
      messageRu: 'Кэширование офлайн-секций не поддерживается этим браузером.',
    };
  }

  const total = params.unitSlugs.length;
  let pagesCached = 0;
  let quotaExceeded = false;

  try {
    const contentCache = await caches.open(CONTENT_CACHE_NAME);
    for (let i = 0; i < total; i++) {
      const slug = params.unitSlugs[i]!;
      const base = `/${params.courseId}/units/${slug}`;
      const urls = [
        base,
        `${base}/play/speaking`,
        `${base}/play/listening`,
        `${base}/play/writing`,
        `${base}/play/reading`,
      ];

      for (const url of urls) {
        try {
          const existing = await contentCache.match(url);
          if (existing) {
            pagesCached += 1;
            continue;
          }
          const res = await fetch(url);
          if (res.ok) {
            await contentCache.put(url, res.clone());
            pagesCached += 1;
          }
        } catch (err) {
          if (isQuotaError(err)) {
            quotaExceeded = true;
            break;
          }
        }
      }

      params.onProgress?.(i + 1, total);
      if (quotaExceeded) break;
    }
  } catch (err) {
    if (isQuotaError(err)) {
      quotaExceeded = true;
    }
  }

  if (quotaExceeded) {
    return {
      pagesCached,
      audioCached: 0,
      quotaExceeded: true,
      messageRu:
        'Недостаточно свободного места на устройстве. Часть секции сохранена — очистите старый кэш в Настройках при необходимости.',
    };
  }

  return {
    pagesCached,
    audioCached: 0,
    quotaExceeded: false,
    messageRu: `Секция сохранена для офлайна (${total} юнитов, ${pagesCached} страниц).`,
  };
}

/**
 * Inspects browser storage estimate and counts cached content/audio entries.
 */
export async function getOfflineCacheBreakdown(): Promise<OfflineCacheBreakdown> {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      contentEntries: 0,
      audioEntries: 0,
      usedMb: 0,
      quotaMb: 0,
      quotaLow: false,
    };
  }

  let contentEntries = 0;
  let audioEntries = 0;
  if ('caches' in window) {
    try {
      const contentCache = await caches.open(CONTENT_CACHE_NAME);
      contentEntries = (await contentCache.keys()).length;
      const audioCache = await caches.open(AUDIO_CACHE_NAME);
      audioEntries = (await audioCache.keys()).length;
    } catch {
      // Ignore cache inspection errors
    }
  }

  let usedMb = 0;
  let quotaMb = 0;
  let quotaLow = false;
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      usedMb = (est.usage ?? 0) / (1024 * 1024);
      quotaMb = (est.quota ?? 0) / (1024 * 1024);
      quotaLow = quotaMb > 0 && usedMb / quotaMb > 0.85;
    } catch {
      // Ignore estimate errors
    }
  }

  return {
    supported: true,
    contentEntries,
    audioEntries,
    usedMb,
    quotaMb,
    quotaLow,
  };
}

/**
 * Clears cached offline pages and MP3 audio WITHOUT deleting IndexedDB user progress.
 */
export async function clearOfflineMediaCacheOnly(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter(
        (k) => k === CONTENT_CACHE_NAME || k === AUDIO_CACHE_NAME || k.startsWith('turkce-duo-'),
      )
      .map((k) => caches.delete(k)),
  );
}
