/**
 * 앱이 지원하는 언어.
 * -------------------------------------------------
 * 화면 문구(UI)만 번역한다. 세계 상식 데이터 1,091항목의 본문은 한국어 그대로다.
 * 그래서 기기 언어를 자동으로 따라가지 않는다 — 영어 기기에서 저절로 영어가 되면
 * 메뉴만 영어이고 문제·해설은 한국어인 "반쯤 번역된 앱"이 되기 때문이다.
 * 언어는 설정에서 사용자가 직접 고를 때만 바뀐다.
 */
export const LANGUAGES = ['ko-KR', 'en-EN', 'ja-JP'] as const;

export type Language = (typeof LANGUAGES)[number];

/** 기본 언어 — 데이터가 한국어라 처음 실행은 언제나 한국어다 */
export const DEFAULT_LANGUAGE: Language = 'ko-KR';

/** 설정 화면에 세우는 이름 — 각 언어를 그 언어로 적는다(자기 언어는 자기 글자로 읽는 것이 가장 빠르다) */
export const LANGUAGE_LABELS: Record<Language, string> = {
	'ko-KR': '한국어',
	'en-EN': 'English',
	'ja-JP': '日本語',
};

/** 저장된 값이 목록에 없으면(앱을 되돌렸거나 값이 깨졌으면) 기본 언어로 되돌린다 */
export const toLanguage = (value: string | null | undefined): Language =>
	LANGUAGES.includes(value as Language) ? (value as Language) : DEFAULT_LANGUAGE;
