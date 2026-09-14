import type { ColorToken } from '@/src/const/ConstColors';
import type { LifeType } from '@/src/types/data/LifeType';

/**
 * 단어 난이도 등급
 * -------------------------------------------------
 * 획수가 아니라 "일상에서 얼마나 자주 쓰는 말인가" 로 매긴 등급이다.
 * 초급에서 특급으로 갈수록 색이 진해져, 칩만 봐도 어느 정도 말인지 짐작된다.
 */
export interface LifeLevel {
	level: LifeType.Level;
	label: string;
	/** 한 줄 설명 — 등급 안내에 쓴다 */
	description: string;
	/**
	 * 난이도 아이콘 (MaterialCommunityIcons) — 새싹에서 왕관까지 자라는 사다리다.
	 * 네 등급이 모두 같은 그림(신호 막대)이던 때는 색만으로 구분해야 해서, 색약이거나 작은 칩에서는 등급이 읽히지 않았다.
	 */
	icon: string;
	color: ColorToken;
	tint: ColorToken;
}

export const LIFE_LEVELS: LifeLevel[] = [
	{ level: 1, label: '초급', description: '누구나 날마다 쓰는 말', icon: 'sprout', color: 'success', tint: 'successSoft' },
	{ level: 2, label: '중급', description: '일상에서 흔히 만나는 말', icon: 'leaf', color: 'primaryDeep', tint: 'primarySoft' },
	{ level: 3, label: '고급', description: '뉴스와 업무에서 쓰는 말', icon: 'tree', color: 'accentOrange', tint: 'warningSoft' },
	{ level: 4, label: '특급', description: '전문·격식을 갖춘 말', icon: 'crown', color: 'errorDark', tint: 'errorSoft' },
];

export const selectLevel = (level: LifeType.Level): LifeLevel => LIFE_LEVELS[level - 1] ?? LIFE_LEVELS[0];
