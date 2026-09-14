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
