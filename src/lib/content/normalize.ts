import type { CourseId } from './schema';

/**
 * Turkish diacritic folding map required by Section 6 of the master prompt:
 * ı→i, ş→s, ğ→g, ç→c, ö→o, ü→u, â→a, î→i, û→u
 */
const TURKISH_ASCII_MAP: Record<string, string> = {
  ı: 'i',
  ş: 's',
  ğ: 'g',
  ç: 'c',
  ö: 'o',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
};

/**
 * Normalizes a learner's answer or accepted reference string:
 * - Uses Turkish-aware `toLocaleLowerCase('tr-TR')` for Turkish (`I -> ı`, `İ -> i`)
 *   and standard `toLocaleLowerCase('en-US')` for English/Russian;
 * - Strips punctuation and collapses whitespace.
 */
export function normalizeText(input: string, lang: CourseId | 'ru' = 'tr'): string {
  const locale = lang === 'tr' ? 'tr-TR' : lang === 'en' ? 'en-US' : 'ru-RU';
  return input
    .toLocaleLowerCase(locale)
    .replace(/[.,!?;:«»"“”'’()[\]{}—–-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Folds Turkish-specific characters into ASCII equivalents so answers typed
 * without a Turkish keyboard layout can be graded as "almost correct" with a hint.
 */
export function foldTurkishDiacritics(normalized: string): string {
  let out = '';
  for (const ch of normalized) {
    out += TURKISH_ASCII_MAP[ch] ?? ch;
  }
  return out;
}

export interface AnswerCheckResult {
  status: 'correct' | 'almost_correct' | 'incorrect';
  matchedAccepted: string | null;
  hint_ru: string | null;
}

/**
 * Checks user input against a list of accepted answers according to Section 6 rules:
 * - Exact match (ignoring case & punctuation via locale-aware normalization) -> 'correct'
 * - For Turkish: match after folding ı/ş/ğ/ç/ö/ü -> 'almost_correct' with hint showing proper spelling
 * - Otherwise -> 'incorrect'
 */
export function checkTypedAnswer(
  userInput: string,
  acceptedList: readonly string[],
  lang: CourseId | 'ru' = 'tr',
): AnswerCheckResult {
  const normalizedUser = normalizeText(userInput, lang);
  if (!normalizedUser) {
    return { status: 'incorrect', matchedAccepted: null, hint_ru: null };
  }

  for (const candidate of acceptedList) {
    const normalizedCandidate = normalizeText(candidate, lang);
    if (normalizedUser === normalizedCandidate) {
      return {
        status: 'correct',
        matchedAccepted: candidate,
        hint_ru: null,
      };
    }
  }

  if (lang === 'tr') {
    const foldedUser = foldTurkishDiacritics(normalizedUser);
    for (const candidate of acceptedList) {
      const normalizedCandidate = normalizeText(candidate, 'tr');
      const foldedCandidate = foldTurkishDiacritics(normalizedCandidate);
      if (foldedUser === foldedCandidate) {
        return {
          status: 'almost_correct',
          matchedAccepted: candidate,
          hint_ru: `Почти верно! Обратите внимание на турецкие буквы: «${candidate}»`,
        };
      }
    }
  }

  return {
    status: 'incorrect',
    matchedAccepted: acceptedList[0] ?? null,
    hint_ru: null,
  };
}
