import React, { useCallback, useMemo, useState } from 'react';
import { Animated, Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import LifeCharacterGuide, { useCharacterGuideOnce } from './common/LifeCharacterGuide';
import PetAvatar from './common/PetAvatar';
import { BagItemModal, type BagItem } from './modal/ShopDialogs';
import PurchaseBurst, { type PurchaseBurstItem } from './common/PurchaseBurst';
import AdmobRewardAd from '@/src/four/screens/common/ads/AdmobRewardAd';
import ShopkeeperDialogue, { type ShopkeeperMessage, type ShopkeeperMood, type ShopkeeperOffer } from './common/ShopkeeperDialogue';
import { ColorToken, Palette, onSurface } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { DecorPreviewProvider, useActiveEffects, useAttendancePet, useInventory, useLife, usePet, useStreak } from '@/src/hooks/useLife';
import { useScreenEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import {
	buyAttendanceIncense,
	buyAttendanceKit,
	buyPetFeed,
	buyBambooLunch,
	buyChestKey,
	claimAdCoins,
	buyChestSeal,
	buyFocusCharm,
	buyFiveColorChest,
	buyGoldenKey,
	buyGuardianCrate,
	buyShopUpgrade,
	buyDecor,
	toggleDecor,
	setWish,
	clearWish,
	buyLearnBookmark,
	buyMasterInkstone,
	buyMemoryOrb,
	buyMoonTea,
	buyPetSnack,
	buyReviewBroom,
	buyReviewBrazier,
	buyReviewBrush,
	buyShield,
	buyScholarElixir,
	buyStudyScroll,
	buyStudyToolkit,
	buyTreasureCompass,
	buyTreasureMap,
	buyWrongGuard,
} from '@/src/store/slice/LifeSlice';
import {
	FOCUS_CHARM_MAX,
	REWARD,
	SHIELD_MAX,
	SHOP_BOOST_MAX,
	SHOP_UPGRADES,
	shopUpgradeEffect,
	shopUpgradePrice,
} from '@/src/const/data/life/ConstLifeRewards';
import { SHOP_ITEM_IMAGES, SHOP_UPGRADE_ITEMS, SHOPKEEPER_IMAGE } from '@/src/const/data/life/ConstShopImages';
import type { LifeType } from '@/src/types/data/LifeType';
import { Paths, tabPath } from '@/src/navigation/conf/Paths';
import { adCoinsLeft } from '@/src/services/life/LifeRules';
import { DECOR_KINDS, DECORS, DECOR_SET_BONUS_PERCENT, decorsOf } from '@/src/const/data/life/ConstLifeDecor';
import MascotImage from '@/src/screens/common/atomic/MascotImage';
import { DecorSwatch, PetPerch, StudyRoomBackdrop, TitlePlaque, useDecorFrame, useDecorSeal, useDecorSkin } from './common/LifeDecor';
import { showToast } from '@/src/screens/common/atomic/GlobalToast';
import { playComplete, playPop } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

const SHOP_HERO_IMAGE = require('@/src/assets/shop/shop-pavilion-hero.webp');

/** 상점에서 파는 소모품 한 줄 */
interface ShopItem {
	key: string;
	label: string;
	description: string;
	image: number;
	color: ColorToken;
	tint: ColorToken;
	price: number;
	/** 지금 보유 수 등 값 한 줄 — 없으면 그리지 않는다 */
	owned?: string;
	/** 더 살 수 없는 이유 — 있으면 버튼이 잠긴다 */
	blocked?: string;
	onBuy: () => void;
}

type ShopTabKey = 'all' | 'upgrade' | 'growth' | 'study' | 'treasure' | 'decor';
type ItemTabKey = Exclude<ShopTabKey, 'all' | 'decor'>;

const SHOP_TABS: { key: ShopTabKey; label: string; icon: string }[] = [
	{ key: 'all', label: '전체', icon: 'view-grid-outline' },
	{ key: 'upgrade', label: '강화', icon: 'trending-up' },
	{ key: 'growth', label: '성장', icon: 'sprout' },
	{ key: 'study', label: '학습', icon: 'book-open-page-variant-outline' },
	{ key: 'treasure', label: '보물', icon: 'treasure-chest' },
	{ key: 'decor', label: '꾸미기', icon: 'palette-outline' },
];

const SHOP_ITEM_TABS: Record<string, ItemTabKey> = {
	engravingInkstone: 'upgrade',
	answerAbacus: 'upgrade',
	attendanceLantern: 'upgrade',
	treasureLoupe: 'upgrade',
	guardianBowl: 'upgrade',
	petFeed: 'growth',
	snack: 'growth',
	studyScroll: 'growth',
	bambooLunch: 'growth',
	masterInkstone: 'growth',
	moonTea: 'growth',
	scholarElixir: 'growth',
	guardianCrate: 'growth',
	shield: 'study',
	focusCharm: 'study',
	reviewBrush: 'study',
	reviewBroom: 'study',
	wrongShield: 'study',
	learningBookmark: 'study',
	attendanceIncense: 'study',
	memoryOrb: 'study',
	studyToolkit: 'study',
	attendanceKit: 'study',
	reviewBrazier: 'study',
	chest: 'treasure',
	chestSeal: 'treasure',
	treasureMap: 'treasure',
	goldenKey: 'treasure',
	treasureCompass: 'treasure',
	fiveColorChest: 'treasure',
};

/**
 * 상점 — 헤더의 코인 칩을 누르면 열린다.
 * -------------------------------------------------
 * 코인이 쌓이기만 하면 모을 이유가 사라진다. 출석·퀴즈·복습·성장·뽑기·꾸미기에 골고루 쓸 수 있게 둔다.
 * 캐릭터(판다)는 경험치로 자라고, 펫(청룡)은 먹이로 자란다 — 파는 물건도 그 둘로 나뉜다.
 * 1) 스트릭 보호권 : 하루 결석을 막는다 (출석 스트릭 보험)
 * 2) 캐릭터 간식   : 코인을 경험치로 바꿔 판다 성장을 앞당긴다
 * 3) 행운의 상자   : 값보다 기대값이 낮은 대신 크게 터질 수 있는 소모처
 * 4) 화면 꾸미기   : 글방·칭호·좌대·액자·카드 테·낙관을 화면 제자리에 놓는다 (영구 보유)
 */
const LifeShopScreen = () => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const guide = useCharacterGuideOnce('life-shop');
	const dispatch = useDispatch();
	const life = useLife();
	const pet = usePet();
	const { shields } = useStreak();
	const attendancePet = useAttendancePet();
	const enterStyle = useScreenEnter();
	/** 가진 소모품 — 홈과 같은 목록 */
	const ownedItems = useInventory();
	const [activeTab, setActiveTab] = useState<ShopTabKey>('all');
	/** 구매 확인 팝업이 들고 있는 상품 — 확인을 눌러야 코인이 빠진다 */
	const [buying, setBuying] = useState<ShopItem | null>(null);
	/**
	 * 지금 사장에게 물어본 꾸미기 — 확인을 눌러야 코인이 빠진다.
	 * 소모품과 달리 "적용된 모습" 을 봐야 고를 수 있어서, 대화 카드에 미리보기를 얹어 함께 보여 준다.
	 */
	const [decorBuying, setDecorBuying] = useState<LifeType.Decor | null>(null);
	/** 내 가방에서 누른 아이템 — 무슨 물건인지 상세로 보여 준다 */
	const [bagItem, setBagItem] = useState<BagItem | null>(null);
	/** 방금 산 물건 — 구매 연출이 한 번 터지고 스스로 비운다 */
	const [burst, setBurst] = useState<PurchaseBurstItem | null>(null);
	/** 광고 시청 중 — 보상형 광고가 떠 있는 동안 true */
	const [watchingAd, setWatchingAd] = useState(false);
	/** 사장이 지금 하고 있는 말 — 없으면 대화 무대를 그리지 않는다 */
	const [shopkeeperMessage, setShopkeeperMessage] = useState<ShopkeeperMessage | null>(null);
	const say = useCallback((text: string, icon = 'storefront-outline', mood: ShopkeeperMood = 'info') => {
		setShopkeeperMessage((previous) => ({ id: (previous?.id ?? 0) + 1, text, icon, mood }));
	}, []);
	/** 대화 무대를 접는다 — 고르던 상품도 같이 내려놓는다 */
	const closeShopkeeper = useCallback(() => {
		setShopkeeperMessage(null);
		setBuying(null);
		setDecorBuying(null);
	}, []);

	/** 코인이 모자라면 사지 않고 얼마가 부족한지 알려 준다 — 모든 소모품이 같은 규칙을 쓴다 */
	const purchase = (price: number, blocked: string | undefined, action: () => void, done: string, doneSub: string, icon: string) => {
		if (blocked) {
			say(`${blocked}. 다른 물건도 둘러볼까요?`, 'information-outline');
			return;
		}
		if (life.coins < price) {
			say(`코인이 ${price - life.coins}개 더 필요해요. 학습과 퀴즈로 모아서 다시 와요!`, 'circle-multiple-outline', 'short');
			return;
		}
		playComplete();
		action();
		say(`${done}! ${doneSub}`, icon, 'success');
	};

	/** 오늘 광고로 코인을 더 받을 수 있는 횟수 — 지급 리듀서와 같은 함수를 쓴다 */
	const adLeft = adCoinsLeft(life.adCoinDate, life.adCoinCount);

	/** 지금 걸려 있는 효과 — 홈과 같은 목록(useActiveEffects) */
	const activeEffects = useActiveEffects();

	/**
	 * 내 가방 — 목록은 useInventory 한 곳에서 온다 (홈도 같은 목록을 쓴다).
	 * 상점에서만 쓰는 "쓰러 가는 길" 만 여기서 붙인다.
	 */
	const inventory = useMemo<BagItem[]>(
		() =>
			ownedItems.map((item) =>
				item.key === 'petFeed'
					? {
							...item,
							// 먹이는 여기서 줄 수 없다 — 청룡이 있는 '나의 활동'으로 바로 보낸다
							action: {
								label: '펫 먹이 주러가기',
								icon: 'food-drumstick',
								onPress: () => {
									playPop();
									router.push(`/${tabPath(Paths.PROFILE)}` as never);
								},
							},
						}
					: item,
			),
		[ownedItems],
	);

	const items = useMemo<ShopItem[]>(
		() => [
			...SHOP_UPGRADE_ITEMS.map((upgrade) => {
				const level = life.shopUpgrades?.[upgrade.key] ?? 0;
				const maxLevel = SHOP_UPGRADES[upgrade.key].maxLevel;
				const maxed = level >= maxLevel;
				const guardianDone = upgrade.key === 'guardianBowl' && !attendancePet.next;
				const blocked = maxed ? '최대 레벨까지 강화했어요' : guardianDone ? '펫이 마지막 단계까지 자랐어요' : undefined;
				const price = shopUpgradePrice(upgrade.key, level);
				const currentEffect = upgrade.effectText(shopUpgradeEffect(upgrade.key, level));
				const nextEffect = upgrade.effectText(shopUpgradeEffect(upgrade.key, Math.min(level + 1, maxLevel)));
				return {
					key: upgrade.key,
					label: upgrade.label,
					description: maxed ? upgrade.description : `${upgrade.description} · 다음 ${nextEffect}`,
					image: upgrade.image,
					color: upgrade.color,
					tint: upgrade.tint,
					price,
					owned: `Lv.${level} / ${maxLevel} · 현재 ${currentEffect}`,
					blocked,
					onBuy: () =>
						purchase(
							price,
							blocked,
							() => dispatch(buyShopUpgrade(upgrade.key)),
							`${upgrade.label} Lv.${level + 1}`,
							`현재 영구 효과: ${nextEffect}`,
							upgrade.icon,
						),
				};
			}),
			{
				key: 'petFeed',
				label: '펫 먹이',
				description: '청룡 펫에게 주면 성장 칸이 한 칸 찹니다',
				image: SHOP_ITEM_IMAGES.petFeed,
				color: 'secondaryDark',
				tint: 'secondarySoft',
				price: REWARD.petFeedPrice,
				owned: attendancePet.next
					? `먹이 ${attendancePet.feeds}개 보유 · ${attendancePet.next.label}까지 ${attendancePet.next.minFeeds - attendancePet.fed}개`
					: '마지막 단계 도달',
				blocked: attendancePet.next ? undefined : '펫이 마지막 단계까지 자랐어요',
				onBuy: () =>
					purchase(
						REWARD.petFeedPrice,
						attendancePet.next ? undefined : '펫이 마지막 단계까지 자랐어요',
						() => dispatch(buyPetFeed()),
						'펫 먹이를 샀어요',
						'나의 활동이나 출석 팝업에서 먹여 주세요',
						'food-drumstick',
					),
			},
			{
				key: 'shield',
				label: '스트릭 보호권',
				description: '하루 빼먹어도 다음 날 출석하면 연속이 이어져요',
				image: SHOP_ITEM_IMAGES.shield,
				color: 'primaryDeep',
				tint: 'primarySoft',
				price: REWARD.shieldPrice,
				owned: `${shields} / ${SHIELD_MAX}장 보유`,
				blocked: shields >= SHIELD_MAX ? `보호권은 ${SHIELD_MAX}장까지 가질 수 있어요` : undefined,
				onBuy: () =>
					purchase(
						REWARD.shieldPrice,
						shields >= SHIELD_MAX ? `보호권은 ${SHIELD_MAX}장까지 가질 수 있어요` : undefined,
						() => dispatch(buyShield()),
						'스트릭 보호권을 샀어요',
						'출석을 하루 빼먹어도 연속이 끊기지 않아요',
						'shield-check',
					),
			},
			{
				key: 'focusCharm',
				label: '집중 부적',
				description: `다음 퀴즈의 문제 보상이 ${REWARD.focusCharmMultiplier}배가 돼요`,
				image: SHOP_ITEM_IMAGES.focusCharm,
				color: 'accentOrange',
				tint: 'warningSoft',
				price: REWARD.focusCharmPrice,
				owned: `${life.quizBoosts ?? 0} / ${FOCUS_CHARM_MAX}장 보유`,
				blocked: (life.quizBoosts ?? 0) >= FOCUS_CHARM_MAX ? `집중 부적은 ${FOCUS_CHARM_MAX}장까지 가질 수 있어요` : undefined,
				onBuy: () =>
					purchase(
						REWARD.focusCharmPrice,
						(life.quizBoosts ?? 0) >= FOCUS_CHARM_MAX ? `집중 부적은 ${FOCUS_CHARM_MAX}장까지 가질 수 있어요` : undefined,
						() => dispatch(buyFocusCharm()),
						'집중 부적을 챙겼어요',
						'다음 퀴즈의 문제 보상이 두 배가 돼요',
						'brightness-percent',
					),
			},
			{
				key: 'snack',
				label: '캐릭터 간식',
				description: `한 개에 +${REWARD.snackExp}EXP · 다음 단계가 그만큼 가까워져요`,
				image: SHOP_ITEM_IMAGES.snack,
				color: 'accentOrange',
				tint: 'warningSoft',
				price: REWARD.snackPrice,
				owned: pet.next ? `다음 단계까지 ${(pet.next.minExp - pet.exp).toLocaleString()}EXP` : '마지막 단계 도달',
				onBuy: () => purchase(REWARD.snackPrice, undefined, () => dispatch(buyPetSnack()), `캐릭터에게 간식을 줬어요 (+${REWARD.snackExp}EXP)`, '경험치만 오르고 코인은 늘지 않아요', 'food-drumstick'),
			},
			{
				key: 'studyScroll',
				label: '학습 두루마리',
				description: `묶음 성장 아이템 · 캐릭터 경험치 +${REWARD.studyScrollExp}EXP`,
				image: SHOP_ITEM_IMAGES.studyScroll,
				color: 'secondaryDark',
				tint: 'secondarySoft',
				price: REWARD.studyScrollPrice,
				owned: pet.next ? `다음 단계까지 ${(pet.next.minExp - pet.exp).toLocaleString()}EXP` : '마지막 단계 도달',
				onBuy: () =>
					purchase(
						REWARD.studyScrollPrice,
						undefined,
						() => dispatch(buyStudyScroll()),
						`두루마리를 펼쳤어요 (+${REWARD.studyScrollExp}EXP)`,
						'캐릭터의 학습 경험치가 크게 올랐어요',
						'script-text',
					),
			},
			{
				key: 'reviewBrush',
				label: '복습 정리 붓',
				description: '가장 오래된 오답 하나를 오답 노트에서 정리해요',
				image: SHOP_ITEM_IMAGES.reviewBrush,
				color: 'primaryDeep',
				tint: 'primarySoft',
				price: REWARD.reviewBrushPrice,
				owned: `정리할 오답 ${life.wrong.length}개`,
				blocked: life.wrong.length === 0 ? '정리할 오답이 아직 없어요' : undefined,
				onBuy: () =>
					purchase(
						REWARD.reviewBrushPrice,
						life.wrong.length === 0 ? '정리할 오답이 아직 없어요' : undefined,
						() => dispatch(buyReviewBrush()),
						'오답 하나를 정리했어요',
						'가장 오래된 오답이 노트에서 지워졌어요',
						'brush',
					),
			},
			{
				key: 'chest',
				label: '행운의 상자 열쇠',
				description: '상자 하나를 바로 받아요. 10~50 코인이 들어 있어요',
				image: SHOP_ITEM_IMAGES.chestKey,
				color: 'accentAmber',
				tint: 'accentAmberSoft',
				price: REWARD.chestKeyPrice,
				owned: life.pendingChests?.length ? `안 연 상자 ${life.pendingChests.length}개` : '뽑기 한 판',
				onBuy: () => purchase(REWARD.chestKeyPrice, undefined, () => dispatch(buyChestKey()), '열쇠로 상자를 하나 받았어요', '홈으로 돌아가면 상자가 떠올라요', 'treasure-chest'),
			},
			{
				key: 'bambooLunch',
				label: '대나무 도시락',
				description: `캐릭터 경험치 +${REWARD.bambooLunchExp}EXP`,
				image: SHOP_ITEM_IMAGES.bambooLunch,
				color: 'secondaryDark',
				tint: 'secondarySoft',
				price: REWARD.bambooLunchPrice,
				owned: pet.next ? `다음 단계까지 ${(pet.next.minExp - pet.exp).toLocaleString()}EXP` : '마지막 단계 도달',
				onBuy: () => purchase(REWARD.bambooLunchPrice, undefined, () => dispatch(buyBambooLunch()), `도시락을 먹었어요 (+${REWARD.bambooLunchExp}EXP)`, '든든하게 성장했어요', 'basket'),
			},
			{
				key: 'masterInkstone',
				label: '명필 벼루',
				description: `캐릭터 경험치 +${REWARD.masterInkstoneExp}EXP · 한 번에 크게 오릅니다`,
				image: SHOP_ITEM_IMAGES.masterInkstone,
				color: 'primaryDeep',
				tint: 'primarySoft',
				price: REWARD.masterInkstonePrice,
				owned: pet.next ? `다음 단계까지 ${(pet.next.minExp - pet.exp).toLocaleString()}EXP` : '마지막 단계 도달',
				onBuy: () => purchase(REWARD.masterInkstonePrice, undefined, () => dispatch(buyMasterInkstone()), `벼루의 기운을 받았어요 (+${REWARD.masterInkstoneExp}EXP)`, '가장 큰 성장 아이템이에요', 'fountain-pen-tip'),
			},
			{
				key: 'reviewBroom',
				label: '복습 빗자루',
				description: `오래된 오답을 최대 ${REWARD.reviewBroomCount}개 정리해요`,
				image: SHOP_ITEM_IMAGES.reviewBroom,
				color: 'accentOrange',
				tint: 'warningSoft',
				price: REWARD.reviewBroomPrice,
				owned: `정리할 오답 ${life.wrong.length}개`,
				blocked: life.wrong.length === 0 ? '정리할 오답이 아직 없어요' : undefined,
				onBuy: () => purchase(REWARD.reviewBroomPrice, life.wrong.length === 0 ? '정리할 오답이 아직 없어요' : undefined, () => dispatch(buyReviewBroom()), '오답을 말끔히 정리했어요', '오래된 오답이 최대 3개 지워졌어요', 'broom'),
			},
			{
				key: 'wrongShield',
				label: '오답 방패',
				description: '다음 퀴즈에서 새 오답이 노트에 쌓이지 않아요',
				image: SHOP_ITEM_IMAGES.wrongShield,
				color: 'primaryDeep',
				tint: 'primarySoft',
				price: REWARD.wrongGuardPrice,
				owned: `${life.wrongGuards ?? 0} / ${SHOP_BOOST_MAX}개 보유`,
				blocked: (life.wrongGuards ?? 0) >= SHOP_BOOST_MAX ? `오답 방패는 ${SHOP_BOOST_MAX}개까지 가질 수 있어요` : undefined,
				onBuy: () => purchase(REWARD.wrongGuardPrice, (life.wrongGuards ?? 0) >= SHOP_BOOST_MAX ? `오답 방패는 ${SHOP_BOOST_MAX}개까지 가질 수 있어요` : undefined, () => dispatch(buyWrongGuard()), '오답 방패를 챙겼어요', '다음 퀴즈에서 새 오답을 막아 줘요', 'shield-star'),
			},
			{
				key: 'chestSeal',
				label: '보물 인장',
				description: '다음 퀴즈를 끝내면 보물상자를 하나 더 받아요',
				image: SHOP_ITEM_IMAGES.chestSeal,
				color: 'accentAmber',
				tint: 'accentAmberSoft',
				price: REWARD.chestSealPrice,
				owned: `${life.chestSeals ?? 0} / ${SHOP_BOOST_MAX}개 보유`,
				blocked: (life.chestSeals ?? 0) >= SHOP_BOOST_MAX ? `보물 인장은 ${SHOP_BOOST_MAX}개까지 가질 수 있어요` : undefined,
				onBuy: () => purchase(REWARD.chestSealPrice, (life.chestSeals ?? 0) >= SHOP_BOOST_MAX ? `보물 인장은 ${SHOP_BOOST_MAX}개까지 가질 수 있어요` : undefined, () => dispatch(buyChestSeal()), '보물 인장을 받았어요', '다음 퀴즈 뒤에 상자가 추가돼요', 'seal'),
			},
			{
				key: 'learningBookmark',
				label: '학습 책갈피',
				description: '다음 신규 단어 학습 보상이 두 배가 돼요',
				image: SHOP_ITEM_IMAGES.learningBookmark,
				color: 'secondaryDark',
				tint: 'secondarySoft',
				price: REWARD.learnBookmarkPrice,
				owned: `${life.learnBoosts ?? 0} / ${SHOP_BOOST_MAX}개 보유`,
				blocked: (life.learnBoosts ?? 0) >= SHOP_BOOST_MAX ? `책갈피는 ${SHOP_BOOST_MAX}개까지 가질 수 있어요` : undefined,
				onBuy: () => purchase(REWARD.learnBookmarkPrice, (life.learnBoosts ?? 0) >= SHOP_BOOST_MAX ? `책갈피는 ${SHOP_BOOST_MAX}개까지 가질 수 있어요` : undefined, () => dispatch(buyLearnBookmark()), '학습 책갈피를 끼웠어요', '다음 신규 학습 보상이 두 배예요', 'bookmark-check'),
			},
			{
				key: 'attendanceIncense',
				label: '출석 향로',
				description: '다음 출석 체크 보상이 두 배가 돼요',
				image: SHOP_ITEM_IMAGES.attendanceIncense,
				color: 'primaryDeep',
				tint: 'primarySoft',
				price: REWARD.attendanceIncensePrice,
				owned: `${life.attendanceBoosts ?? 0} / ${SHOP_BOOST_MAX}개 보유`,
				blocked: (life.attendanceBoosts ?? 0) >= SHOP_BOOST_MAX ? `출석 향로는 ${SHOP_BOOST_MAX}개까지 가질 수 있어요` : undefined,
				onBuy: () => purchase(REWARD.attendanceIncensePrice, (life.attendanceBoosts ?? 0) >= SHOP_BOOST_MAX ? `출석 향로는 ${SHOP_BOOST_MAX}개까지 가질 수 있어요` : undefined, () => dispatch(buyAttendanceIncense()), '출석 향로를 피웠어요', '다음 출석 보상이 두 배예요', 'incognito'),
			},
			{
				key: 'treasureMap',
				label: '보물 지도',
				description: '행운의 보물상자를 두 개 받아요',
				image: SHOP_ITEM_IMAGES.treasureMap,
				color: 'accentAmber',
				tint: 'accentAmberSoft',
				price: REWARD.treasureMapPrice,
				owned: life.pendingChests?.length ? `안 연 상자 ${life.pendingChests.length}개` : '상자 두 개 묶음',
				onBuy: () => purchase(REWARD.treasureMapPrice, undefined, () => dispatch(buyTreasureMap()), '보물상자 두 개를 찾았어요', '홈에서 차례로 열 수 있어요', 'map-marker-path'),
			},
			{
				key: 'goldenKey',
				label: '황금 열쇠',
				description: `${REWARD.goldenChestCoins}코인이 든 황금 상자를 확정으로 받아요`,
				image: SHOP_ITEM_IMAGES.goldenKey,
				color: 'accentAmber',
				tint: 'accentAmberSoft',
				price: REWARD.goldenKeyPrice,
				owned: life.pendingChests?.length ? `안 연 상자 ${life.pendingChests.length}개` : '확정 보상',
				onBuy: () => purchase(REWARD.goldenKeyPrice, undefined, () => dispatch(buyGoldenKey()), '황금 상자를 받았어요', `${REWARD.goldenChestCoins}코인이 들어 있어요`, 'key-variant'),
			},
			{
				key: 'moonTea',
				label: '달빛 옥로차',
				description: `가벼운 성장 차 · 캐릭터 경험치 +${REWARD.moonTeaExp}EXP`,
				image: SHOP_ITEM_IMAGES.moonTea,
				color: 'secondaryDark',
				tint: 'secondarySoft',
				price: REWARD.moonTeaPrice,
				owned: pet.next ? `다음 단계까지 ${(pet.next.minExp - pet.exp).toLocaleString()}EXP` : '마지막 단계 도달',
				onBuy: () => purchase(REWARD.moonTeaPrice, undefined, () => dispatch(buyMoonTea()), `옥로차를 마셨어요 (+${REWARD.moonTeaExp}EXP)`, '달빛 기운으로 캐릭터가 성장했어요', 'tea'),
			},
			{
				key: 'memoryOrb',
				label: '기억의 구슬',
				description: `오래된 오답을 최대 ${REWARD.memoryOrbCount}개 정리해요`,
				image: SHOP_ITEM_IMAGES.memoryOrb,
				color: 'primaryDeep',
				tint: 'primarySoft',
				price: REWARD.memoryOrbPrice,
				owned: `정리할 오답 ${life.wrong.length}개`,
				blocked: life.wrong.length === 0 ? '정리할 오답이 아직 없어요' : undefined,
				onBuy: () => purchase(REWARD.memoryOrbPrice, life.wrong.length === 0 ? '정리할 오답이 아직 없어요' : undefined, () => dispatch(buyMemoryOrb()), '기억을 맑게 정리했어요', '오래된 오답이 최대 5개 사라졌어요', 'crystal-ball'),
			},
			{
				key: 'scholarElixir',
				label: '현자의 비약',
				description: `최상급 비약 · 캐릭터 경험치 +${REWARD.scholarElixirExp}EXP`,
				image: SHOP_ITEM_IMAGES.scholarElixir,
				color: 'accentOrange',
				tint: 'warningSoft',
				price: REWARD.scholarElixirPrice,
				owned: pet.next ? `다음 단계까지 ${(pet.next.minExp - pet.exp).toLocaleString()}EXP` : '마지막 단계 도달',
				onBuy: () => purchase(REWARD.scholarElixirPrice, undefined, () => dispatch(buyScholarElixir()), `현자의 비약을 썼어요 (+${REWARD.scholarElixirExp}EXP)`, '캐릭터의 수련 경험이 크게 올랐어요', 'bottle-tonic-plus'),
			},
			{
				key: 'treasureCompass',
				label: '보물 나침반',
				description: `행운의 보물상자를 ${REWARD.treasureCompassCount}개 한번에 찾아요`,
				image: SHOP_ITEM_IMAGES.treasureCompass,
				color: 'accentAmber',
				tint: 'accentAmberSoft',
				price: REWARD.treasureCompassPrice,
				owned: life.pendingChests?.length ? `안 연 상자 ${life.pendingChests.length}개` : '상자 세 개 묶음',
				onBuy: () => purchase(REWARD.treasureCompassPrice, undefined, () => dispatch(buyTreasureCompass()), '보물상자 세 개를 찾았어요', '홈에서 차례로 열 수 있어요', 'compass-rose'),
			},
			{
				key: 'guardianCrate',
				label: '펫 양식 상자',
				description: `청룡 펫 먹이를 ${REWARD.guardianCrateFeeds}개 한번에 받아요`,
				image: SHOP_ITEM_IMAGES.guardianCrate,
				color: 'secondaryDark',
				tint: 'secondarySoft',
				price: REWARD.guardianCratePrice,
				owned: attendancePet.next ? `먹이 ${attendancePet.feeds}개 보유` : '마지막 단계 도달',
				blocked: attendancePet.next ? undefined : '펫이 마지막 단계까지 자랐어요',
				onBuy: () => purchase(REWARD.guardianCratePrice, attendancePet.next ? undefined : '펫이 마지막 단계까지 자랐어요', () => dispatch(buyGuardianCrate()), '펫 양식을 챙겼어요', `먹이 ${REWARD.guardianCrateFeeds}개가 보관함에 들어왔어요`, 'package-variant-closed-plus'),
			},
			{
				key: 'studyToolkit',
				label: '학습가의 도구함',
				description: '집중 부적·오답 방패·학습 책갈피를 하나씩 챙겨요',
				image: SHOP_ITEM_IMAGES.studyToolkit,
				color: 'primaryDeep',
				tint: 'primarySoft',
				price: REWARD.studyToolkitPrice,
				owned: `부적 ${life.quizBoosts ?? 0} · 방패 ${life.wrongGuards ?? 0} · 책갈피 ${life.learnBoosts ?? 0}`,
				blocked: (life.quizBoosts ?? 0) >= FOCUS_CHARM_MAX || (life.wrongGuards ?? 0) >= SHOP_BOOST_MAX || (life.learnBoosts ?? 0) >= SHOP_BOOST_MAX ? '세 도구 모두 한 칸씩 비워야 묶음을 살 수 있어요' : undefined,
				onBuy: () => purchase(REWARD.studyToolkitPrice, (life.quizBoosts ?? 0) >= FOCUS_CHARM_MAX || (life.wrongGuards ?? 0) >= SHOP_BOOST_MAX || (life.learnBoosts ?? 0) >= SHOP_BOOST_MAX ? '세 도구 모두 한 칸씩 비워야 묶음을 살 수 있어요' : undefined, () => dispatch(buyStudyToolkit()), '학습 도구함을 챙겼어요', '집중 부적·오답 방패·학습 책갈피가 하나씩 늘었어요', 'toolbox-outline'),
			},
			{
				key: 'attendanceKit',
				label: '출석 준비함',
				description: '스트릭 보호권과 출석 향로를 하나씩 챙겨요',
				image: SHOP_ITEM_IMAGES.attendanceKit,
				color: 'accentOrange',
				tint: 'warningSoft',
				price: REWARD.attendanceKitPrice,
				owned: `보호권 ${shields} · 향로 ${life.attendanceBoosts ?? 0}`,
				blocked: shields >= SHIELD_MAX || (life.attendanceBoosts ?? 0) >= SHOP_BOOST_MAX ? '보호권과 향로 모두 한 칸씩 비워야 묶음을 살 수 있어요' : undefined,
				onBuy: () => purchase(REWARD.attendanceKitPrice, shields >= SHIELD_MAX || (life.attendanceBoosts ?? 0) >= SHOP_BOOST_MAX ? '보호권과 향로 모두 한 칸씩 비워야 묶음을 살 수 있어요' : undefined, () => dispatch(buyAttendanceKit()), '출석 준비를 마쳤어요', '보호권과 출석 향로가 하나씩 늘었어요', 'calendar-shield'),
			},
			{
				key: 'reviewBrazier',
				label: '망각의 화로',
				description: '현재 오답 노트에 있는 오답을 모두 정리해요',
				image: SHOP_ITEM_IMAGES.reviewBrazier,
				color: 'accentOrange',
				tint: 'warningSoft',
				price: REWARD.reviewBrazierPrice,
				owned: `정리할 오답 ${life.wrong.length}개`,
				blocked: life.wrong.length === 0 ? '정리할 오답이 아직 없어요' : undefined,
				onBuy: () => purchase(REWARD.reviewBrazierPrice, life.wrong.length === 0 ? '정리할 오답이 아직 없어요' : undefined, () => dispatch(buyReviewBrazier()), '오답 노트를 모두 정리했어요', '새로운 마음으로 다시 시작해 보세요', 'fireplace'),
			},
			{
				key: 'fiveColorChest',
				label: '오색 보물함',
				description: `행운 상자 ${REWARD.fiveColorChestRandomCount}개와 ${REWARD.goldenChestCoins}코인 확정 상자를 받아요`,
				image: SHOP_ITEM_IMAGES.fiveColorChest,
				color: 'accentAmber',
				tint: 'accentAmberSoft',
				price: REWARD.fiveColorChestPrice,
				owned: life.pendingChests?.length ? `안 연 상자 ${life.pendingChests.length}개` : '특별 상자 세 개',
				onBuy: () => purchase(REWARD.fiveColorChestPrice, undefined, () => dispatch(buyFiveColorChest()), '오색 보물함을 열었어요', '행운 상자 2개와 확정 상자 1개가 들어왔어요', 'treasure-chest'),
			},
		],
		// purchase 는 렌더마다 새로 만들어지지만 값(coins)만 읽으므로 의존성에 넣지 않는다
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			dispatch,
			life.attendanceBoosts,
			life.chestSeals,
			life.coins,
			life.learnBoosts,
			life.pendingChests?.length,
			life.quizBoosts,
			life.shopUpgrades,
			life.wrong.length,
			life.wrongGuards,
			pet.exp,
			pet.next,
			shields,
			attendancePet.fed,
			attendancePet.feeds,
			attendancePet.next,
			say,
		],
	);

	/** 사장이 말하고 있는가 — 대화 무대가 화면을 덮는 동안은 아래 고정 버튼을 감춘다 */
	const talking = !!shopkeeperMessage && !guide.visible && !life.pendingLevelUp && !bagItem;


	const visibleItems = activeTab === 'all' ? items : activeTab === 'decor' ? [] : items.filter((item) => SHOP_ITEM_TABS[item.key] === activeTab);
	const showInventory = true;
	const showDecors = activeTab === 'all' || activeTab === 'decor';
	/** 지금 놓아 둔 갈래 수 — 여섯이면 세트 보너스가 켜진다 */
	const setDone = DECOR_KINDS.filter((group) => !!life.decorEquipped?.[group.key]).length;
	const itemSectionTitle = activeTab === 'upgrade' ? '반복 구매 영구 강화' : activeTab === 'growth' ? '캐릭터와 펫 성장' : activeTab === 'study' ? '학습과 출석 도구' : activeTab === 'treasure' ? '보물과 묶음 아이템' : '학습을 돕는 아이템';

	/**
	 * 화면 꾸미기 — 가진 것은 눌러서 놓거나 내리고, 없는 것은 눌러서 산다.
	 * 갈래마다 한 개만 적용되므로 같은 갈래의 다른 것을 누르면 앞서 놓아 둔 것이 저절로 내려간다.
	 */
	const onDecor = (decor: LifeType.Decor) => {
		playPop();
		// 이미 산 것 — 놓거나 내린다. 코인이 빠지지 않으므로 확인을 묻지 않는다
		if ((life.decors ?? []).includes(decor.id)) {
			const equipped = life.decorEquipped?.[decor.kind] === decor.id;
			dispatch(toggleDecor(decor.id));
			say(
				equipped ? `${decor.label}을(를) 내려 뒀어요. 언제든 다시 놓을 수 있어요!` : `${decor.label}을(를) 놓았어요. ${decor.hint}`,
				equipped ? 'eye-off-outline' : 'auto-fix',
				equipped ? 'info' : 'success',
			);
			return;
		}
		// 아직 없는 것 — 누른 즉시 사지 않는다. 적용된 모습을 보여 주고 살지 묻는다
		setDecorBuying(decor);
		say(`${decor.label}, ${decor.price.toLocaleString()}코인이에요. 놓으면 이렇게 보여요. 어떻게 할까요?`, 'storefront', 'offer');
	};

	/** 꾸미기를 정말 산다 — 대화에서 '구매하기' 를 누른 순간에만 코인이 빠진다 */
	const confirmDecor = (decor: LifeType.Decor) => {
		if (life.coins < decor.price) {
			say(`이건 코인이 ${decor.price - life.coins}개 더 필요해요. 조금만 더 모아 봐요!`, 'circle-multiple-outline', 'short');
			return;
		}
		playComplete();
		dispatch(buyDecor(decor.id));
		setBurst({ label: decor.label, price: decor.price, icon: decor.icon });
		say(`${decor.label} 구매 완료! 바로 놓아 드렸어요. ${decor.hint}`, 'shopping', 'success');
	};

	/**
	 * 사장이 지금 값을 읽어 주는 상품 — 소모품과 꾸미기가 같은 대화 카드를 쓴다.
	 * 꾸미기는 물건 사진이 없으므로 그림 자리에 "적용된 모습" 미리보기를 세운다.
	 */
	/**
	 * 코인이 모자란 물건을 적어 둔다 — 값이 모이면 어느 화면에 있든 토스트로 알려 준다(LifeWatcher).
	 * 적어 두는 순간 대화를 접는다. "알려 드릴게요" 한마디를 더 띄우면 대사창이 두 번 바뀌어 산만하다.
	 */
	const wishFor = (key: string, label: string, price: number) => {
		playPop();
		dispatch(setWish({ key, label, price }));
		showToast(`${label}, 코인이 모이면 알려 드릴게요`, 'bookmark-check-outline');
		closeShopkeeper();
	};

	const offer: ShopkeeperOffer | null = buying
		? buying
		: decorBuying
			? {
					label: decorBuying.label,
					description: decorBuying.hint,
					price: decorBuying.price,
					owned: `${DECOR_KINDS.find((group) => group.key === decorBuying.kind)?.label ?? '꾸미기'} · 한 번 사면 계속 남아요`,
					preview: <DecorPreview preview={decorBuying} compact />,
				}
			: null;

	return (
		<SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
			{/* 헤더 띠 대신 히어로 위에 뒤로가기·도움말만 얹는다 — 진열대가 화면 맨 위부터 시작한다 */}
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} onScrollBeginDrag={Keyboard.dismiss}>
				<Animated.View style={[styles.stack, enterStyle]}>
					{/* 진열대 히어로 — 상점에 들어온 순간 게임 공간으로 인식되게 한다 */}
					<View style={styles.marketHero}>
						<Image source={SHOP_HERO_IMAGE} style={styles.marketHeroImage} contentFit="cover" contentPosition="center" accessible={false} />
						<LinearGradient colors={['rgba(6, 22, 51, 0.18)', 'rgba(6, 22, 51, 0.94)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.marketHeroShade} />
						<View style={styles.heroControls} pointerEvents="box-none">
							<PressableScale style={styles.heroControl} onPress={() => router.back()} scaleTo={0.92} accessibilityRole="button" accessibilityLabel="뒤로 가기">
								<IconComponent type="materialIcons" name="arrow-back" size={20} color="#FFFFFF" />
							</PressableScale>
							<PressableScale style={styles.heroControl} onPress={guide.open} scaleTo={0.92} accessibilityRole="button" accessibilityLabel="상점 안내 보기">
								<IconComponent type="materialCommunityIcons" name="help-circle-outline" size={20} color="#FFFFFF" />
							</PressableScale>
						</View>
						<View style={styles.marketHeroContent}>
							<View style={styles.marketCopy}>
								<Text style={styles.marketTitle}>뿔 사장의 한자 상회</Text>
								<Text style={styles.marketSubtitle}>배움으로 모은 코인을 성장과 수집에 사용하세요</Text>
							</View>
							<View style={styles.coinPouch}>
								<View style={styles.coinPouchIcon}>
									<IconComponent type="materialCommunityIcons" name="circle-multiple" size={22} color={Colors.accentAmber} />
								</View>
								<View>
									<Text style={styles.coinPouchLabel}>보유 코인</Text>
									<Text style={styles.coinPouchValue}>{life.coins.toLocaleString()}</Text>
								</View>
							</View>
						</View>
					</View>

					{/*
					 * 진열대 고르기 — 여섯 칸이 한 줄에 모두 들어온다.
					 * 예전에는 가로 스크롤이라 '꾸미기'가 화면 밖에 숨어 있었다. 칸을 균등 분할해 스크롤을 없앴다.
					 */}
					<View style={styles.tabShelf}>
						<LinearGradient
							pointerEvents="none"
							colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.02)']}
							start={{ x: 0.5, y: 0 }}
							end={{ x: 0.5, y: 1 }}
							style={styles.tabShelfGlow}
						/>
						<View style={styles.tabRail} accessibilityRole="tablist">
							{SHOP_TABS.map((tab) => {
								const selected = activeTab === tab.key;
								return (
									<PressableScale
										key={tab.key}
										style={styles.tab}
										onPress={() => {
											playPop();
											setActiveTab(tab.key);
										}}
										scaleTo={0.92}
										accessibilityRole="tab"
										accessibilityState={{ selected }}
										accessibilityLabel={tab.label}
									>
										{/* 고른 칸만 금빛 판이 깔린다 — 나머지는 면 없이 아이콘과 글씨만 남아 줄이 조용해진다 */}
										{selected && (
											<LinearGradient
												colors={['#FFDE8A', '#F5A623']}
												start={{ x: 0.2, y: 0 }}
												end={{ x: 0.8, y: 1 }}
												style={styles.tabPlate}
											/>
										)}
										<IconComponent type="materialCommunityIcons" name={tab.icon} size={scaledSize(19)} color={selected ? '#2A1A05' : Colors.brandBlockMuted} />
										<Text style={[styles.tabText, selected && styles.tabTextOn]} numberOfLines={1}>{tab.label}</Text>
									</PressableScale>
								);
							})}
						</View>
					</View>

					{/*
					 * 광고 보고 코인 받기 — 코인을 벌 길을 하나 더 둔다.
					 * 하루 횟수는 리듀서가 날짜와 함께 센다(화면이 세면 앱을 껐다 켜는 것으로 초기화된다).
					 */}
					<PressableScale
						style={[styles.adCard, adLeft <= 0 && styles.adCardOff]}
						onPress={() => {
							playPop();
							if (adLeft <= 0) {
								say('오늘 광고 보상은 다 받았어요. 내일 다시 들러 주세요!', 'information-outline');
								return;
							}
							setWatchingAd(true);
						}}
						scaleTo={0.98}
						accessibilityRole="button"
						accessibilityLabel={`광고 보고 코인 받기, 오늘 ${adLeft}번 남음`}>
						<View style={styles.adIcon}>
							<IconComponent type="materialCommunityIcons" name="movie-open-play-outline" size={22} color={Colors.accentAmber} />
						</View>
						<View style={styles.adBody}>
							<Text style={styles.adTitle}>{`광고 보고 +${REWARD.adCoins} 코인`}</Text>
							<Text style={styles.adDesc} numberOfLines={1}>
								{adLeft > 0 ? `오늘 ${adLeft}번 더 받을 수 있어요 (하루 ${REWARD.adCoinDailyMax}번)` : '오늘 몫은 다 받았어요. 내일 다시 열려요'}
							</Text>
						</View>
						<View style={[styles.adTag, adLeft <= 0 && styles.adTagOff]}>
							<Text style={[styles.adTagText, adLeft <= 0 && styles.adTagTextOff]}>{adLeft > 0 ? '받기' : '내일'}</Text>
						</View>
					</PressableScale>

					{/*
					 * 찜해 둔 물건 — 코인이 모자라 못 산 것을 한 줄로 붙잡아 둔다.
					 * 값이 모이면 LifeWatcher 가 알려 주므로, 여기서는 "얼마 남았는지" 와 "그만두기" 만 있으면 된다.
					 */}
					{!!life.wish && (
						<View style={styles.wishCard}>
							<View style={styles.wishIcon}>
								<IconComponent type="materialCommunityIcons" name="bookmark-check" size={scaleWidth(18)} color={Colors.accentAmber} />
							</View>
							<View style={styles.wishBody}>
								<Text style={styles.wishLabel} numberOfLines={1}>
									{life.wish.label}
								</Text>
								<Text style={styles.wishHint} numberOfLines={1}>
									{life.coins >= life.wish.price
										? '이제 살 수 있어요!'
										: `${(life.wish.price - life.coins).toLocaleString()}코인 더 모으면 알려 드릴게요`}
								</Text>
							</View>
							<PressableScale
								style={styles.wishClear}
								onPress={() => {
									playPop();
									dispatch(clearWish());
								}}
								scaleTo={0.94}
								accessibilityRole="button"
								accessibilityLabel="찜 지우기">
								<IconComponent type="materialIcons" name="close" size={scaleWidth(16)} color={Colors.textMuted} />
							</PressableScale>
						</View>
					)}

					{/*
					 * 지금 걸려 있는 효과 — 가방(개수)과 따로 세운다.
					 * 보호권·부적처럼 "들고 있으면 저절로 쓰이는" 것들은 개수만 봐서는 켜져 있는지 알 수 없었다.
					 * 아무것도 안 걸려 있으면 줄 자체를 두지 않는다.
					 */}
					{activeEffects.length > 0 && (
						<>
							<View style={styles.sectionHeading}>
								<Text style={styles.sectionTitle}>지금 걸려 있는 효과</Text>
								<View style={[styles.sectionCount, styles.sectionCountLive]}>
									<Text style={styles.sectionCountLiveText}>{activeEffects.length}</Text>
								</View>
							</View>
							<View style={styles.effectStack}>
								{activeEffects.map((effect) => (
									<View key={effect.key} style={styles.effectRow}>
										<View style={styles.effectAssetBox}>
											<Image source={effect.image} style={styles.effectAsset} contentFit="contain" accessible={false} />
										</View>
										<View style={styles.effectBody}>
											<Text style={styles.effectLabel} numberOfLines={1}>
												{effect.label}
											</Text>
											<Text style={styles.effectText} numberOfLines={2}>
												{effect.effect}
											</Text>
										</View>
										<View style={[styles.effectBadge, effect.forever && styles.effectBadgeForever]}>
											<IconComponent
												type="materialCommunityIcons"
												name={effect.forever ? 'infinity' : 'timer-sand'}
												size={11}
												color={effect.forever ? Colors.secondaryDark : Colors.primaryDark}
											/>
											<Text style={[styles.effectBadgeText, effect.forever && styles.effectBadgeTextForever]}>{effect.badge}</Text>
										</View>
									</View>
								))}
							</View>
						</>
					)}

					{/* 내 보유 아이템 — 상점을 훑기 전에 뭘 갖고 있는지 먼저 보여 준다 */}
					{showInventory && <View style={styles.sectionHeading}>
						<Text style={styles.sectionTitle}>내 가방</Text>
						<View style={styles.sectionCount}><Text style={styles.sectionCountText}>{inventory.length}</Text></View>
					</View>}
					{showInventory && (inventory.length ? (
						<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ownedRow}>
							{inventory.map((item) => (
								<PressableScale
									key={item.key}
									style={styles.ownedChip}
									onPress={() => {
										playPop();
										setBagItem(item);
									}}
									scaleTo={0.94}
									accessibilityRole="button"
									accessibilityLabel={`${item.label} ${item.count}개, 자세히 보기`}>
									<View style={styles.ownedAssetBox}>
										<Image source={item.image} style={styles.ownedAsset} contentFit="contain" accessible={false} />
										<View style={styles.ownedBadge}>
											<Text style={styles.ownedCount}>{item.count}</Text>
										</View>
									</View>
									<Text style={styles.ownedLabel} numberOfLines={1}>
										{item.label}
									</Text>
								</PressableScale>
							))}
						</ScrollView>
					) : (
						<View style={styles.ownedEmpty}>
							<IconComponent type="materialCommunityIcons" name="package-variant" size={18} color={Colors.textMuted} />
							<Text style={styles.ownedEmptyText}>아직 가진 아이템이 없어요. 아래에서 하나 골라 보세요</Text>
						</View>
					))}

					{/* 소모품 — 사면 바로 효과가 붙는다 */}
					{activeTab !== 'decor' && (
						<>
							<View style={styles.sectionHeading}>
								<Text style={styles.sectionTitle}>{itemSectionTitle}</Text>
								<View style={styles.sectionCount}><Text style={styles.sectionCountText}>{visibleItems.length}</Text></View>
							</View>
							<View style={styles.itemStack}>
								{visibleItems.map((item, index) => (
									<ShopRow
										key={item.key}
										item={item}
										index={index}
										coins={life.coins}
										onPress={() => {
											playPop();
											// 살 수 없는 물건은 팝업 대신 사장이 이유를 말해 준다
											if (item.blocked) {
												item.onBuy();
												return;
											}
											setBuying(item);
											say(`${item.label}, ${item.price.toLocaleString()}코인이에요. 어떻게 할까요?`, 'storefront', 'offer');
										}}
									/>
								))}
							</View>
						</>
					)}

					{/*
					 * 화면 꾸미기 — 캐릭터에 입히지 않고 화면의 정해진 자리에 놓이는 것들.
					 * 캐릭터에 직접 입히던 방식은 성장 단계 그림마다 좌표를 다시 재야 해서 단계가 오르면 어긋났다.
					 * 이쪽은 고정 슬롯이라 단계와 무관하고, 새 그림 파일도 필요 없다.
					 */}
					{showDecors && (
						<>
							<View style={styles.sectionHeading}>
								<Text style={styles.sectionTitle}>화면 꾸미기</Text>
								<View style={styles.sectionCount}>
									<Text style={styles.sectionCountText}>{DECORS.length}</Text>
								</View>
							</View>
							<Text style={styles.decorLead}>캐릭터에 입히지 않아요. 글방 · 칭호 · 좌대 · 액자 · 카드 테 · 낙관이 화면 제자리에 놓여요. 갈래마다 한 개씩 적용돼요.</Text>
							{/*
							 * 세트 보너스 — 여섯 칸을 다 채우면 코인이 조금 더 붙는다.
							 * "몇 칸 남았는지" 를 숫자로 보여 줘야 한 갈래만 사고 멈추지 않는다.
							 */}
							<View style={[styles.setCard, setDone === DECOR_KINDS.length && styles.setCardOn]}>
								<View style={[styles.setIcon, setDone === DECOR_KINDS.length && styles.setIconOn]}>
									<IconComponent
										type="materialCommunityIcons"
										name={setDone === DECOR_KINDS.length ? 'check-decagram' : 'shape-outline'}
										size={scaleWidth(18)}
										color={setDone === DECOR_KINDS.length ? Colors.accentAmber : Colors.textMuted}
									/>
								</View>
								<View style={styles.setBody}>
									<Text style={styles.setTitle} numberOfLines={1}>
										{`글방 주인 세트 · 코인 획득 +${DECOR_SET_BONUS_PERCENT}%`}
									</Text>
									<Text style={styles.setHint} numberOfLines={2}>
										{setDone === DECOR_KINDS.length
											? '여섯 갈래를 모두 놓았어요. 코인을 받을 때마다 조금 더 붙어요'
											: `여섯 갈래를 모두 놓으면 켜져요. ${DECOR_KINDS.length - setDone}갈래 남았어요`}
									</Text>
								</View>
								<Text style={[styles.setCount, setDone === DECOR_KINDS.length && styles.setCountOn]}>{`${setDone}/${DECOR_KINDS.length}`}</Text>
							</View>
							{/* 지금 적용한 꾸미기를 그대로 세운 미리보기 — 사기 전에 어떻게 보이는지 여기서 확인한다 */}
							<DecorPreview />
							{DECOR_KINDS.map((group) => {
								const groupItems = decorsOf(group.key);
								const onId = life.decorEquipped?.[group.key];
								const onLabel = groupItems.find((entry) => entry.id === onId)?.label;
								return (
									<View key={group.key} style={styles.decorGroup}>
										<View style={styles.decorGroupHead}>
											<View style={styles.decorGroupIcon}>
												<IconComponent type="materialCommunityIcons" name={group.icon} size={16} color={Colors.primaryDark} />
											</View>
											<View style={styles.decorGroupText}>
												<Text style={styles.decorGroupTitle}>{group.label}</Text>
												<Text style={styles.decorGroupHint} numberOfLines={1}>
													{group.hint}
												</Text>
											</View>
											<Text style={[styles.decorGroupOn, !onLabel && styles.decorGroupOff]} numberOfLines={1}>
												{onLabel ? `${onLabel} 적용 중` : '적용 안 함'}
											</Text>
										</View>
										<View style={styles.decorGrid}>
											{groupItems.map((entry) => {
												const owned = (life.decors ?? []).includes(entry.id);
												const equipped = onId === entry.id;
												const affordable = life.coins >= entry.price;
												return (
													<PressableScale
														key={entry.id}
														style={[styles.decorTile, equipped && styles.decorTileOn]}
														onPress={() => onDecor(entry)}
														scaleTo={0.95}
														accessibilityRole="button"
														accessibilityState={{ selected: equipped }}
														accessibilityLabel={
															owned
																? `${entry.label}. ${entry.hint}. ${equipped ? '적용 중, 누르면 내려놓아요' : '보유 중, 누르면 놓아요'}`
																: `${entry.label}. ${entry.hint}. ${entry.price}코인, 누르면 미리 보기`
														}>
														<DecorSwatch decor={{ ...entry, color: Colors[entry.color], tint: Colors[entry.tint] }} size={scaleWidth(54)} />
														<Text style={styles.decorTileLabel} numberOfLines={1}>
															{entry.label}
														</Text>
														{owned ? (
															<View style={[styles.decorTag, equipped ? styles.decorTagOn : styles.decorTagOwned]}>
																<Text style={[styles.decorTagText, equipped && styles.decorTagTextOn]}>{equipped ? '적용 중' : '보유'}</Text>
															</View>
														) : (
															<View style={[styles.decorTag, !affordable && styles.decorTagLocked]}>
																<IconComponent type="materialCommunityIcons" name="circle-multiple" size={11} color={affordable ? Colors.accentAmber : Colors.textMuted} />
																<Text style={[styles.decorTagText, !affordable && styles.decorTagTextLocked]}>{entry.price}</Text>
															</View>
														)}
													</PressableScale>
												);
											})}
										</View>
									</View>
								);
							})}
						</>
					)}

					<Text style={styles.footnote}>꾸미기는 한 번 사면 계속 남아요. 소모품은 살 때마다 코인이 빠져요.</Text>
				</Animated.View>
			</ScrollView>
			{/* 구매 연출 — 확인을 누른 순간 화면 한가운데에서 한 번 터진다 */}
			<PurchaseBurst item={burst} onDone={() => setBurst(null)} />
			{/* 광고 보고 코인 받기 — 끝까지 본 경우에만 리듀서가 코인을 얹는다 */}
			{watchingAd && (
				<AdmobRewardAd
					onRewarded={() => {
						// 보상까지 받은 경우 AdmobRewardAd 는 onClosed 를 부르지 않는다 — 여기서 직접 내린다
						setWatchingAd(false);
						dispatch(claimAdCoins());
						playComplete();
						setBurst({ label: '광고 보상', price: -REWARD.adCoins, image: SHOP_ITEM_IMAGES.chestKey });
						say(`광고 고마워요! +${REWARD.adCoins}코인을 얹어 드렸어요.`, 'movie-open-play-outline', 'success');
					}}
					onClosed={() => {
						setWatchingAd(false);
						say('광고를 끝까지 봐야 코인을 받을 수 있어요.', 'information-outline');
					}}
					onFailed={() => {
						setWatchingAd(false);
						say('광고를 불러오지 못했어요. 잠시 뒤에 다시 눌러 주세요.', 'wifi-off');
					}}
				/>
			)}
			{/* 내 가방 상세 — 무슨 물건이고 어디서 쓰는지 */}
			<BagItemModal item={bagItem} onClose={() => setBagItem(null)} />
			{/* 뿔 사장 대화 무대 — 구매 확인 팝업을 대신한다 */}
			{talking && (
				<ShopkeeperDialogue
					message={shopkeeperMessage}
					offer={offer}
					coins={life.coins}
					onWish={() => {
						if (decorBuying) {
							wishFor(decorBuying.id, decorBuying.label, decorBuying.price);
							return;
						}
						if (buying) {
							wishFor(buying.key, buying.label, buying.price);
						}
					}}
					onConfirm={() => {
						const target = buying;
						const decor = decorBuying;
						setBuying(null);
						setDecorBuying(null);
						// 찜해 둔 걸 샀으면 알림을 기다릴 이유가 없다 — 바로 지운다
						if (life.wish && life.wish.key === (decor?.id ?? target?.key)) {
							dispatch(clearWish());
						}
						if (decor) {
							confirmDecor(decor);
							return;
						}
						// 살 수 있을 때만 연출을 띄운다 — 코인이 모자라면 onBuy 가 사지 않고 이유만 말한다
						if (target && !target.blocked && life.coins >= target.price) {
							setBurst({ label: target.label, price: target.price, image: target.image });
						}
						target?.onBuy();
					}}
					onClose={closeShopkeeper}
				/>
			)}
			{/* 화면 사용법 — 처음 들어오면 한 번, 이후에는 헤더의 물음표로 다시 본다 */}
			<LifeCharacterGuide visible={guide.visible} onClose={guide.close} characterImage={SHOPKEEPER_IMAGE} title="뿔 사장의 상점 안내" accent={Colors.accentAmber} lines={[
				'어서 와요! 한자 상회를 맡고 있는 코뿔소, 뿔 사장이에요.',
				'보호권은 출석 스트릭을 지켜 주고, 간식은 코인을 캐릭터 경험치로 바꿔 줘요.',
				'캐릭터는 판다, 펫은 청룡이에요. 간식은 판다를, 먹이는 청룡을 키워요!',
				'꾸미기 탭에는 글방·칭호·좌대·액자·카드 테·낙관이 있어요. 캐릭터에 입히지 않고 화면에 놓여요!',
			]} />
		</SafeAreaView>
	);
};

/**
 * 꾸미기 미리보기 — 지금 적용 중인 여섯 갈래를 한 장에 모아 세운다.
 * -------------------------------------------------
 * 꾸미기는 홈·나의 활동·학습 카드·출석 도장에 흩어져 붙는다. 사고 나서 해당 화면까지 가 봐야
 * 어떻게 보이는지 알 수 있었다. 상점 안에서 캐릭터(판다)와 펫(청룡)에 적용된 모습을 그대로 보여 준다.
 *
 * @param preview 아직 안 산 꾸미기를 잠깐 덧씌워 본다 — 저장된 값은 그대로 두고 이 판에서만 바뀐다
 * @param compact 사장 대화 카드 안에 들어갈 때 — 무대를 줄이고 설명 줄을 뺀다
 */
const DecorPreview = ({ preview = null, compact = false }: { preview?: LifeType.Decor | null; compact?: boolean }) => (
	// 덧씌우기는 바깥에서 건다 — 안쪽 훅(useDecorFrame·useDecorSkin·useDecorSeal)이 같은 값을 읽어야 한다
	<DecorPreviewProvider value={preview}>
		{/* 대화 카드 안에서는 지금 고른 갈래가 보이는 자리만 남긴다 — 작은 화면에서 대사창까지 다 들어가야 한다 */}
		<DecorPreviewStage compact={compact} focus={compact ? preview?.kind : undefined} />
	</DecorPreviewProvider>
);

const DecorPreviewStage = ({ compact, focus }: { compact: boolean; focus?: LifeType.DecorKind }) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const pet = usePet();
	const attendancePet = useAttendancePet();
	/** 액자 — 미리보기 판 자체에 테를 두른다 */
	const frame = useDecorFrame();
	/** 카드 테 — 학습 카드 견본에 두른다 */
	const skin = useDecorSkin();
	/** 낙관 — 출석 도장에 찍히는 글자와 색 */
	const seal = useDecorSeal();

	/**
	 * 어느 자리를 보여 줄지.
	 * focus 가 없으면(상점 본문) 여섯 갈래를 한 장에 다 세우고,
	 * focus 가 있으면(대화 카드) 그 갈래가 실제로 보이는 자리만 남긴다.
	 */
	const showStage = !focus || focus === 'study' || focus === 'perch' || focus === 'title' || focus === 'frame';
	const showText = !focus || focus === 'title' || focus === 'frame';
	const showSkin = !focus || focus === 'skin';
	const showSeal = !focus || focus === 'seal';

	// 대화 카드 안에서는 무대를 한 뼘 줄인다 — 말풍선과 버튼이 같이 들어가야 한다
	const pandaSize = scaleWidth(compact ? 74 : 92);
	const dragonSize = scaleWidth(compact ? 58 : 70);
	const roomSize = { width: scaleWidth(compact ? 196 : 232), height: scaleWidth(compact ? 88 : 104) };

	return (
		<View style={[styles.previewBox, compact && styles.previewBoxCompact, frame]}>
			{/* 무대 높이를 글방 배경과 같게 잡는다 — 안 그러면 배경이 카드 위쪽 여백을 덮는다 */}
			{showStage && (
				<View style={[styles.previewStageRow, compact && styles.previewStageRowCompact, { height: roomSize.height }]}>
					{/* 글방 — 사 둔 사람에게만 캐릭터 뒤에 깔린다 */}
					<StudyRoomBackdrop width={roomSize.width} height={roomSize.height} />
					<PetAvatar size={pandaSize} plate={false} animated={false} />
					<View style={styles.previewPet}>
						<View style={styles.previewPerch} pointerEvents="none">
							<PetPerch size={dragonSize * 0.94} />
						</View>
						{/* 먹이를 한 번도 안 줬으면 청룡이 아직 없다 — 좌대 자리만 비워 두고 알을 미리 보여 주지 않는다 */}
						{attendancePet.image ? (
							<MascotImage source={attendancePet.image} size={dragonSize} motion="none" shadow={false} />
						) : (
							<View style={[styles.previewPetEmpty, { width: dragonSize, height: dragonSize }]}>
								<IconComponent type="materialCommunityIcons" name="egg-outline" size={scaleWidth(20)} color={Colors.textMuted} />
								<Text style={styles.previewPetEmptyText}>청룡 자리</Text>
							</View>
					)}
					</View>
				</View>
			)}

			{showText && (
				<View style={styles.previewText}>
					<Text style={styles.previewName} numberOfLines={1}>
						{pet.petName}
					</Text>
					{/* 칭호 — 사 둔 사람에게만 이름 아래에 현판이 붙는다 */}
					<TitlePlaque />
					<Text style={styles.previewStage} numberOfLines={1}>
						{`Lv.${pet.level} ${pet.stage.label}`}
					</Text>
				</View>
			)}

			{(showSkin || showSeal) && (
				<View style={styles.previewSlots}>
					{/* 카드 테 견본 — 학습 카드 테두리가 어떻게 바뀌는지 */}
					{showSkin && (
						<View style={[styles.previewSkin, skin]}>
							<Text style={styles.previewSlotLabel}>학습 카드</Text>
						</View>
					)}
					{/* 낙관 — 출석 도장에 찍히는 글자 */}
					{showSeal && (
						<View style={[styles.previewSeal, { borderColor: seal.color, backgroundColor: seal.tint }]}>
							<Text allowFontScaling={false} style={[styles.previewSealText, { color: seal.color }]}>
								{seal.text}
							</Text>
						</View>
					)}
				</View>
			)}

			{!compact && (
				<>
					<Text style={styles.previewHint} numberOfLines={2}>
						가진 것을 누르면 이 자리에 바로 놓여요. 아직 없는 것은 눌러서 미리 보고 살 수 있어요.
					</Text>
					<IconComponent type="materialCommunityIcons" name="eye-outline" size={14} color={Colors.textMuted} style={styles.previewEye} />
				</>
			)}
		</View>
	);
};

/** 게임 인벤토리형 상품 타일 — 에셋, 효과, 보유 상태, 구매가가 한 덩어리로 읽힌다. */
const ShopRow = ({ item, index, coins, onPress }: { item: ShopItem; index: number; coins: number; onPress: () => void }) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const enterStyle = useScreenEnter(14, 240 + index * 60);
	const locked = !!item.blocked || coins < item.price;
	const rarity = SHOP_ITEM_TABS[item.key] === 'upgrade' ? '영구 강화' : item.price >= 250 ? '전설' : item.price >= 120 ? '영웅' : item.price >= 60 ? '희귀' : '일반';

	return (
		<Animated.View style={[styles.itemCell, enterStyle]}>
			<PressableScale style={[styles.item, locked && styles.itemLocked]} onPress={onPress} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={`${item.label}, ${item.price}코인`}>
				<View style={styles.itemTopLine}>
					<View style={[styles.rarityTag, { backgroundColor: Colors[item.tint] }]}>
						<Text style={[styles.rarityText, { color: Colors[item.color] }]}>{rarity}</Text>
					</View>
					{locked && <IconComponent type="materialCommunityIcons" name="lock-outline" size={14} color={Colors.textMuted} />}
				</View>
				<View style={[styles.itemIcon, { backgroundColor: Colors[item.tint] }]}>
					<Image source={item.image} style={styles.itemAsset} contentFit="contain" accessible={false} />
				</View>
				<View style={styles.itemText}>
					<Text style={styles.itemLabel} numberOfLines={1}>
						{item.label}
					</Text>
					<Text style={styles.itemDesc} numberOfLines={3}>
						{item.blocked ?? item.description}
					</Text>
					{!!item.owned && (
						<Text style={styles.itemOwned} numberOfLines={2}>
							{item.owned}
						</Text>
					)}
				</View>
				<View style={[styles.priceTag, locked && styles.priceTagLocked]}>
					<Text style={[styles.buyText, locked && styles.priceTextLocked]}>{item.blocked ? '완료' : '구매'}</Text>
					<View style={styles.priceValue}>
						<IconComponent type="materialCommunityIcons" name="circle-multiple" size={14} color={locked ? Colors.textMuted : Colors.accentAmber} />
						<Text style={[styles.priceText, locked && styles.priceTextLocked]}>{item.price}</Text>
					</View>
				</View>
			</PressableScale>
		</Animated.View>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },
		content: {
			...Layout.column,
			paddingHorizontal: Spacing.lg,
			// 헤더 띠를 없앴으므로 히어로가 상태바에 딱 붙지 않게 한 칸만 띄운다
			paddingTop: SpacingV.sm,
			paddingBottom: SpacingV.xxxl,
		},
		stack: { gap: SpacingV.lg },

		marketHero: {
			height: scaleHeight(218),
			borderRadius: Radius.xl,
			overflow: 'hidden',
			backgroundColor: Colors.primaryDeep,
			...Shadow.floating,
		},
		marketHeroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
		// 헤더 띠를 없앤 대신 히어로 위에 얹는 동그란 버튼 두 개
		heroControls: {
			position: 'absolute',
			top: Spacing.md,
			left: Spacing.md,
			right: Spacing.md,
			zIndex: 2,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
		},
		heroControl: {
			width: scaleWidth(36),
			height: scaleWidth(36),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: 'rgba(6, 22, 51, 0.55)',
		},
		marketHeroShade: { ...StyleSheet.absoluteFillObject },
		marketHeroContent: { flex: 1, justifyContent: 'flex-end', gap: SpacingV.md, padding: Spacing.lg },
		marketCopy: { maxWidth: '78%', gap: SpacingV.xs },
		marketTitle: { fontSize: Typography.h1, fontWeight: FontWeight.heavy, color: '#FFFFFF' },
		marketSubtitle: { fontSize: Typography.bodySm, lineHeight: scaledSize(18), fontWeight: FontWeight.medium, color: '#DCE6FB' },
		coinPouch: {
			alignSelf: 'flex-start',
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.sm,
			minHeight: scaleHeight(48),
			paddingVertical: SpacingV.xs,
			paddingHorizontal: Spacing.md,
			borderRadius: Radius.lg,
			backgroundColor: 'rgba(6, 22, 51, 0.82)',
		},
		coinPouchIcon: {
			width: scaleWidth(34),
			height: scaleWidth(34),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: 'rgba(255, 255, 255, 0.12)',
		},
		coinPouchLabel: { fontSize: Typography.caption, color: '#BFD2FA' },
		coinPouchValue: { fontSize: Typography.title, fontWeight: FontWeight.heavy, color: '#FFFFFF', fontVariant: ['tabular-nums'] },

		/** 광고 보상 줄 — 금빛 테로 "코인이 들어오는 곳" 임을 상품 줄과 구분한다 */
		adCard: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			paddingVertical: SpacingV.md,
			paddingHorizontal: Spacing.lg,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.accentAmber,
			backgroundColor: Colors.accentAmberSoft,
		},
		adCardOff: { borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
		adIcon: {
			width: scaleWidth(42),
			height: scaleWidth(42),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.md,
			backgroundColor: Colors.surface,
		},
		adBody: { flex: 1, gap: scaleHeight(2) },
		adTitle: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: onSurface(Colors.accentAmberSoft) },
		adDesc: { fontSize: Typography.caption, color: onSurface(Colors.accentAmberSoft), opacity: 0.8 },
		adTag: { paddingHorizontal: Spacing.md, height: scaleHeight(30), justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: Colors.accentAmber },
		adTagOff: { backgroundColor: Colors.surfaceAlt },
		adTagText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: '#2A1A05' },
		adTagTextOff: { color: Colors.textMuted },

		sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SpacingV.md },
		sectionTitle: {
			fontSize: Typography.subtitle,
			fontWeight: FontWeight.heavy,
			color: Colors.textStrong,
		},
		sectionCount: {
			minWidth: scaleWidth(28),
			height: scaleHeight(24),
			paddingHorizontal: Spacing.sm,
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.primarySoft,
		},
		sectionCountText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: Colors.primaryDark, fontVariant: ['tabular-nums'] },
		// "걸려 있는" 숫자는 초록으로 — 개수를 세는 회색 숫자와 성질이 다르다
		sectionCountLive: { backgroundColor: Colors.successSoft },
		sectionCountLiveText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: onSurface(Colors.successSoft), fontVariant: ['tabular-nums'] },

		/** 지금 걸려 있는 효과 한 줄 — 에셋, 무슨 효과인지, 몇 번 남았는지 */
		effectStack: { gap: SpacingV.sm },
		effectRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			paddingVertical: SpacingV.sm,
			paddingHorizontal: Spacing.md,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.success,
			backgroundColor: Colors.successSoft,
		},
		effectAssetBox: {
			width: scaleWidth(42),
			height: scaleWidth(42),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.md,
			backgroundColor: Colors.surface,
		},
		effectAsset: { width: scaleWidth(34), height: scaleWidth(34) },
		effectBody: { flex: 1, gap: scaleHeight(1) },
		// 면이 successSoft 다 — 라이트는 연한 초록, 다크는 짙은 초록이라 글자색을 면에서 뽑는다
		effectLabel: { fontSize: Typography.bodySm, fontWeight: FontWeight.heavy, color: onSurface(Colors.successSoft) },
		effectText: { fontSize: Typography.caption, color: onSurface(Colors.successSoft), opacity: 0.8, lineHeight: scaledSize(16) },
		effectBadge: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(3),
			paddingHorizontal: Spacing.sm,
			height: scaleHeight(24),
			borderRadius: Radius.pill,
			backgroundColor: Colors.primarySoft,
		},
		effectBadgeForever: { backgroundColor: Colors.secondarySoft },
		effectBadgeText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: Colors.primaryDark },
		effectBadgeTextForever: { color: Colors.secondaryDark },
		/** 진열대 고르기 판 — 위쪽에서 빛이 드는 어두운 목재 선반 느낌 */
		tabShelf: {
			padding: Spacing.xs,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: 'rgba(255, 255, 255, 0.10)',
			backgroundColor: Colors.brandBlock,
			overflow: 'hidden',
			...Shadow.card,
		},
		tabShelfGlow: { position: 'absolute', left: 0, right: 0, top: 0, height: '55%' },
		tabRail: { flexDirection: 'row' },
		/**
		 * 탭 한 칸 — 여섯 칸이 화면 폭을 균등하게 나눈다.
		 * 고른 칸에만 금빛 판을 깔고 나머지는 면을 비운다 — 여섯 칸 모두 면을 두면 줄 전체가 시끄러웠다.
		 */
		tab: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			gap: scaleHeight(3),
			paddingVertical: SpacingV.sm,
			borderRadius: Radius.md,
			overflow: 'hidden',
		},
		tabPlate: { ...StyleSheet.absoluteFillObject, borderRadius: Radius.md },
		tabText: { fontSize: Typography.caption, fontWeight: FontWeight.semibold, color: Colors.brandBlockMuted },
		tabTextOn: { color: '#2A1A05', fontWeight: FontWeight.heavy },

		/**
		 * 보유 아이템 줄 — 가로로 넘겨 본다.
		 * 좌우 여백은 부모(content)의 paddingHorizontal 이 이미 잡으므로 여기서 또 주지 않는다.
		 */
		ownedRow: { gap: Spacing.sm, paddingVertical: SpacingV.xs, paddingHorizontal: Spacing.xs },
		ownedChip: {
			width: scaleWidth(92),
			alignItems: 'center',
			gap: SpacingV.xs,
			paddingVertical: SpacingV.md,
			paddingHorizontal: Spacing.sm,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.secondarySoft,
			backgroundColor: Colors.secondaryBg,
			...Shadow.card,
		},
		ownedAssetBox: { position: 'relative' },
		ownedAsset: { width: scaleWidth(52), height: scaleWidth(52) },
		ownedLabel: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textStrong, textAlign: 'center' },
		// 개수는 에셋 오른쪽 위 코너에 — 줄을 따로 먹지 않아 칩이 낮고 목록이 가벼워진다
		ownedBadge: {
			position: 'absolute',
			top: scaleHeight(-4),
			right: scaleWidth(-8),
			minWidth: scaleWidth(20),
			paddingHorizontal: scaleWidth(5),
			height: scaleHeight(20),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.primary,
			borderWidth: 1.5,
			borderColor: Colors.surface,
		},
		ownedCount: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textInverse },
		ownedEmpty: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.sm,
			padding: Spacing.lg,
			borderRadius: Radius.xl,
			backgroundColor: Colors.surfaceAlt,
		},
		ownedEmptyText: { flex: 1, fontSize: Typography.caption, color: Colors.textSecondary },

		itemStack: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: Spacing.sm },
		itemCell: { width: Layout.isTablet ? '31.5%' : '48.5%' },
		item: {
			minHeight: scaleHeight(292),
			alignItems: 'stretch',
			gap: SpacingV.sm,
			padding: Spacing.md,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.border,
			backgroundColor: Colors.surface,
			...Shadow.card,
		},
		// 못 사는 물건은 카드째 한 톤 가라앉힌다 — 목록을 훑을 때 살 수 있는 것만 눈에 남는다
		itemLocked: { backgroundColor: Colors.surfaceAlt, borderColor: Colors.border },
		itemTopLine: { minHeight: scaleHeight(20), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
		rarityTag: { paddingHorizontal: Spacing.sm, height: scaleHeight(20), justifyContent: 'center', borderRadius: Radius.pill },
		rarityText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy },
		itemIcon: {
			width: '100%',
			height: scaleHeight(88),
			borderRadius: Radius.md,
			alignItems: 'center',
			justifyContent: 'center',
		},
		itemAsset: { width: scaleWidth(82), height: scaleHeight(82) },
		itemText: { flex: 1, gap: SpacingV.xs },
		itemLabel: {
			fontSize: Typography.callout,
			fontWeight: FontWeight.bold,
			color: Colors.textStrong,
		},
		itemDesc: {
			fontSize: Typography.caption,
			color: Colors.textSecondary,
			lineHeight: scaledSize(16),
		},
		itemOwned: {
			fontSize: Typography.caption,
			fontWeight: FontWeight.bold,
			color: Colors.primaryDark,
			lineHeight: scaledSize(15),
		},
		priceTag: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingHorizontal: Spacing.md,
			height: scaleHeight(40),
			borderRadius: Radius.md,
			backgroundColor: Colors.accentAmberSoft,
		},
		priceTagLocked: { backgroundColor: Colors.surfaceAlt },
		buyText: { fontSize: Typography.bodySm, fontWeight: FontWeight.heavy, color: Colors.textStrong },
		priceValue: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
		priceText: {
			fontSize: Typography.bodySm,
			fontWeight: FontWeight.bold,
			color: Colors.textStrong,
		},
		priceTextLocked: { color: Colors.textMuted },

		/** 꾸미기 미리보기 판 — 액자를 사 두면 이 판에 테가 둘러진다 */
		// 찜 한 줄 — 광고 줄과 같은 높이·같은 모서리를 쓰되 금빛 테로 "적어 뒀다" 를 표시한다
		wishCard: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			paddingVertical: SpacingV.sm,
			paddingHorizontal: Spacing.md,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.accentAmber,
			backgroundColor: Colors.accentAmberSoft,
		},
		wishIcon: { width: scaleWidth(34), height: scaleWidth(34), alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: Colors.surface },
		wishBody: { flex: 1, gap: scaleHeight(2) },
		wishLabel: { fontSize: Typography.bodySm, fontWeight: FontWeight.heavy, color: Colors.textStrong },
		wishHint: { fontSize: Typography.caption, color: Colors.textSecondary },
		// 손가락이 닿을 넓이는 주되 줄 높이는 늘리지 않는다
		wishClear: { width: scaleWidth(32), height: scaleWidth(32), alignItems: 'center', justifyContent: 'center' },

		// 세트 보너스 줄 — 꾸미기 목록 맨 위, 미리보기 바로 앞
		setCard: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			paddingVertical: SpacingV.md,
			paddingHorizontal: Spacing.md,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.border,
			backgroundColor: Colors.surface,
		},
		setCardOn: { borderColor: Colors.accentAmber, backgroundColor: Colors.accentAmberSoft },
		setIcon: { width: scaleWidth(34), height: scaleWidth(34), alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
		setIconOn: { backgroundColor: Colors.surface },
		setBody: { flex: 1, gap: scaleHeight(2) },
		setTitle: { fontSize: Typography.bodySm, fontWeight: FontWeight.heavy, color: Colors.textStrong },
		setHint: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: scaledSize(16) },
		setCount: { fontSize: Typography.subtitle, fontWeight: FontWeight.heavy, color: Colors.textMuted, fontVariant: ['tabular-nums'] },
		setCountOn: { color: Colors.accentAmber },

		previewBox: {
			alignItems: 'center',
			gap: SpacingV.sm,
			paddingVertical: SpacingV.lg,
			paddingHorizontal: Spacing.lg,
			alignSelf: 'stretch',
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.primarySoft,
			backgroundColor: Colors.primaryBg,
			...Shadow.card,
		},
		// 대화 카드 안에 들어갈 때 — 좌우 여백을 줄여 말풍선·버튼과 같이 들어간다
		previewBoxCompact: { paddingVertical: SpacingV.md, paddingHorizontal: Spacing.md, gap: SpacingV.xs },
		// 판다와 청룡이 나란히 선다 — 글방은 그 뒤에 깔린다
		// 둘 사이 간격은 md 로 둔다 — sm 이면 판다 팔과 청룡 꼬리가 붙어 보였다
		previewStageRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: Spacing.md },
		previewStageRowCompact: { gap: Spacing.sm },
		previewPet: { alignItems: 'center', justifyContent: 'flex-end' },
		previewPerch: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
		// 청룡이 아직 없을 때 — 좌대 위에 무엇이 설지만 알려 주는 빈 자리
		previewPetEmpty: {
			alignItems: 'center',
			justifyContent: 'center',
			gap: scaleHeight(2),
			borderRadius: Radius.pill,
			borderWidth: 1,
			borderStyle: 'dashed',
			borderColor: Colors.border,
		},
		previewPetEmptyText: { fontSize: Typography.caption, color: Colors.textMuted },
		previewText: { alignItems: 'center', gap: scaleHeight(4) },
		previewName: {
			fontSize: Typography.subtitle,
			fontWeight: FontWeight.bold,
			color: Colors.textStrong,
		},
		previewStage: {
			fontSize: Typography.caption,
			fontWeight: FontWeight.bold,
			color: Colors.primaryDark,
		},
		previewSlots: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		previewSkin: {
			paddingHorizontal: Spacing.md,
			height: scaleHeight(38),
			justifyContent: 'center',
			borderRadius: Radius.md,
			backgroundColor: Colors.surface,
		},
		previewSlotLabel: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textSecondary },
		previewSeal: {
			width: scaleWidth(38),
			height: scaleHeight(38),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.sm,
			borderWidth: 1.5,
		},
		previewSealText: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, includeFontPadding: false },
		previewHint: { fontSize: Typography.caption, color: Colors.textMuted, textAlign: 'center' },
		previewEye: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },
		/** 꾸미기 안내 한 줄 — "캐릭터에 입히는 게 아니다" 를 목록 위에서 먼저 밝힌다 */
		decorLead: { fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: scaledSize(18) },
		/** 갈래 한 묶음 — 제목 줄 + 타일 줄 */
		decorGroup: { gap: SpacingV.sm, marginTop: SpacingV.sm },
		decorGroupHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		decorGroupIcon: {
			width: scaleWidth(30),
			height: scaleWidth(30),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: Radius.pill,
			backgroundColor: Colors.primarySoft,
		},
		decorGroupText: { flex: 1, gap: scaleHeight(1) },
		decorGroupTitle: { fontSize: Typography.bodySm, fontWeight: FontWeight.heavy, color: Colors.textStrong },
		decorGroupHint: { fontSize: Typography.caption, color: Colors.textMuted },
		decorGroupOn: { maxWidth: scaleWidth(96), fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.primaryDark, textAlign: 'right' },
		decorGroupOff: { color: Colors.textMuted, fontWeight: FontWeight.medium },

		decorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
		decorTile: {
			width: Layout.isTablet ? '15.5%' : '31%',
			minHeight: scaleHeight(126),
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: SpacingV.xs,
			paddingVertical: SpacingV.md,
			paddingHorizontal: Spacing.xs,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.border,
			backgroundColor: Colors.surface,
			...Shadow.card,
		},
		decorTileOn: {
			borderColor: Colors.primary,
			backgroundColor: Colors.primaryBg,
		},
		decorTileLabel: {
			fontSize: Typography.caption,
			fontWeight: FontWeight.semibold,
			color: Colors.text,
		},
		decorTag: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaleWidth(2),
			paddingHorizontal: Spacing.sm,
			height: scaleHeight(20),
			borderRadius: Radius.pill,
			backgroundColor: Colors.accentAmberSoft,
		},
		decorTagOwned: { backgroundColor: Colors.surfaceAlt },
		decorTagOn: { backgroundColor: Colors.primary },
		decorTagLocked: { backgroundColor: Colors.surfaceAlt },
		decorTagText: {
			fontSize: Typography.caption,
			fontWeight: FontWeight.bold,
			color: Colors.textStrong,
		},
		decorTagTextOn: { color: Colors.textInverse },
		decorTagTextLocked: { color: Colors.textMuted },

		footnote: {
			marginTop: SpacingV.md,
			fontSize: Typography.caption,
			color: Colors.textMuted,
			textAlign: 'center',
			lineHeight: scaledSize(18),
		},
		// 자리는 그대로 두고 눈에서만 지운다 — display:'none' 이면 진열대 높이가 흔들린다
	});

export default LifeShopScreen;
