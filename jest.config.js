/**
 * Jest 설정 (jest-expo 프리셋)
 * - 실행: `yarn install` 후 `yarn test`
 * - 테스트 파일: *.spec.ts (메인 tsconfig에서 제외되어 타입체크와 분리)
 */
module.exports = {
	preset: 'jest-expo',
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
	testMatch: ['**/__tests__/**/*.spec.ts', '**/*.spec.ts'],
	transformIgnorePatterns: [
		'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@react-native-async-storage/.*))',
	],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/$1',
	},
};
