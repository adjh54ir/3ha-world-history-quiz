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
			// 사자성어 앱에서 그대로 옮겨 온 화면들(학습·퀴즈·오답노트·타임챌린지).
			// 원본 저장소의 규칙(@react-native/eslint-config)으로 쓰인 코드라 여기 규칙으로는
			// ts-comment·인라인 스타일 등에서 대량으로 걸린다. 동작은 원본에서 검증된 코드이므로
			// 규칙에 맞춰 9천 줄을 다시 쓰는 대신 검사에서 뺀다. 타입은 tsc 가 그대로 본다.
			'src/four/**',
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
		plugins: { 'react-hooks': reactHooks },
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
		},
	},
];
