/**
 * 오늘의 퀴즈 뱃지 인터셉터
 * - 오늘의 퀴즈를 모두 푼 누적 '완료 일수'를 기준으로 신규 획득 뱃지 id 목록을 반환합니다.
 * - 이미 보유한 뱃지(existingBadges)는 제외합니다.
 */
export const TodayQuizBadgeInterceptor = (completedDayCount: number, existingBadges: string[] = []): string[] => {
	const newBadges: string[] = [];
	const existing = new Set(existingBadges);

	// CONST_BADGES 의 today_* 와 동일한 임계값
	const thresholds = [1, 5, 10, 20, 30, 50, 100];

	thresholds.forEach((n) => {
		const id = `today_${n}`;
		if (!existing.has(id) && completedDayCount >= n) {
			newBadges.push(id);
		}
	});

	return newBadges;
};

export default TodayQuizBadgeInterceptor;
