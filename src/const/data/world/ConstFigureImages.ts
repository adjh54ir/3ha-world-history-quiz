/**
 * 위키미디어에서 받아 오는 그림 — 위인 초상(figure)과 랜드마크 사진(landmark).
 * -------------------------------------------------
 * 두 주제의 `fields.image` 는 위키미디어에 올라 있는 파일 이름이다.
 * 다른 주제(국기·신화·태양계)와 달리 그림을 앱에 담지 않는다.
 * 초상 122장·사진 96장을 넣으면 설치 용량만 몇 메가바이트 늘고, 그림마다 사람이 고르고 다듬어야 한다.
 * 이미 위키미디어에 있는 것을 그대로 건다.
 *
 * 왜 Special:FilePath 인가
 * -------------------------------------------------
 * upload.wikimedia.org 주소에는 파일 이름을 해시한 디렉터리가 섞여 있어, 그림이 다시 올라가거나
 * 이름이 바뀌면 끊긴다. Special:FilePath 는 **파일 이름만으로** 지금 그림으로 넘겨 주는 고정 주소다.
 * commons.wikimedia.org 가 아니라 ko.wikipedia.org 에 물어본다 —
 * 공용(Commons) 파일과 한국어 위키가 제 안에 갖고 있는 파일을 모두 찾아 주기 때문이다.
 *
 * 내려받은 그림은 expo-image 가 알아서 기기에 캐시한다 (따로 캐시를 두지 않는다).
 * 쓰는 그림은 모두 퍼블릭 도메인이라 저작자 표시 없이 실을 수 있다 — 자세한 것은 ConstWorldEntries 에 적어 뒀다.
 */
const FILE_PATH = 'https://ko.wikipedia.org/wiki/Special:FilePath/';

/**
 * 기본 폭 — 문제·학습·숏폼의 그림 자리(높이 160dp 안팎)에 넉넉하다.
 *
 * **아무 숫자나 적지 마라.** 위키미디어는 미리 만들어 둔 크기로 올려 잡아 준다 (대략 120·250·330·500·960).
 * 500 을 달라면 500px(80KB) 가 오지만, 512 를 달면 그 다음 칸인 960px(245KB) 가 온다 — 화면에서는 똑같아 보이고
 * 데이터만 세 배 나간다. 바꿀 일이 있으면 위 칸 가운데서 고른다.
 */
const WIDTH = 500;

/**
 * 파일 이름으로 그림 주소 만들기 — 이름이 없으면 undefined (화면이 그 자리를 비워 둔다).
 *
 * 파일 이름에 공백·괄호·한글·악센트가 섞여 있어(`전_이순신_초상_(cropped).jpg`) 반드시 인코딩해서 붙인다.
 *
 * 폭을 받는 이유는 목록 화면 때문이다. 초상 한 장이 512px 에 50KB 안팎이라,
 * 작은 썸네일 자리까지 큰 그림을 받으면 218줄을 훑는 것만으로 몇 메가바이트가 나간다.
 */
export const selectWikimediaImage = (file: string, width: number = WIDTH): string | undefined =>
	file ? `${FILE_PATH}${encodeURIComponent(file)}?width=${width}` : undefined;

/** 위인 초상 */
export const selectFigureImage = selectWikimediaImage;

/** 랜드마크 사진 — 초상과 같은 방식이다 (파일 이름만으로 지금 그림을 받아 온다) */
export const selectLandmarkImage = selectWikimediaImage;
