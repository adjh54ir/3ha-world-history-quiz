/**
 * 모달 전환 훅
 * -------------------------------------------------
 * 모달 위에 모달을 겹쳐 띄우면 안드로이드에서 터치가 죽고,
 * 닫자마자 바로 열면 닫힘 애니메이션과 열림이 겹쳐 이전 모달이 번쩍인다.
 * 먼저 닫고 애니메이션이 끝난 뒤에 다음 모달을 연다.
 *
 * 사용법:
 *   const handoff = useModalHandoff();
 *   handoff(() => setDetail(null), () => setEdit(item));
 */
import { useCallback, useEffect, useRef } from 'react';

/** RN Modal 의 기본 전환 애니메이션이 끝나는 데 필요한 시간 */
const HANDOFF_DELAY = 250;

export const useModalHandoff = (delay: number = HANDOFF_DELAY) => {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(
		() => () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		},
		[],
	);

	return useCallback(
		(close: () => void, open: () => void) => {
			close();
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
			timerRef.current = setTimeout(() => {
				open();
				timerRef.current = null;
			}, delay);
		},
		[delay],
	);
};

export default useModalHandoff;
