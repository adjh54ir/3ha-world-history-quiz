import { createContext, useCallback, useContext, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/src/store/RootReducer';
import { buildBadgeSnapshot, feedAttendancePet, type LifeState } from '@/src/store/slice/LifeSlice';
import { showToast } from '@/src/screens/common/atomic/GlobalToast';
import { playComplete } from '@/src/utils/SoundUtils';
import type { LifeType } from '@/src/types/data/LifeType';
import { DOMAIN_CATEGORIES, selectItemsByCategory } from '@/src/const/data/world/ConstWorldDomain';
import { DECOR_KINDS, DECOR_SET_BONUS_PERCENT, isDecorSetComplete, selectDecor } from '@/src/const/data/life/ConstLifeDecor';
import { SHOP_ITEM_IMAGES, SHOP_UPGRADE_ITEMS } from '@/src/const/data/life/ConstShopImages';
import { ATTENDANCE_PET_IMAGES } from '@/src/const/data/life/ConstPetImages';
import { shopUpgradeEffect } from '@/src/const/data/life/ConstLifeRewards';
import { attendancePetStatus, badgeProgress, calcStreak, categoryStars, needsShield, petStatus, toDateKey, type BadgeProgress } from '@/src/services/life/LifeRules';
import { BADGES } from '@/src/const/data/life/ConstLifeRewards';

/** 학습·보상 상태 전체 */
export const useLife = (): LifeState => useSelector((state: RootState) => state.life);

/**
 * 뱃지마다 조건을 얼마나 채웠는지 — 아직 못 딴 뱃지에 "7 / 10" 을 보여 주는 데 쓴다.
 * 뱃지를 주는 리듀서와 같은 스냅샷을 쓰므로 화면의 100%와 실제 지급 시점이 어긋나지 않는다.
 */
export const useBadgeProgress = (): Map<string, BadgeProgress> => {
	const life = useLife();
	return useMemo(() => {
		const snapshot = buildBadgeSnapshot(life);
		return new Map(BADGES.map((badge) => [badge.id, badgeProgress(badge.id, snapshot)]));
	}, [life]);
};

/** 오늘 기준 연속 출석 + 오늘 출석 여부 */
export const useStreak = () => {
	const attendance = useSelector((state: RootState) => state.life.attendance);
	const shieldedDays = useSelector((state: RootState) => state.life.shieldedDays);
	const shields = useSelector((state: RootState) => state.life.shields);
	return useMemo(() => {
		const today = toDateKey();
		const shielded = shieldedDays ?? [];
		return {
			streak: calcStreak(attendance, today, shielded),
			checkedToday: attendance.includes(today),
			today,
			shields: shields ?? 0,
			/** 오늘 출석하면 보호권이 소모되는지 — 홈이 토스트로 알려 준다 */
			willUseShield: (shields ?? 0) > 0 && needsShield(attendance, shielded, today),
		};
	}, [attendance, shieldedDays, shields]);
};

/**
 * 즐겨찾기한 단어 id 집합 + 켜고 끄는 판단용 헬퍼.
 * 즐겨찾기가 없던 버전에서 올라온 저장본은 배열 자체가 없으므로 빈 배열로 받는다.
 */
export const useFavorites = () => {
	const favorites = useSelector((state: RootState) => state.life.favorites);
	return useMemo(() => {
		const list = favorites ?? [];
		return { list, set: new Set(list) };
	}, [favorites]);
};

/** 지금 걸려 있는 효과 한 줄 — 홈과 상점이 같은 목록을 쓴다 */
export interface ActiveEffect {
	key: string;
	label: string;
	effect: string;
	image: number;
	/** '2회 대기' · 'Lv.3 상시' 처럼 남은 횟수나 레벨 */
	badge: string;
	/** 영구 강화인지 — 소모품과 배지 색을 나눈다 */
	forever: boolean;
}

/**
 * 지금 걸려 있는 효과 — "가진 개수" 와 "지금 효력이 있는지" 는 다른 이야기다.
 * 가방 칩은 개수만 보여 줘서, 보호권처럼 자동으로 쓰이는 것이 켜져 있는지 알 수 없었다.
 * 다음 한 판만 듣는 소모품과 영구 강화를 한 줄로 세워 무엇이 대기 중인지 먼저 읽히게 한다.
 * 홈과 상점이 같은 목록을 보여 줘야 해서 여기 한 벌만 둔다.
 */
export const useActiveEffects = (): ActiveEffect[] => {
	const life = useLife();
	return useMemo(() => {
		const rows: ActiveEffect[] = [];
		/** 다음 행동 한 번에만 듣는 소모품 — 남은 횟수를 그대로 배지에 쓴다 */
		const pending: { key: string; label: string; effect: string; image: number; count: number }[] = [
			{ key: 'shield', label: '스트릭 보호권', effect: '하루 빠져도 연속 출석이 이어져요', image: SHOP_ITEM_IMAGES.shield, count: life.shields ?? 0 },
			{ key: 'focusCharm', label: '집중 부적', effect: '다음 퀴즈 한 판의 문제 보상 2배', image: SHOP_ITEM_IMAGES.focusCharm, count: life.quizBoosts ?? 0 },
			{ key: 'wrongShield', label: '오답 방패', effect: '다음 퀴즈에서 틀려도 오답에 안 남아요', image: SHOP_ITEM_IMAGES.wrongShield, count: life.wrongGuards ?? 0 },
			{ key: 'chestSeal', label: '보물 인장', effect: '다음 퀴즈를 끝내면 상자가 하나 더', image: SHOP_ITEM_IMAGES.chestSeal, count: life.chestSeals ?? 0 },
			{ key: 'learningBookmark', label: '학습 책갈피', effect: '다음 새 단어 학습 보상 2배', image: SHOP_ITEM_IMAGES.learningBookmark, count: life.learnBoosts ?? 0 },
			{ key: 'attendanceIncense', label: '출석 향로', effect: '다음 출석 보상 2배', image: SHOP_ITEM_IMAGES.attendanceIncense, count: life.attendanceBoosts ?? 0 },
		];
		pending
			.filter((item) => item.count > 0)
			.forEach((item) => rows.push({ key: item.key, label: item.label, effect: item.effect, image: item.image, badge: `${item.count}회 대기`, forever: false }));
		// 꾸미기 세트 — 여섯 갈래를 다 놓아 둔 동안에만 듣는다. 하나 내려놓으면 바로 빠진다
		if (isDecorSetComplete(life.decorEquipped)) {
			rows.push({
				key: 'decorSet',
				label: '글방 주인 세트',
				effect: `꾸미기 ${DECOR_KINDS.length}갈래를 모두 놓아 코인 획득 +${DECOR_SET_BONUS_PERCENT}%`,
				image: SHOP_ITEM_IMAGES.goldenKey,
				badge: `+${DECOR_SET_BONUS_PERCENT}% 상시`,
				forever: true,
			});
		}
		// 영구 강화 — 한 번 사면 계속 듣는다. 지금 레벨의 효과를 그대로 읽어 준다
		SHOP_UPGRADE_ITEMS.forEach((upgrade) => {
			const level = life.shopUpgrades?.[upgrade.key] ?? 0;
			if (level <= 0) {
				return;
			}
			rows.push({
				key: upgrade.key,
				label: upgrade.label,
				effect: upgrade.effectText(shopUpgradeEffect(upgrade.key, level)),
				image: upgrade.image,
				badge: `Lv.${level} 상시`,
				forever: true,
			});
		});
		return rows;
	}, [life.attendanceBoosts, life.chestSeals, life.decorEquipped, life.learnBoosts, life.quizBoosts, life.shields, life.shopUpgrades, life.wrongGuards]);
};

export interface CategoryProgress {
	category: LifeType.Category;
	total: number;
	learned: number;
	ratio: number;
	/** 별점 0~3 — 전부 학습 · 퀴즈 80% · 퀴즈 만점 */
	stars: number;
}

/** 카테고리별 학습 진도 + 별점 */
export const useCategoryProgress = (): CategoryProgress[] => {
	const learned = useSelector((state: RootState) => state.life.learned);
	const records = useSelector((state: RootState) => state.life.records);
	return useMemo(() => {
		const set = new Set(learned);
		return DOMAIN_CATEGORIES.map((category) => {
			const words = selectItemsByCategory(category.key);
			const done = words.filter((item) => set.has(item.id)).length;
			return {
				category,
				total: words.length,
				learned: done,
				ratio: words.length ? done / words.length : 0,
				stars: categoryStars(category.key, words, set, records),
			};
		});
	}, [learned, records]);
};

/** 가방 속 물건 한 줄 — 홈과 상점이 같은 목록을 쓴다 */
export interface InventoryItem {
	key: string;
	label: string;
	image: number;
	count: number;
	/** 어디에 쓰는 물건인지 한 줄 */
	hint: string;
}

/**
 * 가진 소모품 목록 — 개수가 0 인 것은 빼고 준다.
 * 홈과 상점이 같은 목록을 보여 줘야 해서 여기 한 벌만 둔다.
 * (예전에는 상점 화면 안에만 있어서 홈에 같은 걸 그리려면 표를 한 벌 더 베껴야 했다)
 */
export const useInventory = (): InventoryItem[] => {
	const life = useLife();
	return useMemo(
		() =>
			[
				{
					key: 'petFeed',
					label: '펫 먹이',
					image: SHOP_ITEM_IMAGES.petFeed,
					count: life.petFeeds ?? 0,
					hint: '청룡 펫에게 주면 성장 칸이 한 칸 차요. 나의 활동에서 먹일 수 있어요',
				},
				{ key: 'shield', label: '스트릭 보호권', image: SHOP_ITEM_IMAGES.shield, count: life.shields ?? 0, hint: '하루 빼먹어도 다음 날 출석하면 연속 출석이 이어져요' },
				{ key: 'focusCharm', label: '집중 부적', image: SHOP_ITEM_IMAGES.focusCharm, count: life.quizBoosts ?? 0, hint: '다음 퀴즈 한 판의 문제 보상이 두 배가 돼요' },
				{ key: 'wrongShield', label: '오답 방패', image: SHOP_ITEM_IMAGES.wrongShield, count: life.wrongGuards ?? 0, hint: '다음 퀴즈에서 틀려도 오답 노트에 기록되지 않아요' },
				{ key: 'chestSeal', label: '보물 인장', image: SHOP_ITEM_IMAGES.chestSeal, count: life.chestSeals ?? 0, hint: '다음 퀴즈를 끝내면 보물상자가 하나 더 나와요' },
				{ key: 'learningBookmark', label: '학습 책갈피', image: SHOP_ITEM_IMAGES.learningBookmark, count: life.learnBoosts ?? 0, hint: '다음 새 단어 학습 보상이 두 배가 돼요' },
				{ key: 'attendanceIncense', label: '출석 향로', image: SHOP_ITEM_IMAGES.attendanceIncense, count: life.attendanceBoosts ?? 0, hint: '다음 출석 체크 보상이 두 배가 돼요' },
				{ key: 'chest', label: '안 연 상자', image: SHOP_ITEM_IMAGES.chestClosed, count: life.pendingChests?.length ?? 0, hint: '홈이나 상점으로 돌아가면 상자를 열 수 있어요' },
			].filter((item) => item.count > 0),
		[
			life.attendanceBoosts,
			life.chestSeals,
			life.learnBoosts,
			life.pendingChests,
			life.petFeeds,
			life.quizBoosts,
			life.shields,
			life.wrongGuards,
		],
	);
};

/**
 * 미리보기로 잠깐 덧씌우는 꾸미기 — 상점에서 "사기 전에 어떻게 보이는지" 를 보여 줄 때만 쓴다.
 * 저장된 값은 건드리지 않는다. 이 값이 걸려 있는 동안만 같은 갈래의 꾸미기가 바꿔치기된다.
 */
const DecorPreviewContext = createContext<LifeType.Decor | null>(null);

/** 이 안에서 그려지는 꾸미기 컴포넌트는 넘긴 꾸미기를 적용한 모습으로 보인다 */
export const DecorPreviewProvider = DecorPreviewContext.Provider;

/**
 * 지금 적용 중인 화면 꾸미기 — 갈래마다 하나씩.
 * 아무것도 안 놓았으면 null 이라, 부르는 쪽은 그냥 그리지 않으면 된다(원래 화면 그대로).
 * 미리보기가 걸려 있으면 그 갈래만 미리보기 값으로 바뀐다.
 */
export const useDecor = (kind: LifeType.DecorKind): LifeType.Decor | null => {
	const equipped = useSelector((state: RootState) => state.life.decorEquipped);
	const preview = useContext(DecorPreviewContext);
	return useMemo(() => (preview?.kind === kind ? preview : selectDecor(equipped?.[kind])), [equipped, kind, preview]);
};

/** 펫 단계 */
export const usePet = () => {
	const exp = useSelector((state: RootState) => state.life.exp);
	const petName = useSelector((state: RootState) => state.life.petName);
	return useMemo(() => ({ ...petStatus(exp), exp, petName }), [exp, petName]);
};

/**
 * 출석 수호신 먹이 주기 — 홈 출석 팝업과 나의 활동이 같은 규칙을 쓴다.
 * 두 화면에 같은 판단(먹이 있나·다 자랐나)과 같은 토스트를 두 번 적지 않도록 여기 모은다.
 */
export const useFeedAttendancePet = () => {
	const dispatch = useDispatch();
	const pet = useAttendancePet();
	const grownUp = !pet.next;
	const canFeed = pet.feeds > 0 && !grownUp;

	const feed = useCallback(() => {
		if (grownUp) {
			showToast('마지막 단계까지 다 자랐어요', 'party-popper');
			return;
		}
		if (pet.feeds <= 0) {
			showToast('먹이가 없어요. 출석 도장을 찍거나 상점에서 살 수 있어요', 'food-drumstick-off');
			return;
		}
		const grew = !!pet.next && pet.fed + 1 >= pet.next.minFeeds;
		playComplete();
		dispatch(feedAttendancePet());
		// 단계가 오르는 순간은 PetGrowthModal 이 검은 화면으로 크게 축하한다 — 토스트까지 겹치면 두 번 알린다
		if (!grew) {
			showToast('먹이를 줬어요', 'food-drumstick', { subMessage: `남은 먹이 ${pet.feeds - 1}개` });
		}
	}, [dispatch, grownUp, pet.fed, pet.feeds, pet.next]);

	return { ...pet, grownUp, canFeed, feed };
};

/**
 * 출석 수호신 — 먹인 먹이 수로 자란다.
 * 출석은 먹이를 하나 주고, 먹이를 직접 줘야 단계가 오른다.
 */
export const useAttendancePet = () => {
	const feeds = useSelector((state: RootState) => state.life.petFeeds ?? 0);
	// 먹이 방식 이전 저장본은 이 칸이 비어 있다 — 그때까지의 출석일을 먹인 것으로 본다
	const attendanceCount = useSelector((state: RootState) => state.life.attendance.length);
	const fedRaw = useSelector((state: RootState) => state.life.petFedCount);
	return useMemo(() => {
		const fed = fedRaw ?? attendanceCount;
		const status = attendancePetStatus(fed);
		return { ...status, fed, feeds, image: status.level >= 0 ? ATTENDANCE_PET_IMAGES[status.level] : null };
	}, [fedRaw, attendanceCount, feeds]);
};
