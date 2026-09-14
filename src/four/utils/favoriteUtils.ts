// @/utils/favoriteUtils.ts
import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playPop } from '@/src/four/utils/SoundUtils';
import { showToast } from '@/src/four/components/AppToast';
import DateUtils from '@/src/four/utils/DateUtils';
import { bumpActivity } from '@/src/four/utils/DailyActivityUtils';

const FAVORITES_STORAGE_KEY = MainStorageKeyType.FAVORITES_STORAGE_KEY;

export interface FavoriteItem {
	id: number;
	addedAt: number; // timestamp
}

/**
 * 즐겨찾기 목록 전체 조회
 */
export const getFavorites = async (): Promise<number[]> => {
	try {
		const jsonValue = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
		if (jsonValue) {
			const favorites: FavoriteItem[] = JSON.parse(jsonValue);
			return favorites.map((item) => item.id);
		}
		return [];
	} catch (error) {
		console.error('즐겨찾기 조회 실패:', error);
		return [];
	}
};

/**
 * 즐겨찾기 추가
 */
export const addFavorite = async (id: number): Promise<boolean> => {
	try {
		const jsonValue = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
		let favorites: FavoriteItem[] = jsonValue ? JSON.parse(jsonValue) : [];

		// 이미 존재하는지 확인
		if (favorites.some((item) => item.id === id)) {
			return false;
		}

		favorites.push({ id, addedAt: DateUtils.now().getTime() });
		await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
		playPop(); // 🔊 즐겨찾기 저장
		bumpActivity('favorite'); // 요일 미션(수요일) 진행도
		return true;
	} catch (error) {
		// 저장이 실패했는데 조용히 false 만 돌려주면 화면은 '이미 있음'과 구분하지 못한다.
		console.error('즐겨찾기 추가 실패:', error);
		showToast('즐겨찾기에 담지 못했습니다', { type: 'error' });
		return false;
	}
};

/**
 * 즐겨찾기 제거
 */
export const removeFavorite = async (id: number): Promise<boolean> => {
	try {
		const jsonValue = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
		if (!jsonValue) {
			return false;
		}

		let favorites: FavoriteItem[] = JSON.parse(jsonValue);
		const filtered = favorites.filter((item) => item.id !== id);

		if (filtered.length === favorites.length) {
			return false; // 제거할 항목이 없었음
		}

		await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(filtered));
		playPop(); // 🔊 즐겨찾기 해제
		return true;
	} catch (error) {
		// 위와 같은 이유 — 실패를 화면까지 올려 준다.
		console.error('즐겨찾기 제거 실패:', error);
		showToast('즐겨찾기에서 빼지 못했습니다', { type: 'error' });
		return false;
	}
};

/**
 * 특정 ID가 즐겨찾기에 있는지 확인
 */
export const isFavorite = async (id: number): Promise<boolean> => {
	try {
		const favorites = await getFavorites();
		return favorites.includes(id);
	} catch (error) {
		console.error('즐겨찾기 확인 실패:', error);
		return false;
	}
};

/**
 * 즐겨찾기 토글 (추가/제거)
 */
export const toggleFavorite = async (id: number): Promise<boolean> => {
	try {
		const favorites = await getFavorites();
		const on = !favorites.includes(id);

		await (on ? addFavorite(id) : removeFavorite(id));
		// 단어 사전(redux)의 별도 같은 값으로 맞춘다 — 예전에는 두 목록이 따로 쌓였다.
		// 순환 import 를 피하려고 부를 때 가져온다.
		require('@/src/four/services/LifeBridge').bridgeFavoriteToApp(id, on);
		return on;
	} catch (error) {
		console.error('즐겨찾기 토글 실패:', error);
		return false;
	}
};
