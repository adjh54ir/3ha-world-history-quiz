import React, { useEffect, useRef, useState } from 'react';
import { ImageSourcePropType } from 'react-native';
import ToastMessage from './ToastMessage';

/**
 * 앱 전역 토스트
 * -------------------------------------------------
 * 즐겨찾기·학습 완료·급수 변경처럼 여러 화면에서 똑같이 일어나는 저장 동작에
 * 화면마다 토스트 상태를 두지 않고 `showToast('...')` 한 줄로 피드백을 준다.
 *
 * - 호스트(<GlobalToast />)는 app/_layout.tsx 에 기본으로 하나 올린다.
 * - RN Modal 은 (안드로이드는 별도 윈도, iOS 는 별도 뷰컨트롤러) 앱 화면 위에 얹히므로
 *   루트 호스트의 토스트는 모달 뒤로 가려진다. 그래서 호스트는 여러 개 둘 수 있게 하고,
 *   토스트를 띄우는 모달은 자기 내용 마지막에 <GlobalToast /> 를 하나 더 둔다.
 *   showToast 한 번이면 살아 있는 모든 호스트가 같이 그리므로, 가장 위에 있는 호스트가 보인다.
 */
/** 되돌리기처럼 토스트 안에서 바로 누를 동작 · 노출 시간 · 캐릭터 */
export interface ToastOptions {
	duration?: number;
	actionLabel?: string;
	onAction?: () => void;
	/** 캐릭터 일러스트 — 있으면 아이콘 대신 마스코트가 톡 튀어나오는 카드형 토스트가 된다 */
	image?: ImageSourcePropType;
	/** 캐릭터 토스트의 둘째 줄 — 한 줄 더 거들 말이 있을 때만 */
	subMessage?: string;
}

type ToastPayload = { message: string; icon: string; seq: number } & ToastOptions;

type Listener = (message: string, icon: string, options?: ToastOptions) => void;

/** 살아 있는 호스트들 — 모달이 열려 있으면 루트 호스트와 모달 호스트가 함께 들어 있다 */
const listeners = new Set<Listener>();

/**
 * 전역 토스트 표시
 * @param message 보여 줄 문구
 * @param icon MaterialCommunityIcons 이름
 * @param options 노출 시간·되돌리기 버튼
 */
export const showToast = (message: string, icon = 'check-circle', options?: ToastOptions): void => {
	listeners.forEach((fn) => fn(message, icon, options));
};

const GlobalToast = () => {
	const [toast, setToast] = useState<ToastPayload | null>(null);
	// 같은 문구를 연달아 띄워도 다시 뜨도록 매번 값을 바꾼다 (ToastMessage 는 message 변화로 연출을 시작한다)
	const seq = useRef(0);

	useEffect(() => {
		const listener = (message: string, icon: string, options?: ToastOptions) => {
			seq.current += 1;
			setToast({ message, icon, seq: seq.current, ...options });
		};
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}, []);

	if (!toast) {
		return null;
	}

	return (
		<ToastMessage
			key={toast.seq}
			message={toast.message}
			icon={toast.icon}
			image={toast.image}
			subMessage={toast.subMessage}
			duration={toast.duration}
			actionLabel={toast.actionLabel}
			onAction={
				toast.onAction &&
				(() => {
					// 되돌리기를 누르면 토스트는 즉시 닫는다 — 남아 있으면 두 번 눌릴 수 있다
					setToast(null);
					toast.onAction?.();
				})
			}
			onHide={() => setToast(null)}
		/>
	);
};

export default GlobalToast;
