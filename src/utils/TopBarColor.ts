import { useEffect, useSyncExternalStore } from 'react';

/**
 * 상태바(상단 인셋) 배경색 오버라이드
 * -------------------------------------------------
 * 상단 인셋은 AppLayout 이 그리므로, 헤더 색이 화면 상태에 따라 달라지는 화면
 * (오답 복습·시험 대비 팩·약점 집중 등 accent 가 주제색인 곳)은 경로만으로 색을 맞출 수 없다.
 * 화면이 자기 accent 를 여기에 올려두면 AppLayout 이 그 색으로 상단을 이어 붙인다.
 */
let current: string | null = null;
const listeners = new Set<() => void>();

/** 상단 인셋 색을 지정한다. null 이면 경로 기본값으로 되돌린다. */
export const setTopBarColor = (color: string | null) => {
	if (current === color) return;
	current = color;
	listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
	listeners.add(l);
	return () => {
		listeners.delete(l);
	};
};

/** AppLayout 전용 — 현재 오버라이드 색 */
export const useTopBarColor = () => useSyncExternalStore(subscribe, () => current, () => current);

/**
 * 화면에서 쓰는 훅. 마운트 동안 상단 인셋 색을 accent 로 맞추고, 벗어나면 원래대로 돌린다.
 * @example useTopBarAccent(accent)
 */
export const useTopBarAccent = (color: string | null) => {
	useEffect(() => {
		setTopBarColor(color);
		return () => setTopBarColor(null);
	}, [color]);
};
