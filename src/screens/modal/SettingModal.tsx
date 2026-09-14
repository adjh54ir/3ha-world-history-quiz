// 추가 모달 컴포넌트 두 개 생성
import React, { useEffect, useMemo, useRef } from 'react';
import {Keyboard, Animated, Easing, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { scaleHeight, scaleWidth } from '@/src/utils/DementionUtils';
import Markdown from 'react-native-markdown-display';
import AppModal from '../common/atomic/AppModal';
import IconComponent from '../common/atomic/IconComponent';
import { Palette } from '@/src/const/ConstColors';
import { FontWeight, Layout, Radius, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';

interface ModalProps {
	visible: boolean;
	onClose: () => void;
}

/**
 * 시트가 아래에서 떠오르는 진입 연출.
 * 언마운트 시 애니메이션을 정지해 값/콜백이 남지 않게 한다.
 */
const useSheetEnter = () => {
	const enter = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		const anim = Animated.timing(enter, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true });
		anim.start();
		return () => anim.stop();
	}, [enter]);
	return {
		opacity: enter,
		transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(20), 0] }) }],
	};
};

const markdown = `
# **1) 개인정보 처리방침**

본 개인정보 처리방침은 EcodeLab(이하 "서비스 제공자")이 광고 지원(Ad Supported) 서비스로 제작한 모바일 애플리케이션 **생활 한자**(이하 "애플리케이션")에 적용됩니다. 본 서비스는 "있는 그대로(AS IS)" 제공됩니다.

---

## **1. 정보 수집 및 이용**

애플리케이션은 사용자가 다운로드하고 이용할 때 다음과 같은 정보를 수집할 수 있습니다:

- 기기의 인터넷 프로토콜 주소(IP 주소)
- 애플리케이션 내 방문한 페이지, 방문 일시, 해당 페이지에서 머문 시간
- 애플리케이션 사용 시간
- 기기의 운영체제 정보

애플리케이션은 사용자의 **정확한 위치 정보**를 수집하지 않습니다.

단, 애플리케이션은 기기의 **대략적인 위치 정보**를 수집하며, 이는 다음과 같이 활용됩니다:

- **위치 기반 서비스**: 맞춤형 콘텐츠, 관련 추천, 위치 기반 기능 제공
- **분석 및 개선**: 익명화된 위치 데이터로 사용자 행동 분석, 트렌드 파악, 기능 및 성능 개선
- **제3자 서비스 활용**: 주기적으로 익명화된 위치 데이터를 외부 서비스에 전송하여 애플리케이션 최적화 및 기능 향상에 활용

또한, 서비스 제공자는 필요에 따라 중요 알림, 필수 고지, 마케팅 프로모션 등을 위해 사용자가 제공한 정보를 이용할 수 있습니다.

더 나은 사용자 경험을 위해 서비스 제공자는 일부 개인 식별 정보를 요청할 수 있으며, 이 정보는 본 정책에 따라 보관 및 활용됩니다.

---

## **2. 제3자 접근**

서비스 제공자는 익명화된 집계 데이터만을 외부 서비스에 주기적으로 전송하여 애플리케이션 및 서비스 개선에 활용합니다.

애플리케이션은 제3자 서비스를 사용하며, 각 서비스의 개인정보 처리방침은 아래에서 확인할 수 있습니다:

- [Google Play Services](https://www.google.com/policies/privacy/)
- [AdMob](https://support.google.com/admob/answer/6128543?hl=ko)
- [Google Analytics for Firebase](https://firebase.google.com/support/privacy)
- [Firebase Crashlytics](https://firebase.google.com/support/privacy)

서비스 제공자는 다음과 같은 경우 사용자 정보를 제공할 수 있습니다:

- 법률에 따른 요구(예: 소환장, 법적 절차 등)
- 권리 보호, 사용자 및 타인의 안전 보호, 사기 조사, 정부 요청 대응 필요 시
- 서비스 제공자를 대신하여 업무를 수행하며, 독립적 정보 사용이 불가하고 본 방침을 준수하는 신뢰할 수 있는 제휴사에 제공될 때

---

## **3. 옵트아웃 권리**

사용자는 애플리케이션을 삭제(언인스톨)함으로써 모든 정보 수집을 중단할 수 있습니다.

이는 기기의 표준 삭제 기능 또는 앱 마켓을 통해 가능합니다.

---

## **4. 데이터 보관 정책**

서비스 제공자는 사용자가 애플리케이션을 이용하는 동안 및 합리적인 기간 동안 사용자 제공 데이터를 보관합니다.

제공한 데이터의 삭제를 원할 경우 [**adjh54ir@gmail.com**](mailto:adjh54ir@gmail.com) 으로 연락하면 합리적인 기간 내에 조치가 이루어집니다.

---

## **5. 아동 개인정보 보호**

서비스 제공자는 만 13세 미만 아동으로부터 개인정보를 의도적으로 수집하거나 마케팅하지 않습니다.

만약 13세 미만 아동이 개인정보를 제공한 사실을 알게 될 경우 즉시 삭제하며, 부모나 보호자가 이를 알게 된 경우 [**adjh54ir@gmail.com**](mailto:adjh54ir@gmail.com) 으로 연락하여 필요한 조치를 요청할 수 있습니다.

---

## **6. 보안**

서비스 제공자는 정보의 기밀성을 보호하기 위해 물리적, 전자적, 절차적 보호 조치를 마련하고 있습니다.

---

## **7. 변경사항**

본 개인정보 처리방침은 필요에 따라 갱신될 수 있으며, 변경 시 본 페이지에 게시됩니다.

애플리케이션을 계속 사용하는 경우 변경사항에 동의한 것으로 간주됩니다.

본 방침은 **2025-07-11**부터 유효합니다.

---

## **8. 동의**

애플리케이션을 사용함으로써, 사용자는 본 개인정보 처리방침에 따라 정보가 처리되는 것에 동의하게 됩니다.

---

## **9. 문의하기**

개인정보 처리방침과 관련된 문의사항은 아래 이메일로 연락해주시기 바랍니다.

📧 [**adjh54ir@gmail.com**](mailto:adjh54ir@gmail.com)

---

# **2) 이용약관**

본 이용약관은 EcodeLab(이하 "서비스 제공자")이 광고 지원(Ad Supported) 서비스로 제작한 모바일 애플리케이션 **생활 한자**(이하 "애플리케이션")에 적용됩니다.

---

## **1. 동의 및 제한 사항**

애플리케이션을 다운로드하거나 이용하는 경우, 사용자는 자동으로 본 약관에 동의하게 됩니다.

애플리케이션 사용 전 반드시 본 약관을 숙지하시기 바랍니다.

다음 행위는 엄격히 금지됩니다:

- 애플리케이션 또는 그 일부의 무단 복사 및 수정
- 애플리케이션의 소스 코드 추출 시도
- 애플리케이션의 타 언어 번역, 파생 버전 제작
- 서비스 제공자의 상표권, 저작권, 데이터베이스 권리, 기타 지식재산권 침해

모든 지식재산권은 서비스 제공자에게 귀속됩니다.

---

## **2. 서비스 제공자의 권리**

서비스 제공자는 애플리케이션을 최대한 유용하고 효율적으로 유지하기 위해 언제든지 애플리케이션을 수정하거나 서비스에 요금을 부과할 권리를 보유합니다.

단, 요금 부과 시 사전에 명확히 안내합니다.

애플리케이션은 사용자가 제공한 개인정보를 처리·저장하며, 사용자는 본인의 기기와 애플리케이션 접근에 대한 보안을 유지할 책임이 있습니다.

특히, 기기의 운영체제 제한을 해제하는 **루팅(rooting)** 또는 **탈옥(jailbreaking)** 은 권장하지 않습니다. 이는 악성코드, 바이러스 감염, 보안 기능 훼손, 애플리케이션 오류 발생 등의 위험을 초래할 수 있습니다.## 

---

## **3. 제3자 서비스**

애플리케이션은 제3자 서비스의 약관을 따릅니다. 아래는 해당 서비스의 약관 링크입니다:

- [Google Play Services](https://policies.google.com/terms)
- [AdMob](https://developers.google.com/admob/terms)
- [Google Analytics for Firebase](https://www.google.com/analytics/terms/)
- [Firebase Crashlytics](https://firebase.google.com/terms/crashlytics)

---

## **4. 인터넷 연결 및 요금**

일부 기능은 인터넷 연결(Wi-Fi 또는 이동통신망)이 필요합니다. 인터넷 연결 불가, 데이터 소진 등으로 인한 애플리케이션 기능 제한에 대해 서비스 제공자는 책임을 지지 않습니다.

Wi-Fi가 아닌 환경에서 사용할 경우, 사용자의 이동통신사 요금제에 따른 데이터 요금이 발생할 수 있으며, 해외 사용 시 로밍 요금이 부과될 수 있습니다.

해당 요금은 전적으로 사용자의 책임이며, 기기 명의자가 아닌 경우 반드시 요금 납부자의 동의를 얻어야 합니다.

---

## **5. 기기 관리 책임**

사용자는 기기가 충전된 상태를 유지할 책임이 있으며, 배터리 방전으로 인해 애플리케이션을 사용하지 못하는 경우 서비스 제공자는 책임지지 않습니다.

---

## **6. 책임의 한계**

서비스 제공자는 항상 최신 정보 제공을 위해 노력하나, 제3자로부터 제공받은 정보에 의존하는 경우가 있습니다.

따라서 애플리케이션 기능만을 전적으로 신뢰하여 발생한 직접적·간접적 손실에 대해 책임을 지지 않습니다.

---

## **7. 업데이트 및 서비스 종료**

애플리케이션은 운영체제(OS) 정책 변경에 따라 업데이트가 필요할 수 있으며, 사용자는 제공되는 업데이트를 수락해야 합니다.

서비스 제공자는 언제든 애플리케이션 제공을 중단할 수 있으며, 종료 시점부터 사용자는 애플리케이션 사용 권한을 잃으며 기기에서 삭제해야 합니다.

---

## **8. 이용약관 변경**

서비스 제공자는 필요에 따라 본 약관을 갱신할 수 있습니다. 변경 시 본 페이지에 게시되며, 사용자가 계속 애플리케이션을 이용하는 경우 변경사항에 동의한 것으로 간주됩니다.

본 약관은 **2025-07-11**부터 유효합니다.

---

## **9. 문의하기**

이용약관 관련 문의사항이나 제안사항은 아래 이메일로 연락해주시기 바랍니다.

📧 [**adjh54ir@gmail.com**](mailto:adjh54ir@gmail.com)

---
`;



export const TermsOfServiceModal = ({ visible, onClose }: ModalProps) => {
	const Colors = useColors();
	const modalStyles = useThemedStyles(createModalStyles);
	const enterStyle = useSheetEnter();
	const markdownStyles = useMemo(() => createMarkdownStyles(Colors), [Colors]);

	// 닫히는 순간 바로 언마운트 — 다음 모달과 사라지는 애니메이션이 겹쳐 이전 모달이 깜빡이는 것을 막는다
	if (!visible) {
		return null;
	}

	return (
		<AppModal visible={visible} onClose={onClose} backdropStyle={modalStyles.overlay}>
			<Animated.View style={[modalStyles.container, enterStyle]}>
					<View style={modalStyles.header}>
						<View style={modalStyles.spacer} />
						<Text style={modalStyles.modalTitle} numberOfLines={1} ellipsizeMode="tail">
							개인정보처리방침 및 이용약관
						</Text>
						<TouchableOpacity style={modalStyles.closeIcon} onPress={onClose} activeOpacity={0.7} hitSlop={8} accessibilityRole="button" accessibilityLabel="닫기">
							<IconComponent type="materialIcons" name="close" size={20} color={Colors.textSecondary} />
						</TouchableOpacity>
					</View>

					<ScrollView contentContainerStyle={modalStyles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>
						<Markdown style={markdownStyles}>{markdown}</Markdown>
					</ScrollView>
			</Animated.View>
		</AppModal>
	);
};

/** 라이선스 고지 항목 — 이름/라이선스/버전(있으면)/원문 링크 */
type OssItem = {
	name: string;
	license: string;
	/** 라이브러리만 버전을 붙인다. 자료·사운드는 버전 개념이 없다 */
	version?: string;
	url: string;
	/** 저작자 표시가 라이선스 조건인 항목의 원작자 */
	credit?: string;
};

type OssSection = { title: string; caption: string; items: OssItem[] };

/**
 * 오픈소스 고지 목록.
 * -------------------------------------------------
 * - 앞 두 묶음(자료·사운드)은 저작자 표시가 **라이선스 조건**이라 반드시 앱 안에 남아야 한다.
 *   근거 문서: `src/assets/fonts/ATTRIBUTIONS.md`, `assets/sounds/ATTRIBUTIONS.md`
 * - 라이브러리 버전은 실제 설치본(node_modules) 기준. 의존성을 올리면 여기도 같이 고친다.
 */
const openSourceSections: OssSection[] = [
	{
		title: '서체',
		caption: '저작자 표시가 라이선스 조건인 항목입니다',
		items: [
			{
				name: 'Source Han Serif K (한자 서체)',
				license: 'SIL Open Font License 1.1',
				credit: 'Adobe',
				url: 'https://github.com/adobe-fonts/source-han-serif',
			},
		],
	},
	{
		title: '필순 자료',
		caption: '저작자 표시가 라이선스 조건인 항목입니다',
		items: [
			{
				name: '한자 획순 (바깥선)',
				license: 'ARPHIC PUBLIC LICENSE',
				credit: 'Make Me a Hanzi · Arphic Technology',
				url: 'https://github.com/skishore/makemeahanzi',
			},
			{
				name: '한자 획순 (중심선 · 한국 자형 33자)',
				license: 'CC BY-SA 3.0',
				credit: 'KanjiVG · Ulrich Apel',
				url: 'http://kanjivg.tagaini.net',
			},
		],
	},
	{
		title: '사운드',
		caption: '앱이 실제로 재생하는 음원입니다',
		items: [
			{ name: '출석 도장 · 정답 · 오답 등 효과음', license: 'CC0', credit: 'Kenney (Interface Sounds)', url: 'https://kenney.nl/assets/interface-sounds' },
			{ name: '퀴즈 · 챌린지 배경음', license: '자체 제작', credit: '3ha', url: 'https://3ha.co.kr' },
		],
	},
	{
		title: '라이브러리',
		caption: '앱이 실제로 사용하는 오픈소스입니다 (설치본 기준)',
		items: [
			{ name: 'React Native', license: 'MIT', version: '0.83.6', url: 'https://github.com/facebook/react-native' },
			{ name: 'React', license: 'MIT', version: '19.2.0', url: 'https://github.com/facebook/react' },
			{ name: 'Expo SDK', license: 'MIT', version: '55.0.26', url: 'https://github.com/expo/expo' },
			{ name: 'expo-router', license: 'MIT', version: '55.0.16', url: 'https://github.com/expo/expo/tree/main/packages/expo-router' },
			{ name: 'expo-audio', license: 'MIT', version: '55.0.15', url: 'https://github.com/expo/expo/tree/main/packages/expo-audio' },
			{ name: 'expo-image', license: 'MIT', version: '55.0.11', url: 'https://github.com/expo/expo/tree/main/packages/expo-image' },
			{ name: 'expo-font', license: 'MIT', version: '55.0.8', url: 'https://github.com/expo/expo/tree/main/packages/expo-font' },
			{ name: 'expo-asset', license: 'MIT', version: '55.0.17', url: 'https://github.com/expo/expo/tree/main/packages/expo-asset' },
			{ name: 'expo-splash-screen', license: 'MIT', version: '55.0.21', url: 'https://github.com/expo/expo/tree/main/packages/expo-splash-screen' },
			{ name: 'expo-status-bar', license: 'MIT', version: '55.0.6', url: 'https://github.com/expo/expo/tree/main/packages/expo-status-bar' },
			{ name: 'expo-updates', license: 'MIT', version: '55.0.25', url: 'https://github.com/expo/expo/tree/main/packages/expo-updates' },
			{ name: '@react-navigation/native', license: 'MIT', version: '7.3.4', url: 'https://github.com/react-navigation/react-navigation' },
			{ name: '@react-navigation/bottom-tabs', license: 'MIT', version: '7.18.3', url: 'https://github.com/react-navigation/react-navigation' },
			{ name: 'react-native-safe-area-context', license: 'MIT', version: '5.6.2', url: 'https://github.com/th3rdwave/react-native-safe-area-context' },
			{ name: 'react-native-screens', license: 'MIT', version: '4.23.0', url: 'https://github.com/software-mansion/react-native-screens' },
			{ name: 'react-native-gesture-handler', license: 'MIT', version: '2.32.0', url: 'https://github.com/software-mansion/react-native-gesture-handler' },
			{ name: 'react-native-reanimated', license: 'MIT', version: '4.2.1', url: 'https://github.com/software-mansion/react-native-reanimated' },
			{ name: 'react-native-worklets', license: 'MIT', version: '0.7.4', url: 'https://github.com/software-mansion/react-native-worklets' },
			{ name: 'react-native-svg', license: 'MIT', version: '15.15.5', url: 'https://github.com/software-mansion/react-native-svg' },
			{ name: 'react-native-vector-icons', license: 'MIT', version: '10.3.0', url: 'https://github.com/oblador/react-native-vector-icons' },
			{ name: '@expo/vector-icons', license: 'MIT', version: '15.1.1', url: 'https://github.com/expo/vector-icons' },
			{ name: 'react-native-confetti-cannon', license: 'MIT', version: '1.5.2', url: 'https://github.com/VincentCATILLON/react-native-confetti-cannon' },
			{ name: '@react-native-async-storage/async-storage', license: 'MIT', version: '2.2.0', url: 'https://github.com/react-native-async-storage/async-storage' },
			{ name: '@reduxjs/toolkit', license: 'MIT', version: '2.12.0', url: 'https://github.com/reduxjs/redux-toolkit' },
			{ name: 'react-redux', license: 'MIT', version: '9.3.0', url: 'https://github.com/reduxjs/react-redux' },
			{ name: 'redux-persist', license: 'MIT', version: '6.0.0', url: 'https://github.com/rt2zz/redux-persist' },
			{ name: '@notifee/react-native', license: 'Apache-2.0', version: '9.1.8', url: 'https://github.com/invertase/notifee' },
			{ name: '@react-native-firebase (app · analytics · crashlytics)', license: 'Apache-2.0', version: '24.1.1', url: 'https://github.com/invertase/react-native-firebase' },
			{ name: 'react-native-google-mobile-ads', license: 'Apache-2.0', version: '16.4.0', url: 'https://github.com/invertase/react-native-google-mobile-ads' },
			{ name: 'react-native-device-info', license: 'MIT', version: '14.1.1', url: 'https://github.com/react-native-device-info/react-native-device-info' },
			{ name: 'react-native-permissions', license: 'MIT', version: '5.6.0', url: 'https://github.com/zoontek/react-native-permissions' },
			{ name: 'react-native-version-check', license: 'MIT', version: '3.5.0', url: 'https://github.com/kimxogus/react-native-version-check' },
			{ name: 'react-native-markdown-display', license: 'MIT', version: '7.0.2', url: 'https://github.com/iamacup/react-native-markdown-display' },
			{ name: '@react-native-community/netinfo', license: 'MIT', version: '11.5.2', url: 'https://github.com/react-native-netinfo/react-native-netinfo' },
			{ name: '@react-native-community/datetimepicker', license: 'MIT', version: '8.6.0', url: 'https://github.com/react-native-datetimepicker/datetimepicker' },
			{ name: 'zod', license: 'MIT', version: '3.25.76', url: 'https://github.com/colinhacks/zod' },
		],
	},
];

export const OpenSourceModal = ({ visible, onClose }: ModalProps) => {
	const Colors = useColors();
	const modalStyles = useThemedStyles(createModalStyles);
	const styles = useThemedStyles(createStyles);
	const enterStyle = useSheetEnter();

	// 닫히는 순간 바로 언마운트 — 다음 모달과 사라지는 애니메이션이 겹쳐 이전 모달이 깜빡이는 것을 막는다
	if (!visible) {
		return null;
	}

	return (
		<AppModal visible={visible} onClose={onClose} backdropStyle={modalStyles.overlay}>
			<Animated.View style={[modalStyles.container, enterStyle]}>
					<View style={modalStyles.header}>
						<View style={modalStyles.spacer} />
						<Text style={modalStyles.modalTitle} numberOfLines={1} ellipsizeMode="tail">
							오픈소스 라이선스
						</Text>
						<TouchableOpacity style={modalStyles.closeIcon} onPress={onClose} activeOpacity={0.7} hitSlop={8} accessibilityRole="button" accessibilityLabel="닫기">
							<IconComponent type="materialIcons" name="close" size={20} color={Colors.textSecondary} />
						</TouchableOpacity>
					</View>

					<ScrollView contentContainerStyle={modalStyles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>
						{openSourceSections.map((section) => (
							<View key={section.title} style={styles.section}>
								<Text style={styles.sectionTitle}>{section.title}</Text>
								<Text style={styles.sectionCaption}>{section.caption}</Text>
								{section.items.map((lib) => {
									const isGithub = lib.url.includes('github.com');
									return (
										<View key={lib.name} style={styles.card}>
											<View style={styles.cardHeader}>
												<View style={styles.cardIconBadge}>
													<IconComponent type="Feather" name="package" size={15} color={Colors.primaryDeep} />
												</View>
												<View style={styles.cardTitleArea}>
													<Text style={styles.libName} numberOfLines={2} ellipsizeMode="tail">
														{lib.name}
													</Text>
													<View style={styles.metaRow}>
														<View style={styles.metaChip}>
															<Text style={styles.metaChipText} numberOfLines={1}>
																{lib.license}
															</Text>
														</View>
														{/* 버전은 라이브러리에만 있고, 원작자 표기는 CC BY 계열에만 있다 */}
														<Text style={styles.metaVersion} numberOfLines={1}>
															{lib.version ? `v${lib.version}` : (lib.credit ?? '')}
														</Text>
													</View>
												</View>
												<TouchableOpacity onPress={() => Linking.openURL(lib.url)} style={styles.linkWrapper} activeOpacity={0.7}>
													<IconComponent type="Feather" name={isGithub ? 'github' : 'external-link'} size={14} color={Colors.primaryDeep} />
													<Text style={styles.linkText}>{isGithub ? 'GitHub' : '원문'}</Text>
												</TouchableOpacity>
											</View>
										</View>
									);
								})}
							</View>
						))}
						<Text style={styles.footer}>오픈소스 커뮤니티에 감사드립니다 🙏</Text>
					</ScrollView>
			</Animated.View>
		</AppModal>
	);
};
const createModalStyles = (Colors: Palette) =>
	StyleSheet.create({
		overlay: {
			paddingHorizontal: Spacing.xl,
		},
		container: {
			...Layout.modalCard,
			maxHeight: scaleHeight(680),
			backgroundColor: Colors.surface,
			borderRadius: Radius.xl,
			overflow: 'hidden',
		},
		scrollContainer: {
			flexGrow: 1,
			paddingHorizontal: Spacing.xl,
			paddingTop: SpacingV.lg,
			paddingBottom: SpacingV.xxl,
		},
		header: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: Spacing.sm,
			paddingVertical: SpacingV.lg,
			paddingHorizontal: Spacing.xl,
			borderBottomWidth: StyleSheet.hairlineWidth,
			borderBottomColor: Colors.border,
		},
		modalTitle: {
			flex: 1,
			fontSize: Typography.subtitle,
			fontWeight: FontWeight.bold,
			textAlign: 'center',
			color: Colors.textStrong,
		},
		spacer: {
			width: scaleWidth(30), // 닫기 아이콘 크기만큼 확보하여 타이틀 중앙 정렬 유지
		},
		closeIcon: {
			width: scaleWidth(30),
			height: scaleWidth(30),
			borderRadius: Radius.lg,
			backgroundColor: Colors.surfaceAlt,
			alignItems: 'center',
			justifyContent: 'center',
		},
	});

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		section: {
			marginBottom: SpacingV.xl,
		},
		sectionTitle: {
			fontSize: Typography.body,
			fontWeight: FontWeight.bold,
			color: Colors.textStrong,
			marginBottom: SpacingV.xs,
		},
		sectionCaption: {
			fontSize: Typography.footnote,
			color: Colors.textMuted,
			marginBottom: SpacingV.md,
		},
		card: {
			backgroundColor: Colors.surface,
			borderRadius: Radius.lg,
			padding: Spacing.lg,
			marginBottom: SpacingV.sm,
			borderWidth: 1,
			borderColor: Colors.border,
		},
		cardHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
		},
		cardIconBadge: {
			width: scaleWidth(36),
			height: scaleWidth(36),
			borderRadius: Radius.md,
			backgroundColor: Colors.primarySoft,
			alignItems: 'center',
			justifyContent: 'center',
			flexShrink: 0,
		},
		cardTitleArea: {
			flex: 1,
			minWidth: 0,
		},
		libName: {
			fontSize: Typography.body,
			fontWeight: FontWeight.semibold,
			color: Colors.textStrong,
			marginBottom: SpacingV.xs,
		},
		metaRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.sm,
		},
		metaChip: {
			backgroundColor: Colors.surfaceAlt,
			borderRadius: Radius.sm,
			paddingHorizontal: Spacing.sm,
			paddingVertical: SpacingV.xs,
			flexShrink: 1,
		},
		metaChipText: {
			flexShrink: 1,
			fontSize: Typography.caption,
			color: Colors.textSecondary,
			fontWeight: FontWeight.semibold,
		},
		metaVersion: {
			fontSize: Typography.caption,
			color: Colors.textMuted,
			flexShrink: 1,
		},
		linkWrapper: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xs,
			backgroundColor: Colors.primarySoft,
			borderRadius: Radius.sm,
			paddingHorizontal: Spacing.md,
			paddingVertical: SpacingV.sm,
			flexShrink: 0,
		},
		linkText: {
			fontSize: Typography.footnote,
			color: Colors.primaryDeep,
			fontWeight: FontWeight.semibold,
		},
		footer: {
			marginTop: SpacingV.lg,
			fontSize: Typography.footnote,
			color: Colors.textMuted,
			textAlign: 'center',
		},
	});

/** react-native-markdown-display 는 StyleSheet 대신 평범한 객체를 받는다 */
const createMarkdownStyles = (Colors: Palette) => ({
	body: {
		color: Colors.text,
		fontSize: Typography.body,
		lineHeight: Math.round(Typography.body * 1.7),
	},
	heading1: {
		fontSize: Typography.h2,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
		marginBottom: SpacingV.lg,
	},
	heading2: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
		marginTop: SpacingV.xxl,
		marginBottom: SpacingV.md,
	},
	heading3: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
		marginTop: SpacingV.xl,
		marginBottom: SpacingV.sm,
	},
	bullet_list: {
		marginBottom: SpacingV.lg,
	},
	hr: {
		backgroundColor: Colors.border,
		height: StyleSheet.hairlineWidth,
		marginVertical: SpacingV.lg,
	},
	blockquote: {
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.sm,
		color: Colors.textSecondary,
	},
	link: {
		color: Colors.primaryDeep,
	},
});
