export interface CharacterPersona {
  id: 'elif' | 'kemal' | 'zeynep' | 'emre';
  name_ru: string;
  role_ru: string;
  greeting_tr: string;
  greeting_en: string;
  avatar: string;
  badgeClass: string;
}

export const CHARACTERS_MAP: Record<string, CharacterPersona> = {
  elif: {
    id: 'elif',
    name_ru: 'Элиф (Elif)',
    role_ru: 'Бариста и гид из Стамбула',
    greeting_tr: 'Merhaba! Hadi birlikte pratik yapalım!',
    greeting_en: 'Hello! Let us practice together!',
    avatar: '/characters/elif.svg',
    badgeClass:
      'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200',
  },
  kemal: {
    id: 'kemal',
    name_ru: 'Кемаль (Kemal)',
    role_ru: 'Преподаватель и путешественник',
    greeting_tr: 'Adım adım ilerleyelim!',
    greeting_en: 'Step by step, we will master this!',
    avatar: '/characters/kemal.svg',
    badgeClass:
      'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-200',
  },
  zeynep: {
    id: 'zeynep',
    name_ru: 'Зейнеп (Zeynep)',
    role_ru: 'Журналистка и любительница кино',
    greeting_tr: 'Harika bir ders bizi bekliyor!',
    greeting_en: 'A great lesson is waiting for us!',
    avatar: '/characters/zeynep.svg',
    badgeClass:
      'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/60 dark:text-violet-200',
  },
  emre: {
    id: 'emre',
    name_ru: 'Эмре (Emre)',
    role_ru: 'Спортсмен и шеф-повар',
    greeting_tr: 'Hazır mısın? Başlayalım!',
    greeting_en: 'Are you ready? Let us begin!',
    avatar: '/characters/emre.svg',
    badgeClass:
      'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200',
  },
};

export function getCharacterPersona(characterId: string): CharacterPersona {
  return CHARACTERS_MAP[characterId] ?? CHARACTERS_MAP.elif!;
}
