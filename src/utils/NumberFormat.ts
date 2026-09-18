import { translate } from '@/src/translations';

/**
 * 큰 수 축약 — 카드/칩 폭을 넘지 않게 짧게 (1,234 → 1.2천 / 12,345 → 1.2만)
 */
export const formatCompact = (n: number): string => {
	const div = (d: number) => (n / d).toFixed(1).replace(/\.0$/, '');
	if (n >= 10000) return translate('common.tenThousand', { n: div(10000) });
	if (n >= 1000) return translate('common.thousand', { n: div(1000) });
	return `${n}`;
};
