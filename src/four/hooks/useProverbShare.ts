import { useCallback, useRef, useState } from 'react';
import { Alert, Share, View } from 'react-native';

import type { MainDataType } from '@/src/four/types/MainDataType';

/**
 * 한자어 카드 공유
 * -------------------------------------------------
 * 원본은 화면 밖에 그려 둔 ProverbShareCard 를 png 로 떠서(react-native-view-shot)
 * 공유 시트에 이미지로 넘겼다. 이 앱에는 그 두 네이티브 모듈(react-native-share,
 * react-native-view-shot)이 없어 **글로 공유**한다.
 *
 * ponytail: 텍스트 공유. 이미지 카드가 필요해지면 두 모듈을 넣고 captureRef 로 되돌린다.
 * cardRef 는 호출부가 카드를 그대로 렌더하고 있어 자리만 유지한다.
 */
export const useProverbShare = () => {
	const cardRef = useRef<View>(null);
	const [sharing, setSharing] = useState(false);

	const shareProverb = useCallback(
		async (proverb: MainDataType.ProverbType) => {
			if (sharing) {
				return;
			}
			setSharing(true);
			try {
				const example = proverb.example?.[0] ? `\n\n${proverb.example[0]}` : '';
				await Share.share({
					message: `${proverb.hangul}(${proverb.hanja})\n${proverb.meaning}${example}`,
				});
			} catch (error) {
				// 사용자가 공유 시트를 닫은 경우도 여기로 오므로 취소는 조용히 넘긴다
				const message = error instanceof Error ? error.message : '';
				if (message && !/cancel/i.test(message)) {
					Alert.alert('공유 실패', '공유하지 못했습니다. 잠시 후 다시 시도해 주세요.');
				}
			} finally {
				setSharing(false);
			}
		},
		[sharing],
	);

	return { cardRef, sharing, shareProverb };
};

export default useProverbShare;
