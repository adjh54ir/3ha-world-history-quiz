/**
 * 로컬 날짜(자정) 경계 감지 훅
 * -------------------------------------------------
 * '오늘' 기준으로 그리는 화면(출석·오늘의 퀴즈·오늘의 상식·추천 숨김)은 자정을 넘기면 전부 갱신돼야 한다.
 * 화면마다 따로 처리하면 어느 하나는 빠지므로, 날짜가 바뀌는 순간을 한 곳에서 알린다.
 *
 * 감지 경로는 둘이다.
 *  - 화면 포커스: 다른 탭/화면을 다녀오는 일반 동선
 *  - 포그라운드 복귀: 화면을 띄워둔 채 자정을 넘기고 앱으로 돌아오는 동선 (포커스 이벤트가 없다)
 */
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import DateUtils from '@/src/utils/DateUtils';

/**
 * @param onChange 날짜가 바뀐 순간 호출된다 (바뀐 날짜를 인자로 받는다)
 *
 * @example
 * useDayChange(() => { loadStatus(); reloadDailyWord(); });
 */
const useDayChange = (onChange: (date: string) => void): void => {
	// 콜백이 매 렌더 새로 만들어져도 리스너를 다시 붙이지 않도록 ref로 최신값만 따라간다
	const handler = useRef(onChange);
	handler.current = onChange;
	const lastDate = useRef(DateUtils.getLocalDateString());

	const check = useCallback(() => {
		const today = DateUtils.getLocalDateString();
		if (today === lastDate.current) return;
		lastDate.current = today;
		handler.current(today);
	}, []);

	useFocusEffect(
		useCallback(() => {
			check();
		}, [check]),
	);

	useEffect(() => {
		const sub = AppState.addEventListener('change', (state) => {
			if (state === 'active') check();
		});
		return () => sub.remove();
	}, [check]);
};

export default useDayChange;
