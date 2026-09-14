import { StyleSheet, Text, View } from 'react-native';
import FourImages from '@/src/four/assets/FourImages';
import IconComponent from './atomic/IconComponent';
import { scaledSize, scaleHeight } from '@/src/four/utils';
import { Colors, withAlpha } from '@/src/four/const/ConstColors';
import { FontWeight, Radius, Spacing, SpacingV, Typography } from '@/src/four/const/ConstDesign';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { LIFE_CATEGORIES } from '@/src/const/data/life/ConstLifeCategories';
import { ATTENDANCE_PET_STAGES } from '@/src/const/data/life/ConstLifeRewards';
import { ATTENDANCE_PET_IMAGES } from '@/src/const/data/life/ConstPetImages';

/**
 * 분야(카테고리) 표는 앱 공통 목록(LIFE_CATEGORIES)에서 만든다.
 * 원본은 사자성어용 17개 분야를 여기 직접 적어 뒀지만, 이 앱은 생활 한자어 26개 분야를 쓰고
 * 목록·아이콘·색이 이미 한 곳에 있다. 여기서 다시 적으면 분야를 늘릴 때 두 곳이 어긋난다.
 */
const CATEGORY_BY_LABEL = new Map(LIFE_CATEGORIES.map((item) => [item.label, item]));

/**
 * 난이도 색 — 민트 → 파랑 → 앰버 → 진한 주황으로 한 단계씩 올라간다.
 *
 * 퀴즈 범위 고르기 화면(QuizModeScreen)의 난이도 램프와 **같은 값**이다. 두 화면에서 같은 난이도가
 * 다른 색으로 나오던 것이 "색이 이상하다" 의 정체였다.
 * 초록↔빨강 짝도 걷었다 — 정답·오답 표시가 그 두 색이라 난이도 배지와 뜻이 겹쳤다.
 */
export const getLevelColor = (level: string): string => {
	const map: Record<string, string> = {
		초급: Colors.tealDark, // 민트 (쉬움)
		중급: Colors.primaryDark, // 파랑
		고급: Colors.warningDark, // 앰버
		특급: Colors.accentOrangeDeep, // 진한 주황 (어려움)
	};
	return map[level] || Colors.textMuted;
};

const makeQuizMode = () => [
	{
		mode: 'meaning' as const,
		key: 'meaning',
		label: '뜻 맞추기',
		icon: 'lightbulb',
		type: 'fontAwesome6',
		color: Colors.secondaryLight,
		desc: '한자어를 보고 올바른 뜻을 고르세요',
	},
	{
		mode: 'proverb' as const,
		key: 'proverb',
		label: '한자어 찾기',
		icon: 'quote-left',
		type: 'fontAwesome6',
		color: Colors.primary,
		desc: '뜻을 보고 올바른 한자어를 고르세요',
	},
	{
		mode: 'blank' as const,
		key: 'blank',
		label: '빈 칸 채우기',
		icon: 'pen',
		type: 'fontAwesome6',
		desc: '한자어의 빠진 글자를 맞혀보세요',
		color: Colors.warningBright,
	},
	{
		mode: 'example' as const,
		key: 'example',
		label: '예문 빈칸',
		icon: 'align-left',
		type: 'fontAwesome6',
		color: Colors.teal,
		desc: '예문 속 빈칸에 들어갈 한자어를 고르세요',
	},
	{
		mode: 'etc' as const,
		key: 'comingsoon',
		label: '새로운 퀴즈\nComing Soon...',
		icon: 'hourglass-half',
		type: 'fontAwesome6',
		color: Colors.textMuted,
		desc: '새로운 퀴즈가 준비중입니다.',
	},
] as const;

export type QuizMode = 'meaning' | 'proverb' | 'blank' | 'example' | 'etc';
/**
 * 분야 드롭다운 항목.
 * 팔레트 값을 복사하므로 테마가 바뀌면 다시 만들어야 한다 (ThemeRegistry 참고) —
 * 안 그러면 실행 중 다크로 바꿨을 때 항목 아이콘 색이 라이트 그대로 남는다.
 */
const makeFieldDropdownItems = () => [
	{
		label: '전체',
		value: '전체',
		iconType: 'materialCommunityIcons',
		iconName: 'clipboard-list-outline',
		iconColor: Colors.textSecondary,
		icon: () => <IconComponent type="materialCommunityIcons" name="clipboard-list-outline" size={scaledSize(16)} color={Colors.textSecondary} />,
		labelStyle: { marginLeft: Spacing.sm, fontSize: Typography.body },
	},
	...LIFE_CATEGORIES.map((category) => {
		const color = (Colors as Record<string, string>)[category.color] ?? Colors.textSecondary;
		return {
			label: category.label,
			value: category.label,
			iconType: 'materialCommunityIcons',
			iconName: category.icon,
			iconColor: color,
			icon: () => <IconComponent type="materialCommunityIcons" name={category.icon} size={scaledSize(16)} color={color} />,
		};
	}),
];

/** 테마가 바뀌면 팔레트가 덮어써지므로 이 표도 다시 만든다 (ThemeRegistry 규약) */
export let QUIZ_MODE = makeQuizMode();
registerThemedStyles(() => {
	QUIZ_MODE = makeQuizMode();
});
export let FIELD_DROPDOWN_ITEMS = makeFieldDropdownItems();

/**
 * 난이도 드롭다운 항목. 분야 목록과 같은 이유로 다시 만들 수 있게 둔다.
 * 첫 항목('전체')에는 아이콘 메타를 함께 담는다 — 선택된 항목의 아이콘을 되찾아 그리는 화면이 있다.
 */
const makeLevelDropdownItems = () => [
	{
		label: '전체',
		value: '전체',
		iconType: 'FontAwesome6',
		iconName: 'clipboard-list',
		iconColor: Colors.textSecondary,
		icon: () => <IconComponent type="FontAwesome6" name="clipboard-list" size={scaledSize(16)} color={Colors.textSecondary} />,
		labelStyle: { marginLeft: Spacing.sm, fontSize: Typography.body },
	},
	{
		label: '초급',
		value: '초급',
		icon: () => <IconComponent type="FontAwesome6" name="seedling" size={scaledSize(16)} color={Colors.primary} />,
	},
	{
		label: '중급',
		value: '중급',
		icon: () => <IconComponent type="FontAwesome6" name="leaf" size={scaledSize(16)} color={Colors.warningLight} />,
	},
	{
		label: '고급',
		value: '고급',
		icon: () => <IconComponent type="FontAwesome6" name="tree" size={scaledSize(16)} color={Colors.accentOrangeLight} />,
	},
	{
		label: '특급',
		value: '특급',
		icon: () => <IconComponent type="FontAwesome6" name="trophy" size={scaledSize(16)} color={Colors.error} />,
	},
];
export let LEVEL_DROPDOWN_ITEMS = makeLevelDropdownItems();

/** 테마가 바뀌면 팔레트를 복사해 둔 목록들을 다시 만든다 */
registerThemedStyles(() => {
	FIELD_DROPDOWN_ITEMS = makeFieldDropdownItems();
	LEVEL_DROPDOWN_ITEMS = makeLevelDropdownItems();
});

// ── 색상 팔레트
export const BOOK_COLORS = [
	Colors.primary, // green
	Colors.primaryDark, // emerald
	Colors.teal, // teal
	Colors.infoDark, // cyan
	Colors.info, // sky
	Colors.secondary, // light blue
	Colors.secondaryDark, // blue
	Colors.secondaryStrong, // indigo-blue
	Colors.warningLight, // yellow
	Colors.warningBright, // amber
	Colors.warning, // amber dark
	Colors.accentOrangeLight, // orange light
	Colors.accentOrange, // orange
	Colors.accentOrangeDark, // orange dark
	Colors.errorLight, // red light
	Colors.error, // red
	Colors.errorDark, // red dark
	Colors.pink, // pink
	Colors.pinkLight, // pink light
	Colors.tealDark, // deep teal
	Colors.warningDeep, // brown
	Colors.textSecondary, // slate
	Colors.textDeep, // slate dark
	Colors.textMuted, // slate light
];

// ── 아이콘 팔레트 (materialIcons)
export const BOOK_ICONS = [
	'menu-book',
	'auto-stories',
	'bookmark',
	'star',
	'favorite',
	'emoji-events',
	'school',
	'lightbulb',
	'psychology',
	'local-fire-department',
	'bolt',
	'diamond',
	'rocket-launch',
	'flag',
	'explore',
	'public',
	'spa',
	'nature',
	'forest',
	'eco',
	'wb-sunny',
	'nights-stay',
	'cloud',
	'ac-unit',
	'music-note',
	'sports-soccer',
	'palette',
	'camera-alt',
	'sports-esports',
	'fitness-center',
	'restaurant',
	'flight',
];
/** 누적 출석일로 알에서 부화해 성장하는 청룡 */
export const PET_REWARDS = ATTENDANCE_PET_STAGES.map((stage, at) => ({
	day: stage.minFeeds,
	label: `먹이 ${stage.minFeeds}개`,
	name: stage.label,
	image: ATTENDANCE_PET_IMAGES[at],
}));
/**
 * 분야 아이콘 — 배지 배경색이 데이터에서 오므로 잉크 색을 밖에서 받는다.
 * 목록에 없는 분야도 빈칸 대신 물음표를 줘서 배지 모양이 흔들리지 않게 한다.
 */
export const getFieldIcon = (category: string, color: string = Colors.textInverse): React.ReactNode => {
	const found = CATEGORY_BY_LABEL.get(category);
	return <IconComponent type="materialCommunityIcons" name={found?.icon ?? 'help-circle-outline'} size={scaledSize(14)} color={color} />;
};

/** 난이도 아이콘 — 세 화면에 같은 switch 문이 복사돼 있던 것을 한 곳으로 모았다 */
const LEVEL_ICONS: Record<string, string> = {
	초급: 'seedling',
	중급: 'leaf',
	고급: 'tree',
	특급: 'trophy',
};

/**
 * 난이도·분야 배지 (퀴즈·오늘의 퀴즈·상세에서 같은 모양으로 쓴다)
 * -------------------------------------------------
 * 원색을 면에 그대로 깔면 화면이 색 덩어리가 되어 문제보다 배지가 먼저 튄다.
 * 면은 같은 색을 옅게, 테두리는 조금 진하게, 글씨·아이콘은 원색으로 둔다 —
 * 색은 그대로 읽히면서 조용해지고, 밝은 앰버 위 흰 글씨 같은 대비 사고도 사라진다.
 */
const MetaBadge = ({ color, icon, label }: { color: string; icon: React.ReactNode; label: string }) => (
	<View style={[metaStyles.chip, { backgroundColor: withAlpha(color, 0.12), borderColor: withAlpha(color, 0.3) }]}>
		{icon}
		<Text style={[metaStyles.text, { color }]} numberOfLines={1}>
			{label}
		</Text>
	</View>
);

/** 난이도 배지 — 초급·중급·고급·특급. 목록에 없는 값이면 아무것도 그리지 않는다 */
export const LevelBadge = ({ level }: { level: string }) => {
	const icon = LEVEL_ICONS[level];
	if (!icon) {
		return null;
	}
	const color = getLevelColor(level);
	return <MetaBadge color={color} label={level} icon={<IconComponent type="FontAwesome6" name={icon} size={scaledSize(13)} color={color} />} />;
};

/**
 * 분야 배지 — 색을 아예 쓰지 않는다.
 *
 * 분야가 26개라 색이 돌고 돌면서 옆의 난이도 배지와 늘 부딪혔다 (같은 앰버가 '중급' 과 '음식' 에
 * 동시에 붙는 식이다). 한 화면에서 색이 뜻을 갖는 건 난이도 하나뿐으로 못박고,
 * 분야는 아이콘 모양과 글자로만 읽히게 한다.
 */
export const CategoryBadge = ({ category }: { category: string }) => (
	<View style={metaStyles.neutralChip}>
		{getFieldIcon(category, Colors.textSecondary)}
		<Text style={metaStyles.neutralText} numberOfLines={1}>
			{category}
		</Text>
	</View>
);

const makeMetaStyles = () =>
	StyleSheet.create({
		chip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xs,
			paddingHorizontal: Spacing.sm,
			paddingVertical: SpacingV.xxs,
			minHeight: scaleHeight(22),
			borderRadius: Radius.pill,
			borderWidth: 1,
		},
		text: { flexShrink: 1, fontSize: Typography.footnote, fontWeight: FontWeight.bold },
		// 분야 배지 — 난이도 배지와 같은 크기·모양, 색만 뺐다
		neutralChip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xs,
			paddingHorizontal: Spacing.sm,
			paddingVertical: SpacingV.xxs,
			minHeight: scaleHeight(22),
			borderRadius: Radius.pill,
			borderWidth: 1,
			borderColor: Colors.border,
			backgroundColor: Colors.surfaceAlt,
		},
		neutralText: { flexShrink: 1, fontSize: Typography.footnote, fontWeight: FontWeight.bold, color: Colors.textSecondary },
	});
let metaStyles = makeMetaStyles();
registerThemedStyles(() => {
	metaStyles = makeMetaStyles();
});
