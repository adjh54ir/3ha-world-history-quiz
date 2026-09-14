/**
 * 한자 전용 서체 로더
 * -------------------------------------------------
 * 번들에 담은 명조 서체(Source Han Serif 한국어 자형 서브셋)를 앱 시작 시 한 번 올린다.
 * - 스타일에서는 ConstDesign 의 HanjaFontFamily 로 참조한다.
 * - 로드에 실패해도 앱은 죽지 않는다. 이름을 못 찾은 Text 는 OS 기본 서체로 그려진다.
 */
import * as Font from 'expo-font';

/** 번들 서체의 패밀리 이름 — 스타일에서 이 이름으로 참조한다 */
export const HANJA_FONT_NAME = 'HanpickHanjaSerif';

/** 앱 시작 시 한 번 호출한다 (스플래시가 떠 있는 동안) */
export const loadHanjaFont = async (): Promise<void> => {
	try {
		await Font.loadAsync({ [HANJA_FONT_NAME]: require('@/src/assets/fonts/HanpickHanjaSerif.otf') });
	} catch (e) {
		// 원인이 묻히면 "폰트만 안 바뀐다"를 추적할 수 없다 — 개발 빌드에서만 노출
		if (__DEV__) {
			console.warn('🔤 한자 서체 로드 실패 — 기본 서체로 표시합니다', e);
		}
	}
};
