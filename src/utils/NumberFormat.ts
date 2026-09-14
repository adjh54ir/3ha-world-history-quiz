/**
 * 큰 수 축약 — 카드/칩 폭을 넘지 않게 짧게 (1,234 → 1.2천 / 12,345 → 1.2만)
 */
export const formatCompact = (n: number): string => {
	const div = (d: number) => (n / d).toFixed(1).replace(/\.0$/, '');
	if (n >= 10000) return `${div(10000)}만`;
	if (n >= 1000) return `${div(1000)}천`;
	return `${n}`;
};
