/**
 * 비동기 작업을 한 줄로 세워 요청 순서대로 하나씩 처리한다.
 * -------------------------------------------------
 * 여러 단계로 이루어진 작업(예: 알림 예약 = cancel → create)은 원자적이지 않다.
 * 호출이 겹치면 단계가 뒤엉켜 마지막 요청이 아닌 값이 최종 상태로 남는다.
 *   A.cancel → B.cancel → B.create(새 값) → A.create(옛 값)   ← 옛 값이 살아남음
 * 앞 작업이 끝나야 다음 작업이 시작하므로 항상 마지막 요청이 최종 상태가 된다.
 *
 * 앞 작업이 실패해도 줄은 끊기지 않는다 (뒤 작업은 그대로 실행된다).
 */
export const createSerialQueue = () => {
	let tail: Promise<unknown> = Promise.resolve();

	return <T>(task: () => Promise<T>): Promise<T> => {
		// 성공/실패 어느 쪽이든 다음 작업을 시작한다
		const next = tail.then(task, task);
		tail = next.catch(() => undefined);
		return next;
	};
};
