/**
 * 랜덤 닉네임 생성기 (랭킹용)
 * - 사용자가 직접 입력하지 않고 주사위로 굴려 뽑는 구조 → 비속어·어뷰징 원천 차단
 * - 형태: "수식어 + 동물/캐릭터 + #4자리" (예: "용감한 호랑이#1024")
 */

const ADJECTIVES = [
	'용감한', '똑똑한', '재빠른', '느긋한', '든든한', '상냥한', '씩씩한', '엉뚱한',
	'슬기로운', '부지런한', '차분한', '명랑한', '다정한', '단단한', '반짝이는', '푸른',
	'따뜻한', '고요한', '날쌘', '깜찍한', '멋진', '기특한', '늠름한', '수줍은',
	'호기심많은', '자유로운', '정직한', '넉넉한', '든든한', '유쾌한',
];

const NOUNS = [
	'호랑이', '까치', '고양이', '다람쥐', '두루미', '토끼', '거북이', '수달',
	'참새', '여우', '사슴', '고래', '기린', '너구리', '올빼미', '펭귄',
	'다랑어', '반달곰', '청개구리', '해오라기', '살구나무', '진달래', '민들레', '소나무',
	'별빛', '달빛', '새벽', '노을', '단풍', '함박눈',
];

/** 랜덤 닉네임 1개 생성 */
export const randomNickname = (): string => {
	const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
	const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
	const num = Math.floor(1000 + Math.random() * 9000);
	return `${a} ${n}#${num}`;
};

/** 생성기로 만든 형식인지 검증 (서버/클라이언트 공통 가드) */
export const isGeneratedNickname = (v: string): boolean => {
	const m = /^(\S+) (\S+)#(\d{4})$/.exec(v.trim());
	if (!m) return false;
	return ADJECTIVES.includes(m[1]) && NOUNS.includes(m[2]);
};

export default { randomNickname, isGeneratedNickname };
