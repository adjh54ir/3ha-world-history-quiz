/**
 * 다크 팔레트 검증 — 토큰 누락과 대비 부족을 잡는다.
 * 테마는 OS 가 아니라 사용자가 설정 화면에서 고른 값이므로 applyTheme 동작도 함께 검사한다.
 */
import { DARK_OVERRIDES, LIGHT_COLORS, Colors, applyTheme, isDark, BRAND_GRADIENT, readableOn } from '@/src/const/ConstColors';

/** WCAG 상대 휘도 */
const luminance = (hex: string): number => {
	const h = hex.replace('#', '');
	const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
	const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
	return 0.2126 * f(ch[0]) + 0.7152 * f(ch[1]) + 0.0722 * f(ch[2]);
};
const contrast = (a: string, b: string): number => {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};

describe('다크 팔레트', () => {
	it('오버라이드 토큰은 모두 라이트 팔레트에 존재하는 키여야 한다(오타 방지)', () => {
		const unknown = Object.keys(DARK_OVERRIDES).filter((k) => !(k in LIGHT_COLORS));
		expect(unknown).toEqual([]);
	});

	it('본문·기능색은 다크 표면 위에서 대비 4.5:1 이상이어야 한다', () => {
		const dark = { ...LIGHT_COLORS, ...DARK_OVERRIDES } as Record<string, string>;
		const surfaces = [dark.surface, dark.surfaceAlt];
		const mustRead = ['text', 'textStrong', 'textSecondary', 'primary', 'primaryDeep', 'success', 'error', 'heat', 'heatDeep', 'gold', 'goldDark', 'goldDeep'];
		mustRead.forEach((token) => {
			surfaces.forEach((bg) => {
				expect(contrast(dark[token], bg)).toBeGreaterThanOrEqual(4.5);
			});
		});
	});

	it('배경·표면·보더는 서로 구분될 만큼 달라야 한다', () => {
		const dark = { ...LIGHT_COLORS, ...DARK_OVERRIDES } as Record<string, string>;
		expect(dark.background).not.toBe(dark.surface);
		expect(dark.surface).not.toBe(dark.surfaceAlt);
		expect(contrast(dark.borderStrong, dark.surface)).toBeGreaterThan(1.2);
	});

	it('단계 램프(primaryTint)는 진함→옅음 순서를 지키고, 등급 점으로 쓰는 tint3 까지 표면 위 3:1 이상이다', () => {
		const dark = { ...LIGHT_COLORS, ...DARK_OVERRIDES } as Record<string, string>;
		const ramp = ['primaryTint1', 'primaryTint2', 'primaryTint3', 'primaryTint4'].map((k) => contrast(dark[k], dark.surface));
		ramp.slice(1).forEach((c, i) => expect(c).toBeLessThan(ramp[i]));
		expect(ramp[2]).toBeGreaterThanOrEqual(3);
	});

	it('토스트(overlayStrong)는 다크 표면과 구분되고 흰 글자가 읽힌다', () => {
		const dark = { ...LIGHT_COLORS, ...DARK_OVERRIDES } as Record<string, string>;
		const [r, g, b] = /rgba\((\d+),(\d+),(\d+)/.exec(dark.overlayStrong)!.slice(1).map((n) => Number(n).toString(16).padStart(2, '0'));
		const toast = `#${r}${g}${b}`;
		expect(contrast(toast, dark.surface)).toBeGreaterThan(1.5);
		expect(contrast(dark.textInverse, toast)).toBeGreaterThanOrEqual(4.5);
	});
});

describe('readableOn', () => {
	afterEach(() => applyTheme('light'));

	it('밝은 배경 위에서는 테마와 무관하게 어두운 글자를 돌려준다', () => {
		applyTheme('dark');
		expect(readableOn('#FBBF24')).toBe(LIGHT_COLORS.textStrong);
		expect(contrast(readableOn('#FB923C'), '#FB923C')).toBeGreaterThanOrEqual(4.5);
	});

	it('어두운 배경 위에서는 흰 글자를 돌려준다', () => {
		expect(readableOn('#1450B0')).toBe(Colors.textInverse);
	});
});

describe('화면 테마 적용', () => {
	afterEach(() => applyTheme('light'));

	it('기본은 라이트 — OS 설정과 무관하게 화이트 팔레트로 시작한다', () => {
		expect(isDark()).toBe(false);
		expect(Colors.background).toBe(LIGHT_COLORS.background);
		expect(Colors.surface).toBe(LIGHT_COLORS.surface);
	});

	it('다크로 바꾸면 표면·텍스트 토큰과 파생 그라디언트가 함께 갱신된다', () => {
		const lightBrand = [...BRAND_GRADIENT];
		applyTheme('dark');

		expect(isDark()).toBe(true);
		expect(Colors.background).toBe(DARK_OVERRIDES.background);
		expect(Colors.text).toBe(DARK_OVERRIDES.text);
		// 파생 그라디언트는 값을 복사해 두므로 제자리 갱신이 안 되면 라이트 색이 남는다
		expect([...BRAND_GRADIENT]).not.toEqual(lightBrand);
	});

	it('다시 라이트로 돌리면 덮어썼던 토큰이 원래 값으로 복구된다', () => {
		applyTheme('dark');
		applyTheme('light');
		expect(Colors.background).toBe(LIGHT_COLORS.background);
		expect(Colors.text).toBe(LIGHT_COLORS.text);
		expect(BRAND_GRADIENT[0]).toBe(LIGHT_COLORS.primary);
	});
});
