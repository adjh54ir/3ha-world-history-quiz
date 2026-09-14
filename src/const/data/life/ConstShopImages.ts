import type { ColorToken } from '@/src/const/ConstColors';
import type { ShopUpgradeKey } from '@/src/const/data/life/ConstLifeRewards';

/** 한자 상회 주인 — 안내와 행동 말풍선에서 공유한다. */
export const SHOPKEEPER_IMAGE = require('@/src/assets/shop/rhino-shopkeeper.webp');

/** 대사의 목적이 표정만 봐도 읽히도록 나눈 뿔 사장 컷. */
export const SHOPKEEPER_IMAGES = {
	default: SHOPKEEPER_IMAGE,
	offer: require('@/src/assets/shop/rhino-shopkeeper-offer.webp'),
	success: require('@/src/assets/shop/rhino-shopkeeper-success.webp'),
	short: require('@/src/assets/shop/rhino-shopkeeper-short.webp'),
	info: require('@/src/assets/shop/rhino-shopkeeper-info.webp'),
} as const;

/** 상점 소모품 — 목록과 관련 화면에서 같은 에셋을 공유한다. */
export const SHOP_ITEM_IMAGES = {
	shield: require('@/src/assets/shop/item-shield.webp'),
	focusCharm: require('@/src/assets/shop/item-focus-charm.webp'),
	petFeed: require('@/src/assets/shop/item-pet-feed.webp'),
	snack: require('@/src/assets/shop/item-snack.webp'),
	studyScroll: require('@/src/assets/shop/item-study-scroll.webp'),
	reviewBrush: require('@/src/assets/shop/item-review-brush.webp'),
	bambooLunch: require('@/src/assets/shop/item-bamboo-lunch.webp'),
	masterInkstone: require('@/src/assets/shop/item-master-inkstone.webp'),
	reviewBroom: require('@/src/assets/shop/item-review-broom.webp'),
	wrongShield: require('@/src/assets/shop/item-wrong-shield.webp'),
	chestSeal: require('@/src/assets/shop/item-chest-seal.webp'),
	learningBookmark: require('@/src/assets/shop/item-learning-bookmark.webp'),
	attendanceIncense: require('@/src/assets/shop/item-attendance-incense.webp'),
	treasureMap: require('@/src/assets/shop/item-treasure-map.webp'),
	goldenKey: require('@/src/assets/shop/item-golden-key.webp'),
	moonTea: require('@/src/assets/shop/item-moon-tea.webp'),
	memoryOrb: require('@/src/assets/shop/item-memory-orb.webp'),
	scholarElixir: require('@/src/assets/shop/item-scholar-elixir.webp'),
	treasureCompass: require('@/src/assets/shop/item-treasure-compass.webp'),
	guardianCrate: require('@/src/assets/shop/item-guardian-crate.webp'),
	studyToolkit: require('@/src/assets/shop/item-study-toolkit.webp'),
	attendanceKit: require('@/src/assets/shop/item-attendance-kit.webp'),
	reviewBrazier: require('@/src/assets/shop/item-review-brazier.webp'),
	fiveColorChest: require('@/src/assets/shop/item-five-color-chest.webp'),
	engravingInkstone: require('@/src/assets/shop/item-engraving-inkstone.webp'),
	answerAbacus: require('@/src/assets/shop/item-answer-abacus.webp'),
	attendanceLantern: require('@/src/assets/shop/item-attendance-lantern.webp'),
	treasureLoupe: require('@/src/assets/shop/item-treasure-loupe.webp'),
	guardianBowl: require('@/src/assets/shop/item-guardian-bowl.webp'),
	chestKey: require('@/src/assets/shop/item-chest-key.webp'),
	chestClosed: require('@/src/assets/illustrations/game-chest-closed.webp'),
} as const;

/**
 * 반복 구매 영구 강화 상품의 표시 정보 — 상점 목록과 '지금 걸려 있는 효과' 가 같은 표를 쓴다.
 * 그림 require 가 들어가므로 데이터 파일(ConstLifeRewards)이 아니라 에셋 파일에 둔다.
 */
export const SHOP_UPGRADE_ITEMS: {
	key: ShopUpgradeKey;
	label: string;
	description: string;
	image: number;
	color: ColorToken;
	tint: ColorToken;
	effectText: (effect: number) => string;
	icon: string;
}[] = [
	{
		key: 'engravingInkstone',
		label: '새김 벼루',
		description: '새 단어를 처음 익힐 때 받는 보상이 영구 증가해요',
		image: SHOP_ITEM_IMAGES.engravingInkstone,
		color: 'primaryDeep',
		tint: 'primarySoft',
		effectText: (effect) => `단어당 +${effect}코인 · +${effect}EXP`,
		icon: 'fountain-pen-tip',
	},
	{
		key: 'answerAbacus',
		label: '정답 주판',
		description: '모든 퀴즈에서 받는 보상이 영구 증가해요',
		image: SHOP_ITEM_IMAGES.answerAbacus,
		color: 'secondaryDark',
		tint: 'secondarySoft',
		effectText: (effect) => `퀴즈 보상 +${effect}%`,
		icon: 'abacus',
	},
	{
		key: 'attendanceLantern',
		label: '출석 등불',
		description: '매일 출석 체크로 받는 보상이 영구 증가해요',
		image: SHOP_ITEM_IMAGES.attendanceLantern,
		color: 'accentOrange',
		tint: 'warningSoft',
		effectText: (effect) => `출석마다 +${effect}코인 · +${effect}EXP`,
		icon: 'lantern',
	},
	{
		key: 'treasureLoupe',
		label: '보물 감정경',
		description: '보물상자를 열 때마다 추가 보상을 받아요',
		image: SHOP_ITEM_IMAGES.treasureLoupe,
		color: 'accentAmber',
		tint: 'accentAmberSoft',
		effectText: (effect) => `상자마다 +${effect}코인 · +${effect}EXP`,
		icon: 'magnify-plus-outline',
	},
	{
		key: 'guardianBowl',
		label: '펫 밥그릇',
		description: '청룡 펫에게 먹이를 줄 때 캐릭터 경험치도 받아요',
		image: SHOP_ITEM_IMAGES.guardianBowl,
		color: 'secondaryDark',
		tint: 'secondarySoft',
		effectText: (effect) => `먹이마다 +${effect}EXP`,
		icon: 'bowl-mix-outline',
	},
];
