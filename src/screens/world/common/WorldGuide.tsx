import React from 'react';
import LifeCharacterGuide, { LifeGuideButton, useCharacterGuideOnce } from '@/src/screens/life/common/LifeCharacterGuide';

/**
 * 세계 상식 화면의 사용법 안내 — 버튼 한 개와 말풍선 한 벌.
 * -------------------------------------------------
 * 화면마다 `useCharacterGuideOnce` + 버튼 + 모달을 따로 배선하면 여덟 곳에 같은 코드가 깔린다.
 * 대신 훅 하나가 둘 다 만들어 주고, 화면은 머리글에 `button` 을, 맨 아래에 `guide` 를 꽂기만 한다.
 *
 * @param key  노출 기록 열쇠 — 화면마다 달라야 "한 번만" 이 화면 단위로 걸린다
 * @param lines 사자가 순서대로 말할 문장 (탭하면 다음 문장)
 * @param buttonColor 물음표 색 — 어두운 판 위에 얹는 화면(숏폼)만 넘긴다
 */
export const useWorldGuide = (key: string, lines: string[], buttonColor?: string) => {
	const guide = useCharacterGuideOnce(key);
	return {
		button: <LifeGuideButton onPress={guide.open} color={buttonColor} size={18} />,
		guide: <LifeCharacterGuide visible={guide.visible} onClose={guide.close} lines={lines} />,
	};
};
