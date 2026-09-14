type DateFormatType = 'type1' | 'type2' | 'type3' | 'type4' | 'type5';

type LocalDateParts = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
};

class DateUtils {
	getTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

	now = (): Date => new Date();

	/** 현재 시각(epoch ms) — 만료 비교 등 숫자 계산용. Date.now() 대신 이 함수를 쓴다 */
	nowTime = (): number => this.now().getTime();

	getLocalDateParts = (date: Date = this.now()): LocalDateParts => {
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: this.getTimeZone(),
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23',
		});
		const parts = Object.fromEntries(
			formatter
				.formatToParts(date)
				.filter(({ type }) => type !== 'literal')
				.map(({ type, value }) => [type, Number(value)]),
		) as Record<string, number>;

		return {
			year: parts.year,
			month: parts.month,
			day: parts.day,
			hour: parts.hour,
			minute: parts.minute,
			second: parts.second,
		};
	};

	formatDate = (date: Date, type: DateFormatType): string => {
		const { year, month, day, hour, minute, second } = this.getLocalDateParts(date);
		const mm = String(month).padStart(2, '0');
		const dd = String(day).padStart(2, '0');
		const hh = String(hour).padStart(2, '0');
		const min = String(minute).padStart(2, '0');
		const ss = String(second).padStart(2, '0');

		switch (type) {
			case 'type1': return `${year}-${mm}-${dd} ${hh}:${min}:${ss}`;
			case 'type2': return `${year}.${mm}.${dd} ${hh}:${min}`;
			case 'type3': return `${year}/${mm}/${dd}`;
			case 'type4': return `${year} -${mm} -${dd}`;
			case 'type5': return `${hh}:${min}`;
		}
	};

	getLocalDateString = (date: Date = this.now()): string => {
		const { year, month, day } = this.getLocalDateParts(date);
		return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	};

	getLocalParamDateToString = (inputDate?: string | Date): string => {
		if (typeof inputDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
			return inputDate;
		}
		return this.getLocalDateString(inputDate ? new Date(inputDate) : this.now());
	};

	createLocalDateAtTime = (hour: number, minute = 0, baseDate: Date = this.now()): Date => {
		const { year, month, day } = this.getLocalDateParts(baseDate);
		return new Date(year, month - 1, day, hour, minute, 0, 0);
	};

	getNextLocalOccurrence = (hour: number, minute = 0, from: Date = this.now()): Date => {
		const target = this.createLocalDateAtTime(hour, minute, from);
		if (target.getTime() <= from.getTime()) {
			target.setDate(target.getDate() + 1);
		}
		return target;
	};

	getLocalHour = (date: Date = this.now()): number => this.getLocalDateParts(date).hour;

	getLocalMinute = (date: Date = this.now()): number => this.getLocalDateParts(date).minute;

	getLocalDayOfWeek = (date: Date = this.now()): number => {
		const weekday = new Intl.DateTimeFormat('en-US', {
			timeZone: this.getTimeZone(),
			weekday: 'short',
		}).format(date);
		return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
	};

	isSameLocalDay = (left: Date | string, right: Date | string): boolean =>
		this.getLocalParamDateToString(left) === this.getLocalParamDateToString(right);

	getLocalDayDifference = (earlier: Date | string, later: Date | string = this.now()): number => {
		const toUtcDay = (value: Date | string) => {
			const [year, month, day] = this.getLocalParamDateToString(value).split('-').map(Number);
			return Date.UTC(year, month - 1, day);
		};
		return Math.floor((toUtcDay(later) - toUtcDay(earlier)) / 86_400_000);
	};
}

export default new DateUtils();
