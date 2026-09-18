import 'intl-pluralrules';

import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE, type Language, toLanguage } from './language';

import en from './en-EN.json';
import ja from './ja-JP.json';
import ko from './ko-KR.json';

export const defaultNS = 'main' as const;

export const resources = {
	'ko-KR': ko,
	'en-EN': en,
	'ja-JP': ja,
} as const satisfies Record<Language, unknown>;

const STORAGE_KEY = 'APP_LANGUAGE';

/**
 * 저장된 언어를 읽는다.
 * 스플래시가 떠 있는 동안 미리 읽어 두면 첫 화면이 한국어로 한 번 그려졌다 바뀌지 않는다
 * (테마·글씨체를 먼저 읽어 두는 것과 같은 이유 — app/_layout.tsx 참고).
 */
export const readLanguage = async (): Promise<Language> => {
	try {
		return toLanguage(await AsyncStorage.getItem(STORAGE_KEY));
	} catch (e) {
		console.warn('언어 설정 조회 실패:', e);
		return DEFAULT_LANGUAGE;
	}
};

/**
 * 언어를 바꾸고 저장한다.
 * i18next 가 바뀐 언어를 구독 중인 화면에 알려 주므로 화면을 다시 띄우지 않아도 글자가 바뀐다.
 */
export const setLanguage = async (next: Language): Promise<void> => {
	await i18n.changeLanguage(next);
	try {
		await AsyncStorage.setItem(STORAGE_KEY, next);
	} catch (e) {
		console.warn('언어 설정 저장 실패:', e);
	}
};

/** 지금 언어 — 화면 밖(알림 문구 등)에서 t() 를 훅 없이 쓸 때 함께 본다 */
export const currentLanguage = (): Language => toLanguage(i18n.language);

i18n.use(initReactI18next).init({
	defaultNS,
	// 번역이 빠진 키는 한국어로 메운다 — 영어 화면에 키 이름이 그대로 드러나는 것보다 낫다
	fallbackLng: DEFAULT_LANGUAGE,
	lng: DEFAULT_LANGUAGE,
	resources,
	// RN 에는 XSS 가 없고, 이스케이프를 켜면 따옴표가 &#39; 로 새어 나온다
	interpolation: { escapeValue: false },
	// 영어 문구에 콜론·점이 들어가도 키 구분자로 잘리지 않게 한다
	nsSeparator: false,
	returnNull: false,
});

export default i18n;

/**
 * 화면 밖에서 쓰는 번역 — 알림 본문, 서비스 계층처럼 훅을 쓸 수 없는 자리.
 * 훅이 아니라 지금 언어를 그때그때 읽으므로, 언어를 바꾼 뒤 다시 불러야 새 언어로 나온다.
 */
export const translate = i18n.t.bind(i18n);

/**
 * 동적으로 조립한 키를 t() 에 넘길 때 쓴다.
 * i18next.d.ts 가 키를 리터럴 유니온으로 좁혀 두어 `badges.${id}.name` 같은 템플릿 키를 거부한다.
 * 화면마다 as never 를 흩뿌리지 않도록 캐스팅 지점을 여기 한 곳에 모은다.
 */
export const tk = (key: string): never => key as never;
