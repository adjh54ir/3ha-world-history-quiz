import Colors from '@/src/const/ConstColors';
import { themed } from '@/src/utils/ThemedStyles';

/**
 * 테마 코스 — 앱에 이미 있는 주제를 테마별로 묶어 코스로 제공한다.
 * (한국어 퀴즈의 '시험 대비 팩' 화면을 그대로 쓰되, 세계 상식에는 정해진 시험이 없어 테마로 묶었다)
 * - 새 데이터는 만들지 않는다. 어떤 주제를 어떤 난이도로 몇 문제 뽑을지의 큐레이션만 담는다.
 * - domains 는 LearnHubService 의 도메인 키. 없는 키는 출제에서 조용히 빠진다.
 */
export interface ExamPack {
	key: string;
	title: string;
	/** 어떤 시험인지 한 줄 설명 */
	subtitle: string;
	icon: string;
	color: string;
	/** 출제 대상 도메인 키 */
	domains: string[];
	/** 난이도 고정 (없으면 전체 난이도) */
	level?: string;
	/** 한 회차 문항 수 */
	count: number;
	/** 무엇이 나오는지 안내 문구 */
	covers: string;
}

export const EXAM_PACKS: ExamPack[] = themed(() => ([
	{
		key: 'geo',
		title: '세계 지리 완전정복',
		subtitle: '나라 · 수도 · 랜드마크 · 지형을 한 번에',
		icon: 'public',
		color: Colors.primary,
		domains: ['capital', 'landmark', 'nature'],
		count: 30,
		covers: '세계 수도 · 세계 랜드마크 · 세계 지형',
	},
	{
		key: 'history',
		title: '세계사 핵심',
		subtitle: '인물 · 사건 · 신화로 훑는 세계사',
		icon: 'account-balance',
		color: Colors.success,
		domains: ['figure', 'event', 'myth'],
		count: 30,
		covers: '세계 위인 · 세계사 사건 · 그리스 로마 신화',
	},
	{
		key: 'space',
		title: '우주와 밤하늘',
		subtitle: '태양계부터 별자리까지',
		icon: 'nights-stay',
		color: Colors.secondaryDark,
		domains: ['space', 'constellation'],
		count: 20,
		covers: '태양계 · 별자리와 천체',
	},
	{
		key: 'expert',
		title: '고급 교양 도전',
		subtitle: '고급 난이도만 모아서',
		icon: 'school',
		color: Colors.goldDark,
		domains: ['capital', 'landmark', 'nature', 'figure', 'event', 'myth', 'space', 'constellation'],
		level: '고급',
		count: 20,
		covers: '고급 난이도 전 주제',
	},
	{
		key: 'sports',
		title: '스포츠 대회',
		subtitle: '월드컵 · 올림픽의 역사',
		icon: 'emoji-events',
		color: Colors.heatDark,
		domains: ['worldcup', 'olympic', 'winter'],
		count: 20,
		covers: '월드컵 · 하계 올림픽 · 동계 올림픽',
	},
]));

export const getExamPack = (key?: string): ExamPack | undefined => EXAM_PACKS.find((p) => p.key === key);

export default EXAM_PACKS;
