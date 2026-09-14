import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useLife } from '@/src/hooks/useLife';
import { BADGES } from '@/src/const/data/life/ConstLifeRewards';
import type { LifeType } from '@/src/types/data/LifeType';
import BadgeUnlockModal from '@/src/screens/life/modal/BadgeUnlockModal';
import { clearPendingBadges, clearWish, DEV_COINS, devFillCoins , syncDomain } from '@/src/store/slice/LifeSlice';
import { applyReminder } from '@/src/services/life/LifeReminder';
import { playComplete } from '@/src/utils/SoundUtils';
import { showToast } from '@/src/screens/common/atomic/GlobalToast';

/**
 * 화면이 아닌 곳에서 상태를 지켜본다 — 루트 레이아웃에 한 번만 올린다.
 * - 새 뱃지가 생기면 어느 화면에 있든 보상 팝업으로 축하한다. 팝업을 닫을 때 목록을 비운다.
 * - 앱을 켤 때 저장된 알림 설정을 다시 건다 (앱 업데이트·재부팅으로 예약이 날아가는 것 보정).
 * - 상점에서 찜해 둔 물건의 값이 모이면 어느 화면에 있든 한 번 알린다.
 * - 개발 빌드는 코인을 한 번 채워 둔다 (상점을 손으로 벌지 않고 바로 보게).
 */
const LifeWatcher = () => {
	const dispatch = useDispatch();
	const { pendingBadges, badges, reminder, coins, wish } = useLife();
	const reapplied = useRef(false);

	/**
	 * 팝업에 세울 뱃지 — 슬라이스의 대기 목록을 그대로 읽는다.
	 * 따로 담아 두지 않으므로, 팝업이 떠 있는 동안 하나 더 따면 목록에 이어 붙는다.
	 */
	const fresh = useMemo(
		() => pendingBadges.map((id) => BADGES.find((item) => item.id === id)).filter((item): item is LifeType.Badge => !!item),
		[pendingBadges],
	);

	// 팝업이 처음 뜨는 순간에만 한 번 울린다
	const hadBadges = useRef(false);
	useEffect(() => {
		if (fresh.length > 0 && !hadBadges.current) {
			playComplete();
		}
		hadBadges.current = fresh.length > 0;
	}, [fresh.length]);

	const closeBadges = useCallback(() => dispatch(clearPendingBadges()), [dispatch]);

	useEffect(() => {
		if (reapplied.current) {
			return;
		}
		reapplied.current = true;
		if (reminder.enabled) {
			applyReminder(reminder);
		}
	}, [reminder]);

	/**
	 * 찜한 물건 값이 모였다 — 한 번 알리고 비운다.
	 * 비우는 것이 곧 "이미 알렸다" 표시라서 따로 플래그를 두지 않는다.
	 */
	useEffect(() => {
		if (!wish || coins < wish.price) {
			return;
		}
		showToast(`${wish.label}, 이제 살 수 있어요! 상점에 들러 보세요`, 'shopping');
		dispatch(clearWish());
	}, [coins, dispatch, wish]);

	// 즐겨찾기를 두 저장소로 나눠 담던 시절의 합치기는 걷어냈다.
	// 학습 도메인이 세계 상식으로 바뀌면서 옛 한자 id 는 syncDomain 이 어차피 걸러 낸다.

	// 저장된 기록을 되살린 직후 한 번 — 학습 도메인이 한자였던 시절의 id 를 걸러 낸다
	useEffect(() => {
		dispatch(syncDomain());
	}, [dispatch]);

	// 개발 빌드에서만 — 켤 때 한 번 채우고, 그 뒤 쓴 코인은 다시 채우지 않는다
	useEffect(() => {
		if (__DEV__) {
			dispatch(devFillCoins(DEV_COINS));
		}
	}, [dispatch]);

	if (fresh.length === 0) {
		return null;
	}

	return <BadgeUnlockModal badges={fresh} owned={badges.length} onClose={closeBadges} />;
};

export default LifeWatcher;
