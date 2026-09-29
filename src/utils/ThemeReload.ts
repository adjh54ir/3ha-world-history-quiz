/**
 * 화면 테마(라이트/다크) 저장·적용
 * -------------------------------------------------
 * - OS 설정을 따르지 않는다. 기본은 라이트이고, 사용자가 설정 화면에서 직접 고른다.
 * - 화면들은 색을 themed()(ThemedStyles) 로 감싸 두어 '읽는 시점'의 테마를 돌려받는다.
 *   테마를 바꾸면 화면들이 리마운트 없이 다시 렌더되며 새 테마 값을 읽는다(상태·스택 유지).
 * - 첫 진입은 여전히 화면 모듈보다 먼저 확정해야 한다(themed 가 최초 1회를 즉시 만들기 때문) → bootstrapTheme.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, DevSettings } from 'react-native';
import { applyTheme, getThemeMode, type ThemeMode } from '@/src/const/ConstColors';
import { installGlobalComponentDefaults } from '@/src/config/GlobalComponentDefaults';

const THEME_KEY = 'APP_THEME_MODE';

/** 퀴즈 진행 중에는 번들 리로드를 미뤄 두었다가 퀴즈가 끝나는 순간 실행한다 */
let quizInProgress = false;
let reloadPending = false;

const applyThemeNow = (mode: ThemeMode) => {
	applyTheme(mode);
	// Text/TextInput 기본 색은 모듈 로드 때 한 번 박히므로 테마가 바뀌면 다시 심는다
	installGlobalComponentDefaults();
	// 네이티브 UI 도 앱 테마를 따라가게 한다. 이 변경 이벤트로 expo-router 가 각 화면을
	// useColorScheme 으로 다시 렌더하므로 트리를 리마운트하지 않아도 새 테마 값이 읽힌다.
	try {
		Appearance.setColorScheme(mode);
	} catch {
		// 지원하지 않는 런타임이면 네이티브는 OS 설정을 따른다
	}
};

export const setQuizInProgress = (value: boolean) => {
	quizInProgress = value;
	if (value) return;
	if (reloadPending) {
		reloadPending = false;
		reload();
	}
};

/** 번들 전체 재로딩 — 데이터 복원처럼 메모리 상태를 통째로 버려야 할 때만 쓴다 */
export const reload = async () => {
	if (quizInProgress) {
		reloadPending = true;
		return;
	}
	try {
		const Updates = require('expo-updates');
		await Updates.reloadAsync();
	} catch {
		// 개발 빌드에서는 expo-updates 가 꺼져 있어 실패한다 — RN 기본 리로드로 대체
		try {
			DevSettings.reload();
		} catch {
			// 리로드 수단이 없으면 다음 실행에서 자연히 반영된다
		}
	}
};

/**
 * 앱 엔트리에서 화면 모듈이 로드되기 전에 1회 호출한다.
 * 저장된 값이 없으면 라이트로 시작한다.
 */
export const bootstrapTheme = async (): Promise<ThemeMode> => {
	let mode: ThemeMode = 'light';
	try {
		if ((await AsyncStorage.getItem(THEME_KEY)) === 'dark') mode = 'dark';
	} catch {
		// 저장소를 못 읽으면 기본값(라이트)으로 시작한다
	}
	applyTheme(mode);
	try {
		Appearance.setColorScheme(mode);
	} catch {
		// 지원하지 않는 런타임이면 네이티브는 OS 설정을 따른다
	}
	return mode;
};

/** 설정 화면에서 테마 선택 — 저장 후 그 자리에서 반영한다(리로드 없음). */
export const setThemeMode = async (mode: ThemeMode): Promise<void> => {
	if (mode === getThemeMode()) return;
	try {
		await AsyncStorage.setItem(THEME_KEY, mode);
	} catch {
		// 저장에 실패하면 다음 실행에서 되돌아가므로 화면도 바꾸지 않는다
		return;
	}
	applyThemeNow(mode);
};

export default { bootstrapTheme, setThemeMode, reload };
