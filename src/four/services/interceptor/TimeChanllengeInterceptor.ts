export interface BonusCheckResult {
	addedTime: number;
	addedHeart: boolean;
	message: string | null;
	updatedHistory: number[];
}

export const TimeChallengeInterceptor = (newScore: number, bonusHistory: number[]): BonusCheckResult => {
	let addedTime = 0;
	let addedHeart = false;
	let message: string | null = null;
	const updatedHistory = [...bonusHistory];

	if (!bonusHistory.includes(100) && newScore >= 100) {
		addedTime = 10_000;
		message = '🎁 100점 달성! ⏱ 보너스 10초';
		updatedHistory.push(100);
	} else if (!bonusHistory.includes(200) && newScore >= 200) {
		addedTime = 10_000;
		addedHeart = true;
		message = '💖 200점 달성! ❤️ 하트 1개 + ⏱ 10초 추가';
		updatedHistory.push(200);
	} else if (!bonusHistory.includes(300) && newScore >= 300) {
		addedTime = 10_000;
		message = '🎉 300점! ⏱ 10초 추가!';
		updatedHistory.push(300);
	} else if (!bonusHistory.includes(400) && newScore >= 400) {
		addedTime = 10_000;
		message = '🔥 400점! ⏱ 추가 10초!';
		updatedHistory.push(400);
	} else if (!bonusHistory.includes(500) && newScore >= 500) {
		addedTime = 50_000;
		addedHeart = true;
		message = '🎉 500점! ⏱ 10초 추가!';
		updatedHistory.push(500);
	}

	return {
		addedTime,
		addedHeart,
		message,
		updatedHistory,
	};
};
