import 'intl-pluralrules';

import { SupportedLanguages, type Language } from '@/src/hooks/language/schema';

import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en-EN.json';
import fr from './fr-FR.json';
import ko from './ko-KR.json';

export const defaultNS = 'main' as const;

export const resources = {
  'en-EN': en,
  'fr-FR': fr,
  'ko-KR': ko,
} as const satisfies Record<Language, unknown>;

/** Expo가 보고하는 시스템의 최우선 언어 — 지금은 쓰지 않는다(아래 resolveSystemLanguage 참고) */
export const getDeviceLanguage = (): string => {
  try {
    const locale = getLocales()[0];
    return (locale?.languageCode ?? locale?.languageTag ?? '').toLowerCase();
  } catch {
    return '';
  }
};

/**
 * 앱 언어 — 기기 언어를 따르지 않고 한국어로 고정한다.
 * 화면 문구와 세계 상식 데이터가 모두 한국어라, 기기 언어를 따르면 탭 이름만 영어·프랑스어인 반쪽 화면이 된다.
 * 데이터·화면 번역이 갖춰지면 아래 주석 처리한 매핑을 되살린다.
 */
export const resolveSystemLanguage = (): Language => {
  // const raw = getDeviceLanguage();
  // if (raw.startsWith('fr')) return SupportedLanguages.FR_FR;
  // if (raw.startsWith('en')) return SupportedLanguages.EN_EN;
  return SupportedLanguages.KR_KR;
};

i18n
  .use(initReactI18next)
  .init({
	initImmediate: false,
    defaultNS,
    fallbackLng: 'ko-KR',
    lng: resolveSystemLanguage(),
	supportedLngs: Object.keys(resources),
    resources,
    interpolation: { escapeValue: false },
  })
  .then(() => {
    // add capitalization formatter
    i18n.services.formatter?.add(
      'capitalize',
      (value: string) =>
        value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
    );
  });

/** 실행 중 시스템 언어가 바뀐 경우 포그라운드 복귀 시 동기화합니다. */
export const syncSystemLanguage = async (): Promise<void> => {
  const language = resolveSystemLanguage();
  if (i18n.language !== language) await i18n.changeLanguage(language);
};

export default i18n;
