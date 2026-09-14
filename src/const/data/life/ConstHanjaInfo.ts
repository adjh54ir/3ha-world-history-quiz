import { CONST_HANJA_DICT } from '@/src/four/const/ConstHanjaDict';
import { CONST_HANJA_SHAPE } from '@/src/four/const/ConstHanjaShape';
import { CONST_HANJA_UNIHAN } from '@/src/four/const/ConstHanjaUnihan';
import type { HanjaDictType } from '@/src/four/types/HanjaDictType';

/**
 * 낱글자 한 칸에 필요한 정보를 자료 세 곳에서 모아 준다.
 * -------------------------------------------------
 * - 급수 자료(ConstHanjaDict)   : 급수·부수·획수·약자. 사자성어에 쓰인 818자만 있다.
 * - 부수 보강표(ConstHanjaShape) : 급수 자료가 놓친 333자의 부수·획수.
 * - Unihan(ConstHanjaUnihan)     : 낱글자 1151자 전부의 표준 독음·교육용 여부·간체.
 *
 * 화면마다 세 자료를 각각 뒤지면 어디는 획수가 0으로 나오고 어디는 나오는 일이 생긴다.
 * 조회는 이 함수 하나를 거친다.
 */
export interface HanjaInfo {
	char: string;
	/** 총획 — 자료가 없으면 0 */
	strokes: number;
	/** 부수 글자 — 자료가 없으면 빈 문자열 */
	radical: string;
	/** 부수 이름 (예: 초두머리) */
	radicalName?: string;
	/** 그 글자에 쓰인 형태 기준 부수 획수 */
	radicalStrokes?: number;
	/** 한자 급수 — 급수 자료에 실린 글자만 */
	grade?: HanjaDictType.Grade;
	/** 표준 독음 (Unihan) — 여러 개면 다음자 */
	hangul?: string[];
	/** 교육용 기초한자(중·고교 1800자) */
	education?: boolean;
	/** 인명용 한자 */
	koreanName?: boolean;
	/** 중국 간체자 */
	simplified?: string;
	/** 약자 (급수 시험에 나오는 글자만) */
	abbr?: string;
}

/** 호환 한자(U+F900~)가 섞여 들어와도 같은 글자로 보이게 맞춘다 */
const normalize = (char: string): string => char.normalize('NFKC');

const DICT = new Map(CONST_HANJA_DICT.map((entry) => [entry.char, entry]));
const SHAPE = new Map(CONST_HANJA_SHAPE.map((entry) => [entry.char, entry]));
const UNIHAN = new Map(CONST_HANJA_UNIHAN.map((entry) => [entry.char, entry]));

export const selectHanjaInfo = (raw: string): HanjaInfo => {
	const char = normalize(raw);
	const dict = DICT.get(char);
	const shape = dict ?? SHAPE.get(char);
	const unihan = UNIHAN.get(char);
	return {
		char,
		strokes: shape?.totalStrokes ?? 0,
		radical: shape?.radical.char ?? '',
		radicalName: shape?.radical.name,
		radicalStrokes: shape?.radical.strokes,
		grade: dict?.grade,
		hangul: unihan?.hangul,
		education: unihan?.education,
		koreanName: unihan?.koreanName,
		simplified: unihan?.simplified,
		abbr: dict?.abbr,
	};
};
