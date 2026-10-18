/**
 * 랜덤 닉네임 생성기 (랭킹용)
 * - 사용자가 직접 입력하지 않고 주사위로 굴려 뽑는 구조 → 비속어·어뷰징 원천 차단
 * - 형태: "수식어 + 동물/캐릭터 + #4자리" (예: "용감한 호랑이#1024")
 * - 낱말·어순은 앱 언어의 번역 파일(misc.nickname.*)에서 가져온다 (언어마다 한 번만 읽는다 — 설정에서 언어를 바꾸면 따라간다)
 */
import i18n from '@/src/translations';
import { localized } from '@/src/utils/ThemedStyles';

const words = (key: 'misc.nickname.adjectives' | 'misc.nickname.nouns'): string[] => {
	const v = i18n.t(key, { returnObjects: true });
	return Array.isArray(v) ? (v as string[]) : [];
};

const ADJECTIVES = localized(() => words('misc.nickname.adjectives'));
const NOUNS = localized(() => words('misc.nickname.nouns'));

/** 수식어·명사 어순은 언어마다 다르다 (예: 프랑스어는 명사가 앞) */
const compose = (adj: string, noun: string): string => i18n.t('misc.nickname.format', { adj, noun });

/** 랜덤 닉네임 1개 생성 */
export const randomNickname = (): string => {
	const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
	const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
	const num = Math.floor(1000 + Math.random() * 9000);
	return `${compose(a, n)}#${num}`;
};

/** 생성기로 만든 형식인지 검증 (서버/클라이언트 공통 가드) */
export const isGeneratedNickname = (v: string): boolean => {
	const m = /^(.+)#(\d{4})$/.exec(v.trim());
	if (!m) return false;
	return ADJECTIVES.some((a) => NOUNS.some((n) => compose(a, n) === m[1]));
};

export default { randomNickname, isGeneratedNickname };
