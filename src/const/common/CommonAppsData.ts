import { Platform } from 'react-native';

import type { Language } from '@/src/hooks/language/schema';
import { CommonType } from '@/src/types/CommonType';
import DateUtils from '@/src/utils/DateUtils';

/**
 * 개발자의 다른 앱 목록 — Supabase Storage 공개 버킷(common-apps)에서 받는다.
 * -------------------------------------------------
 * 앱이 하나 늘 때마다 모든 앱을 다시 빌드해 올리지 않으려고 목록·아이콘·번역을 앱 밖에 둔다.
 * 원본·올리기 스크립트는 3ha-korea-geography 저장소 supabase/storage(yarn upload:apps) 한 곳에만 둔다.
 */
const BASE_URL = 'https://hsnyhvcezyavsrgqazup.supabase.co/storage/v1/object/public/common-apps';
const APP_CATEGORIES: CommonType.AppCategory[] = ['quiz', 'calculator', 'utility'];
/** 버킷 목록에는 이 앱(세계 상식 퀴즈)도 들어 있다 — 내 앱 안에서 나를 다시 권하지 않는다 */
const SELF_APP_ID = 34;

// ponytail: 앱이 떠 있는 동안만 들고 있는다 — 껐다 켜면 다시 받는다. 오프라인에서도 보여야 하면 AsyncStorage 에 남긴다
let cache: Promise<CommonType.AppItem[]> | null = null;

/** 목록을 받는다. 실패하면 들고 있지 않는다 — 다음에 화면에 들어오면 새로 묻는다 */
export const fetchCommonApps = (): Promise<CommonType.AppItem[]> => {
	cache ??= fetch(`${BASE_URL}/apps.json`)
		.then((res) => {
			if (!res.ok) throw new Error(`apps.json ${res.status}`);
			return res.json() as Promise<{ apps: CommonType.AppItem[] }>;
		})
		// 이 앱이 모르는 분류가 JSON 에 먼저 생겨도(새 앱에서 분류를 늘린 경우) 색·라벨 조회에서 터지지 않게 걸러 낸다
		.then(({ apps }) => apps.filter((app) => app.id !== SELF_APP_ID && APP_CATEGORIES.includes(app.category)))
		.catch((e) => {
			cache = null;
			throw e;
		});
	return cache;
};

/** apps.json 에는 파일 이름만 적는다 — 버킷 주소가 바뀌어도 JSON 은 그대로 둔다 */
export const appIconUrl = (app: CommonType.AppItem): string => `${BASE_URL}/icons/${app.icon}`;

/**
 * 지금 기기에서 열 수 있는 스토어 주소. 없으면 null.
 * 반대 플랫폼 링크로 대체하지 않는다 — 한쪽에만 출시된 앱에서 안드로이드 사용자를
 * 앱스토어 페이지로 보내면 설치가 아예 불가능한 화면만 보게 된다.
 */
export const appStoreUrl = (app: CommonType.AppItem): string | null =>
	(Platform.OS === 'android' ? app.android : app.ios) || null;

/** NEW 배지가 붙는 기간 */
const NEW_APP_DAYS = 60;

/**
 * 갓 나온 앱인지.
 * -------------------------------------------------
 * 예전에는 "id 가 가장 큰 두 개" 를 NEW 로 봤다. 그러면 새 앱을 한참 안 올린 동안에도
 * 같은 앱에 NEW 가 영영 붙어 있어, 배지가 아무 뜻도 없는 장식이 된다.
 * 출시일이 적힌 앱만, 그것도 최근 것만 배지를 단다(안 적힌 앱은 붙지 않는다).
 */
export const isNewApp = (app: CommonType.AppItem, now = DateUtils.now()): boolean => {
	if (!app.releasedAt || !/^\d{4}-\d{2}-\d{2}$/.test(app.releasedAt)) return false;
	// 기기 타임존의 날짜 단위로 센다 — UTC 자정으로 세면 한국에서는 배지가 오전 9시에 바뀌었다
	const days = DateUtils.differenceInLocalDays(app.releasedAt, DateUtils.getLocalDateString(now));
	return days >= 0 && days <= NEW_APP_DAYS;
};

/**
 * 지금 언어로 보여 줄 이름/설명. 번역이 없는 언어(한국어 포함)는 목록에 적힌 원문으로 떨어진다.
 * 화면에서는 app.title / app.desc 대신 늘 이 함수를 거친다 — 한 곳이라도 빠지면 그 줄만 한국어로 남는다.
 */
export const localizedApp = (app: CommonType.AppItem, language: string): CommonType.AppText => {
	const texts = app.i18n;
	// 'en' · 'ja' 처럼 지역 없이 들어와도 같은 언어로 잡는다 — 정확히 'en-EN' 만 찾으면 영어 기기에서 한국어로 떨어진다
	const key = (Object.keys(texts ?? {}) as Language[]).find((code) => code === language) ??
		(Object.keys(texts ?? {}) as Language[]).find((code) => code.slice(0, 2) === language.slice(0, 2));
	return (key && texts?.[key]) || { title: app.title, desc: app.desc };
};
