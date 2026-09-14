import type { LifeType } from '@/src/types/data/LifeType';

/**
 * 화면 꾸미기 — 캐릭터에 입히지 않는 꾸미기 모음
 * -------------------------------------------------
 * 캐릭터에 직접 입히던 방식은 판다 그림 위에 PNG 를 얹어, 성장 단계 여섯 장마다 머리·눈·옷깃 좌표를
 * 따로 재야 했고 단계가 오르면 자리가 어긋났다. 여기 있는 것들은 전부 화면의 고정 슬롯에 놓인다.
 *
 * 새 그림 파일을 만들지 않는다 — 색(팔레트 토큰)·글자·기존 상점 아이템 에셋만 조합한다.
 * 그래서 항목을 늘리는 일은 이 표에 한 줄 더 쓰는 일이 전부다.
 *
 * 그림 require 는 여기 두지 않는다. 이 파일은 데이터만 담아 node 테스트에서도 그대로 읽힌다.
 */

/** 갈래 여섯 — 상점 목록의 묶음 순서이자 "어디에 보이는지" 설명이다 */
export const DECOR_KINDS: { key: LifeType.DecorKind; label: string; hint: string; icon: string }[] = [
	{ key: 'study', label: '글방', hint: '홈 화면 캐릭터 뒤에 글방이 깔려요', icon: 'bookshelf' },
	{ key: 'title', label: '칭호', hint: '캐릭터 이름 옆에 칭호가 붙어요', icon: 'card-text-outline' },
	{ key: 'perch', label: '청룡 좌대', hint: '청룡 펫이 올라서는 좌대예요', icon: 'cloud-outline' },
	{ key: 'frame', label: '액자', hint: '나의 활동의 펫 카드에 액자를 둘러요', icon: 'image-frame' },
	{ key: 'skin', label: '카드 테', hint: '학습 카드 테두리가 바뀌어요', icon: 'card-bulleted-outline' },
	{ key: 'seal', label: '낙관', hint: '출석 도장에 찍히는 글자가 바뀌어요', icon: 'stamper' },
];

/**
 * 파는 꾸미기 전부.
 * 값은 120~380 폭으로 두어 코인 쓸 곳이 한쪽으로 쏠리지 않게 한다.
 */
export const DECORS: LifeType.Decor[] = [
	// ── 글방 : 홈 히어로 캐릭터 뒤 ──────────────────────────────
	{
		id: 'roomBamboo',
		kind: 'study',
		label: '대나무 글방',
		hint: '대나무 두루마리와 도시락을 둔 초여름 글방',
		price: 180,
		icon: 'sprout',
		color: 'secondaryDark',
		tint: 'secondarySoft',
		props: ['studyScroll', 'bambooLunch'],
	},
	{
		id: 'roomInk',
		kind: 'study',
		label: '먹향 글방',
		hint: '벼루 두 개를 나란히 둔 먹 냄새 나는 글방',
		price: 240,
		icon: 'fountain-pen-tip',
		color: 'primaryDark',
		tint: 'primarySoft',
		props: ['masterInkstone', 'engravingInkstone'],
	},
	{
		id: 'roomLantern',
		kind: 'study',
		label: '등불 글방',
		hint: '등롱과 향로로 밤까지 밝혀 둔 글방',
		price: 300,
		icon: 'lamp',
		color: 'accentOrange',
		tint: 'warningSoft',
		props: ['attendanceLantern', 'attendanceIncense'],
	},
	{
		id: 'roomTreasure',
		kind: 'study',
		label: '보물 글방',
		hint: '오색 보물상자와 황금 열쇠를 쌓아 둔 글방',
		price: 380,
		icon: 'treasure-chest',
		color: 'accentAmber',
		tint: 'accentAmberSoft',
		props: ['fiveColorChest', 'goldenKey'],
	},

	// ── 칭호 : 캐릭터 이름 옆 ───────────────────────────────────
	{ id: 'titleDiligent', kind: 'title', label: '출석 장인', hint: '이름 옆에 「출석 장인」이 붙어요', price: 120, icon: 'calendar-check', color: 'primaryDark', tint: 'primarySoft', text: '출석 장인' },
	{ id: 'titleScholar', kind: 'title', label: '글방 선비', hint: '이름 옆에 「글방 선비」가 붙어요', price: 160, icon: 'book-open-page-variant-outline', color: 'secondaryDark', tint: 'secondarySoft', text: '글방 선비' },
	{ id: 'titleCollector', kind: 'title', label: '보물 수집가', hint: '이름 옆에 「보물 수집가」가 붙어요', price: 220, icon: 'treasure-chest', color: 'accentAmber', tint: 'accentAmberSoft', text: '보물 수집가' },
	{ id: 'titleMaster', kind: 'title', label: '한자 대가', hint: '이름 옆에 「한자 대가」가 붙어요', price: 320, icon: 'crown-outline', color: 'accentOrange', tint: 'warningSoft', text: '한자 대가' },

	// ── 청룡 좌대 : 펫 발밑 ────────────────────────────────────
	{ id: 'perchCloud', kind: 'perch', label: '구름 좌대', hint: '청룡이 구름을 밟고 떠 있어요', price: 140, icon: 'cloud', color: 'primaryLight', tint: 'primarySoft' },
	{ id: 'perchStone', kind: 'perch', label: '먹돌 좌대', hint: '청룡이 검은 먹돌을 밟아요', price: 160, icon: 'circle-slice-8', color: 'textSecondary', tint: 'surfaceAlt' },
	{ id: 'perchLotus', kind: 'perch', label: '연꽃 좌대', hint: '청룡이 연꽃 위에 앉아요', price: 200, icon: 'flower-outline', color: 'error', tint: 'errorSoft' },
	{ id: 'perchGold', kind: 'perch', label: '황금 좌대', hint: '청룡이 금빛 대좌에 올라요', price: 340, icon: 'crown', color: 'accentAmber', tint: 'accentAmberSoft' },

	// ── 액자 : 나의 활동 펫 카드 ───────────────────────────────
	{ id: 'frameWood', kind: 'frame', label: '목재 액자', hint: '펫 카드에 나무 테를 둘러요', price: 150, icon: 'image-frame', color: 'accentOrange', tint: 'warningSoft' },
	{ id: 'frameJade', kind: 'frame', label: '옥 액자', hint: '펫 카드에 옥빛 테를 둘러요', price: 210, icon: 'image-frame', color: 'secondaryDark', tint: 'secondarySoft' },
	{ id: 'frameCloud', kind: 'frame', label: '구름 액자', hint: '펫 카드에 구름 문양 테를 둘러요', price: 260, icon: 'image-frame', color: 'primaryDark', tint: 'primarySoft' },
	{ id: 'frameGold', kind: 'frame', label: '황금 액자', hint: '펫 카드에 금박 테를 둘러요', price: 360, icon: 'image-frame', color: 'accentAmber', tint: 'accentAmberSoft' },

	// ── 카드 테 : 학습 카드 ────────────────────────────────────
	{ id: 'skinHanji', kind: 'skin', label: '한지 테', hint: '학습 카드 테두리가 한지색이 돼요', price: 130, icon: 'card-bulleted-outline', color: 'accentOrange', tint: 'warningSoft' },
	{ id: 'skinJade', kind: 'skin', label: '옥 테', hint: '학습 카드 테두리가 옥색이 돼요', price: 190, icon: 'card-bulleted-outline', color: 'secondaryDark', tint: 'secondarySoft' },
	{ id: 'skinPlum', kind: 'skin', label: '매화 테', hint: '학습 카드 테두리가 매화색이 돼요', price: 250, icon: 'card-bulleted-outline', color: 'error', tint: 'errorSoft' },
	{ id: 'skinGold', kind: 'skin', label: '금박 테', hint: '학습 카드 테두리가 금박이 돼요', price: 350, icon: 'card-bulleted-outline', color: 'accentAmber', tint: 'accentAmberSoft' },

	// ── 낙관 : 출석 도장 ──────────────────────────────────────
	{ id: 'sealDiligence', kind: 'seal', label: '근면 낙관', hint: '출석 도장에 勤(부지런할 근)이 찍혀요', price: 120, icon: 'stamper', color: 'accentOrange', tint: 'warningSoft', text: '勤' },
	{ id: 'sealScholar', kind: 'seal', label: '학문 낙관', hint: '출석 도장에 學(배울 학)이 찍혀요', price: 180, icon: 'stamper', color: 'primaryDark', tint: 'primarySoft', text: '學' },
	{ id: 'sealTreasure', kind: 'seal', label: '보물 낙관', hint: '출석 도장에 寶(보배 보)가 찍혀요', price: 260, icon: 'stamper', color: 'accentAmber', tint: 'accentAmberSoft', text: '寶' },
	{ id: 'sealDragon', kind: 'seal', label: '청룡 낙관', hint: '출석 도장에 龍(용 룡)이 찍혀요', price: 340, icon: 'stamper', color: 'secondaryDark', tint: 'secondarySoft', text: '龍' },
];

/**
 * 여섯 갈래를 모두 놓아 두면 붙는 세트 보너스 — 코인 획득 %.
 * 꾸미기는 지금까지 "보기 좋다" 뿐이라, 한 갈래만 사고 나면 나머지를 모을 이유가 없었다.
 * 여섯 칸을 다 채워 두는 동안에만 듣는다(하나라도 내려놓으면 바로 빠진다).
 */
export const DECOR_SET_BONUS_PERCENT = 5;

/** 여섯 갈래가 모두 적용 중인가 — 보너스를 줄지 정한다 */
export const isDecorSetComplete = (equipped?: Partial<Record<LifeType.DecorKind, string>> | null): boolean =>
	!!equipped && DECOR_KINDS.every((group) => !!selectDecor(equipped[group.key]));

/** id 로 하나 꺼낸다 — 없는 id(지워진 항목이 저장본에 남은 경우)면 null */
export const selectDecor = (id?: string | null): LifeType.Decor | null => (id ? DECORS.find((item) => item.id === id) ?? null : null);

/** 갈래별 목록 — 상점이 묶음으로 그릴 때 쓴다 */
export const decorsOf = (kind: LifeType.DecorKind): LifeType.Decor[] => DECORS.filter((item) => item.kind === kind);
