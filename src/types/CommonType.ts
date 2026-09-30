/**
 * 공통 타입을 관리하는 모듈
 */

export declare namespace CommonType {
	export type AppCategory = 'quiz' | 'calculator' | 'utility';
	export type AppItem = {
		id: number;
		icon: any;
		title: string;
		desc: string;
		category: AppCategory;
		/** 스토어 출시일(YYYY-MM-DD). 적힌 앱만 일정 기간 NEW 배지가 붙는다 — isNewApp 참고 */
		releasedAt?: string;
		android?: string;
		ios?: string;
	};
	/**
	 * 일반적인 타입을 관리합니다.
	 */
	export type userInfoType = {
		userSq: number;
		userId: string;
		userUuid: string;
	};
}
