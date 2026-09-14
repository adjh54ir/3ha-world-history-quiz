/**
 * 한자 낱글자 사전 유틸
 * -------------------------------------------------
 * - 한자어에 쓰인 한자를 낱글자 기준으로 뒤집어 색인한다.
 * - 새김·부수·획수의 근거 자료는 한자 급수 시험 배정한자({@link CONST_HANJA_DICT})다.
 *   한자어 데이터의 characters 는 획수 179자·새김 358자가 급수 자료와 어긋나 있어
 *   (過 11획→13획, 花 7획→8획) 급수 자료를 우선하고, 급수 자료에 없는 7자만 원래 값을 쓴다.
 * - 한자어 데이터에만 있는 새김(說: 말씀 설 / 말할 설)은 altMeanings 로 남긴다.
 */
import ProverbServices from '@/src/four/services/ProverbServices';
import { CONST_HANJA_DICT } from '@/src/four/const/ConstHanjaDict';
import { CONST_HANJA_SHAPE } from '@/src/four/const/ConstHanjaShape';
import { CONST_HANJA_UNIHAN } from '@/src/four/const/ConstHanjaUnihan';
import type { HanjaDictType } from '@/src/four/types/HanjaDictType';
import type { MainDataType } from '@/src/four/types/MainDataType';
import { matchesAny } from '@/src/four/utils/SearchUtils';

export type HanjaEntry = {
	char: string;
	/** 대표 새김 — 급수 자료의 훈음('가르칠 교') */
	meaning: string;
	/** 한자어 데이터에 달리 적힌 새김 */
	altMeanings: string[];
	strokes: number;
	/** 부수 글자 */
	radical: string;
	/** 이 한자가 들어간 한자어 (데이터 순서 유지) */
	proverbs: MainDataType.ProverbType[];
	/** 급수 자료에 실린 글자인지 — 아래 급수 정보는 이때만 채워진다 */
	grade?: HanjaDictType.Grade;
	/** 훈 (뜻) */
	hun?: string;
	/** 음 (소리) */
	eum?: string;
	/** 부수 이름 (예: 초두머리) */
	radicalName?: string;
	/** 부수 획수 */
	radicalStrokes?: number;
	/** 음이 같은 한자 (사전에 실린 글자만) */
	homophones?: string[];
	/** 약자 */
	abbr?: string;
	/** 자원(字源) */
	origin?: string;
	/** 표준 독음 (Unihan) — 여러 개면 다음자 */
	hangul?: string[];
	/** 교육용 기초한자(중·고교 1800자) */
	education?: boolean;
	/** 인명용 한자 */
	koreanName?: boolean;
	/** 중국 간체자 */
	simplified?: string;
};

export type HanjaSortType = 'frequency' | 'strokes' | 'radical' | 'grade';

/** 한국어문회 급수 — 쉬운 급수부터. 급수 정렬·필터 순서의 기준이다 */
export const EOMUN_GRADE_ORDER = [
	'8급', '7급II', '7급', '6급II', '6급', '5급II', '5급',
	'4급II', '4급', '3급II', '3급', '2급', '1급', '특급II', '특급',
];

const gradeRank = (entry: HanjaEntry): number => {
	const at = entry.grade?.eomun ? EOMUN_GRADE_ORDER.indexOf(entry.grade.eomun) : -1;
	// 급수 미배정 글자는 맨 뒤로
	return at < 0 ? EOMUN_GRADE_ORDER.length : at;
};

/**
 * 한자어 데이터에는 호환 한자(U+F900~, 두음법칙 표기)가 섞여 있다.
 * 梨(U+F9E2)와 梨(U+68A8)가 따로 색인돼 같은 글자가 두 칸으로 나오던 것을 정규화로 막는다.
 */
const normalize = (char: string): string => char.normalize('NFKC');

const DICT_INDEX = new Map(CONST_HANJA_DICT.map((entry) => [entry.char, entry]));
/** 급수 자료에 없는 글자의 부수·획수 보강표 — 급수 정보는 없고 모양만 있다 */
const SHAPE_INDEX = new Map(CONST_HANJA_SHAPE.map((entry) => [entry.char, entry]));
/** 유니코드 Unihan 부가 정보 — 낱글자 전체를 덮는다 (표준 독음·교육용 여부·간체) */
const UNIHAN_INDEX = new Map(CONST_HANJA_UNIHAN.map((entry) => [entry.char, entry]));

/** Unihan 부가 정보만 뽑아 낸다 — char 는 색인에 이미 있으므로 뺀다 */
const unihanOf = (char: string) => {
	const found = UNIHAN_INDEX.get(char);
	if (!found) {
		return {};
	}
	const { char: _char, ...rest } = found;
	return rest;
};

let cache: HanjaEntry[] | null = null;

/** 낱글자 색인 생성 (최초 1회, 이후 캐시) */
export const getHanjaList = (): HanjaEntry[] => {
	if (cache) {
		return cache;
	}
	const map = new Map<string, { meanings: Map<string, number>; strokes: number; radical: string; proverbs: MainDataType.ProverbType[] }>();

	ProverbServices.selectProverbList().forEach((proverb) => {
		proverb.characters?.forEach((c) => {
			if (!c?.char) {
				return;
			}
			const char = normalize(c.char);
			const found = map.get(char);
			if (found) {
				found.meanings.set(c.meaning, (found.meanings.get(c.meaning) ?? 0) + 1);
				found.proverbs.push(proverb);
				return;
			}
			map.set(char, {
				meanings: new Map([[c.meaning, 1]]),
				strokes: c.strokes,
				radical: c.radical,
				proverbs: [proverb],
			});
		});
	});

	cache = [...map.entries()]
		.map(([char, v]) => {
			// 한자어 데이터의 새김 — 많이 쓰인 표기부터
			const localMeanings = [...v.meanings.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
			const dict = DICT_INDEX.get(char);
			if (!dict) {
				// 급수 자료에 없는 글자 — 새김은 단어 데이터의 것을 쓰고, 부수·획수만 보강표에서 채운다
				const shape = SHAPE_INDEX.get(char);
				return {
					char,
					meaning: localMeanings[0] ?? '',
					altMeanings: localMeanings.slice(1),
					strokes: shape?.totalStrokes ?? v.strokes,
					radical: shape?.radical.char ?? v.radical,
					proverbs: v.proverbs,
					radicalName: shape?.radical.name,
					radicalStrokes: shape?.radical.strokes,
					...unihanOf(char),
				};
			}
			const meaning = `${dict.hun} ${dict.eum}`;
			return {
				char,
				meaning,
				altMeanings: localMeanings.filter((m) => m !== meaning),
				strokes: dict.totalStrokes,
				radical: dict.radical.char,
				proverbs: v.proverbs,
				grade: dict.grade,
				hun: dict.hun,
				eum: dict.eum,
				radicalName: dict.radical.name,
				radicalStrokes: dict.radical.strokes,
				homophones: dict.homophones,
				abbr: dict.abbr,
				origin: dict.origin,
				...unihanOf(char),
			};
		})
		.sort((a, b) => b.proverbs.length - a.proverbs.length);

	return cache;
};

/** 한자어 상세·학습 카드에 쓰는 글자 한 칸 */
export type RefinedCharacter = {
	char: string;
	/** 훈 (뜻) — 예: '지날' */
	hun: string;
	/** 음 (소리) — 예: '과'. 급수 자료에 없는 글자는 빈 문자열 */
	eum: string;
	/** 훈음 한 줄 — 예: '지날 과' */
	meaning: string;
	strokes: number;
	radical: string;
	radicalName?: string;
	grade?: HanjaDictType.Grade;
	/** 교육용 기초한자 */
	education?: boolean;
	/** 중국 간체자 */
	simplified?: string;
};

/** 글자 카드에 얹는 Unihan 정보 — 교육용 여부·간체만 쓴다 */
const refinedUnihan = (char: string): Pick<RefinedCharacter, 'education' | 'simplified'> => {
	const found = UNIHAN_INDEX.get(char);
	return { education: found?.education, simplified: found?.simplified };
};

/** '지날 과' → 훈 '지날' + 음 '과'. 마지막 토큰을 음으로 본다 */
const splitHunEum = (meaning: string): { hun: string; eum: string } => {
	const parts = (meaning ?? '').trim().split(/\s+/);
	return parts.length > 1 ? { hun: parts.slice(0, -1).join(' '), eum: parts[parts.length - 1] } : { hun: meaning ?? '', eum: '' };
};

/**
 * 한자어 구성 한자를 급수 자료 기준으로 보정한다.
 * 화면마다 characters 를 직접 읽으면 잘못된 획수·새김이 그대로 나가고,
 * '지날 과'를 훈/음으로 쪼개는 코드도 화면마다 따로 생긴다 — 조회는 전부 이 함수를 거친다.
 */
export const refineCharacters = (proverb: Pick<MainDataType.ProverbType, 'hanja' | 'characters'>): RefinedCharacter[] =>
	[...(proverb.hanja ?? '')].map((raw, at) => {
		const char = normalize(raw);
		const dict = DICT_INDEX.get(char);
		if (dict) {
			return {
				char,
				hun: dict.hun,
				eum: dict.eum,
				meaning: `${dict.hun} ${dict.eum}`,
				strokes: dict.totalStrokes,
				radical: dict.radical.char,
				radicalName: dict.radical.name,
				grade: dict.grade,
				...refinedUnihan(char),
			};
		}
		// 급수 자료에 없는 글자는 한자어 데이터 값을 그대로 쓴다
		const fallback = proverb.characters?.[at];
		const shape = SHAPE_INDEX.get(char);
		return {
			char,
			...splitHunEum(fallback?.meaning ?? ''),
			meaning: fallback?.meaning ?? '',
			strokes: shape?.totalStrokes ?? fallback?.strokes ?? 0,
			radical: shape?.radical.char ?? fallback?.radical ?? '',
			radicalName: shape?.radical.name,
			...refinedUnihan(char),
		};
	});

/** 한 글자 조회 (동음자 카드에서 다른 글자로 건너뛸 때 쓴다) */
export const findHanja = (char: string): HanjaEntry | undefined =>
	getHanjaList().find((entry) => entry.char === normalize(char));

/** 부수 목록 — 그 부수를 쓰는 한자가 많은 순 */
export const getRadicals = (): { radical: string; count: number }[] => {
	const counter = new Map<string, number>();
	getHanjaList().forEach((entry) => counter.set(entry.radical, (counter.get(entry.radical) ?? 0) + 1));
	return [...counter.entries()].map(([radical, count]) => ({ radical, count })).sort((a, b) => b.count - a.count);
};

/** 어문회 급수 목록 — 쉬운 급수부터, 실제로 글자가 있는 급수만 */
export const getGrades = (): { grade: string; count: number }[] => {
	const counter = new Map<string, number>();
	getHanjaList().forEach((entry) => {
		const grade = entry.grade?.eomun;
		if (grade) {
			counter.set(grade, (counter.get(grade) ?? 0) + 1);
		}
	});
	return EOMUN_GRADE_ORDER.filter((grade) => counter.has(grade)).map((grade) => ({ grade, count: counter.get(grade) as number }));
};

const sorters: Record<HanjaSortType, (a: HanjaEntry, b: HanjaEntry) => number> = {
	frequency: (a, b) => b.proverbs.length - a.proverbs.length,
	strokes: (a, b) => a.strokes - b.strokes || b.proverbs.length - a.proverbs.length,
	radical: (a, b) => a.radical.localeCompare(b.radical) || a.strokes - b.strokes,
	grade: (a, b) => gradeRank(a) - gradeRank(b) || b.proverbs.length - a.proverbs.length,
};

/**
 * 한자 검색 — 한자 자체, 새김(뜻)·음, 부수, 급수, 포함된 한자어의 한글 표기까지 훑는다.
 * query 가 비어 있으면 정렬만 적용한 전체 목록.
 * @param radical 부수 필터 (부수 글자)
 * @param grade 어문회 급수 필터
 */
export const searchHanja = (query: string, sort: HanjaSortType = 'frequency', radical?: string, grade?: string): HanjaEntry[] => {
	const q = query.trim().toLowerCase();
	const list = getHanjaList().filter((entry) => {
		if (radical && entry.radical !== radical) {
			return false;
		}
		if (grade && entry.grade?.eomun !== grade) {
			return false;
		}
		if (!q) {
			return true;
		}
		// 새김('달 감')·음·부수·수록 한자어까지 훑고, 'ㄷㄱ' 같은 초성 질의도 함께 받는다
		return (
			entry.char === q ||
			entry.radical === q ||
			entry.eum === q ||
			matchesAny([entry.meaning, ...entry.altMeanings, entry.radicalName], query) ||
			entry.proverbs.some((p) => matchesAny([p.hangul, p.hanja], query))
		);
	});
	return list.sort(sorters[sort]);
};

export default { getHanjaList, getRadicals, getGrades, searchHanja, findHanja, refineCharacters };
