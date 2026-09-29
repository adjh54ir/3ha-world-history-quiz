// @/src/const/ConstTowerQuizData.ts

import type { LearnType } from '@/src/types/data/LearnType';
import LearnHubService from '@/src/services/LearnHubService';

export interface TowerQuizQuestion {
	/** 원본 문항 — 오답 노트로 넘길 때 쓴다 */
	source: LearnType.QuizQuestion;
	/** 묻는 말 — 문제 칸 아랫줄 */
	question: string;
	options: string[];
	correctAnswer: number;
	explanation: string;
	/** 묻는 대상 — 문제 칸 윗줄 */
	proverb: string;
	/** 그림 문항(국기·초상 맞히기)이면 윗줄 대신 그림을 건다 */
	imageRef?: string;
	/** 보기가 나라 이름이면 국기를 붙인다 */
	optionFlags?: boolean;
}

/** 타워 층 → 문항 난이도 */
export const TOWER_LEVEL_MAP: Record<number, string> = { 1: '초급', 2: '중급', 3: '고급', 4: '특급' };

/** 층 난이도의 전 주제 믹스 문항 */
export const generateTowerQuiz = (level: string, questionCount: number = 5): TowerQuizQuestion[] =>
	LearnHubService.generateMixedQuiz(questionCount, level).map((q) => ({
		source: q,
		question: q.guide,
		options: q.options,
		correctAnswer: q.answerIndex,
		explanation: q.examples?.length ? `${q.explanation}\n\n더 알아보기:\n${q.examples.join('\n')}` : q.explanation,
		proverb: q.subPrompt ? `${q.prompt}\n${q.subPrompt}` : q.prompt,
		imageRef: q.imageRef,
		optionFlags: q.optionFlags,
	}));
