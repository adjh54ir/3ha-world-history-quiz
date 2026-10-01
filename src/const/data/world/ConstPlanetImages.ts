/**
 * 태양계 천체 그림 — space.json 의 `fields.image` 가 이 열쇠다 (영문 이름 소문자).
 *
 * 데이터 파일(JSON)은 그림을 모른다 — `node --test` 로 도는 데이터 검증이 그림 없이 JSON 만 읽어야 한다.
 * 안드로이드 에셋 이름 규칙 때문에 파일 이름은 전부 소문자다.
 *
 * 처음 20개는 생성 그림이다. 생성 원본은 보관 경로에 두고 앱에는 투명 배경 512px WebP 만 넣었다.
 * 2026-10 에 더한 8개는 NASA 사진(위키미디어 공용, 전부 퍼블릭 도메인)을 검은 배경만 오려 같은 규격으로 맞췄다.
 *  ganymede·callisto(Galileo) · triton(Voyager 2) · charon(New Horizons) · phobos(MRO HiRISE)
 *  halley(1986 W. Liller) · vesta(Dawn) · haumea(STScI 상상도 — 실제 사진이 없다)
 * 마케마케는 퍼블릭 도메인 그림이 없어(허블 사진은 CC BY 4.0) 그림 없이 둔다.
 */
export const PLANET_IMAGES: Record<string, number> = {
	'asteroid-belt': require('@/src/assets/planets/asteroid-belt.webp'),
	callisto: require('@/src/assets/planets/callisto.webp'),
	ceres: require('@/src/assets/planets/ceres.webp'),
	charon: require('@/src/assets/planets/charon.webp'),
	earth: require('@/src/assets/planets/earth.webp'),
	enceladus: require('@/src/assets/planets/enceladus.webp'),
	eris: require('@/src/assets/planets/eris.webp'),
	europa: require('@/src/assets/planets/europa.webp'),
	ganymede: require('@/src/assets/planets/ganymede.webp'),
	halley: require('@/src/assets/planets/halley.webp'),
	haumea: require('@/src/assets/planets/haumea.webp'),
	io: require('@/src/assets/planets/io.webp'),
	jupiter: require('@/src/assets/planets/jupiter.webp'),
	'kuiper-belt': require('@/src/assets/planets/kuiper-belt.webp'),
	mars: require('@/src/assets/planets/mars.webp'),
	mercury: require('@/src/assets/planets/mercury.webp'),
	moon: require('@/src/assets/planets/moon.webp'),
	neptune: require('@/src/assets/planets/neptune.webp'),
	'oort-cloud': require('@/src/assets/planets/oort-cloud.webp'),
	phobos: require('@/src/assets/planets/phobos.webp'),
	pluto: require('@/src/assets/planets/pluto.webp'),
	saturn: require('@/src/assets/planets/saturn.webp'),
	sun: require('@/src/assets/planets/sun.webp'),
	titan: require('@/src/assets/planets/titan.webp'),
	triton: require('@/src/assets/planets/triton.webp'),
	uranus: require('@/src/assets/planets/uranus.webp'),
	venus: require('@/src/assets/planets/venus.webp'),
	vesta: require('@/src/assets/planets/vesta.webp'),
};

/** 이름 코드로 그림 찾기 — 없으면 undefined (화면이 자리를 비워 둔다) */
export const selectPlanetImage = (code: string): number | undefined => PLANET_IMAGES[code.toLowerCase()];
