/**
 * 검색 매칭 유틸 (초성 검색 지원)
 * -------------------------------------------------
 * 화면마다 `text.toLowerCase().includes(q)` 를 각자 쓰다 보니 초성 검색을 붙일 곳이
 * 흩어져 있었다. 모든 검색은 이 파일의 matchesQuery 를 거치게 한다.
 *
 * - 일반 질의: 기존과 동일한 부분 문자열(대소문자 무시) 매칭
 * - 초성만 입력한 질의('ㄱㅈㄱㄹ'): 대상 문자열의 초성열과 부분 매칭
 */

/** 한글 음절 유니코드 시작/끝 */
const SYLLABLE_START = 0xac00;
const SYLLABLE_END = 0xd7a3;
/** 한 초성이 담당하는 음절 수 (중성 21 × 종성 28) */
const SYLLABLE_PER_CHO = 588;

/** 초성 19자 (유니코드 조합 순서) */
const CHOSEONG = [
	'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
	'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

/** 호환 자모(ㄱ~ㅎ) 영역 — 사용자가 키보드로 입력한 낱자음 */
const isCompatJamo = (ch: string): boolean => {
	const code = ch.charCodeAt(0);
	return code >= 0x3131 && code <= 0x314e;
};

/**
 * 문자열을 초성열로 바꾼다. 한글 음절이 아닌 문자는 그대로 남긴다.
 * '고진감래 苦盡' → 'ㄱㅈㄱㄹ 苦盡'
 */
export const toChoseong = (text: string): string => {
	let out = '';
	for (const ch of text) {
		const code = ch.charCodeAt(0);
		if (code >= SYLLABLE_START && code <= SYLLABLE_END) {
			out += CHOSEONG[Math.floor((code - SYLLABLE_START) / SYLLABLE_PER_CHO)];
		} else {
			out += ch;
		}
	}
	return out;
};

/**
 * 질의가 '초성만'으로 이루어졌는지 판단한다.
 * 자음 낱자가 하나라도 있고, 공백을 뺀 나머지가 전부 낱자음일 때만 초성 검색으로 본다.
 * ('ㄱ' 한 글자도 초성 검색으로 취급 — 목록을 좁히는 용도로 유용하다)
 */
export const isChoseongQuery = (query: string): boolean => {
	const compact = query.replace(/\s/g, '');
	return compact.length > 0 && [...compact].every(isCompatJamo);
};

/**
 * 단일 문자열이 질의에 걸리는지 검사한다.
 * @param text 검색 대상 (undefined 안전)
 * @param query 사용자가 입력한 질의
 * @param choseongMode 초성 질의 여부 — 목록 필터에서 매번 재계산하지 않도록 밖에서 넘긴다
 */
export const matchesQuery = (text: string | undefined | null, query: string, choseongMode?: boolean): boolean => {
	if (!text) {
		return false;
	}
	const q = query.trim();
	if (!q) {
		return true;
	}
	const useChoseong = choseongMode ?? isChoseongQuery(q);
	if (useChoseong) {
		return toChoseong(text).includes(q.replace(/\s/g, ''));
	}
	return text.toLowerCase().includes(q.toLowerCase());
};

/**
 * 여러 후보 필드 중 하나라도 걸리면 true.
 * 화면에서 `matchesAny([item.hangul, item.meaning], keyword)` 처럼 쓴다.
 */
export const matchesAny = (texts: (string | undefined | null)[], query: string): boolean => {
	const q = query.trim();
	if (!q) {
		return true;
	}
	const choseongMode = isChoseongQuery(q);
	return texts.some((text) => matchesQuery(text, q, choseongMode));
};

export default { toChoseong, isChoseongQuery, matchesQuery, matchesAny };
