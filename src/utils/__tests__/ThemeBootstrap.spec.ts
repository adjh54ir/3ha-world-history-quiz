/**
 * 부팅 순서 계약 검증.
 * 화면·디자인 토큰 모듈은 색상 '값'을 복사해 가므로, bootstrapTheme 이 먼저 돌고
 * 그 뒤에 로드된 모듈만 올바른 테마 색을 갖는다. 이 순서가 깨지면 다크 모드가
 * 일부 화면에만 적용되므로 테스트로 고정한다.
 */
const THEME_KEY = 'APP_THEME_MODE';

/** 모듈 레지스트리를 비운 뒤 그 안의 AsyncStorage 로 값을 심는다(앱 콜드 스타트 재현) */
const freshStorage = () => {
	const mod = require('@react-native-async-storage/async-storage');
	return mod.default ?? mod;
};

describe('테마 부팅 순서', () => {
	beforeEach(() => jest.resetModules());

	it('저장된 다크를 먼저 적용하면 이후 로드되는 디자인 토큰이 다크 값을 잡는다', async () => {
		await freshStorage().setItem(THEME_KEY, 'dark');

		const { bootstrapTheme } = require('@/src/utils/ThemeReload');
		expect(await bootstrapTheme()).toBe('dark');

		// bootstrapTheme 이후에 로드되는 모듈 (실제 앱에서는 라우트/화면 모듈)
		const { CardSurface } = require('@/src/const/ConstDesign');
		const { DARK_OVERRIDES } = require('@/src/const/ConstColors');
		expect(CardSurface.backgroundColor).toBe(DARK_OVERRIDES.surface);
		expect(CardSurface.borderColor).toBe(DARK_OVERRIDES.border);
	});

	it('저장값이 없으면 라이트로 시작한다 (OS 다크 설정을 따르지 않는다)', async () => {
		await freshStorage().clear();

		const { bootstrapTheme } = require('@/src/utils/ThemeReload');
		expect(await bootstrapTheme()).toBe('light');

		const { CardSurface } = require('@/src/const/ConstDesign');
		const { LIGHT_COLORS } = require('@/src/const/ConstColors');
		expect(CardSurface.backgroundColor).toBe(LIGHT_COLORS.surface);
	});
});
