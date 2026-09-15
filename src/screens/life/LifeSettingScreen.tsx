import React, { useCallback, useEffect, useRef, useState } from 'react';
import {Keyboard, Animated, Easing, FlatList, Linking, Platform, ScrollView, Share, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import DeviceInfo from 'react-native-device-info';
import { useDispatch } from 'react-redux';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import { showToast } from '@/src/screens/common/atomic/GlobalToast';
import CmmDelConfirmModal from '@/src/screens/modal/CmmDelConfirmModal';
import DeveloperAppsModal from '@/src/screens/modal/DeveloperAppsModal';
import { OpenSourceModal, TermsOfServiceModal } from '@/src/screens/modal/SettingModal';
import LifeHeader from './common/LifeHeader';
import LifeCharacterGuide, { useCharacterGuideOnce } from './common/LifeCharacterGuide';
import { ColorToken, Palette } from '@/src/const/ConstColors';
import { ThemeMode, useColors, useTheme, useThemedStyles } from '@/src/hooks/useTheme';
import { HanjaFontStyle } from '@/src/hooks/useHanjaFont';
import { useLife, usePet, useStreak } from '@/src/hooks/useLife';
import { useAnimationRunner, useScreenEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { devCompleteQuiz, LifeState, markLearned, resetAll, resetProgress, restoreLife, setReminder } from '@/src/store/slice/LifeSlice';
import { applyReminder } from '@/src/services/life/LifeReminder';
import { clearPortedProgress, restorePortedProgress, type PortedSnapshot } from '@/src/services/life/PortedStorage';
import { DOMAIN_CATEGORIES, DOMAIN_ITEMS } from '@/src/const/data/world/ConstWorldDomain';
import { COMMON_APPS_DATA } from '@/src/const/common/CommonAppsData';
import { CommonType } from '@/src/types/CommonType';
import DateUtils from '@/src/utils/DateUtils';
import { APP_DESCRIPTION, APP_NAME, APP_STORE_URL, GOOGLE_PLAY_STORE_URL } from '@env';
import {
	AppPermissionStatus,
	getAppPermissionStatuses,
	isPermissionActionable,
	requestAppPermission,
	toPermissionLabel,
} from '@/src/utils/PermissionUtils';
import { isBgmEnabled, isSfxEnabled, playComplete, playPop, setBgmEnabled, setSfxEnabled } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';

/**
 * 최근에 낸 앱 두 개 — 가로 목록의 카드에 NEW 배지를 붙인다.
 * id 가 클수록 최신이라 정렬 기준을 따로 두지 않는다(개발자의 다른 앱 팝업과 같은 규칙).
 * 목록이 앱 실행 중에 바뀌지 않으므로 모듈에서 한 번만 만든다.
 */
const NEW_APP_IDS = new Set(
	[...COMMON_APPS_DATA.Apps]
		.sort((a, b) => b.id - a.id)
		.slice(0, 2)
		.map((app) => app.id),
);

/** 지금 플랫폼의 스토어 주소 — 아직 한쪽만 나온 앱은 반대쪽 주소라도 열어 준다 */
const storeUrlOf = (app: CommonType.AppItem): string | null =>
	(Platform.OS === 'android' ? app.android : app.ios) ?? (Platform.OS === 'android' ? app.ios : app.android) ?? null;

/** 초기화 종류 — 지우는 범위가 달라 확인 문구도 다르다 */
type ResetTarget = 'progress' | 'all';

/** 색은 토큰 이름으로 둔다 — 팔레트는 화면에서 테마에 맞춰 꺼내 쓴다 */
const RESET_META: Record<
	ResetTarget,
	{
		label: string;
		desc: string;
		icon: string;
		color: ColorToken;
		tint: ColorToken;
		title: string;
		summary: string;
		done: string;
	}
> = {
	progress: {
		label: '학습 기록 초기화',
		desc: '학습 완료·오답 노트·퀴즈 기록',
		icon: 'book-remove-outline',
		color: 'accentOrange',
		tint: 'warningSoft',
		title: '학습 기록을 지울까요?',
		summary: '학습 완료 표시, 오답 노트, 퀴즈 기록, 오늘의 퀴즈가 지워집니다. 경험치·펫·뱃지는 그대로 남아요.',
		done: '학습·퀴즈 기록을 지웠어요',
	},
	all: {
		label: '전체 초기화',
		desc: '기록과 경험치·펫·뱃지까지 전부',
		icon: 'delete-outline',
		color: 'errorDark',
		tint: 'errorSoft',
		title: '모든 데이터를 지울까요?',
		summary: '학습·퀴즈 기록은 물론 경험치, 펫, 뱃지까지 모두 사라집니다. 되돌릴 수 없어요.',
		done: '모든 데이터를 지웠어요',
	},
};

const RESET_ORDER: ResetTarget[] = ['progress', 'all'];

/** 화면 테마 — 기기 설정과 무관하게 라이트/다크 중 하나로 고정한다 */
const THEME_OPTIONS: { key: ThemeMode; label: string; icon: string; hint: string }[] = [
	{ key: 'light', label: '라이트', icon: 'white-balance-sunny', hint: '항상 밝은 화면으로 보여 줍니다' },
	{ key: 'dark', label: '다크', icon: 'weather-night', hint: '항상 어두운 화면으로 보여 줍니다' },
];

/** 권한 행 아이콘 / 설명 — 무슨 기능이 막히는지 알려 준다 */
const PERMISSION_ICON: Record<string, string> = { notifications: 'bell-outline', tracking: 'target-account' };
const PERMISSION_DESC: Record<string, string> = {
	notifications: '매일 학습 알림을 받으려면 필요합니다',
	tracking: '더 관련성 높은 광고를 보여주는 데 사용됩니다',
};
/** 권한 이름 */
const PERMISSION_LABEL: Record<string, string> = {
	notifications: '알림',
	tracking: '앱 추적',
};

/** 오전/오후 12시간 표기 */
const toTimeLabel = ({ hour, minute }: { hour: number; minute: number }, meridiem: { am: string; pm: string }): string =>
	`${hour < 12 ? meridiem.am : meridiem.pm} ${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, '0')}`;

/**
 * 설정 행.
 * 테마 스타일·색은 프롭으로 받는다 — 화면 안에서 정의하면 렌더마다 컴포넌트 타입이 바뀌어 행이 통째로 다시 마운트된다.
 */
const Row = ({
	icon,
	label,
	value,
	onPress,
	right,
	styles,
	Colors,
}: {
	icon: string;
	label: string;
	value?: string;
	onPress?: () => void;
	right?: React.ReactNode;
	styles: ReturnType<typeof createStyles>;
	Colors: Palette;
}) => (
	<TouchableOpacity
		style={styles.row}
		activeOpacity={onPress ? 0.7 : 1}
		disabled={!onPress}
		accessibilityRole="button"
		accessibilityState={{ disabled: !onPress }}
		onPress={onPress}>
		<View style={styles.rowIcon}>
			<IconComponent type="materialCommunityIcons" name={icon} size={18} color={Colors.primaryDark} />
		</View>
		<Text style={[styles.rowLabel, styles.rowLabelFill]} numberOfLines={1} ellipsizeMode="tail">
			{label}
		</Text>
		{!!value && (
			<Text style={styles.rowValue} numberOfLines={1} ellipsizeMode="tail">
				{value}
			</Text>
		)}
		{right ?? (onPress ? <IconComponent type="materialIcons" name="chevron-right" size={20} color={Colors.textMuted} /> : null)}
	</TouchableOpacity>
);

/**
 * 설정 — 앱 공유, 테마, 글씨체, 소리, 알림, 리포트, 초기화, 권한, 앱 정보.
 */
const LifeSettingScreen = () => {
	// 오전/오후 표기는 언어마다 다르다 — toTimeLabel 에 넘겨 준다
	const meridiem = { am: '오전', pm: '오후' };
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const guide = useCharacterGuideOnce('life-setting');
	const dispatch = useDispatch();
	const { mode: themeMode, setMode: setThemeMode, isDark } = useTheme();
	const life = useLife();
	const pet = usePet();
	const { streak } = useStreak();
	const run = useAnimationRunner();
	const enterStyle = useScreenEnter();

	const [sfx, setSfx] = useState(isSfxEnabled);
	const [bgm, setBgm] = useState(isBgmEnabled);
	const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
	const [appsVisible, setAppsVisible] = useState(false);
	const [termsVisible, setTermsVisible] = useState(false);
	const [openSourceVisible, setOpenSourceVisible] = useState(false);
	/** 릴리즈 빌드에서도 개발용 섹션을 볼 수 있게 — 버전 행 7번 탭으로 해제. 앱 재시작 시 다시 숨김 */
	const [devUnlocked, setDevUnlocked] = useState(__DEV__);
	const versionTaps = useRef(0);
	const onTapVersion = () => {
		if (devUnlocked) return;
		versionTaps.current += 1;
		const left = 7 - versionTaps.current;
		if (left <= 0) {
			setDevUnlocked(true);
			showToast('개발용 메뉴를 열었어요', 'code-tags');
		} else if (left <= 3) {
			showToast(`${left}번 더 누르면 개발용 메뉴가 열려요`, 'gesture-tap');
		}
	};
	const [permissions, setPermissions] = useState<AppPermissionStatus[]>([]);
	const [showPicker, setShowPicker] = useState(false);
	/** 피커를 굴리는 동안의 임시 시각 — iOS 스피너는 굴리는 내내 값이 올라와 화면 값만 먼저 바꾸고 '완료'에서 저장한다 */
	const [time, setTime] = useState({ hour: life.reminder.hour, minute: life.reminder.minute });
	/** 피커가 닫혀 있을 때는 저장된 값이 곧 화면 값이다 */
	const shownTime = showPicker ? time : life.reminder;
	/** 초기화 직전 백업 — 되돌리기를 누르면 이 상태로 복원한다 */
	const undoSnapshot = useRef<LifeState | null>(null);
	/**
	 * 같은 시점의 이식 화면(통계·오답노트·타워) 기록 백업 — redux 와 함께 지우고 함께 되돌린다.
	 * 값이 아니라 '지우는 중인 약속'을 들고 있는다 — 지우기가 끝나기 전에 되돌리기를 눌러도 백업을 놓치지 않는다.
	 */
	const undoPorted = useRef<Promise<PortedSnapshot> | null>(null);

	/** 테마 세그먼트 — 선택 칸을 미끄러지듯 옮긴다. 칸 너비는 실제로 그려진 뒤에야 알 수 있어 onLayout 으로 받는다 */
	const themeIndex = Math.max(0, THEME_OPTIONS.findIndex((item) => item.key === themeMode));
	const [segWidth, setSegWidth] = useState(0);
	const segSlot = segWidth > 0 ? (segWidth - SEG_PADDING * 2) / THEME_OPTIONS.length : 0;
	const segAnim = useRef(new Animated.Value(themeIndex)).current;
	/** 알림 시각 영역 — 스위치를 켤 때만 아래로 펼쳐진다 */
	const alarmAnim = useRef(new Animated.Value(life.reminder.enabled ? 1 : 0)).current;

	useEffect(() => {
		run(Animated.spring(segAnim, { toValue: themeIndex, friction: 9, tension: 110, useNativeDriver: true }));
	}, [themeIndex, segAnim, run]);

	useEffect(() => {
		run(
			Animated.timing(alarmAnim, {
				toValue: life.reminder.enabled ? 1 : 0,
				duration: 220,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
		);
	}, [alarmAnim, life.reminder.enabled, run]);

	/** 권한 상태 조회 — 설정 앱에서 바꾸고 돌아올 수 있으므로 화면에 들어올 때마다 다시 읽는다 */
	const loadPermissions = useCallback(async () => {
		try {
			setPermissions(await getAppPermissionStatuses());
		} catch (e) {
			console.warn('권한 상태 조회 실패:', e);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			loadPermissions();
		}, [loadPermissions]),
	);

	/** 미설정 권한은 다시 요청하고, 차단된 권한은 시스템 설정 화면으로 보낸다 */
	const onPressPermission = async (key: AppPermissionStatus['key']) => {
		try {
			await requestAppPermission(key);
		} catch (e) {
			console.warn('권한 요청 실패:', e);
		}
		loadPermissions();
	};

	/** 효과음 on/off — 켤 때는 어떤 소리인지 한 번 들려 준다 */
	const onToggleSfx = (value: boolean) => {
		setSfxEnabled(value);
		setSfx(value);
		if (value) {
			// playPop 은 소음이라 무음 처리된 지 오래다 — 미리듣기가 조용해서 켠 티가 안 났다
			playComplete();
		}
		showToast(value ? '효과음을 켰어요' : '효과음을 껐어요', value ? 'volume-high' : 'volume-off');
	};

	/** 배경음 on/off — 끄면 재생 중인 배경음도 즉시 멈춘다 (setBgmEnabled 안에서 정리) */
	const onToggleBgm = (value: boolean) => {
		setBgmEnabled(value);
		setBgm(value);
		showToast(value ? '학습·퀴즈에서 배경음이 나와요' : '배경음을 껐어요', value ? 'music-note' : 'music-note-off');
	};

	/** 알림 저장 + 예약 — 권한이 없으면 스위치를 되돌린다 */
	const applyAlarm = async (next: LifeState['reminder'], message?: string) => {
		const ok = await applyReminder(next);
		if (!ok) {
			showToast('알림 권한이 없어요. 설정에서 허용해 주세요', 'bell-off-outline');
			return;
		}
		dispatch(setReminder(next));
		if (message) {
			showToast(message, 'bell-ring-outline');
		}
	};

	const onToggleAlarm = (enabled: boolean) => {
		if (!enabled) {
			setShowPicker(false);
		}
		applyAlarm({ ...life.reminder, enabled }, enabled ? `매일 ${toTimeLabel(life.reminder, meridiem)}에 알려 드릴게요` : '알림을 껐어요');
	};

	const onChangeTime = (event: DateTimePickerEvent, date?: Date) => {
		// 안드로이드는 다이얼로그라 고르거나 취소하면 바로 닫는다. 확정된 값 한 번만 들어온다
		if (Platform.OS === 'android') {
			setShowPicker(false);
			if (event.type === 'dismissed' || !date) {
				return;
			}
			const next = { enabled: true, hour: date.getHours(), minute: date.getMinutes() };
			setTime({ hour: next.hour, minute: next.minute });
			applyAlarm(next, `매일 ${toTimeLabel(next, meridiem)}에 알려 드릴게요`);
			return;
		}
		if (date) {
			setTime({ hour: date.getHours(), minute: date.getMinutes() });
		}
	};

	/** iOS 전용 — '완료'를 눌렀을 때 한 번만 저장·예약한다 */
	const onDonePicker = () => {
		setShowPicker(false);
		applyAlarm({ enabled: true, ...time }, `매일 ${toTimeLabel(time, meridiem)}에 알려 드릴게요`);
	};

	/**
	 * 종류별 초기화 실행.
	 * 지우기 직전 상태를 들고 있다가, 토스트가 사라지기 전까지 되돌릴 수 있게 한다.
	 */
	const onReset = () => {
		if (!resetTarget) {
			return;
		}
		undoSnapshot.current = life;
		// 기록은 redux 와 이식 화면 저장소 두 곳에 있다 — 한쪽만 지우면 통계 탭에 옛 숫자가 그대로 남는다
		undoPorted.current = clearPortedProgress(resetTarget === 'all' ? 'all' : 'progress');
		dispatch(resetTarget === 'all' ? resetAll() : resetProgress());
		// 초기화 토스트는 되돌릴 시간을 주기 위해 더 오래 띄운다
		showToast(RESET_META[resetTarget].done, 'delete-sweep-outline', { duration: 6000, actionLabel: '되돌리기', onAction: onUndoReset });
		setResetTarget(null);
	};

	/** 초기화 되돌리기 — 지우기 직전 상태를 그대로 다시 넣는다 */
	const onUndoReset = () => {
		const snapshot = undoSnapshot.current;
		if (!snapshot) {
			return;
		}
		dispatch(restoreLife(snapshot));
		undoSnapshot.current = null;
		// 이식 화면 기록도 같이 되돌린다 (지우기가 끝난 뒤 이어서 쓴다 — 화면은 redux 만 보고 그리므로 기다리지 않는다)
		undoPorted.current?.then(restorePortedProgress);
		undoPorted.current = null;
		showToast('초기화를 되돌렸어요', 'backup-restore');
	};

	/** 앱 자체를 공유한다 — 스토어 링크를 문구와 함께 보낸다 */
	const onShareApp = async () => {
		const androidUrl = GOOGLE_PLAY_STORE_URL.trim();
		const iosUrl = APP_STORE_URL.trim();
		if (!androidUrl && !iosUrl) {
			showToast('아직 스토어에 출시되지 않았어요', 'store-alert-outline');
			return;
		}
		const message = [
			'요즘 제가 재미있게 쓰고 있는 앱이 있어서 추천드려요! 😊',
			'',
			APP_NAME || '세계 상식 퀴즈',
			APP_DESCRIPTION,
			'',
			'👇 아래 링크에서 받아보세요',
			`• Android: ${androidUrl || '출시 예정입니다.'}`,
			'',
			`• iOS: ${iosUrl || '출시 예정입니다.'}`,
		]
			.filter((line, at) => at !== 3 || !!APP_DESCRIPTION)
			.join('\n');
		try {
			// iOS 는 url 을 따로 넘겨야 링크 미리보기가 붙는다
			await Share.share(Platform.OS === 'ios' ? { message, url: iosUrl || androidUrl, title: APP_NAME } : { message, title: APP_NAME });
		} catch (e) {
			console.warn('앱 공유 실패:', e);
		}
	};

	/** 최근 7일 성과를 텍스트로 공유한다 — 어디에 붙여 넣어도 읽히게 이미지 없이 보낸다 */
	const onShareReport = async () => {
		const since = DateUtils.nowTime() - 7 * 24 * 60 * 60 * 1000;
		const week = life.records.filter((item) => new Date(item.playedAt).getTime() >= since);
		const total = week.reduce((sum, item) => sum + item.total, 0);
		const correct = week.reduce((sum, item) => sum + item.correct, 0);
		const message = [
			`📘 ${APP_NAME || '세계 상식 퀴즈'} 이번 주 기록`,
			'',
			`· 연속 출석 ${streak}일`,
			`· 배운 항목 ${life.learned.length} / ${DOMAIN_ITEMS.length}개`,
			`· 퀴즈 ${week.length}판 · ${total}문제 중 ${correct}개 정답${total ? ` (${Math.round((correct / total) * 100)}%)` : ''}`,
			`· 타임 챌린지 최고 ${life.bestTime}점 · 타워 챌린지 최고 ${life.bestTower}층`,
			`· ${pet.petName} Lv.${pet.level} ${pet.stage.label}`,
		].join('\n');
		try {
			await Share.share({ message });
		} catch (e) {
			console.warn('리포트 공유 실패:', e);
		}
	};

	/** [DEV] 모든 단어를 학습 완료로 — 진도·뱃지 화면을 100% 상태로 바로 확인할 때 쓴다 */
	const onCompleteAllStudy = () => {
		dispatch(markLearned(DOMAIN_ITEMS.map((item) => item.id)));
		showToast(`항목 ${DOMAIN_ITEMS.length}개를 학습 완료로 두었어요`, 'school');
	};

	/** [DEV] 오늘의 퀴즈를 만점으로 끝낸 상태로 — 기록·미션·보상 화면을 바로 확인할 때 쓴다 */
	const onCompleteQuiz = () => {
		dispatch(devCompleteQuiz());
		showToast('오늘의 퀴즈를 만점 완료로 두었어요', 'clipboard-check-outline');
	};

	/** 가로 목록의 앱 카드 — 지금 플랫폼 스토어로 보낸다 (아직 안 나온 앱은 안내만) */
	const onOpenApp = async (app: CommonType.AppItem) => {
		const url = storeUrlOf(app);
		if (!url) {
			showToast('아직 출시 준비 중인 앱이에요', 'clock-outline');
			return;
		}
		playPop();
		try {
			await Linking.openURL(url);
		} catch {
			showToast('스토어를 열 수 없어요', 'alert-circle-outline');
		}
	};

	const storeUrl = Platform.OS === 'ios' ? APP_STORE_URL : GOOGLE_PLAY_STORE_URL;
	const confirm = resetTarget ? RESET_META[resetTarget] : null;

	return (
		<SafeAreaView style={styles.safe} edges={['left', 'right']}>
			<LifeHeader title="설정" subtitle="테마 · 글씨체 · 알림을 내 방식대로" onPressGuide={guide.open} />

			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>
				<Animated.View style={enterStyle}>
					{/* 앱 공유 — 학습 기록은 '나의 활동'에서 보므로 설정 맨 위는 앱을 알리는 자리로 쓴다 */}
					<View style={styles.shareCard}>
						<View style={styles.shareTitleRow}>
							<View style={styles.shareTitleIcon}>
								<IconComponent type="materialCommunityIcons" name="cellphone-check" size={16} color={Colors.primaryDeep} />
							</View>
							<Text style={styles.shareTitle}>앱이 마음에 드셨나요?</Text>
						</View>
						<Text style={styles.shareSubtitle}>가족이나 친구, 지인에게 유용한 앱을 함께 나눠보세요!</Text>
						<Image source={require('@/src/assets/mainIcon.webp')} style={styles.shareAppIcon} contentFit="contain" accessible={false} />
						<PressableScale style={styles.shareButton} accessibilityRole="button" onPress={onShareApp}>
							<IconComponent type="materialCommunityIcons" name="share-variant" size={18} color={Colors.textInverse} />
							<Text style={styles.shareButtonText}>공유하기</Text>
						</PressableScale>
					</View>

					{/* 화면 테마 — 라이트 / 다크 */}
					<Text style={styles.sectionTitle}>화면 테마</Text>
					<View style={styles.themeCard}>
						<View style={styles.segTrack} onLayout={(e) => setSegWidth(e.nativeEvent.layout.width)}>
							{segSlot > 0 && (
								<Animated.View
									style={[
										styles.segThumb,
										{
											width: segSlot,
											transform: [
												{
													translateX: segAnim.interpolate({
														inputRange: [0, THEME_OPTIONS.length - 1],
														outputRange: [0, segSlot * (THEME_OPTIONS.length - 1)],
													}),
												},
											],
										},
									]}
								/>
							)}
							{THEME_OPTIONS.map((item) => {
								const active = item.key === themeMode;
								return (
									<TouchableOpacity
										key={item.key}
										style={styles.segItem}
										activeOpacity={0.8}
										accessibilityRole="button"
										accessibilityState={{ selected: active }}
										onPress={() => {
											playPop();
											setThemeMode(item.key);
											showToast(`화면 테마를 ${item.label}(으)로 바꿨어요`, item.icon);
										}}>
										<IconComponent type="materialCommunityIcons" name={item.icon} size={16} color={active ? Colors.primaryDeep : Colors.textMuted} />
										<Text style={[styles.segLabel, active && styles.segLabelActive]}>{item.label}</Text>
									</TouchableOpacity>
								);
							})}
						</View>
						<Text style={styles.themeHint}>{THEME_OPTIONS[themeIndex].hint}</Text>
					</View>

					{/* 소리 — 효과음과 배경음을 따로 끈다 */}
					<Text style={styles.sectionTitle}>소리</Text>
					<View style={styles.card}>
						<View style={styles.row}>
							<View style={styles.rowIcon}>
								<IconComponent type="materialCommunityIcons" name={sfx ? 'volume-high' : 'volume-off'} size={18} color={Colors.primaryDark} />
							</View>
							<View style={styles.rowBody}>
								<Text style={styles.rowLabel}>효과음</Text>
								<Text style={styles.rowDesc}>정답·오답·출석 체크를 소리로 알려 줍니다</Text>
							</View>
							<Switch
								style={styles.switch}
								value={sfx}
								onValueChange={onToggleSfx}
								trackColor={{ false: Colors.borderStrong, true: Colors.primaryLight }}
								thumbColor={sfx ? Colors.primary : Colors.surface}
							/>
						</View>
						<View style={styles.divider} />
						<View style={styles.row}>
							<View style={styles.rowIcon}>
								<IconComponent type="materialCommunityIcons" name={bgm ? 'music-note' : 'music-note-off'} size={18} color={Colors.primaryDark} />
							</View>
							<View style={styles.rowBody}>
								<Text style={styles.rowLabel}>배경음</Text>
								<Text style={styles.rowDesc}>학습·퀴즈·챌린지를 하는 동안 잔잔하게 깔립니다</Text>
							</View>
							<Switch
								style={styles.switch}
								value={bgm}
								onValueChange={onToggleBgm}
								trackColor={{ false: Colors.borderStrong, true: Colors.primaryLight }}
								thumbColor={bgm ? Colors.primary : Colors.surface}
							/>
						</View>
					</View>

					{/* 알림 — 매일 같은 시각에 출석·오늘의 퀴즈를 알려 준다 */}
					<Text style={styles.sectionTitle}>알림</Text>
					<View style={styles.alarmCard}>
						<View style={styles.row}>
							<View style={styles.rowIcon}>
								<IconComponent type="materialCommunityIcons" name="bell-ring-outline" size={18} color={Colors.primaryDark} />
							</View>
							<View style={styles.rowBody}>
								<Text style={styles.rowLabel}>매일 학습 알림</Text>
								<Text style={styles.rowDesc}>
									{life.reminder.enabled ? `매일 ${toTimeLabel(life.reminder, meridiem)}에 알려 드려요` : '출석과 오늘의 퀴즈를 잊지 않게 알려 드려요'}
								</Text>
							</View>
							<Switch
								style={styles.switch}
								value={life.reminder.enabled}
								onValueChange={onToggleAlarm}
								trackColor={{ false: Colors.borderStrong, true: Colors.primaryLight }}
								thumbColor={life.reminder.enabled ? Colors.primary : Colors.surface}
							/>
						</View>

						{life.reminder.enabled && (
							<Animated.View
								style={{
									opacity: alarmAnim,
									transform: [{ translateY: alarmAnim.interpolate({ inputRange: [0, 1], outputRange: [-scaleHeight(6), 0] }) }],
								}}>
								<TouchableOpacity
									style={styles.timeButton}
									activeOpacity={0.8}
									onPress={() => {
										setTime({ hour: life.reminder.hour, minute: life.reminder.minute });
										setShowPicker((prev) => !prev);
									}}>
									<IconComponent type="materialCommunityIcons" name="clock-outline" size={16} color={Colors.primaryDeep} />
									<Text style={styles.timeText}>{toTimeLabel(shownTime, meridiem)}</Text>
									<Text style={styles.timeHint}>시간 변경</Text>
								</TouchableOpacity>

								{showPicker && (
									<View style={styles.pickerBox}>
										{/* 앱 테마와 기기 테마가 다르면 피커가 시스템 색을 따라가 글자가 안 보인다 — 앱 테마를 넘겨 준다 */}
										<DateTimePicker
											value={DateUtils.createLocalDateAtTime(shownTime.hour, shownTime.minute)}
											mode="time"
											display={Platform.OS === 'ios' ? 'spinner' : 'default'}
											themeVariant={isDark ? 'dark' : 'light'}
											textColor={Colors.textStrong}
											onChange={onChangeTime}
										/>
										{Platform.OS === 'ios' && (
											<TouchableOpacity style={styles.doneButton} activeOpacity={0.85} onPress={onDonePicker}>
												<Text style={styles.doneText}>완료</Text>
											</TouchableOpacity>
										)}
									</View>
								)}
							</Animated.View>
						)}
					</View>

					{/* 학습 리포트 — 이번 주 기록을 텍스트로 보낸다 */}
					<Text style={styles.sectionTitle}>학습 리포트</Text>
					<View style={styles.card}>
						<Row icon="chart-box-outline" label="이번 주 성과 공유" onPress={onShareReport} styles={styles} Colors={Colors} />
					</View>

					{/* 데이터 초기화 — 지운 직후 토스트에서 되돌릴 수 있다 */}
					<Text style={styles.sectionTitle}>데이터 초기화</Text>
					<View style={styles.resetList}>
						{RESET_ORDER.map((target) => {
							const meta = RESET_META[target];
							return (
								<TouchableOpacity
									key={target}
									style={styles.resetRow}
									activeOpacity={0.85}
									accessibilityRole="button"
									onPress={() => setResetTarget(target)}>
									<View style={[styles.resetIcon, { backgroundColor: Colors[meta.tint] }]}>
										<IconComponent type="materialCommunityIcons" name={meta.icon} size={18} color={Colors[meta.color]} />
									</View>
									<View style={styles.resetBody}>
										<Text style={[styles.resetLabel, { color: Colors[meta.color] }]}>{meta.label}</Text>
										{/* 지우는 범위는 줄바꿈으로 다 보여 준다 — 한 줄로 잘리면 무엇이 지워지는지 알 수 없다 */}
										<Text style={styles.resetDesc}>{meta.desc}</Text>
									</View>
									<View style={[styles.resetChip, { backgroundColor: Colors[meta.tint] }]}>
										<Text style={[styles.resetChipText, { color: Colors[meta.color] }]}>초기화</Text>
									</View>
								</TouchableOpacity>
							);
						})}
					</View>

					{/* 권한 — 미설정이면 눌러서 바로 요청하거나 시스템 설정으로 이동한다 */}
					{permissions.length > 0 && (
						<>
							<Text style={styles.sectionTitle}>권한</Text>
							<View style={styles.card}>
								{permissions.map((item, index) => {
									const actionable = isPermissionActionable(item.status);
									return (
										<React.Fragment key={item.key}>
											{index > 0 && <View style={styles.divider} />}
											<TouchableOpacity
												style={styles.row}
												activeOpacity={actionable ? 0.7 : 1}
												disabled={!actionable}
												accessibilityRole="button"
												accessibilityState={{ disabled: !actionable }}
												onPress={() => onPressPermission(item.key)}>
												<View style={styles.rowIcon}>
													<IconComponent type="materialCommunityIcons" name={PERMISSION_ICON[item.key]} size={18} color={Colors.primaryDark} />
												</View>
												<View style={styles.rowBody}>
													<Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">
														{PERMISSION_LABEL[item.key]}
													</Text>
													<Text style={styles.rowDesc} numberOfLines={2} ellipsizeMode="tail">
														{PERMISSION_DESC[item.key]}
													</Text>
												</View>
												<View style={[styles.statusChip, actionable ? styles.statusChipOff : styles.statusChipOn]}>
													<Text style={[styles.statusChipText, actionable ? styles.statusChipTextOff : styles.statusChipTextOn]}>
														{toPermissionLabel(item.status)}
													</Text>
												</View>
												{actionable && <IconComponent type="materialIcons" name="chevron-right" size={20} color={Colors.textMuted} />}
											</TouchableOpacity>
										</React.Fragment>
									);
								})}
							</View>
							<Text style={styles.permissionNotice}>권한을 끄면 해당 기능만 동작하지 않고, 나머지 학습 기능은 그대로 사용할 수 있습니다.</Text>
						</>
					)}

					{/* 앱 정보 */}
					<Text style={styles.sectionTitle}>앱 정보</Text>
					<View style={styles.card}>
						{/* 안드로이드는 build.gradle(versionName/versionCode), iOS는 Xcode(MARKETING_VERSION/CURRENT_PROJECT_VERSION) 값을 그대로 읽는다 */}
						<Row icon="information-outline" label="버전" value={`${DeviceInfo.getVersion()} (${DeviceInfo.getBuildNumber()})`} onPress={onTapVersion} right={null} styles={styles} Colors={Colors} />
						<View style={styles.divider} />
						<Row icon="star-outline" label="스토어 리뷰 남기기" onPress={() => storeUrl && Linking.openURL(storeUrl)} styles={styles} Colors={Colors} />
						<View style={styles.divider} />
						<Row icon="apps" label="개발자의 다른 앱" onPress={() => setAppsVisible(true)} styles={styles} Colors={Colors} />
						<View style={styles.divider} />
						<Row icon="file-document-outline" label="이용약관 / 개인정보처리방침" onPress={() => setTermsVisible(true)} styles={styles} Colors={Colors} />
						<View style={styles.divider} />
						<Row icon="code-tags" label="오픈소스 라이선스" onPress={() => setOpenSourceVisible(true)} styles={styles} Colors={Colors} />
					</View>

					{/* 개발자의 다른 앱 — 가로로 넘겨 보고, 카드를 누르면 스토어로 바로 간다 */}
					<View style={styles.appsHeader}>
						<Text style={styles.appsTitle}>개발자의 다른 앱</Text>
						<TouchableOpacity
							style={styles.appsMore}
							onPress={() => setAppsVisible(true)}
							hitSlop={8}
							accessibilityRole="button"
							accessibilityLabel="개발자의 다른 앱 전체 보기">
							<Text style={styles.appsMoreText}>전체 보기</Text>
							<IconComponent type="materialIcons" name="chevron-right" size={16} color={Colors.textMuted} />
						</TouchableOpacity>
					</View>
					<FlatList
						horizontal
						data={COMMON_APPS_DATA.Apps}
						keyExtractor={(item) => String(item.id)}
						showsHorizontalScrollIndicator={false}
						style={styles.appsList}
						contentContainerStyle={styles.appsListContent}
						renderItem={({ item }) => (
							<PressableScale
								style={styles.appCard}
								onPress={() => onOpenApp(item)}
								accessibilityRole="button"
								accessibilityLabel={`${item.title} 스토어로 이동`}>
								<View style={styles.appIconWrap}>
									<Image source={item.icon} style={styles.appIcon} contentFit="contain" />
								</View>
								{NEW_APP_IDS.has(item.id) && (
									<View style={styles.appNewBadge}>
										<Text style={styles.appNewBadgeText}>NEW</Text>
									</View>
								)}
								<Text style={styles.appName} numberOfLines={1}>
									{item.title}
								</Text>
								<Text style={styles.appDesc} numberOfLines={2}>
									{item.desc}
								</Text>
							</PressableScale>
						)}
					/>

					{/* 개발용 — 진도 100% 화면을 손으로 채우지 않고 바로 보기 위한 단축키. 개발 빌드 또는 버전 7번 탭 후 보인다 */}
					{devUnlocked && (
						<>
							<Text style={styles.sectionTitle}>개발용 (DEV)</Text>
							<View style={styles.card}>
								<Row icon="school" label="모든 항목 학습 완료로 설정" onPress={onCompleteAllStudy} styles={styles} Colors={Colors} />
								<View style={styles.divider} />
								<Row icon="clipboard-check-outline" label="오늘의 퀴즈 완료로 설정" onPress={onCompleteQuiz} styles={styles} Colors={Colors} />
							</View>
						</>
					)}

					<Text style={styles.dataNotice}>
						{`세계의 수도·랜드마크·신화·천체·스포츠 ${DOMAIN_ITEMS.length.toLocaleString()}개를 ${DOMAIN_CATEGORIES.length}개 주제로 나눠 담고 있습니다.`}
					</Text>
				</Animated.View>
			</ScrollView>

			<CmmDelConfirmModal
				visible={!!confirm}
				title={confirm ? confirm.title : undefined}
				summary={confirm ? confirm.summary : undefined}
				confirmText="지우기"
				onCancel={() => setResetTarget(null)}
				onConfirm={onReset}
			/>
			<DeveloperAppsModal visible={appsVisible} onClose={() => setAppsVisible(false)} />
			<TermsOfServiceModal visible={termsVisible} onClose={() => setTermsVisible(false)} />
			<OpenSourceModal visible={openSourceVisible} onClose={() => setOpenSourceVisible(false)} />
			{/* 화면 사용법 — 처음 들어오면 한 번, 이후에는 헤더의 물음표로 다시 본다 */}
			<LifeCharacterGuide visible={guide.visible} onClose={guide.close} lines={[
				'테마·글씨체·소리·알림을 내 방식대로 바꾸는 곳이에요.',
				'맨 위에서 앱을 공유하고, 맨 아래 앱 정보에서 개발자의 다른 앱도 볼 수 있어요.',
			]} />
		</SafeAreaView>
	);
};

/** 세그먼트 트랙 안쪽 여백 — 선택 칸 너비 계산에도 같은 값을 쓴다 */
const SEG_PADDING = scaleWidth(4);

const createStyles = (Colors: Palette, HanjaFont: HanjaFontStyle) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },
		content: { ...Layout.column, paddingHorizontal: Spacing.lg, paddingTop: SpacingV.xs, paddingBottom: SpacingV.xxxl },

		// 앱 공유 — 설정 맨 위. 가운데 정렬 한 덩어리로 두고 아이콘·문구·버튼 간격을 같은 결로 맞춘다
		shareCard: {
			alignItems: 'center',
			paddingHorizontal: Spacing.lg,
			paddingVertical: SpacingV.xl,
			borderRadius: Radius.xl,
			borderWidth: 1,
			borderColor: Colors.primaryLight,
			backgroundColor: Colors.primaryBg,
		},
		shareTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		shareTitleIcon: {
			width: scaleWidth(28),
			height: scaleWidth(28),
			borderRadius: Radius.pill,
			backgroundColor: Colors.surface,
			alignItems: 'center',
			justifyContent: 'center',
		},
		shareTitle: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.textStrong },
		shareSubtitle: { marginTop: SpacingV.sm, fontSize: Typography.bodySm, color: Colors.textSecondary, textAlign: 'center' },
		shareAppIcon: { width: scaleWidth(76), height: scaleWidth(76), marginTop: SpacingV.lg, borderRadius: Radius.lg },
		shareButton: {
			alignSelf: 'stretch',
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: Spacing.sm,
			marginTop: SpacingV.lg,
			height: scaleHeight(48),
			borderRadius: Radius.lg,
			backgroundColor: Colors.primarySurface,
		},
		shareButtonText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textInverse },

		// 설정만 예외 — 다른 화면의 섹션 제목(18pt)이 아니라 목록 그룹 라벨이라 작고 흐리게 둔다 (iOS 설정 앱과 같은 결)
		sectionTitle: { marginTop: SpacingV.xl, marginBottom: SpacingV.sm, fontSize: Typography.bodySm, fontWeight: FontWeight.bold, color: Colors.textMuted },
		card: { borderRadius: Radius.xl, backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, ...Shadow.card },

		themeCard: { borderRadius: Radius.xl, backgroundColor: Colors.surface, padding: Spacing.md, ...Shadow.card },
		segTrack: { flexDirection: 'row', padding: SEG_PADDING, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt },
		segThumb: { position: 'absolute', top: SEG_PADDING, bottom: SEG_PADDING, left: SEG_PADDING, borderRadius: Radius.md, backgroundColor: Colors.surface, ...Shadow.card },
		segItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scaleWidth(5), height: scaleHeight(40), borderRadius: Radius.md },
		segLabel: { fontSize: Typography.bodySm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
		segLabelActive: { color: Colors.primaryDeep, fontWeight: FontWeight.bold },
		themeHint: { marginTop: SpacingV.sm, paddingHorizontal: Spacing.xs, fontSize: Typography.caption, color: Colors.textMuted },

		row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: scaleHeight(58) },
		rowIcon: { width: scaleWidth(32), height: scaleWidth(32), borderRadius: Radius.md, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
		rowBody: { flex: 1 },
		// 기본 스위치는 줄 높이에 비해 커서 눈에 먼저 들어온다 — 조금 줄이고 줄 한가운데에 고정한다
		switch: { alignSelf: 'center', transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] },
		// flex 는 세로로 쌓이는 rowBody 안에서 높이를 0으로 만들어 글자가 잘린다 — 가로로 늘려야 할 때만 rowLabelFill 을 함께 준다
		rowLabel: { fontSize: Typography.body, color: Colors.text },
		rowLabelFill: { flex: 1 },
		rowDesc: { marginTop: scaleHeight(2), fontSize: Typography.caption, color: Colors.textMuted, lineHeight: scaledSize(17) },
		rowValue: { flexShrink: 1, maxWidth: '45%', fontSize: Typography.bodySm, color: Colors.textMuted },
		// 지금 고른 글씨체로 그려 설정 화면에서 바로 확인할 수 있게 한다
		fontRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 1 },
		fontPreview: { ...HanjaFont, fontSize: Typography.h3, lineHeight: Math.round(Typography.h3 * 1.3), color: Colors.primaryDeep },
		fontValue: { flexShrink: 1, fontSize: Typography.bodySm, color: Colors.textMuted },
		divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: scaleWidth(44) },

		alarmCard: { borderRadius: Radius.xl, backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingBottom: SpacingV.md, ...Shadow.card },
		timeButton: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.sm,
			paddingHorizontal: Spacing.lg,
			height: scaleHeight(44),
			borderRadius: Radius.lg,
			backgroundColor: Colors.primaryBg,
		},
		timeText: { flex: 1, fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.primaryDeep },
		timeHint: { fontSize: Typography.caption, color: Colors.primaryDark },
		pickerBox: { marginTop: SpacingV.sm, alignItems: 'center' },
		doneButton: { alignSelf: 'stretch', height: scaleHeight(44), borderRadius: Radius.lg, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
		doneText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textInverse },

		resetList: { gap: SpacingV.sm },
		resetRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			paddingHorizontal: Spacing.lg,
			paddingVertical: SpacingV.md,
			borderRadius: Radius.lg,
			borderWidth: 1,
			borderColor: Colors.border,
			backgroundColor: Colors.surface,
		},
		resetIcon: { width: scaleWidth(38), height: scaleWidth(38), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
		resetBody: { flex: 1 },
		resetLabel: { fontSize: Typography.body, fontWeight: FontWeight.bold },
		resetDesc: { marginTop: scaleHeight(3), fontSize: Typography.caption, color: Colors.textMuted, lineHeight: scaledSize(17) },
		resetChip: { paddingHorizontal: Spacing.md, height: scaleHeight(30), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
		resetChipText: { fontSize: Typography.caption, fontWeight: FontWeight.bold },

		statusChip: { paddingHorizontal: Spacing.md, height: scaleHeight(26), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
		statusChipOn: { backgroundColor: Colors.primarySoft },
		statusChipOff: { backgroundColor: Colors.errorSoft },
		statusChipText: { fontSize: Typography.caption, fontWeight: FontWeight.bold },
		statusChipTextOn: { color: Colors.primaryDeep },
		statusChipTextOff: { color: Colors.errorDark },
		permissionNotice: { marginTop: SpacingV.sm, paddingHorizontal: Spacing.xs, fontSize: Typography.caption, color: Colors.textMuted, lineHeight: scaledSize(17) },

		dataNotice: { marginTop: SpacingV.xl, fontSize: Typography.caption, color: Colors.textMuted, textAlign: 'center', lineHeight: scaledSize(18) },

		// 개발자의 다른 앱 — 제목 줄은 다른 섹션 제목과 위아래 간격을 똑같이 맞춘다
		appsHeader: { marginTop: SpacingV.xl, marginBottom: SpacingV.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
		appsTitle: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold, color: Colors.textMuted },
		appsMore: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
		appsMoreText: { fontSize: Typography.caption, fontWeight: FontWeight.semibold, color: Colors.textMuted },
		// 가로 목록만 본문 좌우 여백(Spacing.lg)을 벗어나 화면 끝까지 흐른다 — 카드가 가장자리에서 잘려 "더 있다"가 보인다.
		// 벗어난 만큼은 contentContainer 의 padding 으로 되돌려 첫 카드와 마지막 카드의 여백을 본문과 맞춘다.
		appsList: { marginHorizontal: -Spacing.lg },
		// 위아래 padding 은 카드 그림자가 잘리지 않게 두는 자리
		appsListContent: { paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.xs, gap: Spacing.md },
		appCard: { width: scaleWidth(124), paddingVertical: SpacingV.md, paddingHorizontal: Spacing.sm, borderRadius: Radius.xl, backgroundColor: Colors.surface, alignItems: 'center', ...Shadow.card },
		appIconWrap: { width: scaleWidth(56), height: scaleWidth(56), borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.surfaceAlt },
		appIcon: { width: '100%', height: '100%' },
		// 배지는 아이콘 밖(카드 모서리)에 둔다 — 아이콘 상자는 overflow:hidden 이라 안에 두면 잘린다
		appNewBadge: { position: 'absolute', top: scaleHeight(6), right: scaleWidth(6), paddingHorizontal: Spacing.xs, paddingVertical: scaleHeight(2), borderRadius: Radius.pill, backgroundColor: Colors.error },
		appNewBadgeText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: Colors.textInverse, letterSpacing: 0.3 },
		appName: { marginTop: SpacingV.sm, fontSize: Typography.bodySm, fontWeight: FontWeight.semibold, color: Colors.text, textAlign: 'center' },
		appDesc: { marginTop: scaleHeight(2), fontSize: Typography.caption, color: Colors.textMuted, textAlign: 'center', lineHeight: scaledSize(15) },
	});

export default LifeSettingScreen;
