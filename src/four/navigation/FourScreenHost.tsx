/**
 * 이식 화면 껍데기
 * -------------------------------------------------
 * 옮겨 온 화면들은 StyleSheet 를 **모듈 로드 시점에** 구워 두고 쓴다.
 * 설정에서 테마를 바꾸면 ThemeRegistry 가 스타일을 다시 만들지만,
 * 이미 그려진 트리는 예전 style 객체를 그대로 들고 있어 화면이 바뀌지 않는다.
 * 변경 알림이 오면 key 를 바꿔 통째로 다시 그린다.
 */
import React, { useEffect, useState } from 'react';
import { onAppearanceChange } from '@/src/four/const/ThemeRegistry';

const FourScreenHost = ({ children }: { children: React.ReactNode }) => {
	const [generation, setGeneration] = useState(0);

	useEffect(() => onAppearanceChange(() => setGeneration((prev) => prev + 1)), []);

	return <React.Fragment key={generation}>{children}</React.Fragment>;
};

export default FourScreenHost;
