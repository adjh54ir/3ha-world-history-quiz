import React, { useEffect, useRef, useState } from 'react';
import { Modal, type ModalProps } from 'react-native';

/**
 * 현재 화면에 떠 있는 AppModal 수.
 * 안드로이드는 RN Modal 을 별도 네이티브 윈도우로 띄우기 때문에, 앞 모달이 닫히는 도중에
 * 뒤 모달을 올리면 두 윈도우가 겹치면서 "이전 모달이 잠깐 보였다 사라지는" 깜빡임이 생긴다.
 */
let presentedCount = 0;
/** 겹침 대기 중인 모달들에게 앞 모달이 닫혔음을 알리는 구독자 목록 */
const waiters = new Set<() => void>();

const acquire = () => {
	presentedCount += 1;
};

const release = () => {
	presentedCount = Math.max(0, presentedCount - 1);
	if (presentedCount === 0) waiters.forEach((notify) => notify());
};

/** 네이티브 dismiss 애니메이션이 끝날 때까지의 여유 (RN Modal fade 기준) */
const DISMISS_MS = 220;
/** 앞 모달이 닫히지 않는 '의도적 겹침'까지 막지 않기 위한 대기 상한 */
const STACK_FALLBACK_MS = 400;

/**
 * 모달 공통 래퍼.
 * - 숨겨진 모달을 네이티브 트리에 남기지 않아 연속 전환 시 이전 모달이 번쩍이는 현상을 막습니다.
 * - 다른 모달이 아직 떠 있으면 그 모달이 완전히 닫힌 뒤에 올립니다(겹침 방지).
 * - 하단 여백은 각 시트가 자체 insets.bottom 으로 처리하므로 래퍼에서 패딩을 주지 않습니다.
 */
const AppModal = ({ visible, transparent = true, presentationStyle = 'overFullScreen', animationType = 'fade', children, ...props }: ModalProps) => {
	const [ready, setReady] = useState(false);
	/** 이 인스턴스가 presentedCount 를 점유 중인지 */
	const heldRef = useRef(false);

	// 앞 모달이 닫힐 때까지 기다렸다가 올린다
	useEffect(() => {
		if (!visible) {
			setReady(false);
			return;
		}
		if (presentedCount === 0) {
			setReady(true);
			return;
		}
		let timer: ReturnType<typeof setTimeout> | undefined;
		const notify = () => {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => setReady(true), DISMISS_MS);
		};
		waiters.add(notify);
		// 앞 모달 위에 의도적으로 겹쳐 띄우는 경우(시트 안의 확인 팝업 등)까지 막지 않도록
		// 일정 시간이 지나면 기다리지 않고 올린다.
		const fallback = setTimeout(() => setReady(true), STACK_FALLBACK_MS);
		return () => {
			waiters.delete(notify);
			clearTimeout(fallback);
			if (timer) clearTimeout(timer);
		};
	}, [visible]);

	// 실제로 떠 있는 동안만 카운트를 점유하고, 언마운트 시 반드시 반납한다
	useEffect(() => {
		const shouldHold = !!visible && ready;
		if (shouldHold === heldRef.current) return;
		heldRef.current = shouldHold;
		if (shouldHold) acquire();
		else release();
	}, [visible, ready]);

	useEffect(
		() => () => {
			if (heldRef.current) {
				heldRef.current = false;
				release();
			}
		},
		[],
	);

	if (!visible || !ready) return null;
	return (
		<Modal
			{...props}
			visible
			transparent={transparent}
			presentationStyle={presentationStyle}
			animationType={animationType}
			statusBarTranslucent
			navigationBarTranslucent
			hardwareAccelerated>
			{children}
		</Modal>
	);
};

export default AppModal;
