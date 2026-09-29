import type { LearnType } from '@/src/types/data/LearnType';
import { selectTopicImage } from '@/src/const/data/world/ConstWorldImages';

/**
 * 상황별 마스코트 그림 — 역사 사자 (세계 상식 퀴즈 마스코트)
 * 원본 명세는 src/assets/illustrations/lion/lion-prompts.md
 */
export const SHARED_STATE_ILLUSTRATIONS = {
	locked: require('@/src/assets/illustrations/lion/lion-encourage.webp'),
	empty: require('@/src/assets/illustrations/lion/lion-empty-search.webp'),
	noResults: require('@/src/assets/illustrations/lion/lion-empty-search.webp'),
	reviewNeeded: require('@/src/assets/illustrations/lion/lion-study.webp'),
	allComplete: require('@/src/assets/illustrations/lion/lion-study-complete.webp'),
	perfectScore: require('@/src/assets/illustrations/lion/lion-result-great.webp'),
	retry: require('@/src/assets/illustrations/lion/lion-result-retry.webp'),
} as const;

export type SharedStateIllustrationKey = keyof typeof SHARED_STATE_ILLUSTRATIONS;

export const getSharedStateIllustration = (key: SharedStateIllustrationKey): ReturnType<typeof require> =>
	SHARED_STATE_ILLUSTRATIONS[key];

/** 주제 대표 그림 — 항목 그림이 없는 주제(지형·사건·스포츠 대회)에만 있다. 없으면 null (화면은 아이콘으로 대신한다) */
export const getDomainIllustration = (domain: LearnType.Domain): ReturnType<typeof require> | null => selectTopicImage(domain) ?? null;
