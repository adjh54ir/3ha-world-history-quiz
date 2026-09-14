/**
 * 앱 엔트리 (expo-router/entry 를 감싼 커스텀 엔트리)
 * -------------------------------------------------
 * 화면들의 StyleSheet 는 모듈이 로드되는 순간 Colors 의 '값'을 복사해 간다.
 * 그래서 저장된 화면 테마(라이트/다크)는 라우트 모듈이 로드되기 전에 확정돼야 한다.
 * ExpoRoot 는 렌더 시점에 라우트를 require 하므로, 테마를 읽기 전까지 렌더를 미루면
 * 전 화면이 올바른 색으로 만들어진다. (네이티브 동기 저장소를 추가하지 않기 위한 구조)
 */
import 'react-native-gesture-handler';
import '@expo/metro-runtime';

import React, { useEffect, useState } from 'react';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

import { bootstrapTheme } from './src/utils/ThemeReload';

const Root = () => {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		let alive = true;
		bootstrapTheme().finally(() => alive && setReady(true));
		return () => {
			alive = false;
		};
	}, []);

	// 테마 확정 전에는 아무것도 그리지 않는다 (네이티브 스플래시가 떠 있는 구간이라 눈에 띄지 않는다)
	return ready ? <App /> : null;
};

renderRootComponent(Root);
