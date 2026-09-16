import type { WorldType } from '@/src/types/data/WorldType';
import capital from './capital.json';
import landmark from './landmark.json';
import nature from './nature.json';
import figure from './figure.json';
import event from './event.json';
import myth from './myth.json';
import space from './space.json';
import constellation from './constellation.json';
import worldcup from './worldcup.json';
import olympic from './olympic.json';
import winter from './winter.json';

/**
 * 주제별 학습 항목 — 원본은 같은 폴더의 JSON 이다.
 * JSON 에는 타입이 없으므로 여기서 한 번만 Entry 로 못 박는다 (화면·서비스는 이 상수만 본다).
 *
 * 어디서 온 자료인가 (JSON 에는 주석을 달 수 없어 여기 적어 둔다)
 * -------------------------------------------------
 * - capital  : 수도 퀴즈 앱(3ha-capital-quiz)의 REST Countries 스냅샷(2026-07-15) 242개를 옮겨 왔다.
 *              id 는 순번이 아니라 cca3 소문자다 (capital-kor). 재정렬해도 바뀌지 않는 열쇠다.
 *              **나라만 있는 것이 아니다** — 홍콩·괌·그린란드 같은 자치령·속령이 함께 들어 있어
 *              발문에 "나라" 라고 쓰지 않는다. 대륙은 출처를 따라 다섯 갈래고(아메리카를 남북으로 나누지 않는다)
 *              landmark 의 여섯 대주 표기와 다르다. 주제가 달라 보기가 섞이지 않으므로 그대로 둔다.
 *              242개 가운데 84개는 설명·곁가지를 출처의 인구·면적에서 기계로 뽑아 썼다
 *              (곁가지가 "인구는" 으로 시작하면 그 항목이다). 나머지 158개는 손으로 썼다.
 *              인구·면적은 2026-07-15 시점 값이라 시간이 지나면 어긋난다.
 * - figure   : 인물 338명. 설명·곁가지는 손으로 썼다.
 *              **초상은 앱에 없다** — `fields.image` 는 위키미디어의 파일 이름이고, 화면에서 주소로 바꿔 받아 온다
 *              (ConstFigureImages). 그래서 이 주제만 그림을 보려면 인터넷이 있어야 한다.
 *              고른 그림은 전부 퍼블릭 도메인이다. CC BY·CC BY-SA 인 것은 저작자를 표시할 자리가 없어 아예 뺐고,
 *              그 바람에 세종대왕·장영실·허준·넬슨 만델라처럼 넣고 싶었던 인물이 빠졌다 (표준영정·근래 사진은 저작권이 남아 있다).
 *              나라는 **출신 기준의 현대 국가 이름**이다 (퀴리는 폴란드, 멘델은 체코, 콜럼버스는 이탈리아).
 *              어느 나라 깃발 아래 일했는지가 아니라 어디서 났는지를 적었다 — 곁가지에 그 사정을 적어 둔다.
 *              시대는 주로 활동한 때로 잡았다.
 *
 *              초상 고르는 법 (216명을 늘릴 때 쓴 절차 — 더 늘릴 때도 그대로 하면 된다)
 *                1. 위키데이터 P18(대표 그림)로 파일 이름을 받는다. 사람이 이름을 찍어 고르면 오타가 난다.
 *                2. 커먼즈 `extmetadata` 로 라이선스를 본다. Public domain·CC0·PDM 만 남긴다.
 *                3. 확장자가 jpg·png·gif 가 아닌 것은 버린다 (svg·tif 는 expo-image 가 못 그린다).
 *                4. **눈으로 본다.** P18 이 초상이 아닌 경우가 꽤 있다 — 샤를마뉴는 동전, 베르길리우스는 무덤 공원,
 *                   한비자는 유리장 안의 책이 걸렸다. 정선은 그가 그린 그림이지 그를 그린 그림이 아니다.
 *                   얼굴이 안 보이거나 여럿이 함께 있으면 '초상 맞히기' 가 성립하지 않으므로 뺀다.
 * - nature   : 지형 50개. 그림이 없다 — 강·산맥은 사진 한 장으로 가려낼 수 있는 대상이 아니다.
 *              나라는 **그 안에 온전히 들어 있을 때만** 적는다 (50개 가운데 18개). 나일강(11개국)·알프스산맥처럼
 *              여러 나라에 걸친 것은 비워 둔다. 비우면 '어느 나라' 문항만 안 나온다.
 *              처음 20개는 등급마다 3~7개뿐이라 한 판(10문항)이 안 나왔다. 30개를 보태 11·13·14·12 로 맞췄다.
 *              랜드마크에 이미 있는 것은 넣지 않는다 — 그랜드캐니언·울루루·앙헬 폭포·그레이트배리어리프는
 *              사진으로 먼저 아는 곳이어서 그쪽에 두고, 여기서는 콜로라도강·아마존 열대우림처럼 지도로 아는 것을 넣었다.
 * - event    : 사건 61개. 그림이 없는 주제다 (사건 사진은 저작권이 남아 있는 것이 대부분이라 아예 안 쓴다).
 *              나라는 **지금의 나라 이름**으로 적는다 — 그래야 국기가 자동으로 붙는다 (ConstCountryCodes).
 *              여러 나라가 얽힌 사건(세계 대전·흑사병·십자군)은 `country` 를 아예 비워 둔다.
 *              `century` 는 연도가 아니라 세기다. 보기에 연도 넷을 놓으면 아는 사람도 찍게 된다.
 *              사실관계는 손으로 썼다 — 기계로 검증하지 않는다.
 * - winter   : 동계 올림픽 25회(1924~2026). 필드가 하계와 같아 그림 없이 그대로 붙였다.
 *              `top`(종합 1위)은 금메달 수 1위다. 1948년은 노르웨이와 스웨덴이 같아 가릴 수 없고,
 *              2014년은 도핑 재집계로 1위가 뒤집혀 논란이 남았고, 2026년은 집계를 손으로 확인하지 못했다 —
 *              이 세 회차는 `top` 을 비워 뒀다. 비우면 '종합 1위' 문항만 안 나온다.
 *              1984년 개최국 유고슬라비아와 1984년 1위 동독은 국기 파일이 없다 (테스트의 NO_FLAG 에 적어 뒀다).
 * - myth     : 그림 58장이 먼저 들어와, 그림에만 있던 18인물을 데이터에 맞춰 넣어 90개가 됐다.
 * - 그 밖    : 손으로 썼다. 사실관계를 기계로 검증하지 않는다 — 고칠 때는 사람이 확인해야 한다.
 *
 * 그림은 여기 없다. ConstFlagImages·ConstMythImages·ConstPlanetImages·ConstFigureImages 가 `fields` 의 열쇠로 건다.
 */
export const WORLD_ENTRIES: Record<WorldType.TopicKey, WorldType.Entry[]> = {
	capital: capital as WorldType.Entry[],
	landmark: landmark as WorldType.Entry[],
	nature: nature as WorldType.Entry[],
	figure: figure as WorldType.Entry[],
	event: event as WorldType.Entry[],
	myth: myth as WorldType.Entry[],
	space: space as WorldType.Entry[],
	constellation: constellation as WorldType.Entry[],
	worldcup: worldcup as WorldType.Entry[],
	olympic: olympic as WorldType.Entry[],
	winter: winter as WorldType.Entry[],
};

export const ALL_WORLD_ENTRIES: WorldType.Entry[] = Object.values(WORLD_ENTRIES).flat();

/** id 로 한 항목 찾기 — 오답 노트·뱃지처럼 id 만 들고 있는 자리에서 쓴다 */
export const selectEntry = (id: string): WorldType.Entry | undefined =>
	ALL_WORLD_ENTRIES.find((entry) => entry.id === id);
