import { Typography, Spacing, SpacingV, Radius, Shadow, CardSurface, Layout } from '@/src/const/ConstDesign';

/**
 * 디자인 토큰 규칙 회귀 테스트
 * - 화면 코드가 아니라 토큰 자체의 규칙이 깨지는 것을 잡는다.
 * - 여기서 실패하면 앱 전체의 통일성이 한 번에 무너진 상태다.
 */
describe('ConstDesign 토큰 규칙', () => {
	it('타이포그래피는 단조 증가한다', () => {
		const order = [
			Typography.micro,
			Typography.caption,
			Typography.bodySm,
			Typography.callout,
			Typography.title,
			Typography.h3,
			Typography.h2,
			Typography.h1,
			Typography.display,
		];
		order.forEach((v, i) => {
			if (i > 0) expect(v).toBeGreaterThan(order[i - 1]);
		});
	});

	it('인접 1pt 단계는 병합된 상태를 유지한다', () => {
		expect(Typography.caption).toBe(Typography.footnote);
		expect(Typography.bodySm).toBe(Typography.body);
		expect(Typography.callout).toBe(Typography.subtitle);
	});

	it('평면 카드에는 그림자가 없다 (헤어라인 보더로 통일)', () => {
		expect(Shadow.card.shadowOpacity).toBe(0);
		expect(CardSurface.borderWidth).toBe(1);
	});

	it('떠 있는 요소용 그림자는 살아 있다', () => {
		expect(Shadow.floating.shadowOpacity).toBeGreaterThan(0);
	});

	it('스페이싱·라운드는 단조 증가한다', () => {
		const sp = [Spacing.xxs, Spacing.xs, Spacing.sm, Spacing.md, Spacing.lg, Spacing.xl, Spacing.xxl, Spacing.xxxl];
		sp.forEach((v, i) => i > 0 && expect(v).toBeGreaterThan(sp[i - 1]));
		const spv = [SpacingV.xxs, SpacingV.xs, SpacingV.sm, SpacingV.md, SpacingV.lg, SpacingV.xl, SpacingV.xxl, SpacingV.xxxl];
		spv.forEach((v, i) => i > 0 && expect(v).toBeGreaterThan(spv[i - 1]));
		const rd = [Radius.sm, Radius.md, Radius.lg, Radius.xl, Radius.pill];
		rd.forEach((v, i) => i > 0 && expect(v).toBeGreaterThan(rd[i - 1]));
	});

	it('화면 레이아웃 기준값은 스페이싱 토큰에서 파생된다', () => {
		expect(Layout.screenH).toBe(Spacing.xl);
		expect(Layout.screenTop).toBe(SpacingV.md);
		expect(Layout.screenBottom).toBeGreaterThan(Layout.screenTop);
		expect(Layout.touch).toBeGreaterThanOrEqual(40);
	});
});
