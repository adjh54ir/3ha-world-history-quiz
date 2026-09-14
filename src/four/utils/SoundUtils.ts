/**
 * 이식 화면용 효과음 — 앱 공통 SoundUtils(expo-audio) 로 넘긴다.
 * 원본은 react-native-sound 를 썼는데 이 앱에는 없다. 이름만 맞춰 두고 소리는 하나로 관리한다.
 */
import { playSfx, playStart } from '@/src/utils/SoundUtils';

export {
	playCorrect,
	playWrong,
	playFinish,
	playTimeout,
	playComplete,
	playTick,
	playFlip,
	playSwipe,
	playPop,
} from '@/src/utils/SoundUtils';

/** 원본의 '휙' 소리 — 이 앱의 시작음으로 잇는다(현재 시작음은 무음 처리돼 있다) */
export const playWhoosh = () => playStart();

/** 짝이 맞았을 때 — 정답음과 같은 소리를 쓴다 */
export const playMatch = () => playSfx('correct');

/**
 * 콤보 사운드.
 * 원본은 콤보 단계마다 음을 올렸지만 expo-audio 쪽에는 피치 조절이 없다.
 * 단계는 무시하고 같은 소리를 낸다 — 콤보 연출(숫자·흔들림)은 화면이 따로 한다.
 */
export const playCombo = (_combo = 0) => playSfx('correct');

/** 원본은 효과음 on/off 를 'sound' 한 이름으로 불렀다 — 이 앱의 효과음(SFX) 설정으로 잇는다 */
export { isSfxEnabled as isSoundEnabled, setSfxEnabled as setSoundEnabled } from '@/src/utils/SoundUtils';
