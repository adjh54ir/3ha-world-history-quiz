import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions, type ModalProps } from 'react-native';
import { ToastHost } from '@/src/context/ToastContext';

/**
 * 현재 화면에 떠 있는 AppModal 수.
 * 안드로이드는 RN Modal 을 별도 네이티브 윈도우로 띄우기 때문에, 앞 모달이 닫히는 도중에
 * 뒤 모달을 올리면 두 윈도우가 겹치면서 "이전 모달이 잠깐 보였다 사라지는" 깜빡임이 생긴다.
 */
let presentedCount = 0;
/** 겹침 대기 중인 모달들에게 앞 모달이 닫혔음을 알리는 구독자 목록 */
const waiters = new Set<() => void>();
/** 마지막으로 모달이 닫힌 시각 — 같은 커밋에서 닫힘·열림이 겹치면 카운트가 이미 0이라 대기를 건너뛰던 문제를 막는다 */
let lastReleaseAt = 0;

const acquire = () => {
	presentedCount += 1;
};

const release = () => {
	presentedCount = Math.max(0, presentedCount - 1);
	if (presentedCount === 0) {
		lastReleaseAt = Date.now();
		waiters.forEach((notify) => notify());
	}
};

/** 네이티브 dismiss 애니메이션이 끝날 때까지의 여유 (RN Modal fade 기준) */
const DISMISS_MS = 220;
/** 앞 모달이 닫히지 않는 '의도적 겹침'까지 막지 않기 위한 대기 상한 */
const STACK_FALLBACK_MS = 400;

/**
 * 모달 공통 래퍼.
 * - 숨겨진 모달을 네이티브 트리에 남기지 않아 연속 전환 시 이전 모달이 번쩍이는 현상을 막습니다.
 * - 다른 모달이 아직 떠 있으면 그 모달이 완전히 닫힌 뒤에 올립니다(겹침 방지).
 * - 모달 안에서 부른 토스트(useToast)도 보이도록 ToastHost 를 함께 그립니다.
 * - 하단 여백은 각 시트가 자체 insets.bottom 으로 처리하므로 래퍼에서 패딩을 주지 않습니다.
 */
const AppModal = ({ visible, transparent = true, presentationStyle = 'overFullScreen', animationType = 'fade', children, ...props }: ModalProps) => {
	const [ready, setReady] = useState(false);
	const { width, height } = useWindowDimensions();
	/** 이 인스턴스가 presentedCount 를 점유 중인지 */
	const heldRef = useRef(false);

	// 앞 모달이 닫힐 때까지 기다렸다가 올린다
	useEffect(() => {
		if (!visible) {
			setReady(false);
			return;
		}
		if (presentedCount === 0) {
			// 앞 모달이 방금 닫혔다면(닫힘 애니메이션 진행 중) 남은 시간만큼 기다렸다가 올린다.
			// 효과 실행 순서상 닫히는 모달의 release 가 먼저 돌면 카운트가 0으로 보여 바로 열리면서 이전 모달이 번쩍였다.
			const remain = DISMISS_MS - (Date.now() - lastReleaseAt);
			if (remain <= 0) {
				setReady(true);
				return;
			}
			const wait = setTimeout(() => setReady(true), remain);
			return () => clearTimeout(wait);
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
			{/* 안드로이드 모달 루트는 0×0 으로 시작해 네이티브 크기 통보 후에야 커진다.
			    첫 표시 때 창 인셋 반영 전 크기로 잡히면 배경(dim)이 화면을 다 덮지 못하므로 최소 창 크기를 보장한다 */}
			<View style={[styles.fill, { minWidth: width, minHeight: height }]}>
				{children}
				{/* 모달은 별도 창이라 루트 토스트가 가려진다 — 모달 안에서 토스트를 그린다 */}
				<ToastHost />
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	fill: { flex: 1 },
});

export default AppModal;
