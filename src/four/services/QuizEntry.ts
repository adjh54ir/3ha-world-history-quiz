/**
 * 퀴즈 화면 진입 파라미터 정리
 * -------------------------------------------------
 * 이식된 퀴즈 화면은 앞 화면(퀴즈 유형 고르기)이 **문제 목록을 통째로 넘겨 주는** 것을 전제로 한다.
 * 그런데 이 앱은 홈·오늘의 퀴즈·오답 노트·단어 상세에서 `/quiz?source=daily` 처럼
 * 주소만 던지고 들어오는 자리가 이미 여러 곳이다.
 *
 * 목록이 실려 오면 그대로 쓰고, 주소만 왔으면 여기서 문제 목록을 만들어 채운다.
 * 이 한 곳만 있으면 기존 진입점을 하나도 고치지 않아도 된다.
 */
import { Store } from '@/src/store/Store';
import { LIFE_CATEGORIES } from '@/src/const/data/life/ConstLifeCategories';
import ProverbServices, { toProverbId } from '@/src/four/services/ProverbServices';
import { pickByLevel, QUIZ_COUNT } from '@/src/services/life/LifeRules';
import type { MainDataType } from '@/src/four/types/MainDataType';

export interface QuizEntryParams {
	questionPool: MainDataType.ProverbType[];
	title: string;
	mode: 'meaning' | 'proverb' | 'blank' | 'example';
	selectedLevel: string;
	levelKey: string;
	isWrongReview?: boolean;
	selectedCategory?: string;
	isPracticeMode?: boolean;
	practiceBookId?: string;
}

/** 주소로 들어올 때 한 판 기본 문항 수 — 등급 환산(expToActions)도 같은 값을 본다 */
const DEFAULT_COUNT = QUIZ_COUNT;

/** 이 앱의 모드 이름 → 이식 화면의 모드 이름 */
const MODE_MAP: Record<string, QuizEntryParams['mode']> = {
	meaning: 'meaning',
	hanja: 'proverb',
	proverb: 'proverb',
	blank: 'blank',
	example: 'example',
};

/** 이식 화면은 등급을 한글로 들고 있다 — 뽑을 때 1~4 로 되돌린다 */
const LEVEL_LABELS: MainDataType.ProverbType['level'][] = ['초급', '중급', '고급', '특급'];
const levelNumberOf = (item: MainDataType.ProverbType): number => LEVEL_LABELS.indexOf(item.level) + 1;

/** 넘어온 id 목록을 이식 화면이 읽는 문제로 바꾼다 (없는 단어는 건너뛴다) */
const poolFromWordIds = (wordIds: string[]): MainDataType.ProverbType[] =>
	ProverbServices.selectProverbByIds(wordIds.map(toProverbId).filter((id): id is number => !!id));

type Search = { source?: string; category?: string; modes?: string; count?: string };

/**
 * @param routeParams 앞 화면이 객체째 넘긴 파라미터 (있으면 그대로 쓴다)
 * @param search      주소로 들어온 값 (`?source=daily&category=daily`)
 */
export const resolveQuizParams = (routeParams: Partial<QuizEntryParams> | undefined, search: Search): QuizEntryParams => {
	// 주소에 source 가 있으면 그쪽이 이번 진입의 뜻이다.
	// 앞 화면이 남겨 둔 파라미터는 경로 이름 한 칸에 머물러 있어, 이 검사가 없으면
	// 이식 퀴즈를 한 판 푼 뒤 "오늘의 퀴즈"로 들어와도 지난 판 문제가 그대로 나온다.
	if (!search.source && routeParams?.questionPool?.length) {
		return routeParams as QuizEntryParams;
	}

	// 여러 모드를 함께 넘겨도 이식 화면은 한 판에 한 모드만 낸다 — 첫 번째를 쓴다
	const mode = MODE_MAP[search.modes?.split(',')[0] ?? ''] ?? 'meaning';
	const count = Math.max(1, Number(search.count) || DEFAULT_COUNT);
	const life = Store.getState().life;

	if (search.source === 'wrong') {
		return {
			questionPool: poolFromWordIds(life.wrong.map((note) => note.wordId)),
			title: '오답 복습',
			mode,
			selectedLevel: '전체',
			levelKey: 'all',
			isWrongReview: true,
		};
	}

	if (search.source === 'daily') {
		return {
			questionPool: poolFromWordIds(life.daily?.wordIds ?? []),
			title: '오늘의 퀴즈',
			mode,
			selectedLevel: '전체',
			levelKey: 'all',
		};
	}

	const category = LIFE_CATEGORIES.find((item) => item.key === search.category);
	const all = ProverbServices.selectProverbList();
	const pool = category ? all.filter((item) => item.category === category.label) : all;

	return {
		// 배운 수에 맞는 등급부터 뽑는다 — 데이터가 특급 쪽으로 쏠려 있어 그냥 섞으면 첫판부터 어렵다
		questionPool: pickByLevel(pool, life.learned.length, count, Math.random, levelNumberOf),
		title: category ? `${category.label} 퀴즈` : '전체 퀴즈',
		mode,
		selectedLevel: '전체',
		levelKey: 'all',
		selectedCategory: category?.label,
	};
};
