import type { WorldType } from '@/src/types/data/WorldType';
import { selectFigureImage, selectLandmarkImage } from './ConstFigureImages';
import { selectFlag } from './ConstFlagImages';
import { selectMythImage } from './ConstMythImages';
import { selectPlanetImage } from './ConstPlanetImages';
import { selectConstellationImage } from './ConstConstellationImages';

/**
 * 항목에 붙은 그림을 찾아 준다 — 화면이 쓰는 유일한 입구.
 *
 * 주제마다 그림 열쇠가 되는 필드가 다르고(수도는 국가 코드, 신화·태양계는 영문 이름) 그림 묶음도 따로다.
 * 화면마다 이 대응표를 다시 쓰면 한 군데만 고치고 다른 데를 잊는다.
 *
 * 신화와 태양계는 모든 항목에 그림이 있으며, 없으면 undefined 를 주고 화면은 그 자리를 비워 둔다.
 *
 * 돌려주는 값이 두 가지다
 * -------------------------------------------------
 * number — `require` 로 앱에 담은 그림 (국기·신화·태양계)
 * string — 위키미디어에서 받아 올 주소 (위인). expo-image 는 둘 다 `source` 로 그대로 받는다.
 */
export type EntryImage = number | string;

/**
 * `width` 는 주소로 받아 오는 그림(위인·랜드마크)에만 쓴다 — 앱에 담은 그림은 받을 것이 없어 그냥 무시한다.
 */
const SOURCES: Partial<Record<WorldType.TopicKey, { field: string; pick: (code: string, width?: number) => EntryImage | undefined }>> = {
	capital: { field: 'code', pick: selectFlag },
	figure: { field: 'image', pick: selectFigureImage },
	landmark: { field: 'image', pick: selectLandmarkImage },
	myth: { field: 'image', pick: selectMythImage },
	space: { field: 'image', pick: selectPlanetImage },
	constellation: { field: 'image', pick: selectConstellationImage },
};

const TOPIC_IMAGES: Partial<Record<WorldType.TopicKey, number>> = {
	worldcup: require('@/src/assets/world/worldcup-hero.webp'),
	olympic: require('@/src/assets/world/olympic-hero.webp'),
};

const FALLBACK_IMAGES: Partial<Record<WorldType.TopicKey, number>> = {
	figure: require('@/src/assets/world/figure-fallback.webp'),
	landmark: require('@/src/assets/world/landmark-fallback.webp'),
};

/**
 * @param width 받아 올 그림 폭(px) — 작은 썸네일 자리에서 낮춰 잡으면 데이터를 아낀다. 앱에 담은 그림에는 영향이 없다
 */
export const selectEntryImage = (topic: WorldType.TopicKey, entry: WorldType.Entry, width?: number): EntryImage | undefined => {
	const source = SOURCES[topic];
	const code = source && entry.fields[source.field];
	return source && code ? source.pick(code, width) : undefined;
};

/** 그림 문항에서 문제로 걸 그림 — `askAs` 가 가리키는 묶음에서 찾는다 */
export const selectPromptImage = (askAs: NonNullable<WorldType.QuizMode['askAs']>, code: string): EntryImage | undefined => {
	const pick =
		askAs === 'flag'
			? selectFlag
			: askAs === 'myth'
				? selectMythImage
				: askAs === 'space'
					? selectPlanetImage
					: askAs === 'constellation'
						? selectConstellationImage
					: askAs === 'landmark'
						? selectLandmarkImage
						: selectFigureImage;
	return pick(code);
};

/** 그림을 가진 항목이 하나라도 있는 주제인지 — 목록 화면이 미리보기를 걸지 말지 고른다 */
export const hasImages = (topic: WorldType.TopicKey): boolean => SOURCES[topic] !== undefined;

/** 항목 사진이 없는 대회 주제 카드에 쓰는 대표 그림 */
export const selectTopicImage = (topic: WorldType.TopicKey): number | undefined => TOPIC_IMAGES[topic];

/** 위키미디어 사진을 못 받았을 때 보여 줄 로컬 대체 그림 */
export const selectEntryImageFallback = (topic: WorldType.TopicKey): number | undefined => FALLBACK_IMAGES[topic];

export const selectPromptImageFallback = (askAs: NonNullable<WorldType.QuizMode['askAs']>): number | undefined =>
	askAs === 'figure' ? FALLBACK_IMAGES.figure : askAs === 'landmark' ? FALLBACK_IMAGES.landmark : undefined;
