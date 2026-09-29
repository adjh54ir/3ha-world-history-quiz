/** 날짜 포맷 타입 정의 */
type DateFormatType = 'type1' | 'type2' | 'type3' | 'type4' | 'type5';

export interface ZonedDateParts {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
}

const DAY_MS = 86_400_000;

class DateUtils {
	/** 앱의 모든 달력 계산이 따르는 현재 기기 타임존 */
	getTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

	/** 테스트에서 주입하기 쉽도록 현재 시각 생성을 한 곳으로 모읍니다. */
	now = (): Date => new Date();

	private getTimeZoneOffset = (date: Date): number => {
		const p = this.getZonedParts(date);
		const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
		return asUtc - Math.floor(date.getTime() / 1000) * 1000;
	};

	/** 현재 기기 IANA 타임존의 달력 요소를 정확한 절대 시각으로 변환합니다. */
	fromZonedParts = ({ year, month, day, hour, minute, second = 0 }: ZonedDateParts): Date => {
		const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute, second);
		let result = new Date(wallClockUtc);
		result = new Date(wallClockUtc - this.getTimeZoneOffset(result));
		// DST 경계에서는 첫 추정값과 실제 오프셋이 달라질 수 있어 한 번 더 보정합니다.
		const corrected = new Date(wallClockUtc - this.getTimeZoneOffset(result));
		return corrected;
	};

	getZonedParts = (date: Date = this.now()): ZonedDateParts => {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: this.getTimeZone(),
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23',
		}).formatToParts(date);
		const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
		return {
			year: value('year'),
			month: value('month'),
			day: value('day'),
			hour: value('hour'),
			minute: value('minute'),
			second: value('second'),
		};
	};

	formatDate = (date: Date, type: DateFormatType): string => {
		const p = this.getZonedParts(date);
		const year = String(p.year);
		const month = String(p.month).padStart(2, '0');
		const day = String(p.day).padStart(2, '0');
		const hours = String(p.hour).padStart(2, '0');
		const minutes = String(p.minute).padStart(2, '0');
		const seconds = String(p.second).padStart(2, '0');

		switch (type) {
			case 'type1': return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
			case 'type2': return `${year}.${month}.${day} ${hours}:${minutes}`;
			case 'type3': return `${year}/${month}/${day}`;
			case 'type4': return `${year} -${month} -${day}`;
			case 'type5': return `${hours}:${minutes}`;
			default: {
				const _exhaustiveCheck: never = type;
				throw new Error(`Invalid date format type: ${_exhaustiveCheck}`);
			}
		}
	};

	/** 타임존 기준 YYYY-MM-DD 키 */
	getLocalDateString = (date: Date = this.now()): string => {
		const { year, month, day } = this.getZonedParts(date);
		return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	};

	getLocalParamDateToString = (inputDate?: string | Date): string =>
		this.getLocalDateString(inputDate ? new Date(inputDate) : this.now());

	/** YYYY-MM-DD를 DST의 영향을 받지 않는 달력 일련번호로 변환합니다. */
	dateKeyToOrdinal = (dateKey: string): number => {
		const [year, month, day] = dateKey.split('-').map(Number);
		if (!year || !month || !day) throw new Error(`Invalid local date key: ${dateKey}`);
		return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
	};

	addLocalDays = (dateKey: string, amount: number): string => {
		const date = new Date((this.dateKeyToOrdinal(dateKey) + amount) * DAY_MS);
		return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
	};

	differenceInLocalDays = (from: string, to: string): number => this.dateKeyToOrdinal(to) - this.dateKeyToOrdinal(from);

	/** 0(일)~6(토) */
	getLocalDayOfWeek = (dateKey: string = this.getLocalDateString()): number =>
		new Date(this.dateKeyToOrdinal(dateKey) * DAY_MS).getUTCDay();

	getLocalMonthDay = (date: Date = this.now()): Pick<ZonedDateParts, 'year' | 'month' | 'day'> => {
		const { year, month, day } = this.getZonedParts(date);
		return { year, month, day };
	};

	getLocalDateAtTime = (dateKey: string, hour: number, minute = 0, second = 0): Date => {
		const [year, month, day] = dateKey.split('-').map(Number);
		if (!year || !month || !day) throw new Error(`Invalid local date key: ${dateKey}`);
		return this.fromZonedParts({ year, month, day, hour, minute, second });
	};

	/** 현재 기기 타임존에서 오늘의 지정 시각을 만듭니다. */
	getLocalTimeToday = (hour: number, minute = 0): Date => {
		return this.getLocalDateAtTime(this.getLocalDateString(), hour, minute);
	};

	getNextLocalTime = (hour: number, minute = 0): Date => {
		const now = this.now();
		const today = this.getLocalDateString(now);
		const target = this.getLocalDateAtTime(today, hour, minute);
		return target.getTime() > now.getTime() ? target : this.getLocalDateAtTime(this.addLocalDays(today, 1), hour, minute);
	};

	getNextLocalWeekday = (dayOfWeek: number, hour: number, minute = 0): Date => {
		const firstTarget = this.getNextLocalTime(hour, minute);
		const firstKey = this.getLocalDateString(firstTarget);
		const daysUntilTarget = (dayOfWeek - this.getLocalDayOfWeek(firstKey) + 7) % 7;
		return this.getLocalDateAtTime(this.addLocalDays(firstKey, daysUntilTarget), hour, minute);
	};

	getLocalTimeAfterDays = (days: number, hour: number, minute = 0): Date => {
		const targetKey = this.addLocalDays(this.getLocalDateString(), days);
		return this.getLocalDateAtTime(targetKey, hour, minute);
	};

	getMillisecondsUntilNextLocalDay = (): number => {
		const now = this.now();
		const tomorrow = this.addLocalDays(this.getLocalDateString(now), 1);
		return Math.max(0, this.getLocalDateAtTime(tomorrow, 0).getTime() - now.getTime());
	};

	/** 저장/정렬용 절대 시각. 달력 날짜 비교에는 getLocalDateString을 사용합니다. */
	toISOString = (date: Date = this.now()): string => date.toISOString();
	getTimestamp = (): number => this.now().getTime();
	getTimestampFrom = (value: string | number | Date): number => new Date(value).getTime();
	formatTimestamp = (timestamp: number, type: DateFormatType): string => this.formatDate(new Date(timestamp), type);
}

export default new DateUtils();
