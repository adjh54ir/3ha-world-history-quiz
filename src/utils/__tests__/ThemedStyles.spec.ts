/**
 * themed() — 읽는 시점의 테마로 값이 갈리는지 확인한다.
 * 이게 깨지면 테마를 바꿔도 화면이 이전 색을 그대로 들고 있다(예전 번들 리로드 동작으로 회귀).
 */
import Colors, { applyTheme } from '@/src/const/ConstColors';
import { themed } from '../ThemedStyles';

afterEach(() => applyTheme('light'));

describe('themed', () => {
	it('테마마다 다른 값을 돌려주고, 돌아오면 원래 값을 돌려준다', () => {
		applyTheme('light');
		const styles = themed(() => ({ card: { backgroundColor: Colors.surface } }));
		const light = styles.card.backgroundColor;

		applyTheme('dark');
		const dark = styles.card.backgroundColor;

		expect(dark).not.toBe(light);
		expect(dark).toBe(Colors.surface);

		applyTheme('light');
		expect(styles.card.backgroundColor).toBe(light);
	});

	it('스프레드·Object.entries·배열도 현재 테마를 따른다', () => {
		applyTheme('light');
		const map = themed(() => ({ home: Colors.background }));
		const list = themed(() => [Colors.surface, Colors.border]);

		applyTheme('dark');
		expect({ ...map }.home).toBe(Colors.background);
		expect(Object.entries(map)).toEqual([['home', Colors.background]]);
		expect(Array.isArray(list)).toBe(true);
		expect([...list]).toEqual([Colors.surface, Colors.border]);
		expect(list.map((c) => c)).toEqual([Colors.surface, Colors.border]);
	});
});
