/**
 * 앱 통합 컬러 시스템 (단일 포인트 컬러 + 무채색 그레이스케일)
 * -------------------------------------------------
 * - 포인트 컬러 1개(브랜드 블루 #3182F7)만 강조에 사용
 * - 나머지는 전부 무채색 그레이 스케일 (밝은 배경 + 흰 카드 + 진한/중간/연한 텍스트)
 * - 정답/오답 등 '기능적 의미색'(초록/빨강)만 예외적으로 유지
 * - 금지: 보라색, 다색 팔레트, 왼쪽 강조선
 * 새로운 색상이 필요하면 임의 hex 대신 여기에 토큰을 추가하세요.
 */

/**
 * 다크 모드에서 덮어쓸 토큰 (표면/텍스트/보더 계열만).
 * 브랜드·기능색(정답/오답/메달)은 의미가 바뀌면 안 되므로 어두운 배경에서 읽히도록 밝기만 조정한다.
 */
export const DARK_OVERRIDES = {
	primary: '#4E93F9',
	primaryDark: '#3B82F6',
	primaryDeep: '#7FB2FB', // 어두운 표면 위 텍스트·아이콘으로 쓰이므로 밝게 (그라디언트는 BRAND_GRADIENT_DARK 사용)
	primaryLight: '#1E3A5F',
	primarySoft: '#1E3356',
	primaryBg: '#16233A',
	primaryTint1: '#4E93F9',
	primaryTint2: '#4479D6',
	primaryTint3: '#3F6CBC',
	primaryTint4: '#35589A', // 단계 램프는 다크 표면 위 점·막대로 쓰인다 — 최하 단계도 배경과 구분되게 밝힌다

	secondary: '#94A3B8',
	secondaryDark: '#CBD5E1',
	secondaryLight: '#475569',
	secondarySoft: '#1E293B',
	secondaryBg: '#161C28',

	bookmarkSoft: '#3B3418',

	// 메달색은 어두운 goldBg 위 텍스트로 쓰인다 — 대비 확보를 위해 밝은 단계로 올린다
	goldDark: '#F59E0B',
	goldDeep: '#FBBF24',

	heat: '#FB923C',
	heatDark: '#F97316', // heatPale(다크) 위 텍스트 대비 3.5 → 4.9
	// 어두운 표면 위 텍스트로 쓰이므로 밝게 (그라디언트는 HEAT_GRADIENT_DARK 사용)
	heatDeep: '#FDBA74',
	heatPale: '#3A2412',
	heatBg: '#241608',
	goldBg: '#2A2110',

	text: '#D5DBE5',
	textStrong: '#F3F5F9',
	textSecondary: '#9AA5B5',
	textMuted: '#7C8798',

	background: '#0F141C',
	surface: '#171E29',
	surfaceAlt: '#1F2735',
	border: '#28313F',
	borderStrong: '#3A465A',

	// 기능색은 의미를 유지하되 어두운 표면에서 대비 4.5:1 이상이 되도록 밝게 조정
	success: '#22C55E',
	successDeep: '#15803D',
	successBright: '#4ADE80',
	successSoft: '#12301F',
	error: '#F87171',
	errorDark: '#EF4444',
	errorSoft: '#3A1B1E',
	errorBorder: '#5C2A2E',
	warning: '#4E93F9', // primary 와 같은 파랑 — 빠져 있으면 다크에서 라이트 파랑(#3182F7)이 남는다
	warningSoft: '#1E3356',

	overlayStrong: 'rgba(58,70,90,0.96)', // 기본값(#0F172A)은 다크 표면과 같아 토스트가 묻힌다 — borderStrong 톤으로 띄운다
	backdrop: 'rgba(0,0,0,0.62)',
} as const;

/** 앱이 지원하는 화면 테마 — OS 설정을 따르지 않고 사용자가 설정 화면에서 직접 고른다. */
export type ThemeMode = 'light' | 'dark';

const LIGHT_COLORS_BASE = {
	/** 브랜드 포인트 (단 하나의 강조색 — 블루) */
	primary: '#3182F7', // 메인 액션, 활성/강조
	primaryDark: '#1B64DA', // pressed
	primaryDeep: '#1450B0', // 진한 강조
	primaryLight: '#9BC2FB', // 옅은 강조
	primarySoft: '#E3EDFE', // 배지/칩 배경
	primaryBg: '#F1F6FF', // 섹션/카드 틴트 배경

	/** 포인트 컬러 명도 램프 — 등급/히트맵처럼 '단계'를 표현할 때 (진함 → 옅음) */
	primaryTint1: '#5B9BF9',
	primaryTint2: '#8FB8FA',
	primaryTint3: '#B7D3FC',
	primaryTint4: '#DCE9FE',

	/** 잉크(딥 네이비) — 프리미엄/다크 서피스, 그림자 기준색 */
	ink: '#0F172A',
	inkSoft: '#1E293B',

	/**
	 * 보조 — 별도 강조색을 두지 않고 그레이 스케일로 흡수 (단일 포인트 원칙)
	 * 기존 secondary* 참조는 모두 무채색으로 매핑됩니다.
	 */
	secondary: '#64748B',
	secondaryDark: '#334155',
	secondaryLight: '#CBD5E1',
	secondarySoft: '#F1F5F9',
	secondaryBg: '#F8FAFC',

	/**
	 * 즐겨찾기(북마크) 전용 — 별 아이콘은 앱 전역에서 노란색으로 통일
	 * (단일 포인트 원칙의 예외: '저장됨'을 직관적으로 알리는 기능색)
	 */
	bookmark: '#FACC15',
	bookmarkSoft: '#FEF3C7',

	/**
	 * 열기(heat) — 타임 챌린지·콤보 등 '속도/열기' 연출 전용 기능색
	 * (단일 포인트 원칙의 예외: 시간 압박·연속 정답을 직관적으로 알리는 온도 표현)
	 */
	heat: '#F97316',
	heatDark: '#EA580C',
	heatDeep: '#C2410C',
	heatLight: '#FB923C',
	heatSoft: '#FDBA74',
	heatPale: '#FFEDD5',
	heatBg: '#FFF7ED',

	/** 메달 — 랭킹 1·2·3위 및 보상 표기 전용 */
	gold: '#FBBF24',
	goldDark: '#D97706',
	goldDeep: '#B45309',
	goldSoft: '#FDE68A',
	goldBg: '#FEF0E7',
	silver: '#94A3B8',
	amber: '#F59E0B',

	/** 텍스트 (무채색 그레이 스케일) */
	text: '#334155', // 기본 본문 (중간)
	textStrong: '#111827', // 제목 (진한)
	textSecondary: '#6B7280', // 보조 설명 (중간)
	textMuted: '#9CA3AF', // 비활성, placeholder (연한)
	textInverse: '#FFFFFF', // 컬러 배경 위 텍스트

	/** 배경/보더 (무채색) */
	background: '#F5F6F8', // 화면 기본 배경 (밝은 그레이)
	surface: '#FFFFFF', // 카드, 모달 (흰색)
	surfaceAlt: '#F2F4F6', // 구분 영역 (연한 그레이)
	border: '#EAECEF', // 기본 보더 (헤어라인)
	borderStrong: '#D1D5DB', // 진한 보더, 비활성

	/** 시맨틱 (기능적 의미색 — 정답/오답 피드백에만 사용) */
	success: '#16A34A', // 정답/완료
	successDeep: '#15803D', // 흰 글자를 얹는 초록 채움 (라이트·다크 동일 — 두 테마 모두 4.9:1)
	successSoft: '#DCFCE7',
	successBright: '#34C759', // 컬러 배경 위 성공 강조 (그라디언트 히어로 점수 등)
	error: '#EF4444', // 오답
	errorDark: '#DC2626',
	errorSoft: '#FEE2E2',
	errorBorder: '#FECACA', // errorSoft 배경 위 보더
	warning: '#3182F7', // 하이라이트 → 포인트 컬러로 흡수
	warningSoft: '#E3EDFE',

	/**
	 * 컬러/그라디언트 배경 위 오버레이 — 히어로 카드 내부의 텍스트·구분선·면
	 * (화면마다 제각각이던 rgba 리터럴을 여기로 수렴)
	 */
	onBrandText: 'rgba(255,255,255,0.90)', // 보조 텍스트
	onBrandTextSoft: 'rgba(255,255,255,0.78)', // 캡션/라벨
	onBrandSurface: 'rgba(255,255,255,0.13)', // 내부 면(칩·통계 박스)
	onBrandDivider: 'rgba(255,255,255,0.21)', // 구분선
	onBrandWatermark: 'rgba(255,255,255,0.08)', // 워터마크 아이콘
	onBrandSurfaceStrong: 'rgba(255,255,255,0.25)', // 강조 면(선택된 칩·아이콘 원형)
	onBrandBorder: 'rgba(255,255,255,0.40)', // 강조 보더
	onBrandBorderSoft: 'rgba(255,255,255,0.28)', // 옅은 보더/트랙

	/** 모달 딤 배경 — 모든 팝업이 같은 농도를 쓰도록 통일 */
	backdrop: 'rgba(15,23,42,0.45)',

	/** 어두운 연출 배경 (숏폼 화면·카운트다운 무대) */
	night: '#0B1220',
	nightDeep: '#020617',
	/** 카운트다운 강조 — 숫자/타이머 */
	infoBright: '#60A5FA',
	errorPale: '#FCA5A5',
	/** 진한 오버레이 (플로팅 토스트 등) */
	overlayStrong: 'rgba(15,23,42,0.92)',
	/** 텍스트 그림자 (대형 숫자 가독성 보정) */
	shadowStrong: 'rgba(0,0,0,0.35)',

	/** 다크 (숏폼 등 어두운 배경) */
	darkBackground: '#111827',
	darkSurface: '#1F2937',
	darkBorder: '#374151',
	darkText: '#F3F4F6',
	darkTextSecondary: '#9CA3AF',
} as const;

/**
 * 앱 전역 컬러 — 다크 모드면 표면/텍스트 토큰만 덮어쓴다.
 * 화면들은 전부 이 객체 하나를 참조하므로 여기만 바꾸면 전 화면에 반영된다.
 */
/** 라이트 팔레트 원본 (테스트·참조용) */
export const LIGHT_COLORS = LIGHT_COLORS_BASE;

/**
 * 앱 전역 컬러 객체. 화면들의 StyleSheet 는 이 객체의 '값'을 복사해 가므로
 * 반드시 화면 모듈이 로드되기 전(앱 엔트리의 bootstrapTheme)에 applyTheme 로 확정해야 한다.
 * 기본값은 라이트 — OS 가 다크여도 사용자가 고르기 전까지는 화이트 모드로 나온다.
 */
export const Colors = { ...LIGHT_COLORS_BASE } as typeof LIGHT_COLORS_BASE;

let currentMode: ThemeMode = 'light';

/** 현재 적용된 테마가 다크인지 */
export const isDark = (): boolean => currentMode === 'dark';
export const getThemeMode = (): ThemeMode => currentMode;

/**
 * 테마 적용 — Colors 와 파생 그라디언트를 제자리에서 갱신한다.
 * 이미 만들어진 StyleSheet 는 값을 복사해 갔으므로 갱신되지 않는다.
 * 그래서 화면 스타일은 themed() 로 감싸 렌더 시점에 현재 테마 값을 읽게 한다.
 */
export const applyTheme = (mode: ThemeMode): void => {
	currentMode = mode;
	Object.assign(Colors, LIGHT_COLORS_BASE);
	if (mode === 'dark') Object.assign(Colors, DARK_OVERRIDES);
	syncGradients();
};

export type ColorToken = keyof typeof Colors;

/** hex 색에 8비트 알파(예: '14', '59')를 붙인다 — 화면마다 중복 정의하던 헬퍼를 여기로 수렴 */
export const withAlpha = (hex: string, alpha: string) => `${hex}${alpha}`;

/** 브랜드 그라디언트 (히어로 카드·랭킹 헤더 등 공통) */
export const BRAND_GRADIENT: [string, string, string] = [Colors.primary, Colors.primaryDark, Colors.primaryDeep];
/** 다크 전용 브랜드 그라디언트 — primaryDeep 은 다크에서 '읽히는 밝은 파랑'이라 그라디언트에 못 쓴다 */
const BRAND_GRADIENT_DARK: [string, string, string] = ['#4E93F9', '#2F6FE0', '#1D4ED8'];
/** 다크 전용 열기 그라디언트 — heatDeep 도 같은 이유로 그라디언트와 분리한다 */
const HEAT_GRADIENT_DARK: [string, string, string] = ['#FB923C', '#EA580C', '#B93F0A'];

/** 카운트다운 무대 그라디언트 — 일반 퀴즈(밤) / 타임챌린지(불씨) */
export const NIGHT_GRADIENT: [string, string, string] = [Colors.inkSoft, Colors.night, Colors.nightDeep];
export const EMBER_GRADIENT: [string, string, string] = ['#3F2A12', '#1B1206', '#050303'];

/** 유형 테스트 결과 유형별 아이덴티티 그라디언트 (A~C) */
export const TYPE_RESULT_GRADIENTS: Record<'A' | 'B' | 'C', [string, string]> = {
	A: [Colors.infoBright, '#2563EB'],
	B: ['#34D399', '#059669'],
	C: ['#5EEAD4', '#0D9488'],
};

/** 열기 그라디언트 (타임 챌린지 히어로·결과 헤더 등 공통) */
export const HEAT_GRADIENT: [string, string, string] = [Colors.heat, Colors.heatDark, Colors.heatDeep];

/** 파생 그라디언트는 Colors 값을 복사해 두므로 테마가 바뀌면 제자리에서 다시 채운다. */
function syncGradients(): void {
	const brand = isDark() ? BRAND_GRADIENT_DARK : [Colors.primary, Colors.primaryDark, Colors.primaryDeep];
	brand.forEach((c, i) => (BRAND_GRADIENT[i] = c));
	[Colors.inkSoft, Colors.night, Colors.nightDeep].forEach((c, i) => (NIGHT_GRADIENT[i] = c));
	const heat = isDark() ? HEAT_GRADIENT_DARK : [Colors.heat, Colors.heatDark, Colors.heatDeep];
	heat.forEach((c, i) => (HEAT_GRADIENT[i] = c));
	TYPE_RESULT_GRADIENTS.A = [Colors.infoBright, '#2563EB'];
}

/** 두 hex 색을 t(0~1)로 섞는다 — 구간(계단)이 아닌 연속 농도 표현용 */
export const mixHex = (from: string, to: string, t: number): string => {
	const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
	const [r1, g1, b1] = parse(from);
	const [r2, g2, b2] = parse(to);
	const ch = (a: number, b: number) => Math.round(a + (b - a) * t).toString(16).padStart(2, '0');
	return `#${ch(r1, r2)}${ch(g1, g2)}${ch(b1, b2)}`;
};

/**
 * 정답률 색상 — 0%에서 100%로 갈수록 노란색이 '점차' 진해진다(구간 없이 연속 보간).
 * onDark: 브랜드 그라디언트 위에서는 너무 어두워지면 안 읽히므로 밝은 구간(연노랑~앰버) 안에서만 진해진다.
 */
export const accuracyColor = (rate: number, onDark = false): string => {
	const t = Math.min(1, Math.max(0, rate / 100));
	// 다크 테마는 surface 가 어두워 라이트 경로(gold→goldDeep)가 같은 값으로 덮여 단계가 사라진다 — onDark 램프를 재사용한다
	return onDark || isDark() ? mixHex(Colors.goldSoft, Colors.amber, t) : mixHex(Colors.gold, Colors.goldDeep, t);
};

/**
 * 배경색 위에서 읽히는 전경색(흰/검) 선택.
 * 뱃지처럼 데이터가 색을 정하는 요소는 흰 아이콘을 고정하면 밝은 색 위에서 묻는다 — 명도로 갈라준다.
 * 기준값 0.6 은 WCAG 상대휘도 근사(sRGB 가중 평균)에서 흰/검 대비가 뒤집히는 지점.
 */
export const readableOn = (hex: string): string => {
	const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
	// 파싱 불가(그라디언트·rgba 등)면 기존 동작인 흰색을 유지한다
	if (!m) return Colors.textInverse;
	const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
	const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
	return luminance > 0.6 ? LIGHT_COLORS.textStrong : Colors.textInverse;
};

export default Colors;
