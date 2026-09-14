/**
 * 한자 낱글자 사전 타입
 * -------------------------------------------------
 * 한자 급수 시험(한국어문회·한자교육진흥회) 배정한자 자료에서 사자성어에 쓰인 글자만 추린 것.
 * 데이터는 scripts/genHanjaDict.js 가 굽는다.
 */
export declare namespace HanjaDictType {
	/** 시험 주관 기관 */
	type Org = 'eomun' | 'jinheung';

	/** 기관별 배정 급수. 한쪽에만 배정된 글자는 다른 쪽이 null */
	interface Grade {
		/** 한국어문회 (특급 ~ 8급) */
		eomun: string | null;
		/** 한자교육진흥회 (사범 ~ 8급) */
		jinheung: string | null;
	}

	interface Radical {
		/** 부수 글자 */
		char: string;
		/** 부수 이름 (예: 갓머리) */
		name: string;
		/** 그 글자에 쓰인 형태 기준 부수 획수 */
		strokes: number;
	}

	interface Entry {
		char: string;
		/** 대표 훈 (뜻) — 예: '가르칠' */
		hun: string;
		/** 대표 음 (소리) — 예: '교' */
		eum: string;
		grade: Grade;
		radical: Radical;
		/** 총획 */
		totalStrokes: number;
		/** 음이 같은 한자 */
		homophones?: string[];
		/** 약자 (시험에 나오는 글자만) */
		abbr?: string;
		/** 자원(字源) — '회의 · 설명' 꼴. 확인된 글자에만 있다 */
		origin?: string;
	}
}
