import Colors from '@/src/const/ConstColors';
import { themed } from '@/src/utils/ThemedStyles';
import i18n from '@/src/translations';
import { DIFFICULTY_LABELS } from '@/src/const/ConstQuizMeta';
import { WORLD_TOPIC_TEXT } from '@/src/const/data/world/ConstWorldText';
import type { WorldType } from '@/src/types/data/WorldType';

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

/** 다루는 주제 이름을 ' · ' 로 잇는다 (주제 이름은 ConstWorldText 한 곳에서 번역) */
const topicNames = (keys: WorldType.TopicKey[]): string => keys.map((k) => WORLD_TOPIC_TEXT[k].label).join(' · ');

export const EXAM_PACKS: ExamPack[] = themed(() => ([
	{
		key: 'geo',
		title: i18n.t('examPacks.geo.title'),
		subtitle: i18n.t('examPacks.geo.subtitle'),
		icon: 'public',
		color: Colors.primary,
		domains: ['capital', 'landmark', 'nature'],
		count: 30,
		covers: topicNames(['capital', 'landmark', 'nature']),
	},
	{
		key: 'history',
		title: i18n.t('examPacks.history.title'),
		subtitle: i18n.t('examPacks.history.subtitle'),
		icon: 'account-balance',
		color: Colors.success,
		domains: ['figure', 'event', 'myth'],
		count: 30,
		covers: topicNames(['figure', 'event', 'myth']),
	},
	{
		key: 'space',
		title: i18n.t('examPacks.space.title'),
		subtitle: i18n.t('examPacks.space.subtitle'),
		icon: 'nights-stay',
		color: Colors.secondaryDark,
		domains: ['space', 'constellation'],
		count: 20,
		covers: topicNames(['space', 'constellation']),
	},
	{
		key: 'expert',
		title: i18n.t('examPacks.expert.title'),
		subtitle: i18n.t('examPacks.expert.subtitle'),
		icon: 'school',
		color: Colors.goldDark,
		domains: ['capital', 'landmark', 'nature', 'figure', 'event', 'myth', 'space', 'constellation'],
		level: DIFFICULTY_LABELS[3],
		count: 20,
		covers: i18n.t('examPacks.expert.covers', { level: DIFFICULTY_LABELS[3] }),
	},
	{
		key: 'sports',
		title: i18n.t('examPacks.sports.title'),
		subtitle: i18n.t('examPacks.sports.subtitle'),
		icon: 'emoji-events',
		color: Colors.heatDark,
		domains: ['worldcup', 'olympic', 'winter'],
		count: 20,
		covers: topicNames(['worldcup', 'olympic', 'winter']),
	},
]));

export const getExamPack = (key?: string): ExamPack | undefined => EXAM_PACKS.find((p) => p.key === key);

export default EXAM_PACKS;
