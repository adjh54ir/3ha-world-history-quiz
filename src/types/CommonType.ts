/**
 * 공통 타입을 관리하는 모듈
 */

export namespace CommonType {
	export type AppCategory = 'quiz' | 'calculator' | 'utility';
	export type AppItem = {
		id: number;
		icon: any;
		title: string;
		desc: string;
		category: AppCategory;
		android?: string;
		ios?: string;
		/** 스토어 출시일(YYYY-MM-DD) — 기록용 */
		releasedAt?: string;
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
