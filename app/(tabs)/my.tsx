/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import withRemountOnFocus from '@/src/screens/common/withRemountOnFocus';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Linking, Image, Platform, FlatList } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
import { router, useFocusEffect } from 'expo-router';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { showAlert } from '@/src/screens/common/modal/ConfirmModal';

import { setSoundEnabled, isSoundEnabled, playCorrect } from '@/src/utils/SoundUtils';
import { resetCharacterGuideSeen } from '@/src/screens/common/CharacterGuide';
import { setBgmEnabled, isBgmEnabled } from '@/src/utils/BgmUtils';
import Colors, { withAlpha, getThemeMode, type ThemeMode } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Layout, CardSurface, Tracking } from '@/src/const/ConstDesign';
import { scaledSize, scaleWidth, scaleHeight } from '@/src/utils';
import DailyWordService from '@/src/services/DailyWordService';
import LearnProgressService from '@/src/services/LearnProgressService';
import LearnHubService from '@/src/services/LearnHubService';
import AttendanceService from '@/src/services/AttendanceService';
import PetService from '@/src/services/PetService';
import LeagueService from '@/src/services/LeagueService';
import TestHistoryService from '@/src/services/TestHistoryService';
import RankingService from '@/src/services/RankingService';
import { RequestNotificationPermission, CancelDailyWordReminder } from '@/src/utils/NotifactionHelper';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import DailyAlarmModal from '@/src/screens/modal/DailyAlarmModal';
import ResetConfirmModal from '@/src/screens/modal/ResetConfirmModal';
import BackupRestoreModal from '@/src/screens/modal/BackupRestoreModal';
import BackupService from '@/src/services/BackupService';
import OnboardingService, { INTEREST_OPTIONS, type Interest } from '@/src/services/OnboardingService';
import { devResetAdsRemoved } from '@/src/services/PurchaseService';
import { shareApp as appShare } from '@/src/utils/AppShare';
import { openContactMail } from '@/src/utils/ReportIssue';
import { COMMON_APPS_DATA } from '@/src/const/common/CommonAppsData';
import InAppRemoveAdsSection from '@/src/screens/common/setting/InAppRemoveAdsSection';
import { CommonType } from '@/src/types/CommonType';
import { useToast } from '@/src/context/ToastContext';
import { setThemeMode } from '@/src/utils/ThemeReload';
import TabHeader from '@/src/screens/common/TabHeader';
import { TAB_ILLUSTRATIONS } from '@/src/const/ConstTabIllustrationAssets';
import { themed } from '@/src/utils/ThemedStyles';

interface ResetRow {
	key: string;
	label: string;
	desc: string;
	icon: string;
	run: () => Promise<void>;
}

/** 설정 서브 타이틀 — 아이콘 칩 + 제목 + 헤어라인으로 구분감을 준다 */
const SubHead: React.FC<{ label: string; icon: string; tint?: string }> = ({ label, icon, tint = Colors.primary }) => (
	<View style={styles.subHead}>
		<View style={[styles.subHeadIcon, { backgroundColor: withAlpha(tint, '14') }]}>
			<IconComponent type="materialIcons" name={icon} size={scaledSize(14)} color={tint} />
		</View>
		<Text style={styles.subHeadLabel} numberOfLines={2} ellipsizeMode="tail">{label}</Text>
		<View style={styles.subHeadLine} />
	</View>
);

/**
 * 설정 (통합 세계 상식 퀴즈)
 * - 알림 / 데이터 초기화 / 정보
 */
/** 화면 테마 — OS 설정을 따르지 않고 여기서 고른 값이 곧 앱 테마다. */
const THEME_OPTIONS: { key: ThemeMode; label: string; desc: string; icon: string }[] = [
	{ key: 'light', label: '라이트', desc: '밝은 배경으로 보여요 (기본)', icon: 'light-mode' },
	{ key: 'dark', label: '다크', desc: '어두운 배경으로 눈부심을 줄여요', icon: 'dark-mode' },
];

const Setting = () => {
	const [reminderOn, setReminderOn] = useState(false);
	const [showAlarm, setShowAlarm] = useState(false);
	const [showBackup, setShowBackup] = useState(false);
	const [interest, setInterestState] = useState<Interest>('both');
	const [theme, setTheme] = useState<ThemeMode>(() => getThemeMode());
	const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
	const [bgmOn, setBgmOn] = useState(() => isBgmEnabled());

	const toggleSound = (v: boolean) => {
		setSoundOn(v);
		setSoundEnabled(v);
		if (v) playCorrect(); // 켤 때 바로 들려주기
		showToast(v ? '효과음을 켰어요' : '효과음을 껐어요', v ? 'volume-up' : 'volume-off');
	};
	const testSound = () => {
		playCorrect();
		showToast('효과음을 재생했어요. 소리가 없으면 기기 음량·무음 모드를 확인해 주세요', 'volume-up');
	};
	/** 테마 변경 — 리마운트 없이 그 자리에서 반영된다. 바뀐 색 자체가 피드백이라 토스트는 띄우지 않는다. */
	const changeTheme = (mode: ThemeMode) => {
		if (mode === theme) return;
		setTheme(mode);
		setThemeMode(mode);
	};
	const toggleBgm = (v: boolean) => {
		setBgmOn(v);
		setBgmEnabled(v);
		showToast(v ? '배경음악을 켰어요' : '배경음악을 껐어요', v ? 'music-note' : 'music-off');
	};
	const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
	const [trackingGranted, setTrackingGranted] = useState<boolean | null>(null);
	const { showToast } = useToast();

	const openAppSettings = () => Linking.openSettings().catch(() => { });
	const scrollRef = useRef<any>(null);
	useScrollToTop(scrollRef);

	// 함께 쓰기 좋은 상식·퀴즈 앱만 노출 (수픽·한국어 상식 퀴즈·한자 급수 퀴즈·무한 수학 퀴즈·냥픽·멍픽)
	const RELATED_APP_IDS = [3, 24, 23, 19, 8, 6];
	const previewApps = RELATED_APP_IDS.map((id) => COMMON_APPS_DATA.Apps.find((a) => a.id === id)).filter(Boolean) as typeof COMMON_APPS_DATA.Apps;
	// 맨 아래 앱 목록의 NEW 배지 — id 가 큰(최근 등록) 2개에만 붙인다
	const newAppIds = new Set(
		[...COMMON_APPS_DATA.Apps]
			.sort((a, b) => b.id - a.id)
			.slice(0, 2)
			.map((app) => app.id),
	);
	const openStore = (app: CommonType.AppItem) => {
		const url = (Platform.OS === 'android' ? app.android : app.ios) || app.android || app.ios;
		if (url) Linking.openURL(url).catch(() => { });
	};

	const refreshPermissionState = useCallback(() => {
		notifee.getNotificationSettings()
			.then((s) => {
				setNotifGranted(s.authorizationStatus >= AuthorizationStatus.AUTHORIZED);
			})
			.catch(() => {
				setNotifGranted(null);
			});
		if (Platform.OS === 'ios') {
			check(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY)
				.then((r) => setTrackingGranted(r === RESULTS.GRANTED))
				.catch(() => setTrackingGranted(null));
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			// 탭에 들어올 때마다 열려 있던 팝업은 닫는다
			setShowAlarm(false);
			DailyWordService.isReminderOn().then(setReminderOn);
			OnboardingService.getInterest().then(setInterestState);
			refreshPermissionState();
		}, [refreshPermissionState]),
	);

	const manageNotificationPermission = async () => {
		if (notifGranted) return openAppSettings();
		const granted = await RequestNotificationPermission();
		if (granted) setNotifGranted(true);
		else openAppSettings();
	};

	const manageTrackingPermission = async () => {
		if (Platform.OS !== 'ios') return;
		const permission = PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY;
		const current = await check(permission);
		if (current === RESULTS.DENIED) {
			const result = await request(permission);
			setTrackingGranted(result === RESULTS.GRANTED);
			return;
		}
		openAppSettings();
	};



	// 데이터 초기화 — 전용 모달 팝업으로 대상/영향 범위를 보여준 뒤 실행
	const [resetTarget, setResetTarget] = useState<{ label: string; desc?: string; icon?: string; run: () => Promise<void> } | null>(null);
	const [resetBusy, setResetBusy] = useState(false);
	// 초기화 안내 팝업 지연 타이머 — 화면을 벗어나면 정리한다
	const resetAlertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => () => { if (resetAlertTimer.current) clearTimeout(resetAlertTimer.current); }, []);

	const confirmReset = (label: string, run: () => Promise<void>, desc?: string, icon?: string) => {
		setResetTarget({ label, run, desc, icon });
	};

	const runReset = async () => {
		if (!resetTarget || resetBusy) return;
		const { label, run } = resetTarget;
		setResetBusy(true);
		let ok = true;
		try {
			await run();
		} catch {
			ok = false;
		} finally {
			setResetBusy(false);
			setResetTarget(null);
		}
		// 확인 모달이 완전히 닫힌 뒤에 안내 모달을 띄운다(둘 다 RN Modal — 겹치면 터치가 먹통)
		if (resetAlertTimer.current) clearTimeout(resetAlertTimer.current);
		resetAlertTimer.current = setTimeout(() => {
			if (ok) showAlert('초기화 완료', `${label}이(가) 초기화되었습니다.`, 'check-circle');
			else showAlert('초기화 실패', `${label} 초기화 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.`, 'error-outline');
		}, 260);
	};

	// 초기화 항목은 사용자가 실제로 구분해서 인지하는 3가지(학습 / 퀴즈 / 타임챌린지)로만 둔다.
	// 나머지(즐겨찾기·출석·펫·리그·테스트 등)는 '모두 초기화'에서 함께 지워진다.
	const RESETS: ResetRow[] = [
		{ key: 'learn', label: '학습', desc: '카드·숏폼으로 학습 완료한 기록 초기화', icon: 'menu-book', run: () => LearnProgressService.clearLearning() },
		{ key: 'quiz', label: '퀴즈', desc: '점수·정답률·연속·오답노트·오늘의 퀴즈 초기화', icon: 'quiz', run: () => resetQuizRecords() },
		{ key: 'time', label: '타임챌린지', desc: '타임챌린지 최고 점수·플레이 기록·랭킹 점수 초기화', icon: 'timer', run: () => resetTimeChallenge() },
	];

	/** 오늘의 퀴즈 관련 저장키 (완료일·결과 스냅샷·히스토리·발급목록·알림설정) */
	const TODAY_QUIZ_KEYS = ['TODAY_QUIZ_DONE_DATE', 'TODAY_QUIZ_RESULT', 'TODAY_QUIZ_HISTORY', 'TodayQuizList', 'TODAY_QUIZ_ALARM_ON'];

	/** 홈 화면 상태 저장키 — 남겨두면 초기화 후에도 커리큘럼 카드가 숨겨진 채로 남는다 */
	const HOME_STATE_KEYS = ['HOME_CURRICULUM_CELEBRATED', 'HOME_CURRICULUM_OPEN', 'HOME_SEEN_CHAR_LEVEL', 'HOME_RECOMMEND_DISMISS_DATE', 'HOME_SELECTED_CHARACTER', 'HOME_DAILY_GOAL', 'HOME_ATT_POPUP_DATE'];

	/** 오늘의 퀴즈 기록 + 홈 '오늘의 목표'(오늘 푼 문제/학습 수) 초기화 */
	const clearTodayQuiz = async () => {
		await AsyncStorage.multiRemove(TODAY_QUIZ_KEYS);
		await LearnProgressService.clearTodayProgress();
	};

	/** 랭킹 서버 초기화 — 실패(RPC 미배포·네트워크)하면 조용히 넘기지 않고 알린다 */
	const resetRankingWithNotice = async (opts?: { keepTimeBest?: boolean }) => {
		const ok = await RankingService.reset(opts);
		if (!ok) showToast('랭킹 서버 점수는 지우지 못했어요. 잠시 후 다시 시도해 주세요', 'cloud-off');
	};

	/** 퀴즈 초기화 — 점수·정답률·오답노트 + 오늘의 퀴즈. 타임챌린지 최고점은 건드리지 않는다 */
	const resetQuizRecords = async () => {
		await LearnProgressService.clearQuiz();
		await clearTodayQuiz();
		await resetRankingWithNotice({ keepTimeBest: true });
	};

	/** 타임챌린지 초기화 — 로컬 최고점/플레이 기록 + 서버 타임 랭킹 (누적 점수는 유지) */
	const resetTimeChallenge = async () => {
		await LearnProgressService.clearTimeChallenge();
		await resetRankingWithNotice();
	};

	const resetAll = () =>
		confirmReset(
			'모두',
			async () => {
			// 한 단계가 실패해도 나머지가 반드시 실행되도록 독립 처리(과거: 순차 await → 앞단계 실패 시 오늘의 퀴즈 초기화 누락)
			await Promise.allSettled([
				// 랭킹 초기화는 지운 뒤 '남은 점수'를 다시 제출하므로 통계가 비워진 뒤에 실행해야 한다
				LearnProgressService.clearAll().then(() => resetRankingWithNotice()),
				AttendanceService.reset(),
				PetService.reset(),
				LeagueService.reset(),
				DailyWordService.reset(),
				TestHistoryService.clearAll(),
				clearTodayQuiz(),
				AsyncStorage.multiRemove(HOME_STATE_KEYS),
				resetCharacterGuideSeen(),
				OnboardingService.clear(),
				CancelDailyWordReminder(),
			]);
			setReminderOn(false);
			},
			'즐겨찾기·오답노트·통계·점수·출석·펫·리그·테스트 기록 등 앱의 모든 학습 데이터',
			'delete-forever',
		);

	// ── 개발용(__DEV__): 진행상태 강제 완료 처리 ──
	// 모든 퀴즈 완료: 도메인별 전체 문항을 정답으로 기록 (집계형 stats라 단일 write)
	const devCompleteAllQuizzes = async () => {
		const entries = LearnHubService.getDomainList().flatMap((d) =>
			Array.from({ length: d.total }, () => ({ domain: d.key, domainTitle: d.title, correct: true })),
		);
		await LearnProgressService.recordResults(entries);
		showToast('모든 퀴즈를 완료 처리했어요', 'check-circle');
	};

	// 모든 학습 완료: 도메인별 전체 학습카드 uid를 학습완료(STUDIED)로 기록
	// (개별 addStudied 반복은 대용량에서 O(n²) → 기존 저장 구조/키 그대로 1회 저장)
	const devCompleteAllLearning = async () => {
		const studied: Record<string, string[]> = {};
		LearnHubService.getDomainList().forEach((d) => {
			studied[d.key] = LearnHubService.getDomain(d.key).getStudyCards().map((c) => c.uid);
		});
		await AsyncStorage.setItem('LEARN_STUDIED', JSON.stringify(studied));
		showToast('모든 학습을 완료 처리했어요', 'check-circle');
	};

	// 광고제거 되돌리기(테스트용): 강제 미구매 상태로 전환 → 광고가 다시 노출됨
	const devRevertAdsRemoved = async () => {
		await devResetAdsRemoved();
		showToast('미구매 상태로 전환했어요 (테스트용)', 'undo');
	};

	const shareApp = () => appShare();
	const contact = () => { void openContactMail(); };

	return (
		<View style={styles.safe}>
			<ScrollView ref={scrollRef} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
				{/* 헤더를 스크롤 안에 두어 목록과 함께 밀려 올라가게 한다 */}
				<TabHeader title="설정" sub="알림과 학습 환경을 나에게 맞게 설정해요" illustration={TAB_ILLUSTRATIONS.my} />
				<FadeInUp>
					{/* 공유 카드 — 앱 아이콘과 함께 상단 강조 */}
					<View style={styles.shareCard}>
						<View style={styles.shareTitleRow}>
							<View style={styles.shareTitleChip}>
								<IconComponent type="materialIcons" name="mobile-friendly" size={scaledSize(16)} color={Colors.primary} />
							</View>
							<Text style={styles.shareCardTitle}>앱이 마음에 드셨나요?</Text>
						</View>
						<Text style={styles.shareCardSub}>가족이나 친구, 지인에게 유용한 앱을 함께 나눠보세요!</Text>
						<View style={styles.shareIconWrap}>
							{/* 앱 메인 아이콘(mainIcons) — 예전 아이콘이 남아 있었다 */}
							<Image source={require('@/src/assets/mainIcon.webp')} style={styles.shareIconImg} resizeMode="contain" />
						</View>
						<TouchableOpacity style={styles.shareCardBtn} onPress={shareApp} activeOpacity={0.85}>
							<IconComponent type="materialIcons" name="share" size={scaledSize(16)} color={Colors.textInverse} />
							<Text style={styles.shareCardBtnText}>공유하기</Text>
						</TouchableOpacity>
					</View>

					{/* 광고 제거 (인앱 결제) */}
					<InAppRemoveAdsSection />

					{/* 알림 */}
					<SubHead label="알림" icon="notifications" />
					<View style={styles.card}>
						<TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => setShowAlarm(true)}>
							<View style={[styles.rowIcon, { backgroundColor: Colors.primarySoft }]}>
								<IconComponent type="materialIcons" name="notifications" size={scaledSize(20)} color={Colors.primary} />
							</View>
							<View style={styles.rowBody}>
								<Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">오늘의 상식 알림</Text>
								<Text style={styles.rowDesc} numberOfLines={2} ellipsizeMode="tail">매일 지정한 시간에 오늘의 상식을 알려드려요</Text>
							</View>
							<View style={[styles.permPill, reminderOn ? styles.permOn : styles.permOff]}>
								<Text style={[styles.permText, reminderOn ? styles.permTextOn : styles.permTextOff]}>{reminderOn ? '켜짐' : '꺼짐'}</Text>
							</View>
							<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
						</TouchableOpacity>
						<View style={[styles.row, styles.rowBorder]}>
							<View style={[styles.rowIcon, { backgroundColor: Colors.primaryBg }]}>
								<IconComponent type="materialIcons" name="volume-up" size={scaledSize(20)} color={Colors.primary} />
							</View>
							<View style={styles.rowBody}>
								<Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">효과음</Text>
								<Text style={styles.rowDesc} numberOfLines={2} ellipsizeMode="tail">정답·오답·완료 효과음을 재생해요</Text>
							</View>
							{/* 효과음이 실제로 나는지 즉시 확인 (무음 이슈 자가 진단) */}
							<TouchableOpacity style={styles.soundTestBtn} activeOpacity={0.8} disabled={!soundOn} onPress={testSound}>
								<IconComponent type="materialIcons" name="play-arrow" size={scaledSize(16)} color={soundOn ? Colors.primary : Colors.textMuted} />
								<Text style={[styles.soundTestText, !soundOn && { color: Colors.textMuted }]}>듣기</Text>
							</TouchableOpacity>
							<Switch value={soundOn} onValueChange={toggleSound} trackColor={{ true: Colors.primary, false: Colors.borderStrong }} thumbColor={Colors.textInverse} />
						</View>
						<View style={[styles.row, styles.rowBorder]}>
							<View style={[styles.rowIcon, { backgroundColor: Colors.primaryBg }]}>
								<IconComponent type="materialIcons" name="music-note" size={scaledSize(20)} color={Colors.primary} />
							</View>
							<View style={styles.rowBody}>
								<Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">배경음악</Text>
								<Text style={styles.rowDesc} numberOfLines={2} ellipsizeMode="tail">퀴즈·타임챌린지 중 배경음악을 재생해요</Text>
							</View>
							<Switch value={bgmOn} onValueChange={toggleBgm} trackColor={{ true: Colors.primary, false: Colors.borderStrong }} thumbColor={Colors.textInverse} />
						</View>
					</View>

					{/* 화면 테마 — 시스템 설정과 무관하게 여기서 고른 값이 적용된다 */}
					<SubHead label="화면 테마" icon="brightness-6" />
					<View style={styles.card}>
						{THEME_OPTIONS.map((o, i) => {
							const on = theme === o.key;
							return (
								<TouchableOpacity key={o.key} style={[styles.row, i > 0 && styles.rowBorder]} activeOpacity={0.7} onPress={() => changeTheme(o.key)}>
									<View style={[styles.rowIcon, { backgroundColor: on ? Colors.primarySoft : Colors.surfaceAlt }]}>
										<IconComponent type="materialIcons" name={o.icon} size={scaledSize(20)} color={on ? Colors.primary : Colors.textSecondary} />
									</View>
									<View style={styles.rowBody}>
										<Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">{o.label}</Text>
										<Text style={styles.rowDesc} numberOfLines={2} ellipsizeMode="tail">{o.desc}</Text>
									</View>
									{on && <IconComponent type="materialIcons" name="check-circle" size={scaledSize(20)} color={Colors.primary} />}
								</TouchableOpacity>
							);
						})}
					</View>

					{/* 관심 주제 — 홈 섹션 순서를 정한다 (온보딩에서 고른 값) */}
					<SubHead label="관심 주제" icon="category" />
					<View style={styles.card}>
						{INTEREST_OPTIONS.map((o, i) => {
							const on = interest === o.key;
							return (
								<TouchableOpacity
									key={o.key}
									style={[styles.row, i > 0 && styles.rowBorder]}
									activeOpacity={0.7}
									onPress={() => {
										setInterestState(o.key);
										OnboardingService.setInterest(o.key);
										showToast('홈 화면에 바로 반영돼요', 'check-circle');
									}}>
									<View style={[styles.rowIcon, { backgroundColor: on ? Colors.primarySoft : Colors.surfaceAlt }]}>
										<IconComponent type="materialIcons" name={o.icon} size={scaledSize(20)} color={on ? Colors.primary : Colors.textSecondary} />
									</View>
									<View style={styles.rowBody}>
										<Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">{o.label}</Text>
										<Text style={styles.rowDesc} numberOfLines={2} ellipsizeMode="tail">{o.desc}</Text>
									</View>
									{on && <IconComponent type="materialIcons" name="check-circle" size={scaledSize(20)} color={Colors.primary} />}
								</TouchableOpacity>
							);
						})}
					</View>

					{/* 학습 기록 백업 — 기기 변경 시 진도 이전 */}
					{BackupService.isConfigured && (
						<>
							<SubHead label="학습 기록 백업" icon="cloud-upload" />
							<View style={styles.card}>
								<TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => setShowBackup(true)}>
									<View style={[styles.rowIcon, { backgroundColor: Colors.primarySoft }]}>
										<IconComponent type="materialIcons" name="cloud-sync" size={scaledSize(20)} color={Colors.primary} />
									</View>
									<View style={styles.rowBody}>
										<Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">백업 · 복원</Text>
										<Text style={styles.rowDesc} numberOfLines={2} ellipsizeMode="tail">복원 코드로 새 기기에 학습 기록을 그대로 옮겨요</Text>
									</View>
									<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
								</TouchableOpacity>
							</View>
						</>
					)}

					{/* 데이터 초기화 */}
					<SubHead label="데이터 초기화" icon="restart-alt" tint={Colors.error} />
					<View style={styles.card}>
						{RESETS.map((r, i) => (
							<TouchableOpacity key={r.key} style={[styles.row, i > 0 && styles.rowBorder]} activeOpacity={0.7} onPress={() => confirmReset(r.label, r.run, r.desc, r.icon)}>
								<View style={[styles.rowIcon, { backgroundColor: Colors.surfaceAlt }]}>
									<IconComponent type="materialIcons" name={r.icon} size={scaledSize(20)} color={Colors.textSecondary} />
								</View>
								<View style={styles.rowBody}>
									<Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">{r.label}</Text>
									<Text style={styles.rowDesc} numberOfLines={2} ellipsizeMode="tail">{r.desc}</Text>
								</View>
								<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
							</TouchableOpacity>
						))}
					</View>

					<TouchableOpacity style={styles.resetAllBtn} activeOpacity={0.85} onPress={resetAll}>
						<IconComponent type="materialIcons" name="delete-forever" size={scaledSize(20)} color={Colors.error} />
						<Text style={styles.resetAllText}>모두 초기화</Text>
					</TouchableOpacity>

					{/* 권한 관리 — 앱 목록 바로 위. 미설정 항목은 눌러서 바로 설정으로 이동한다. */}
					<SubHead label="권한 관리" icon="verified-user" />
					<View style={styles.card}>
						<TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={manageNotificationPermission}>
							<View style={[styles.rowIcon, { backgroundColor: Colors.primarySoft }]}>
								<IconComponent type="materialIcons" name="notifications" size={scaledSize(20)} color={Colors.primary} />
							</View>
							<View style={styles.rowBody}>
								<Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">알림</Text>
								<Text style={styles.rowDesc} numberOfLines={2} ellipsizeMode="tail">오늘의 상식·오답 복습 알림에 필요해요</Text>
							</View>
							<View style={[styles.permPill, notifGranted ? styles.permOn : styles.permOff]}>
								<Text style={[styles.permText, notifGranted ? styles.permTextOn : styles.permTextOff]}>{notifGranted == null ? '확인 중' : notifGranted ? '허용됨' : '설정하기'}</Text>
							</View>
						</TouchableOpacity>
						{Platform.OS === 'ios' && (
							<TouchableOpacity style={[styles.row, styles.rowBorder]} activeOpacity={0.7} onPress={manageTrackingPermission}>
								<View style={[styles.rowIcon, { backgroundColor: Colors.primaryBg }]}>
									<IconComponent type="materialIcons" name="privacy-tip" size={scaledSize(20)} color={Colors.primary} />
								</View>
								<View style={styles.rowBody}>
									<Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">추적 허용 (ATT)</Text>
									<Text style={styles.rowDesc} numberOfLines={2} ellipsizeMode="tail">맞춤 광고 제공을 위한 선택 권한이에요</Text>
								</View>
								<View style={[styles.permPill, trackingGranted ? styles.permOn : styles.permOff]}>
									<Text style={[styles.permText, trackingGranted ? styles.permTextOn : styles.permTextOff]}>{trackingGranted == null ? '확인 중' : trackingGranted ? '허용됨' : '설정하기'}</Text>
								</View>
							</TouchableOpacity>
						)}
					</View>
					{/* 함께하면 좋은 퀴즈 앱 */}
					<SubHead label="함께하면 좋은 퀴즈 앱" icon="apps" />
					<View style={styles.card}>
						{previewApps.map((app, i) => (
							<TouchableOpacity key={app.id} style={[styles.row, i > 0 && styles.rowBorder]} activeOpacity={0.7} onPress={() => openStore(app)}>
								<Image source={app.icon} style={styles.appIcon} />
								<View style={styles.rowBody}>
									<Text style={styles.rowLabel} numberOfLines={1}>{app.title}</Text>
									<Text style={styles.rowDesc} numberOfLines={2}>{app.desc}</Text>
								</View>
								<IconComponent type="materialIcons" name="open-in-new" size={scaledSize(20)} color={Colors.textMuted} />
							</TouchableOpacity>
						))}
					</View>

					{/* 정보 */}
					<SubHead label="정보" icon="info-outline" />
					<View style={styles.card}>
						<View style={styles.row}>
							<View style={[styles.rowIcon, { backgroundColor: Colors.surfaceAlt }]}>
								<IconComponent type="materialIcons" name="info" size={scaledSize(20)} color={Colors.textSecondary} />
							</View>
							<View style={styles.rowBody}>
								<Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">앱 버전</Text>
							</View>
							<Text style={styles.versionText}>{`${DeviceInfo.getVersion()} (${DeviceInfo.getBuildNumber()})`}</Text>
						</View>
						<TouchableOpacity style={[styles.row, styles.rowBorder]} activeOpacity={0.7} onPress={shareApp}>
							<View style={[styles.rowIcon, { backgroundColor: Colors.primarySoft }]}>
								<IconComponent type="materialIcons" name="ios-share" size={scaledSize(20)} color={Colors.primaryDeep} />
							</View>
							<View style={styles.rowBody}>
								<Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">앱 공유하기</Text>
							</View>
							<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
						</TouchableOpacity>
						<TouchableOpacity style={[styles.row, styles.rowBorder]} activeOpacity={0.7} onPress={contact}>
							<View style={[styles.rowIcon, { backgroundColor: Colors.surfaceAlt }]}>
								<IconComponent type="materialIcons" name="mail" size={scaledSize(20)} color={Colors.textSecondary} />
							</View>
							<View style={styles.rowBody}>
								<Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">문의하기</Text>
								<Text style={styles.rowDesc} numberOfLines={2} ellipsizeMode="tail">adjh54ir@gmail.com</Text>
							</View>
							<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
						</TouchableOpacity>
						<TouchableOpacity style={[styles.row, styles.rowBorder]} activeOpacity={0.7} onPress={() => router.push('/opensource')}>
							<View style={[styles.rowIcon, { backgroundColor: Colors.surfaceAlt }]}>
								<IconComponent type="materialIcons" name="inventory-2" size={scaledSize(20)} color={Colors.textSecondary} />
							</View>
							<View style={styles.rowBody}>
								<Text style={styles.rowLabel} numberOfLines={1} ellipsizeMode="tail">오픈소스 라이브러리</Text>
								<Text style={styles.rowDesc} numberOfLines={2} ellipsizeMode="tail">사용 중인 오픈소스와 라이선스를 확인해요</Text>
							</View>
							<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
						</TouchableOpacity>
					</View>

					{/* 개발자 전용 (프로덕션 빌드에서는 숨김) */}
					{__DEV__ && (
						<>
							<SubHead label="개발자 (DEV)" icon="code" />
							<View style={styles.devGroup}>
								<TouchableOpacity style={styles.devBtn} activeOpacity={0.85} onPress={devCompleteAllQuizzes}>
									<IconComponent type="materialIcons" name="quiz" size={scaledSize(20)} color={Colors.primaryDeep} />
									<Text style={styles.devBtnText}>모든 퀴즈 완료</Text>
								</TouchableOpacity>
								<TouchableOpacity style={styles.devBtn} activeOpacity={0.85} onPress={devCompleteAllLearning}>
									<IconComponent type="materialIcons" name="school" size={scaledSize(20)} color={Colors.primaryDeep} />
									<Text style={styles.devBtnText}>모든 학습 완료</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.devBtn}
									activeOpacity={0.85}
									delayLongPress={1000}
									onLongPress={devRevertAdsRemoved}
									onPress={() => showToast('실수 방지를 위해 1초간 길게 눌러주세요', 'info')}>
									<IconComponent type="materialIcons" name="undo" size={scaledSize(20)} color={Colors.primaryDeep} />
									<Text style={styles.devBtnText}>광고제거 되돌리기 (길게 누르기)</Text>
								</TouchableOpacity>
							</View>
						</>
					)}

					{/* 제작자 앱 더보기 — 설정 화면 맨 아래 앱 목록(가로 스크롤) */}
					<SubHead label="제작자 앱 더보기" icon="apps" />
					<View style={styles.footerAppWrapper}>
						<FlatList
							horizontal
							data={COMMON_APPS_DATA.Apps}
							keyExtractor={(item) => item.id.toString()}
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.footerAppList}
							renderItem={({ item }) => (
								<TouchableOpacity style={styles.footerAppCard} activeOpacity={0.85} onPress={() => openStore(item)}>
									<View style={styles.footerAppIconBox}>
										<View style={styles.footerAppIconWrapper}>
											<Image source={item.icon} style={styles.footerAppIcon} resizeMode="contain" />
										</View>
										{newAppIds.has(item.id) && (
											<View style={styles.footerNewBadge}>
												<Text style={styles.footerNewBadgeText}>NEW</Text>
											</View>
										)}
									</View>
									<Text style={styles.footerAppTitle} numberOfLines={1}>{item.title}</Text>
									<Text style={styles.footerAppDesc} numberOfLines={2}>{item.desc}</Text>
								</TouchableOpacity>
							)}
						/>
					</View>

				</FadeInUp>
			</ScrollView>

			<DailyAlarmModal visible={showAlarm} onClose={() => setShowAlarm(false)} onChange={setReminderOn} />

			{/* 학습 기록 백업·복원 */}
			<BackupRestoreModal visible={showBackup} onClose={() => setShowBackup(false)} />

			{/* 데이터 초기화 전용 확인 팝업 */}
			<ResetConfirmModal
				visible={!!resetTarget}
				label={resetTarget?.label ?? ''}
				desc={resetTarget?.desc}
				icon={resetTarget?.icon}
				busy={resetBusy}
				onCancel={() => setResetTarget(null)}
				onConfirm={runReset}
			/>
		</View>
	);
};

export default withRemountOnFocus(Setting);

const styles = themed(() => StyleSheet.create({
	subHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Layout.sectionGap, marginBottom: SpacingV.sm },
	subHeadIcon: { width: scaleWidth(26), height: scaleWidth(26), borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
	subHeadLabel: { fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong },
	subHeadLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: Spacing.sm },
	safe: { flex: 1, backgroundColor: Colors.background },
	shareCard: { ...CardSurface, alignItems: 'center', borderRadius: Radius.lg, paddingVertical: SpacingV.xl, paddingHorizontal: Spacing.lg, marginBottom: Layout.sectionGap },
	shareTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: SpacingV.xs },
	shareTitleChip: { width: scaleWidth(28), height: scaleWidth(28), borderRadius: Radius.pill, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
	shareCardTitle: { flexShrink: 1, fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong },
	shareCardSub: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: SpacingV.lg },
	shareIconWrap: { width: scaleWidth(80), height: scaleWidth(80), borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, marginBottom: SpacingV.lg },
	shareIconImg: { width: '100%', height: '100%' },
	shareCardBtn: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: SpacingV.md },
	shareCardBtnText: { flexShrink: 1, color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '800', textAlign: 'center' },
	permPill: { paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.sm, borderRadius: Radius.md },
	permOn: { backgroundColor: Colors.successSoft },
	permOff: { backgroundColor: Colors.primaryBg },
	permText: { fontSize: Typography.footnote, fontWeight: '800' },
	permTextOn: { color: Colors.success },
	permTextOff: { color: Colors.primary },
	container: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	// 섹션 묶음 머리 — 왼쪽 컬러 바 + 라벨 (내활동 탭과 동일)
	card: { ...CardSurface, borderRadius: Radius.lg, overflow: 'hidden' },
	row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SpacingV.md, paddingHorizontal: Spacing.lg },
	rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
	rowIcon: { width: scaleWidth(38), height: scaleWidth(38), borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
	rowBody: { flex: 1 },
	rowLabel: { fontSize: Typography.callout, fontWeight: '700', color: Colors.textStrong },
	rowDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs },
	// 효과음 미리듣기 버튼
	soundTestBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, marginRight: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
	soundTestText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.primary },
	versionText: { fontSize: Typography.body, fontWeight: '700', color: Colors.textSecondary },
	appIcon: { width: scaleWidth(40), height: scaleWidth(40), borderRadius: Radius.md, marginRight: Spacing.md },
	resetAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: SpacingV.md, paddingVertical: SpacingV.lg, borderRadius: Radius.lg, backgroundColor: Colors.errorSoft, borderWidth: 1, borderColor: Colors.errorBorder },
	resetAllText: { fontSize: Typography.body, fontWeight: '800', color: Colors.errorDark },
	devGroup: { gap: SpacingV.sm },
	devBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.sm,
		paddingVertical: SpacingV.lg,
		borderRadius: Radius.lg,
		backgroundColor: Colors.primaryBg,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	devBtnText: { fontSize: Typography.body, fontWeight: '800', color: Colors.primaryDeep },
	// 맨 아래 앱 목록 — 가로 카드 리스트
	footerAppWrapper: { paddingVertical: SpacingV.sm },
	footerAppList: { gap: Spacing.md },
	footerAppCard: { width: scaleWidth(120), padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'flex-start', borderWidth: 1, borderColor: Colors.border },
	footerAppIconBox: { position: 'relative', marginBottom: SpacingV.sm },
	footerAppIconWrapper: { width: scaleWidth(64), height: scaleWidth(64), borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
	footerAppIcon: { width: '100%', height: '100%' },
	footerAppTitle: { fontSize: Typography.bodySm, fontWeight: '700', color: Colors.textStrong, textAlign: 'center', marginBottom: SpacingV.xs },
	footerAppDesc: { fontSize: Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
	footerNewBadge: { position: 'absolute', top: scaleHeight(-4), right: scaleWidth(-6), backgroundColor: Colors.errorDark, borderRadius: Radius.pill, paddingHorizontal: Spacing.xs, paddingVertical: SpacingV.xxs },
	footerNewBadgeText: { fontSize: Typography.micro, fontWeight: '800', color: Colors.textInverse, letterSpacing: Tracking.tight },
}));
