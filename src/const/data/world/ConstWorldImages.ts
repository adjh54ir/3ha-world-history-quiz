import type { WorldType } from '@/src/types/data/WorldType';
import { selectFlag } from './ConstFlagImages';
import { selectMythImage } from './ConstMythImages';
import { selectPlanetImage } from './ConstPlanetImages';

/**
 * 항목에 붙은 그림을 찾아 준다 — 화면이 쓰는 유일한 입구.
 *
 * 주제마다 그림 열쇠가 되는 필드가 다르고(수도는 국가 코드, 신화·태양계는 영문 이름) 그림 묶음도 따로다.
 * 화면마다 이 대응표를 다시 쓰면 한 군데만 고치고 다른 데를 잊는다.
 *
 * 그림이 없는 항목이 섞여 있는 것은 정상이다 (신화 90개 중 58개, 태양계 20개 중 9개).
 * 없으면 undefined 를 주고, 화면은 그 자리를 비워 둔다.
 */
const SOURCES: Partial<Record<WorldType.TopicKey, { field: string; pick: (code: string) => number | undefined }>> = {
	capital: { field: 'code', pick: selectFlag },
	myth: { field: 'image', pick: selectMythImage },
	space: { field: 'image', pick: selectPlanetImage },
};

export const selectEntryImage = (topic: WorldType.TopicKey, entry: WorldType.Entry): number | undefined => {
	const source = SOURCES[topic];
	const code = source && entry.fields[source.field];
	return source && code ? source.pick(code) : undefined;
};

/** 그림 문항에서 문제로 걸 그림 — `askAs` 가 가리키는 묶음에서 찾는다 */
export const selectPromptImage = (askAs: NonNullable<WorldType.QuizMode['askAs']>, code: string): number | undefined => {
	const pick = askAs === 'flag' ? selectFlag : askAs === 'myth' ? selectMythImage : selectPlanetImage;
	return pick(code);
};

/** 그림을 가진 항목이 하나라도 있는 주제인지 — 목록 화면이 미리보기를 걸지 말지 고른다 */
export const hasImages = (topic: WorldType.TopicKey): boolean => SOURCES[topic] !== undefined;
