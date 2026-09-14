/**
 * 이식 화면 → 앱 상태 다리
 * -------------------------------------------------
 * 옮겨 온 화면들은 자기 기록을 AsyncStorage 에 직접 쓴다(원본 그대로).
 * 그런데 이 앱의 홈·나의 활동·펫은 redux(LifeSlice)를 본다. 다리를 놓지 않으면
 * **학습을 해도 홈의 진도·코인·펫이 0인 채로 남는다**.
 *
 * 그래서 "한 판이 끝났다" 같은 굵직한 사건만 여기서 한 번씩 넘긴다.
 * 화면 안의 세세한 진행(콤보·점수·뱃지)은 원본 저장소가 그대로 맡는다.
 *
 * dispatch 는 훅이 아니라 스토어에 직접 건다 — 이식 화면은 Provider 안에 있지만
 * 호출 지점이 이벤트 콜백 깊숙이 있어 훅으로 끌고 다니면 화면마다 배선이 늘어난다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Store } from '@/src/store/Store';
import { ensureDaily, finishQuiz, markLearned, recordTimeChallenge, recordTower, setFavorite } from '@/src/store/slice/LifeSlice';
import type { LifeType } from '@/src/types/data/LifeType';
import { toProverbId, toWordId } from '@/src/four/services/ProverbServices';
import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';
import type { MainDataType } from '@/src/four/types/MainDataType';
import { LIFE_CATEGORIES } from '@/src/const/data/life/ConstLifeCategories';
import { quizBonus } from '@/src/services/life/LifeRules';

/** 원본 퀴즈 모드 → 앱의 퀴즈 모드 (앱은 세 가지만 구분한다) */
const MODE_MAP: Record<string, LifeType.QuizMode> = {
	meaning: 'meaning',
	proverb: 'hanja',
	blank: 'blank',
	example: 'blank',
};

/** 아직 앱 상태로 넘기지 않은 이번 판의 정오답 */
let buffer: LifeType.AnswerLog[] = [];

/** 학습 카드에서 "알았어요" — 처음 배운 단어만 코인·경험치가 붙는다 */
export const bridgeStudied = (proverbId: number): void => {
	const wordId = toWordId(proverbId);
	if (wordId) {
		Store.dispatch(markLearned([wordId]));
	}
};

/** 퀴즈 한 문제 채점 — 판이 끝날 때 한꺼번에 넘기려고 모아 둔다 */
export const bridgeAnswer = (proverbId: number, mode: string, isCorrect: boolean, fast = false): void => {
	const wordId = toWordId(proverbId);
	if (!wordId) {
		return;
	}
	buffer.push({ wordId, mode: MODE_MAP[mode] ?? 'meaning', selected: '', isCorrect, fast: isCorrect && fast });
};

/** 주소로 들어온 카테고리 키가 실제 카테고리일 때만 기록에 남긴다 (별점 계산용) */
const toCategory = (key?: string): LifeType.CategoryKey | undefined => LIFE_CATEGORIES.find((item) => item.key === key)?.key;

/**
 * 모아 둔 정오답을 앱 상태에 넘긴다 — 기록·오답 노트·코인이 여기서 한 번에 반영된다.
 * 판이 끝날 때뿐 아니라 화면을 벗어날 때도 부른다 (중간에 나가도 푼 만큼은 남아야 한다).
 */
export const flushQuiz = (source: LifeType.QuizSource = 'category', category?: string): LifeType.QuizBonus | null => {
	if (buffer.length === 0) {
		return null;
	}
	const logs = buffer;
	buffer = [];
	Store.dispatch(finishQuiz({ source, category: toCategory(category), logs }));
	// 결과 화면이 "번개 3 · 최대 콤보 7" 을 보여 줄 수 있게 이번 판 보너스를 돌려준다
	return quizBonus(logs);
};

/** 다음 판을 위해 남은 기록을 버린다 (다시 풀기로 새 판을 시작할 때) */
export const resetQuizBuffer = (): void => {
	buffer = [];
};

/**
 * 오늘의 퀴즈 5문제 완료.
 * 이식 화면은 문제를 자기 저장소에서 뽑으므로 redux 의 오늘 세트가 비어 있을 수 있다.
 * 세트가 없으면 finishQuiz 의 '오늘 완료' 처리가 통째로 건너뛰어지므로 먼저 확보한다.
 */
export const bridgeDailyDone = (): void => {
	Store.dispatch(ensureDaily());
	flushQuiz('daily');
};

/** 타워 한 층 클리어 — 최고 층과 코인을 넘긴다 */
export const bridgeTower = (level: number): void => {
	const logs = buffer;
	buffer = [];
	// score 에 층을 실어 보내면 3층마다 만점 보물상자가 나온다
	Store.dispatch(finishQuiz({ source: 'tower', logs, score: level }));
	Store.dispatch(recordTower(level));
};

/** 타임 챌린지 종료 — 최고 점수와 코인을 넘긴다 */
export const bridgeTimeChallenge = (score: number, correct: number): void => {
	const logs = buffer;
	buffer = [];
	Store.dispatch(finishQuiz({ source: 'time', logs, reward: correct * 2, score }));
	Store.dispatch(recordTimeChallenge(score));
};

/**
 * 오답 방패가 걸려 있는지.
 * 방패는 redux 쪽 오답 노트만 걸러 주고 있었다 — 화면에 보이는 오답 노트는 이식 화면 저장소를 읽으므로,
 * 산 아이템이 정작 눈에 보이는 곳에서 아무 일도 하지 않았다. 퀴즈 화면이 이 값을 보고 같이 건너뛴다.
 * (실제 소모는 판이 끝날 때 redux finishQuiz 에서 한 번만 일어난다)
 */
export const isWrongGuardActive = (): boolean => (Store.getState().life.wrongGuards ?? 0) > 0;

/**
 * 앱 쪽(숏폼)에서 익힌 단어를 이식 화면 저장소에도 남긴다 — 반대 방향 다리.
 * -------------------------------------------------
 * 통계 탭의 학습 진척도·마지막 학습일은 이식 화면 저장소(UserStudyHistory)만 읽는다.
 * 숏폼 학습은 redux 에만 기록해서, 숏폼으로만 공부하면 통계가 0인 채로 남았다.
 * 학습 카드(QuizStudyScreen)가 쓰는 것과 같은 모양으로 한 줄 더해 둔다.
 */
export const bridgeStudiedToStats = async (wordId: string): Promise<void> => {
	const proverbId = toProverbId(wordId);
	if (!proverbId) {
		return;
	}
	try {
		const raw = await AsyncStorage.getItem(MainStorageKeyType.USER_STUDY_HISTORY);
		const parsed: Partial<MainDataType.UserStudyHistory> = raw ? JSON.parse(raw) : {};
		const studyProverbs = parsed.studyProverbs ?? [];
		const next: MainDataType.UserStudyHistory = {
			studyProverbs: studyProverbs.includes(proverbId) ? studyProverbs : [...studyProverbs, proverbId],
			studyCounts: { ...(parsed.studyCounts ?? {}), [proverbId]: (parsed.studyCounts?.[proverbId] ?? 0) + 1 },
			badges: parsed.badges ?? [],
			lastStudyAt: new Date(),
		};
		await AsyncStorage.setItem(MainStorageKeyType.USER_STUDY_HISTORY, JSON.stringify(next));
	} catch (e) {
		console.warn('학습 기록 반영 실패:', e);
	}
};

/**
 * 즐겨찾기 — 별이 두 목록에 따로 쌓이던 것을 한 목록처럼 보이게 잇는다.
 * -------------------------------------------------
 * 단어 사전의 별은 redux(단어 id)에, 오늘의 퀴즈·오답노트의 별은 이식 화면 저장소(숫자 id)에 쌓였다.
 * 한쪽에서 담은 단어가 다른 쪽에는 없어서 같은 '즐겨찾기'가 두 개였다.
 * 켜고 끈 결과를 서로에게 그대로 옮긴다 — toggle 이 아니라 값을 넘겨야 두 저장소가 엇갈리지 않는다.
 */

/** 이식 화면에서 별을 눌렀을 때 — redux 쪽 목록을 같은 값으로 맞춘다 */
export const bridgeFavoriteToApp = (proverbId: number, on: boolean): void => {
	const wordId = toWordId(proverbId);
	if (wordId) {
		Store.dispatch(setFavorite({ id: wordId, on }));
	}
};

/**
 * 이식 화면 즐겨찾기 저장소를 소리·미션 진행도 없이 직접 손본다.
 * favoriteUtils.addFavorite 을 부르면 담을 때마다 효과음이 울리고 요일 미션이 오른다 —
 * 단어 사전에서 이미 한 번 울린 뒤라 두 번 울리고, 첫 합치기에서는 수십 번 울린다.
 */
interface PortedFavorite {
	id: number;
	addedAt: number;
}

const FAVORITES_KEY = MainStorageKeyType.FAVORITES_STORAGE_KEY;

const readPortedFavorites = async (): Promise<PortedFavorite[]> => {
	try {
		const raw = await AsyncStorage.getItem(FAVORITES_KEY);
		return raw ? (JSON.parse(raw) as PortedFavorite[]) : [];
	} catch {
		return [];
	}
};

/** 단어 사전에서 별을 눌렀을 때 — 이식 화면 저장소를 같은 값으로 맞춘다 */
export const bridgeFavoriteToPorted = async (wordId: string, on: boolean): Promise<void> => {
	const proverbId = toProverbId(wordId);
	if (!proverbId) {
		return;
	}
	try {
		const rows = await readPortedFavorites();
		const has = rows.some((row) => row.id === proverbId);
		if (on === has) {
			return;
		}
		const next = on ? [...rows, { id: proverbId, addedAt: Date.now() }] : rows.filter((row) => row.id !== proverbId);
		await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
	} catch (e) {
		console.warn('즐겨찾기 반영 실패:', e);
	}
};

/**
 * 두 목록을 한 번만 합친다 — 이 다리가 생기기 전에 양쪽에 따로 담아 둔 별을 살린다.
 * 합집합으로 맞추고, 다시는 돌지 않게 표시를 남긴다.
 */
const FAVORITES_MERGED_KEY = 'FAVORITES_MERGED_V1';

export const mergeFavoritesOnce = async (): Promise<void> => {
	try {
		if (await AsyncStorage.getItem(FAVORITES_MERGED_KEY)) {
			return;
		}
		const rows = await readPortedFavorites();
		const portedIds = new Set(rows.map((row) => row.id));
		const appIds: string[] = Store.getState().life.favorites ?? [];

		// 이식 화면에만 있던 별 → 단어 사전으로
		portedIds.forEach((id) => {
			const wordId = toWordId(id);
			if (wordId && !appIds.includes(wordId)) {
				Store.dispatch(setFavorite({ id: wordId, on: true }));
			}
		});

		// 단어 사전에만 있던 별 → 이식 화면 저장소로 (한 번에 쓴다)
		const added: PortedFavorite[] = [];
		appIds.forEach((wordId) => {
			const proverbId = toProverbId(wordId);
			if (proverbId && !portedIds.has(proverbId)) {
				added.push({ id: proverbId, addedAt: Date.now() });
			}
		});
		if (added.length > 0) {
			await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...rows, ...added]));
		}

		await AsyncStorage.setItem(FAVORITES_MERGED_KEY, '1');
	} catch (e) {
		console.warn('즐겨찾기 합치기 실패:', e);
	}
};
