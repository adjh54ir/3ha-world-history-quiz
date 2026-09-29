import AsyncStorage from '@react-native-async-storage/async-storage';
import DateUtils from '@/src/utils/DateUtils';

/**
 * 첫 실행 온보딩 — 관심 주제와 하루 목표를 먼저 물어 홈을 개인화한다.
 * - 관심 주제: 홈에서 어느 섹션(메인 주제 / 서브 퀴즈)을 위로 올릴지 결정
 *   (키 이름 vocab·knowledge 는 한국어 퀴즈 시절 그대로다 — 저장값이라 바꾸지 않는다)
 * - 하루 목표: 홈의 '오늘의 목표'와 같은 키(HOME_DAILY_GOAL)를 쓴다
 */
export type Interest = 'vocab' | 'knowledge' | 'both';

const DONE_KEY = 'ONBOARDING_DONE';
const INTEREST_KEY = 'ONBOARDING_INTEREST';
/** 홈의 하루 목표와 같은 저장키 — 온보딩에서 고른 값이 그대로 홈에 반영된다 */
const DAILY_GOAL_KEY = 'HOME_DAILY_GOAL';
/** 온보딩을 마친 시각 — 홈 점진 공개(신규 며칠은 섹션 축소) 기준 */
const STARTED_AT_KEY = 'ONBOARDING_STARTED_AT';
/** 이 기간 동안은 홈 하위 섹션을 접어 첫인상을 단순하게 유지한다 */
export const NEWCOMER_DAYS = 3;

export const INTEREST_OPTIONS: { key: Interest; label: string; desc: string; icon: string }[] = [
	{ key: 'vocab', label: '세계 지리 · 역사', desc: '수도 · 랜드마크 · 위인 · 세계사 · 신화 · 우주', icon: 'public' },
	{ key: 'knowledge', label: '스포츠 상식', desc: '월드컵 · 하계 올림픽 · 동계 올림픽', icon: 'emoji-events' },
	{ key: 'both', label: '둘 다 볼래요', desc: '지리·역사와 스포츠를 골고루 익혀요', icon: 'auto-awesome' },
];

const OnboardingService = {
	/** 온보딩을 이미 마쳤는가 */
	async isDone(): Promise<boolean> {
		return (await AsyncStorage.getItem(DONE_KEY)) === '1';
	},

	/** 고른 관심 주제 (안 골랐으면 both) */
	async getInterest(): Promise<Interest> {
		const v = await AsyncStorage.getItem(INTEREST_KEY);
		return v === 'vocab' || v === 'knowledge' ? v : 'both';
	},

	/** 온보딩 완료 — 관심 주제와 하루 목표를 저장한다 */
	async complete(interest: Interest, dailyGoal: number): Promise<void> {
		await AsyncStorage.multiSet([
			[DONE_KEY, '1'],
			[INTEREST_KEY, interest],
			[DAILY_GOAL_KEY, String(dailyGoal)],
			[STARTED_AT_KEY, String(DateUtils.getTimestamp())],
		]);
	},

	/**
	 * 시작한 지 NEWCOMER_DAYS 이내인가 — 홈에서 하위 섹션을 접을지 판단한다.
	 * 시작 시각이 없는(업데이트로 넘어온) 기존 사용자는 신규로 보지 않는다.
	 */
	async isNewcomer(): Promise<boolean> {
		const raw = await AsyncStorage.getItem(STARTED_AT_KEY);
		if (!raw) return false;
		const startedAt = Number(raw);
		if (!Number.isFinite(startedAt)) return false;
		return DateUtils.getTimestamp() - startedAt < NEWCOMER_DAYS * 24 * 60 * 60 * 1000;
	},

	/** 마이 화면에서 관심 주제만 바꾸는 경우 */
	async setInterest(interest: Interest): Promise<void> {
		await AsyncStorage.setItem(INTEREST_KEY, interest);
	},

	/** 초기화 — '모두 초기화'에서 함께 지운다 */
	async clear(): Promise<void> {
		await AsyncStorage.multiRemove([DONE_KEY, INTEREST_KEY, STARTED_AT_KEY]);
	},
};

export default OnboardingService;
