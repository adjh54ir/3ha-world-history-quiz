import LifeSettingScreen from '@/src/screens/life/LifeSettingScreen';
import withTabReset from '@/src/screens/common/atomic/withTabReset';

// 탭을 누를 때마다 처음 상태로 (열어 둔 시간 선택기·펼침 초기화)
export default withTabReset(LifeSettingScreen);
