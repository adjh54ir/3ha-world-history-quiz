import AsyncStorage from '@react-native-async-storage/async-storage';
import AttendanceService from '../AttendanceService';

describe('AttendanceService — 누적 출석일', () => {
	beforeEach(async () => {
		await AttendanceService.reset();
	});

	it('같은 날 두 번 출석해도 누적은 1일', async () => {
		await AttendanceService.checkIn();
		const { state } = await AttendanceService.checkIn();
		expect(state.totalDays).toBe(1);
	});

	it('90개로 잘린 옛 기록도 누적은 이어서 센다', async () => {
		const dates = Array.from({ length: 90 }, (_, i) => `2020-01-${String((i % 28) + 1).padStart(2, '0')}-${i}`);
		await AsyncStorage.setItem('ATTENDANCE_STATE', JSON.stringify({ dates, lastCheck: '2020-01-01', streak: 1, bestStreak: 1 }));
		const { state } = await AttendanceService.checkIn();
		expect(state.dates.length).toBe(90);
		expect(state.totalDays).toBe(91);
	});
});
