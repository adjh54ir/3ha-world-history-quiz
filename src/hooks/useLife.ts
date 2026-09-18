import { useCallback, useMemo } from 'react';
import { translate } from '@/src/translations';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/src/store/RootReducer';
import { buildBadgeSnapshot, feedAttendancePet, type LifeState } from '@/src/store/slice/LifeSlice';
import { showToast } from '@/src/screens/common/atomic/GlobalToast';
import { playComplete } from '@/src/utils/SoundUtils';
import type { LifeType } from '@/src/types/data/LifeType';
import { DOMAIN_CATEGORIES, selectItemsByCategory } from '@/src/const/data/world/ConstWorldDomain';
import { ATTENDANCE_PET_IMAGES } from '@/src/const/data/life/ConstPetImages';
import { attendancePetStatus, badgeProgress, calcStreak, categoryStars, petStatus, toDateKey, type BadgeProgress } from '@/src/services/life/LifeRules';
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
	return useMemo(() => {
		const today = toDateKey();
		return {
			streak: calcStreak(attendance, today),
			checkedToday: attendance.includes(today),
			today,
		};
	}, [attendance]);
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

/** 펫 단계 */
export const usePet = () => {
	const exp = useSelector((state: RootState) => state.life.exp);
	const saved = useSelector((state: RootState) => state.life.petName);
	// 이름을 손으로 고치지 않았으면(빈 값) 지금 언어의 기본 이름을 쓴다
	const petName = saved || translate('pet.defaultName');
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
			showToast(translate('pet.feedGrownUp'), 'party-popper');
			return;
		}
		if (pet.feeds <= 0) {
			showToast(translate('pet.feedEmpty'), 'food-drumstick-off');
			return;
		}
		const grew = !!pet.next && pet.fed + 1 >= pet.next.minFeeds;
		playComplete();
		dispatch(feedAttendancePet());
		// 단계가 오르는 순간은 PetGrowthModal 이 검은 화면으로 크게 축하한다 — 토스트까지 겹치면 두 번 알린다
		if (!grew) {
			showToast(translate('pet.fedToast'), 'food-drumstick', { subMessage: translate('pet.fedLeft', { n: pet.feeds - 1 }) });
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
