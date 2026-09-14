/** 오늘의 퀴즈 (탭) — 날마다 새로 뽑는 다섯 문제 */
import WorldQuizScreen from '@/src/screens/world/WorldQuizScreen';
import withTabReset from '@/src/screens/common/atomic/withTabReset';

// 탭을 누를 때마다 처음 상태로 (풀던 자리·결과 화면 초기화)
const TodayTab = withTabReset(() => <WorldQuizScreen source="daily" />);

export default function Route() {
	return <TodayTab />;
}
