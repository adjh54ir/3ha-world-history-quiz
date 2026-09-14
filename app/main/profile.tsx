import LifeProfileScreen from '@/src/screens/life/LifeProfileScreen';
import withTabReset from '@/src/screens/common/atomic/withTabReset';

// 탭을 누를 때마다 처음 상태로 (스크롤·펼침·선택값 초기화)
export default withTabReset(LifeProfileScreen);
