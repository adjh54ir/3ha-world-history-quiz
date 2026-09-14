/**
 * 태양계 천체 그림 — space.json 의 `fields.image` 가 이 열쇠다 (영문 이름 소문자).
 *
 * 데이터 파일(JSON)은 그림을 모른다 — `node --test` 로 도는 데이터 검증이 그림 없이 JSON 만 읽어야 한다.
 * 안드로이드 에셋 이름 규칙 때문에 파일 이름은 전부 소문자다.
 *
 * 퀴즈에는 태양계 8행성과 달까지 9개 그림을 쓴다.
 * 생성 원본은 보관 경로에 두고 앱에는 투명 배경 512px WebP 만 넣었다.
 */
export const PLANET_IMAGES: Record<string, number> = {
	earth: require('@/src/assets/planets/earth.webp'),
	jupiter: require('@/src/assets/planets/jupiter.webp'),
	mars: require('@/src/assets/planets/mars.webp'),
	mercury: require('@/src/assets/planets/mercury.webp'),
	moon: require('@/src/assets/planets/moon.webp'),
	neptune: require('@/src/assets/planets/neptune.webp'),
	saturn: require('@/src/assets/planets/saturn.webp'),
	uranus: require('@/src/assets/planets/uranus.webp'),
	venus: require('@/src/assets/planets/venus.webp'),
};

/** 이름 코드로 그림 찾기 — 없으면 undefined (화면이 자리를 비워 둔다) */
export const selectPlanetImage = (code: string): number | undefined => PLANET_IMAGES[code.toLowerCase()];
