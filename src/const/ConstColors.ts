/**
 * 앱 통합 컬러 시스템 (브랜드 블루 메인 + 민트 서브 + 앰버 포인트)
 * -------------------------------------------------
 * 앱 아이콘·스플래시의 파랑(#1249C9)을 주조색으로 두고, 민트는 한 톤 가벼운 보조 강조로,
 * 앰버/오렌지는 소량의 포인트 컬러로 사용해 또렷하고 모던한 조화를 구성합니다.
 * 모든 화면/컴포넌트는 이 토큰을 사용합니다.
 * 새로운 색상이 필요하면 임의 hex 대신 여기에 토큰을 추가하세요.
 */
export const Colors = {
	/** 브랜드 (Primary - Brand Blue) — 메인 액션/활성 강조 */
	primary: '#1249C9', // 메인 액션, 활성 상태, 강조 (앱 아이콘 파랑)
	primaryDark: '#0F3DA8', // pressed, 강조 텍스트
	/** 채워진 버튼·배지의 면 — 위에 흰 글씨를 얹는 자리 전용 (primaryDark 는 다크에서 밝게 뒤집힌다) */
	primarySurface: '#0F3DA8',
	primaryDeep: '#0B2E80', // 진한 강조, 밝은 배경 위 텍스트
	primaryLight: '#7FA3F0', // 보조 강조, 아이콘
	primarySoft: '#DCE6FB', // 배지/칩 배경
	primaryBg: '#EEF3FE', // 섹션/카드 틴트 배경

	/** 보조 (Secondary - Mint) — 서브 강조/링크/정보 */
	secondary: '#14B8A6', // 보조 액션, 링크 (민트)
	secondaryDark: '#0D9488',
	secondaryLight: '#5EEAD4',
	secondarySoft: '#CCFBF1',
	secondaryBg: '#F0FDFA',

	/** 포인트 (Accent - Amber) — 타이머/별점/하이라이트 등 소량 포인트 */
	accentAmber: '#F59E0B',
	/** 앰버 계열 글자·아이콘용 — 밝은 앰버는 연한 틴트 위에서 대비가 2:1 밖에 안 나와 읽히지 않는다 */
	accentAmberDark: '#B45309',
	accentAmberSoft: '#FEF3C7',
	accentOrange: '#F97316', // 연속 도전 등 에너지 표현

	/** 텍스트 (Slate) */
	text: '#334155', // 기본 본문/제목
	textStrong: '#1E293B', // 강한 제목
	textSecondary: '#64748B', // 보조 설명
	textMuted: '#94A3B8', // 비활성, placeholder
	textInverse: '#FFFFFF', // 컬러 배경 위 텍스트

	/** 배경/보더 */
	background: '#F8FAFC', // 화면 기본 배경
	surface: '#FFFFFF', // 카드, 모달
	surfaceAlt: '#F1F5F9', // 구분 영역
	border: '#E2E8F0', // 기본 보더
	borderStrong: '#CBD5E1', // 진한 보더, 비활성 버튼

	/** 시맨틱 — 정답/완료는 브랜드색과 구분되는 초록을 그대로 쓴다 */
	success: '#22C55E', // 정답/완료
	/** 초록 계열 글자·아이콘용 — 밝은 초록도 연한 틴트 위에서 2:1 밖에 안 나온다 */
	successDark: '#15803D',
	successSoft: '#DCFCE7',
	error: '#EF4444',
	errorDark: '#DC2626',
	errorSoft: '#FEE2E2',
	warning: '#F59E0B', // 별점, 하이라이트
	warningSoft: '#FEF3C7',

	/** 브랜드 블록 — 히어로처럼 넓은 면을 브랜드색으로 채울 때. 다크에서는 눈부시지 않게 깊은 톤으로 뒤집는다 */
	brandBlock: '#1249C9',
	brandBlockText: '#FFFFFF',
	brandBlockMuted: '#BFD2FA',

	/** 모달 뒤 어둠막 — 모든 바텀시트·팝업이 같은 농도를 쓴다 (다크에서는 더 짙게) */
	overlay: 'rgba(15, 23, 42, 0.45)',

	/** 토스트 — 화면 위에 잠깐 뜨는 알림. 라이트/다크 모두 배경 위로 떠 보여야 해서 본문 색과 따로 둔다 */
	toastBg: '#1E293B',
	toastText: '#FFFFFF',

	/** 다크 모드 */
	darkBackground: '#0F172A',
	darkSurface: '#1E293B',
	darkBorder: '#334155',
	darkText: '#F1F5F9',
	darkTextSecondary: '#94A3B8',
} as const;

/**
 * 주어진 면 위에서 읽히는 글씨·아이콘 색을 고른다.
 *
 * 층 배지·모드 칩처럼 **면 색이 데이터에서 오는** 자리는 흰 글씨를 고정할 수 없다.
 * 앰버(#FBBF24)나 민트(#5EEAD4) 같은 밝은 면에 흰 글씨를 얹으면 대비가 1.5:1 로 떨어져 글자가 사라진다.
 *
 * @example <Text style={{ color: onSurface(tower.color) }}>
 */
export const onSurface = (surface: string): string => {
	const hex = surface.replace('#', '');
	const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.slice(0, 6);
	if (full.length !== 6) {
		return '#FFFFFF';
	}
	const channel = (at: number): number => {
		const v = parseInt(full.slice(at, at + 2), 16) / 255;
		return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	};
	const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
	// 0.23 은 흰 글씨와 어두운 잉크(#1E293B)의 대비가 뒤바뀌는 지점 — 항상 더 잘 읽히는 쪽을 준다
	return luminance > 0.23 ? '#1E293B' : '#FFFFFF';
};

export type ColorToken = keyof typeof Colors;

/** 화면에서 실제로 쓰는 팔레트 타입 — 라이트/다크가 같은 키를 갖는다 */
export type Palette = { [K in ColorToken]: string };

/** 라이트 팔레트 (기본) */
export const LightColors: Palette = { ...Colors };

/**
 * 다크 팔레트
 * -------------------------------------------------
 * 같은 토큰 이름을 "역할" 기준으로 뒤집는다.
 * - `*Soft` / `*Bg` : 밝은 틴트 → 어두운 틴트(카드 위에서 살짝 떠 보이는 정도)
 * - `*Deep` / `*Dark` : 어두운 텍스트 강조 → 밝은 텍스트 강조
 * - `textInverse` : 컬러 버튼 위 글자. 다크에서도 버튼은 채도 있는 파랑이라 흰 글자를 유지한다.
 */
export const DarkColors: Palette = {
	primary: '#3B6FE0',
	primaryDark: '#5B8DEF',
	// 면은 밝게 뒤집지 않는다 — 위에 얹는 흰 글씨가 읽혀야 한다 (대비 6.2:1)
	primarySurface: '#2E5BC4',
	primaryDeep: '#A9C2F7',
	primaryLight: '#5B8DEF',
	primarySoft: '#1B2E5C',
	primaryBg: '#16223F',

	secondary: '#2DD4BF',
	secondaryDark: '#5EEAD4',
	secondaryLight: '#14B8A6',
	secondarySoft: '#134E4A',
	secondaryBg: '#112E2B',

	accentAmber: '#FBBF24',
	// 라이트에서 어두운 앰버였던 자리 — 다크에서는 밝게 뒤집어야 어두운 틴트 위에서 읽힌다
	accentAmberDark: '#FCD34D',
	accentAmberSoft: '#3B2F12',
	accentOrange: '#FB923C',

	text: '#E2E8F0',
	textStrong: '#F8FAFC',
	textSecondary: '#A3B1C2',
	textMuted: '#7C8CA0',
	textInverse: '#FFFFFF',

	background: '#0F172A',
	surface: '#1B263B',
	surfaceAlt: '#27354D',
	border: '#334155',
	borderStrong: '#475569',

	success: '#4ADE80',
	successDark: '#86EFAC',
	successSoft: '#14532D',
	error: '#F87171',
	errorDark: '#FCA5A5',
	errorSoft: '#4A1D1D',
	warning: '#FBBF24',
	warningSoft: '#3B2F12',

	// 다크에서 채도 높은 파랑으로 큰 면을 채우면 눈이 부시다 — 깊은 남색 + 밝은 글자로 뒤집는다
	brandBlock: '#0F2F7A',
	brandBlockText: '#DCE6FB',
	brandBlockMuted: '#7FA3F0',

	// 다크 배경은 이미 어두워 같은 농도로는 막이 보이지 않는다 — 한 단계 더 짙게
	overlay: 'rgba(2, 6, 23, 0.65)',

	// 다크에서는 흰 토스트가 눈을 때린다 — 카드보다 한 단계 밝은 회색으로 띄운다
	toastBg: '#334155',
	toastText: '#F8FAFC',

	darkBackground: '#0F172A',
	darkSurface: '#1E293B',
	darkBorder: '#334155',
	darkText: '#F1F5F9',
	darkTextSecondary: '#94A3B8',
};

export default Colors;
