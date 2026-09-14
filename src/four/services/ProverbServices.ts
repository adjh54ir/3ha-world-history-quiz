/**
 * 이식 화면용 데이터 어댑터
 * -------------------------------------------------
 * 옮겨 온 화면들(학습·퀴즈·오답노트·타임챌린지)은 전부 `MainDataType.ProverbType` 을 읽는다.
 * 이 앱의 학습 단위는 사자성어가 아니라 **생활 한자어**(LifeType.Word)라서,
 * 화면 9천 줄을 고치는 대신 여기서 한 번만 모양을 바꿔 준다.
 *
 *   LifeType.Word            →  MainDataType.ProverbType
 *   word    '生活'            →  hanja
 *   reading '생활'            →  hangul
 *   meaning                   →  meaning / shortMeaning
 *   example '규칙적인 {}을 …'  →  example[0] (빈칸을 독음으로 채운 문장)
 *   category 'daily'          →  category '일상'  (카테고리 라벨)
 *   chars                     →  characters (획수·부수는 급수 자료에서 보정)
 *   —                         →  level  (글자 급수로 초급/중급/고급/특급 산출)
 *
 * id 는 LIFE_WORDS 의 순번(1부터)이다. 화면과 저장소가 숫자 id 를 쓰기 때문인데,
 * 단어를 **목록 중간에 끼워 넣으면 뒤쪽 id 가 전부 밀려** 저장된 학습·오답 기록이 어긋난다.
 * 새 단어는 항상 목록 끝에 추가한다.
 */
import { LIFE_WORDS, fillExample } from '@/src/const/data/life/ConstLifeWords';
import { LIFE_CATEGORIES } from '@/src/const/data/life/ConstLifeCategories';
import type { LifeType } from '@/src/types/data/LifeType';
import { CONST_HANJA_DICT } from '@/src/four/const/ConstHanjaDict';
import { CONST_HANJA_SHAPE } from '@/src/four/const/ConstHanjaShape';
import type { MainDataType } from '@/src/four/types/MainDataType';

/** 호환 한자(U+F900~)가 섞여 들어와도 같은 글자로 보이게 맞춘다 */
const normalize = (char: string): string => char.normalize('NFKC');

const DICT = new Map(CONST_HANJA_DICT.map((entry) => [entry.char, entry]));
/** 급수 자료에 없는 글자의 부수·획수 보강표 */
const SHAPE = new Map(CONST_HANJA_SHAPE.map((entry) => [entry.char, entry]));
const CATEGORY_LABEL = new Map(LIFE_CATEGORIES.map((item) => [item.key, item.label]));

const LEVEL_ORDER: MainDataType.ProverbType['level'][] = ['초급', '중급', '고급', '특급'];

/**
 * 난이도 — 단어 데이터의 등급(1 초급 ~ 4 특급)을 그대로 쓴다.
 *
 * 예전에는 분야 안 순번을 4등분했다. 급수 자료(CONST_HANJA_DICT)는 사자성어에 쓰인 글자만 담고 있어
 * 活·話·週·準 처럼 흔한 글자가 통째로 빠져 있었기 때문이다 (낱글자 1151자 중 333자 누락).
 * 이제 단어마다 "얼마나 자주 쓰는 말인가" 로 매긴 등급이 있으므로 그 값을 쓴다.
 */
const levelOf = (word: LifeType.Word): MainDataType.ProverbType['level'] => LEVEL_ORDER[word.level - 1] ?? '중급';

/**
 * 낱글자 정보.
 * 새김은 단어 데이터의 훈음(`날 생`)을 쓴다 — 그 단어에서 읽는 음 기준이라 더 정확하다.
 * 획수·부수는 급수 자료를 먼저 보고, 없으면 보강표(ConstHanjaShape)에서 가져온다.
 * 두 곳 다 없으면 0/빈 문자열이고, 화면은 그때 그 줄을 감춘다.
 */
const toCharacters = (word: LifeType.Word): MainDataType.ProverbCharacter[] =>
	word.chars.map((item) => {
		const char = normalize(item.char);
		const shape = DICT.get(char) ?? SHAPE.get(char);
		return {
			char: item.char,
			meaning: `${item.hun} ${item.eum}`,
			strokes: shape?.totalStrokes ?? 0,
			radical: shape?.radical.char ?? '',
		};
	});

/** 뜻이 길면 카드 제목에 넘치므로 첫 마디만 잘라 짧은 뜻으로 쓴다 */
const shorten = (meaning: string): string => {
	const head = meaning.split(/[,·]/)[0].trim();
	return head.length > 18 ? `${head.slice(0, 18)}…` : head;
};

/**
 * 연관 키워드 — 같은 분야에서 바로 앞뒤에 있는 단어의 독음.
 * 분야의 맨 앞 세 개를 그대로 쓰면 그 분야 전체가 같은 키워드를 달게 되므로 자기 주변에서 뽑는다.
 */
const relatedOf = (word: LifeType.Word): string[] => {
	const family = LIFE_WORDS.filter((item) => item.category === word.category);
	const at = family.findIndex((item) => item.id === word.id);
	return [family[at - 2], family[at - 1], family[at + 1], family[at + 2]]
		.filter((item): item is LifeType.Word => !!item)
		.slice(0, 3)
		.map((item) => item.reading);
};

const toProverb = (word: LifeType.Word, at: number): MainDataType.ProverbType => ({
	id: at + 1,
	hanja: word.word,
	hangul: word.reading,
	shortMeaning: shorten(word.meaning),
	meaning: word.meaning,
	example: word.examples.map((_, no) => fillExample(word, no)),
	category: CATEGORY_LABEL.get(word.category) ?? '기타',
	level: levelOf(word),
	characters: toCharacters(word),
	relatedWords: relatedOf(word),
});

/** 한 번만 만들고 재사용한다 (급수 조회가 단어 수만큼 돈다) */
const PROVERBS: MainDataType.ProverbType[] = LIFE_WORDS.map(toProverb);
const BY_ID = new Map(PROVERBS.map((item) => [item.id, item]));

/** ProverbType.id → 원본 단어 id ('daily-01') — 이식 화면의 기록을 앱 상태에 옮길 때 쓴다 */
export const toWordId = (id: number): string | undefined => LIFE_WORDS[id - 1]?.id;

/** 원본 단어 id → ProverbType.id */
export const toProverbId = (wordId: string): number | undefined => {
	const at = LIFE_WORDS.findIndex((item) => item.id === wordId);
	return at < 0 ? undefined : at + 1;
};

const ProverbServices = {
	/**
	 * 전체 목록 조회.
	 * ⚠️ 반드시 복사본을 반환한다 — 호출부에서 .sort()/.reverse() 로 원본을 흔들면
	 * 앱 전역(목록·오늘의 퀴즈·학습 화면)의 순서가 영구히 뒤섞인다.
	 */
	selectProverbList(): MainDataType.ProverbType[] {
		return [...PROVERBS];
	},

	selectCategoryList(): string[] {
		return [...new Set(PROVERBS.map((item) => item.category).filter(Boolean))];
	},

	selectLevelNameList(): string[] {
		return LEVEL_ORDER.filter((level) => PROVERBS.some((item) => item.level === level));
	},

	selectProverbById(id: number): MainDataType.ProverbType | undefined {
		return BY_ID.get(id);
	},

	/**
	 * id 목록으로 단어를 찾는다.
	 * **넘긴 id 순서를 그대로 지킨다** — 오늘의 퀴즈는 난이도 순으로 담아 넘기므로,
	 * 원본 목록 순서로 돌려주면 그 의도가 사라진다. 없는 id 는 건너뛴다.
	 */
	selectProverbByIds(ids: number[]): MainDataType.ProverbType[] {
		return ids.map((id) => BY_ID.get(id)).filter((item): item is MainDataType.ProverbType => !!item);
	},
};

export default ProverbServices;
