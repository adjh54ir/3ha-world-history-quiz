import 'intl-pluralrules';

import { SupportedLanguages, languageSchema, type Language } from '@/src/hooks/language/schema';

import { File, Paths } from 'expo-file-system';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en-EN.json';
import es from './es-ES.json';
import fr from './fr-FR.json';
import ja from './ja-JP.json';
import ko from './ko-KR.json';
import zh from './zh-CN.json';

export const defaultNS = 'main' as const;

export const resources = {
  'ko-KR': ko,
  'en-EN': en,
  'zh-CN': zh,
  'ja-JP': ja,
  'fr-FR': fr,
  'es-ES': es,
} as const satisfies Record<Language, unknown>;

/** 설정 화면 언어 목록 — 이름은 그 언어로 적는다(어느 언어로 보고 있든 자기 언어를 찾을 수 있게) */
export const LANGUAGE_OPTIONS: readonly { code: Language; label: string; badge: string }[] = [
  { code: SupportedLanguages.KR_KR, label: '한국어', badge: 'KO' },
  { code: SupportedLanguages.EN_EN, label: 'English', badge: 'EN' },
  { code: SupportedLanguages.ZH_CN, label: '简体中文', badge: '中' },
  { code: SupportedLanguages.JA_JP, label: '日本語', badge: 'あ' },
  { code: SupportedLanguages.FR_FR, label: 'Français', badge: 'FR' },
  { code: SupportedLanguages.ES_ES, label: 'Español', badge: 'ES' },
];

/** Expo가 보고하는 시스템의 최우선 언어 코드 ('ko', 'en' …) */
export const getDeviceLanguage = (): string => {
  try {
    const locale = getLocales()[0];
    return (locale?.languageCode ?? locale?.languageTag ?? '').toLowerCase();
  } catch {
    return '';
  }
};

const DEVICE_MAP: Record<string, Language> = {
  ko: SupportedLanguages.KR_KR,
  en: SupportedLanguages.EN_EN,
  zh: SupportedLanguages.ZH_CN,
  ja: SupportedLanguages.JA_JP,
  fr: SupportedLanguages.FR_FR,
  es: SupportedLanguages.ES_ES,
};

/**
 * 사용자가 설정에서 고른 언어 — 파일 하나에 적어 둔다.
 * 화면·데이터 상수가 모듈을 읽는 순간 언어를 정하므로 동기로 읽을 수 있어야 한다 (AsyncStorage 는 못 쓴다).
 */
const languageFile = (): File => new File(Paths.document, 'app-language.txt');

export const getSavedLanguage = (): Language | null => {
  try {
    const file = languageFile();
    if (!file.exists) return null;
    const parsed = languageSchema.safeParse(file.textSync().trim());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

/** 고른 언어가 있으면 그것, 없으면 기기 언어, 지원하지 않는 기기 언어면 영어 */
export const resolveSystemLanguage = (): Language => {
  const saved = getSavedLanguage();
  if (saved) return saved;
  // ponytail: 테스트는 한국어 데이터를 기준으로 쓰여 있다
  if (process.env.NODE_ENV === 'test') return SupportedLanguages.KR_KR;
  return DEVICE_MAP[getDeviceLanguage().slice(0, 2)] ?? SupportedLanguages.EN_EN;
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

/** 지금 앱 언어 — 데이터 번역·날짜 형식이 이 값을 본다 */
export const appLanguage = (): Language => (languageSchema.safeParse(i18n.language).success ? (i18n.language as Language) : SupportedLanguages.KR_KR);

/**
 * 설정에서 언어 바꾸기 — 저장하고 그 자리에서 바꾼다 (번들을 다시 읽지 않아 화면·광고가 그대로 남는다).
 * 주제 이름·뱃지·세계 데이터는 언어마다 따로 만들어 두는 값(ThemedStyles 의 localized·themed)이라
 * changeLanguage 뒤 다음 렌더부터 새 언어로 읽힌다. useTranslation 을 쓰는 화면이 다시 그려진다.
 */
export const setAppLanguage = async (language: Language): Promise<void> => {
  if (language === appLanguage()) return;
  try {
    const file = languageFile();
    if (!file.exists) file.create();
    file.write(language);
  } catch {
    return;
  }
  await i18n.changeLanguage(language);
  // 예약해 둔 알림 문구도 새 언어로 다시 건다
  const { ReconcileNotificationSchedules } = require('@/src/utils/NotifactionHelper');
  ReconcileNotificationSchedules().catch(() => {});
};

/** 기기 언어를 따르는 중에 기기 언어가 바뀌었으면 포그라운드 복귀 시 다시 읽는다 */
export const syncSystemLanguage = async (): Promise<void> => {
  if (resolveSystemLanguage() === appLanguage()) return;
  const { reload } = require('@/src/utils/ThemeReload');
  await reload();
};

export default i18n;
