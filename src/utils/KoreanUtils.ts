/**
 * 뜻풀이 문장화
 * -------------------------------------------------
 * 단어 데이터의 뜻풀이는 퀴즈 보기·목록에서 짧게 쓰려고 명사구('~하는 것', '~한 사람')로 두었다.
 * 상세 모달·쇼츠처럼 문장으로 읽히는 자리에서만 이 함수로 '…을 뜻합니다.' 를 붙인다.
 */
const HANGUL_BASE = 0xac00;

/** 마지막 글자가 받침 있는 한글이면 true — 조사 을/를 고르는 기준 */
const hasFinalConsonant = (text: string): boolean => {
	const code = text.charCodeAt(text.length - 1) - HANGUL_BASE;
	return code >= 0 && code < 11172 && code % 28 !== 0;
};

/**
 * 부사로 끝나 목적어 자리에 못 서는 뜻풀이의 끝말.
 * '每日 = 하루하루 빠짐없이' 처럼 명사구로 못 바꾸는 말이 있어, 이쪽은 '~라는 뜻입니다.' 로 맺는다.
 * ('빠짐없이를 뜻합니다' · '앞으로를 뜻합니다' 처럼 조사가 붙어 문장이 깨지던 것을 막는다)
 * 목록에 없는 부사 끝말이 새로 들어오면 ConstLifeWords.test.ts 가 잡는다.
 */
const ADVERB_ENDINGS = ['마다', '없이', '따로따로', '그때그때', '바로', '앞으로', '내내', '한꺼번에', '어림잡아', '까지', '서로'];

export const meaningToSentence = (meaning: string): string => {
	const trimmed = meaning.trim();
	if (ADVERB_ENDINGS.some((ending) => trimmed.endsWith(ending))) {
		return `${trimmed}라는 뜻입니다.`;
	}
	return `${trimmed}${hasFinalConsonant(trimmed) ? '을' : '를'} 뜻합니다.`;
};

export { ADVERB_ENDINGS };
