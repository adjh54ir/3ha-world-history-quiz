/** 통계 (탭) — 학습·퀴즈·출석·챌린지 기록을 한 화면에 모아 본다 */
import WorldStatsScreen from '@/src/screens/world/WorldStatsScreen';
import withTabReset from '@/src/screens/common/atomic/withTabReset';

const StatsTab = withTabReset(WorldStatsScreen);

export default function Route() {
	return <StatsTab />;
}
