import type { WorldType } from '@/src/types/data/WorldType';
import capital from './capital.json';
import landmark from './landmark.json';
import myth from './myth.json';
import space from './space.json';
import constellation from './constellation.json';
import worldcup from './worldcup.json';
import olympic from './olympic.json';

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
 * - myth     : 그림 58장이 먼저 들어와, 그림에만 있던 18인물을 데이터에 맞춰 넣어 90개가 됐다.
 * - 그 밖    : 손으로 썼다. 사실관계를 기계로 검증하지 않는다 — 고칠 때는 사람이 확인해야 한다.
 *
 * 그림은 여기 없다. ConstFlagImages·ConstMythImages·ConstPlanetImages 가 `fields` 의 열쇠로 건다.
 */
export const WORLD_ENTRIES: Record<WorldType.TopicKey, WorldType.Entry[]> = {
	capital: capital as WorldType.Entry[],
	landmark: landmark as WorldType.Entry[],
	myth: myth as WorldType.Entry[],
	space: space as WorldType.Entry[],
	constellation: constellation as WorldType.Entry[],
	worldcup: worldcup as WorldType.Entry[],
	olympic: olympic as WorldType.Entry[],
};

export const ALL_WORLD_ENTRIES: WorldType.Entry[] = Object.values(WORLD_ENTRIES).flat();

/** id 로 한 항목 찾기 — 오답 노트·뱃지처럼 id 만 들고 있는 자리에서 쓴다 */
export const selectEntry = (id: string): WorldType.Entry | undefined =>
	ALL_WORLD_ENTRIES.find((entry) => entry.id === id);
