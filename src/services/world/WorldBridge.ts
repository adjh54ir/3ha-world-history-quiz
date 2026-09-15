import { Store } from '@/src/store/Store';
import { ensureDaily, finishQuiz, markLearned, recordTimeChallenge, recordTower } from '@/src/store/slice/LifeSlice';
import { quizBonus } from '@/src/services/life/LifeRules';
import type { LifeType } from '@/src/types/data/LifeType';

/**
 * 세계 상식 화면 → 앱 상태 다리
 * -------------------------------------------------
 * 학습·퀴즈 화면은 문제를 내고 채점만 한다. 진도·오답 노트·경험치·미션·뱃지는
 * 전부 redux(LifeSlice)가 맡는다. 다리를 놓지 않으면 **퀴즈를 풀어도 홈이 0인 채로 남는다**.
 *
 * 채점은 문제마다 일어나지만 상태는 판이 끝날 때 한 번만 건드린다.
 * 문제마다 dispatch 하면 오답 노트 졸업·미션·뱃지 판정이 한 판에 열 번 돈다.
 *
 * dispatch 는 훅이 아니라 스토어에 직접 건다 — 부르는 자리가 이벤트 콜백 깊숙이 있어
 * 훅으로 끌고 다니면 화면마다 배선이 늘어난다 (이식 화면의 LifeBridge 와 같은 방식).
 */

/** 아직 앱 상태로 넘기지 않은 이번 판의 정오답 */
let buffer: LifeType.AnswerLog[] = [];

/** 학습 카드를 한 장 넘겼다 — 처음 보는 항목만 경험치가 붙는다 */
export const bridgeWorldStudied = (entryId: string): void => {
	Store.dispatch(markLearned([entryId]));
};

/**
 * 퀴즈 한 문제 채점 — 판이 끝날 때 한꺼번에 넘기려고 모아 둔다.
 * @param fast 빠르게 맞혔는지 (번개 보너스). 타이머 없는 화면은 넘기지 않는다
 */
export const collectWorldAnswer = (entryId: string, isCorrect: boolean, fast = false): void => {
	buffer.push({ wordId: entryId, mode: 'meaning', selected: '', isCorrect, fast: isCorrect && fast });
};

/**
 * 모아 둔 정오답을 앱 상태에 넘긴다 — 기록·오답 노트·경험치·미션이 여기서 한 번에 반영된다.
 * 판이 끝날 때뿐 아니라 화면을 벗어날 때도 부른다 (중간에 나가도 푼 만큼은 남아야 한다).
 *
 * @returns 이번 판 보너스 (번개·최대 콤보). 넘길 것이 없으면 null
 */
export const flushWorldQuiz = (source: LifeType.QuizSource = 'category', category?: string): LifeType.QuizBonus | null => {
	if (buffer.length === 0) {
		return null;
	}
	const logs = buffer;
	buffer = [];
	if (source === 'daily') {
		// 오늘의 세트를 한 번도 안 열었으면 '오늘 완료' 처리가 통째로 건너뛰어진다
		Store.dispatch(ensureDaily());
	}
	Store.dispatch(finishQuiz({ source, category, logs }));
	return quizBonus(logs);
};

/** 다시 풀기로 새 판을 시작할 때 — 남은 기록을 버린다 */
export const resetWorldBuffer = (): void => {
	buffer = [];
};

/** 타워 한 층 클리어 — 최고 층과 퀴즈 기록을 넘긴다 */
export const bridgeWorldTower = (level: number): void => {
	const logs = buffer;
	buffer = [];
	Store.dispatch(finishQuiz({ source: 'tower', logs, score: level }));
	Store.dispatch(recordTower(level));
};

/** 타임 챌린지 종료 — 최고 점수와 퀴즈 기록을 넘긴다 */
export const bridgeWorldTime = (score: number): void => {
	const logs = buffer;
	buffer = [];
	Store.dispatch(finishQuiz({ source: 'time', logs, score }));
	Store.dispatch(recordTimeChallenge(score));
};
