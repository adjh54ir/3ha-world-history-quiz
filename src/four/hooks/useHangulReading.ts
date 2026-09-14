// hooks/useHangulReading.ts
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';

/** 기본값: 독음 표시 ON */
const DEFAULT_SHOW_HANGUL = true;

/** 모듈 레벨 전역 상태 (화면 간 즉시 동기화용) */
let currentShowHangul: boolean = DEFAULT_SHOW_HANGUL;
/** AsyncStorage 최초 로드 완료 여부 */
let isHydrated = false;
/** 구독자 목록 */
const listeners = new Set<(value: boolean) => void>();

/** 구독자 전체에 변경 알림 */
const notifyListeners = () => {
	listeners.forEach((listener) => listener(currentShowHangul));
};

/**
 * AsyncStorage 에서 독음 표시 설정을 1회 로드합니다.
 * (이후에는 모듈 레벨 상태만 사용하며 재조회하지 않습니다.)
 */
const hydrateShowHangul = async (): Promise<void> => {
	if (isHydrated) {
		return;
	}
	isHydrated = true;

	try {
		const stored = await AsyncStorage.getItem(MainStorageKeyType.SHOW_HANGUL_READING);
		if (stored !== null) {
			const parsed = stored === 'true';
			if (parsed !== currentShowHangul) {
				currentShowHangul = parsed;
				notifyListeners();
			}
		}
	} catch (e) {
		console.warn('독음 표시 설정 로드 실패:', e);
	}
};

/** 훅 외부(비 컴포넌트)에서 현재 값이 필요할 때 사용 */
export const getShowHangulReading = (): boolean => currentShowHangul;

/**
 * '독음(한자)' 형태 표기를 만듭니다.
 * - showHangul=false 면 한자만 반환
 * - 한자가 비어있으면(데이터 누락) 빈 화면 방지를 위해 항상 독음 반환
 */
export const formatHangulFirst = (hangul: string, hanja: string, showHangul: boolean, space: string = ''): string => {
	const trimmedHanja = (hanja ?? '').trim();
	if (!trimmedHanja) {
		return hangul ?? '';
	}
	if (!showHangul) {
		return trimmedHanja;
	}
	return `${hangul ?? ''}${space}(${trimmedHanja})`;
};

/**
 * '한자(독음)' 형태 표기를 만듭니다.
 * - showHangul=false 면 한자만 반환
 * - 한자가 비어있으면 항상 독음 반환
 */
export const formatHanjaFirst = (hanja: string, hangul: string, showHangul: boolean, space: string = ''): string => {
	const trimmedHanja = (hanja ?? '').trim();
	if (!trimmedHanja) {
		return hangul ?? '';
	}
	if (!showHangul) {
		return trimmedHanja;
	}
	return `${trimmedHanja}${space}(${hangul ?? ''})`;
};

/**
 * 한자 독음(한글) 표시 여부 전역 설정 훅
 * - 기본값 true, 앱 첫 로드 전에도 true 로 렌더됩니다.
 * - 한 화면에서 토글하면 구독 중인 모든 화면에 즉시 반영됩니다.
 */
export const useHangulReading = (): { showHangul: boolean; setShowHangul: (v: boolean) => void } => {
	const [showHangul, setShowHangulState] = useState<boolean>(currentShowHangul);

	useEffect(() => {
		const listener = (value: boolean) => setShowHangulState(value);
		listeners.add(listener);

		// 마운트 시점의 최신 전역 값 반영
		setShowHangulState(currentShowHangul);
		void hydrateShowHangul();

		return () => {
			listeners.delete(listener);
		};
	}, []);

	const setShowHangul = useCallback((value: boolean) => {
		if (currentShowHangul === value) {
			return;
		}
		currentShowHangul = value;
		isHydrated = true;
		notifyListeners();

		AsyncStorage.setItem(MainStorageKeyType.SHOW_HANGUL_READING, value ? 'true' : 'false').catch((e) => {
			console.warn('독음 표시 설정 저장 실패:', e);
		});
	}, []);

	return { showHangul, setShowHangul };
};

export default useHangulReading;
