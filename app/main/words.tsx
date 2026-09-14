/** 세계 상식 사전 (탭) */
import WorldListScreen from '@/src/screens/world/WorldListScreen';
import withTabReset from '@/src/screens/common/atomic/withTabReset';

const WordsTab = withTabReset(WorldListScreen);

export default function Route() {
	return <WordsTab />;
}
