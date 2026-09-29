import DateUtils from '@/src/utils/DateUtils';

describe('DateUtils local calendar arithmetic', () => {
	it('adds days across month and leap-year boundaries without DST drift', () => {
		expect(DateUtils.addLocalDays('2024-02-28', 1)).toBe('2024-02-29');
		expect(DateUtils.addLocalDays('2024-02-29', 1)).toBe('2024-03-01');
		expect(DateUtils.addLocalDays('2025-01-01', -1)).toBe('2024-12-31');
	});

	it('calculates calendar-day differences independently of elapsed-hour changes', () => {
		expect(DateUtils.differenceInLocalDays('2025-03-08', '2025-03-10')).toBe(2);
		expect(DateUtils.differenceInLocalDays('2025-03-10', '2025-03-08')).toBe(-2);
	});

	it('returns stable weekday values from local date keys', () => {
		expect(DateUtils.getLocalDayOfWeek('2026-07-19')).toBe(0);
		expect(DateUtils.getLocalDayOfWeek('2026-07-20')).toBe(1);
	});

	it('creates an absolute timestamp that preserves the requested device-timezone wall clock', () => {
		const target = DateUtils.getLocalDateAtTime('2026-08-02', 9, 35);
		const parts = DateUtils.getZonedParts(target);
		expect(parts).toMatchObject({ year: 2026, month: 8, day: 2, hour: 9, minute: 35 });
	});
});
