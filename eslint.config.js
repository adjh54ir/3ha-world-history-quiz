// ESLint 9 flat config — 타입 검사는 tsc 가 하므로 여기서는 "죽은 코드/훅 규칙"만 본다.
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const reactHooks = require('eslint-plugin-react-hooks');

module.exports = [
	{
		ignores: [
			'node_modules/**',
			'android/**',
			'ios/**',
			'build/**',
			'_/**',
			'.expo/**',
			'dist/**',
			'babel.config.js',
			'metro.config.js',
			'react-native.config.js',
			'eslint.config.js',
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		// scripts/ 는 앱이 아니라 node 에서 직접 돌리는 도구다 — node 전역과 require 를 열어 둔다
		files: ['scripts/**/*.{js,mjs}'],
		languageOptions: {
			globals: {
				console: 'readonly',
				process: 'readonly',
				fetch: 'readonly',
				require: 'readonly',
				module: 'writable',
				__dirname: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
			},
		},
		rules: { '@typescript-eslint/no-require-imports': 'off' },
	},
	{
		files: ['**/*.{ts,tsx}'],
		// 위 규칙 이름만 알려 준 두 플러그인은 아무것도 보고하지 않으므로 끄는 주석이 늘 '쓸모없음' 으로 잡힌다
		linterOptions: { reportUnusedDisableDirectives: 'off' },
		plugins: {
			'react-hooks': reactHooks,
			// 화면은 한국어 퀴즈(3ha-korea-quiz)에서 그대로 옮겨 왔다. 그 저장소는 @react-native/eslint-config 로 쓰여
			// 파일 머리에 `eslint-disable react-native/no-inline-styles` 같은 주석이 남아 있다.
			// 플러그인을 들이지 않고 규칙 이름만 알려 준다 — 모르는 규칙을 끄는 주석은 그 자체로 에러가 된다.
			'react-native': { rules: { 'no-inline-styles': { create: () => ({}) } } },
			react: { rules: { 'no-unstable-nested-components': { create: () => ({}) } } },
		},
		languageOptions: {
			parserOptions: { ecmaFeatures: { jsx: true } },
			globals: { console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly' },
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			// 안 쓰는 값은 지우거나 _ 로 시작시킨다 — 이번 테마 마이그레이션에서 실제로 죽은 코드가 남았다
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
			// RN 프로젝트라 any 는 실무상 자주 쓰인다 (네비게이션 타입 등) — 막지 않는다
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			// 타입 정의를 namespace 로 묶는 것이 이 저장소의 규칙이다
			'@typescript-eslint/no-namespace': 'off',
			'no-undef': 'off', // 타입은 tsc 담당

			// useRef(new Animated.Value(0)).current 는 RN 공식 애니메이션 패턴이라 렌더 중 접근이 정상이다
			'react-hooks/refs': 'off',
			// 화면 진입 시 로드 → setState 는 이 앱의 기본 패턴이라 에러 대신 경고로만 본다
			'react-hooks/set-state-in-effect': 'warn',
			'react-hooks/immutability': 'warn',
			// 아래 셋은 옮겨 온 화면 코드에서만 걸린다 (셔플을 useMemo 안에서 부르는 등 원본에서 동작이 검증된 패턴).
			// 화면을 그대로 두기로 했으므로 에러로 막지 않고 경고로 남겨 둔다.
			'react-hooks/purity': 'warn',
			'react-hooks/preserve-manual-memoization': 'warn',
			'no-empty': ['warn', { allowEmptyCatch: true }],
			'@typescript-eslint/no-unused-expressions': 'warn',
		},
	},
];
