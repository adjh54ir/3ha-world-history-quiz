import { Text } from 'react-native';

describe('GlobalComponentDefaults', () => {
	it('react-native 의 Text 를 앱 Text 로 교체한다', () => {
		const before = Text;
		require('@/src/config/GlobalComponentDefaults');
		const after = require('react-native').Text;
		expect(after).not.toBe(before);
		expect(after.displayName).toBe('Text');
	});
});
