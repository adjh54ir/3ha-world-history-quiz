// @/src/four/const/ConstTowerQuizData.ts

import type { MainDataType } from '@/src/four/types/MainDataType';
import { formatProverbExamples } from '@/src/four/utils/ProverbExampleUtils';
import ProverbServices from '@/src/four/services/ProverbServices';

/**
 * 문제를 뽑을 단어 풀.
 * 원본은 사자성어 원본 배열(CONST_FOUR_IDIOM_DATA.PROVERB)을 직접 읽었다.
 * 이 앱은 생활 한자어를 ProverbServices 가 같은 모양으로 바꿔 주므로 그 목록을 쓴다.
 */
const WORD_POOL = (): MainDataType.ProverbType[] => ProverbServices.selectProverbList();

export interface TowerQuizQuestion {
	/** 문제로 낸 단어의 id — 결과를 앱 상태(오답 노트·코인)로 넘길 때 쓴다 */
	proverbId: number;
	question: string;
	options: string[];
	correctAnswer: number;
	explanation: string;
	proverb: string;
	level: MainDataType.ProverbType['level'];
	category: MainDataType.ProverbType['category'];
}

function shuffle<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

export function generateTowerQuiz(
	level: MainDataType.ProverbType['level'],
	questionCount: number = 10,
): TowerQuizQuestion[] {
	const pool = WORD_POOL();
	const levelWords = pool.filter((item) => item.level === level);

	if (levelWords.length === 0) {
		return [];
	}

	const selectedWords = shuffle(levelWords).slice(0, Math.min(questionCount, levelWords.length));

	return selectedWords.map((item) => {
		const otherWords = pool.filter((w) => w.id !== item.id);
		const wrongAnswers = shuffle(otherWords)
			.slice(0, 3)
			.map((w) => w.meaning);

		const allOptions = shuffle([item.meaning, ...wrongAnswers]);
		const correctAnswer = allOptions.indexOf(item.meaning);

		return {
			proverbId: item.id,
			question: `'${item.hanja}(${item.hangul})'의 뜻은 무엇일까요?`,
			options: allOptions,
			correctAnswer,
			explanation: `${item.meaning}\n\n예시:\n${formatProverbExamples(item.example)}`,
			proverb: `${item.hanja}(${item.hangul})`,
			level: item.level,
			category: item.category,
		};
	});
}

export function generateTowerChallengeQuiz(questionsPerLevel: number = 5): TowerQuizQuestion[] {
	const levels: MainDataType.ProverbType['level'][] = ['초급', '중급', '고급', '특급'];
	return levels.flatMap((level) => generateTowerQuiz(level, questionsPerLevel));
}

export function generateCategoryQuiz(
	category: MainDataType.ProverbType['category'],
	questionCount: number = 10,
): TowerQuizQuestion[] {
	const pool = WORD_POOL();
	const categoryWords = pool.filter((item) => item.category === category);

	if (categoryWords.length === 0) {
		return [];
	}

	const selectedWords = shuffle(categoryWords).slice(0, Math.min(questionCount, categoryWords.length));

	return selectedWords.map((item) => {
		const otherWords = pool.filter((w) => w.id !== item.id);
		const wrongAnswers = shuffle(otherWords)
			.slice(0, 3)
			.map((w) => w.meaning);

		const allOptions = shuffle([item.meaning, ...wrongAnswers]);
		const correctAnswer = allOptions.indexOf(item.meaning);

		return {
			proverbId: item.id,
			question: `'${item.hanja}(${item.hangul})'의 뜻은 무엇일까요?`,
			options: allOptions,
			correctAnswer,
			explanation: `${item.meaning}\n\n예시:\n${formatProverbExamples(item.example)}`,
			proverb: `${item.hanja}(${item.hangul})`,
			level: item.level,
			category: item.category,
		};
	});
}

export function getLevelName(level: MainDataType.ProverbType['level']): string {
	const levelMap: Record<MainDataType.ProverbType['level'], string> = {
		전체: '전체',
		초급: '아주 쉬움',
		중급: '쉬움',
		고급: '보통',
		특급: '어려움',
	};
	return levelMap[level];
}

export interface QuizResult {
	total: number;
	correct: number;
	score: number;
	wrongQuestions: TowerQuizQuestion[];
}

export function gradeQuiz(questions: TowerQuizQuestion[], answers: number[]): QuizResult {
	const wrongQuestions: TowerQuizQuestion[] = [];
	let correct = 0;

	questions.forEach((q, i) => {
		if (q.correctAnswer === answers[i]) {
			correct++;
		} else {
			wrongQuestions.push(q);
		}
	});

	return {
		total: questions.length,
		correct,
		score: Math.round((correct / questions.length) * 100),
		wrongQuestions,
	};
}
