/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Animated, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { showAlert } from '@/src/screens/common/modal/ConfirmModal';
import BottomButton from '@/src/screens/common/atomic/BottomButton';
import ScrollTopButton, { useScrollTop } from '@/src/screens/common/atomic/ScrollTopButton';
import CharacterGuide, { useCharacterGuideOnce } from '@/src/screens/common/CharacterGuide';
import DonutChart from '@/src/screens/common/atomic/DonutChart';
import Colors, { isDark, withAlpha, accentInk } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth, isTablet } from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import LearnProgressService from '@/src/services/LearnProgressService';
import { LearnType } from '@/src/types/data/LearnType';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';
import DetailSheet, { DetailItem } from '@/src/screens/modal/DetailSheet';
import { FadeInUp, CountUp } from '@/src/screens/common/anim/Motion';
import { RequestNotificationPermission, ScheduleTodayQuizReminder, CancelTodayQuizReminder, GetTodayQuizReminderTime, SetTodayQuizReminderTime } from '@/src/utils/NotifactionHelper';
import DateUtils from '@/src/utils/DateUtils';
import { useToast } from '@/src/context/ToastContext';
import { playPop } from '@/src/utils/SoundUtils';
import LearnItemCard from '@/src/screens/common/LearnItemCard';
import { Image as ExpoImage } from 'expo-image';
import AdaptiveGrid from '@/src/screens/common/layout/AdaptiveGrid';
import { localized, themed } from '@/src/utils/ThemedStyles';
import { DIFFICULTY_LABELS } from '@/src/const/ConstQuizMeta';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';

const DAILY_COUNT = 5;
/** 오늘의 퀴즈 난이도 배분 — 쉬운 문제부터 계단식으로 오르게 고정 (복습 문항이 있으면 앞에서부터 잘라 쓴다) */
const LEVEL_QUOTA = localized(() => [1, 1, 2, 2, 3].map((lv) => DIFFICULTY_LABELS[lv]));
/** 오늘의 퀴즈에 섞어 낼 복습(오답) 문항 최대 개수 */
const REVIEW_SLOT = 2;
/** 오늘의 퀴즈 새 문항 중 그림이 붙은 문항을 먼저 채울 자리 수 (나머지는 주제가 고르게 섞이도록 둔다) */
const IMAGE_SLOTS = 3;
const ALARM_KEY = 'TODAY_QUIZ_ALARM_ON';
/** 완료 화면 결과 목록 기본 노출 개수 (나머지는 '더보기') */
const RESULT_PREVIEW = 3;

interface TodayResultItem {
	uid?: string;
	prompt: string;
	answer: string;
	explanation?: string;
	correct: boolean;
	domain: string;
}
interface TodayResult {
	correct: number;
	total: number;
	items: TodayResultItem[];
}

/** 요일 번역 키 (getLocalDayOfWeek: 0=일 ~ 6=토) */
const WEEKDAY_KEYS = [
	'quiz.today.weekday.sun',
	'quiz.today.weekday.mon',
	'quiz.today.weekday.tue',
	'quiz.today.weekday.wed',
	'quiz.today.weekday.thu',
	'quiz.today.weekday.fri',
	'quiz.today.weekday.sat',
] as const;

/**
 * 오늘의 퀴즈 — 하루 5문제 랜덤. 완료 시 해설(공용 플레이어), 푸시 알림 설정 제공.
 */
const TodayChallenge = () => {
	const { t } = useTranslation();
	const scrollTop = useScrollTop();
	const todayLabel = (): string => {
		const { month, day } = DateUtils.getLocalMonthDay();
		return t('quiz.today.dateLabel', { month, day, dow: t(WEEKDAY_KEYS[DateUtils.getLocalDayOfWeek()]) });
	};
	const [started, setStarted] = useState(false);
	const [alarmOn, setAlarmOn] = useState(false);
	// 사용자가 고른 알림 시각 (기본 09:00)
	const [alarmTime, setAlarmTime] = useState({ hour: 9, minute: 0 });
	const [showTimePicker, setShowTimePicker] = useState(false);
	const [doneToday, setDoneToday] = useState(false);
	const [result, setResult] = useState<TodayResult | null>(null);
	const [remain, setRemain] = useState('');
	// 선택된 결과 문항 → 공용 상세 팝업(DetailSheet)
	const [detail, setDetail] = useState<TodayResultItem | null>(null);
	// 결과 목록 필터 (전체/정답/오답)
	const [resultFilter, setResultFilter] = useState<'all' | 'correct' | 'wrong'>('wrong');
	// 결과 목록 전체 펼침 여부
	const [resultExpanded, setResultExpanded] = useState(false);
	// 완료 화면 등장 연출 — 스케일 인
	const doneAnim = useRef(new Animated.Value(0)).current;
	const doneScale = doneAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
	// 화면 사용법 안내 — 최초 1회, 홈에서 고른 캐릭터가 설명
	// v2: 그림 문항 안내가 들어간 문구 — 예전 안내를 본 사람에게도 한 번 더 보여 준다
	const guide = useCharacterGuideOnce('today-quiz-v2');
	const { showToast } = useToast();

	// 복습할 때가 된 오답 (최대 REVIEW_SLOT개) — 새 문제와 섞어 오늘의 퀴즈로 낸다
	const [reviewQs, setReviewQs] = useState<LearnType.QuizQuestion[] | null>(null);
	useEffect(() => {
		LearnProgressService.getDueWrongNotes(REVIEW_SLOT)
			.then((due) => setReviewQs(due.length ? LearnHubService.generateReviewQuiz(due) : []))
			.catch(() => setReviewQs([]));
	}, []);

	// 세션 동안 동일한 5문제 유지 (복습 문항 + 나머지는 새 문제)
	const questions = useMemo(() => {
		if (reviewQs === null) return [];
		// 복습 문항과 새 문항이 같은 uid로 겹치지 않게 거른다
		const used = new Set(reviewQs.map((q) => q.uid));
		// 난이도 쿼터를 채우려면 넉넉한 풀이 필요 — 한 번만 뽑아 난이도별로 골라 쓴다
		const pool = LearnHubService.generateMixedQuiz(DAILY_COUNT * 12).filter((q) => !used.has(q.uid));
		const slots = Math.max(0, DAILY_COUNT - reviewQs.length);
		const picked: LearnType.QuizQuestion[] = [];
		const taken = new Set<string>();
		// 앞 IMAGE_SLOTS 자리는 그림이 붙은 문항을 먼저 고르고, 모든 자리에서 아직 안 나온 주제를 먼저 고른다
		// (그림만 앞세우면 그림 없는 주제(지형·사건)가 아예 안 나오고 같은 주제가 겹친다)
		const domainsUsed = new Set(reviewQs.map((q) => q.domain));
		LEVEL_QUOTA.slice(0, slots).forEach((level) => {
			const fits = (c: LearnType.QuizQuestion) => c.level === level && !taken.has(c.uid);
			const fresh = (c: LearnType.QuizQuestion) => fits(c) && !domainsUsed.has(c.domain);
			const wantImage = picked.filter((p) => p.imageRef).length < IMAGE_SLOTS;
			const q = (wantImage ? pool.find((c) => fresh(c) && c.imageRef) : undefined) ?? pool.find(fresh) ?? pool.find(fits);
			if (q) {
				picked.push(q);
				taken.add(q.uid);
				domainsUsed.add(q.domain);
			}
		});
		// 해당 난이도 문항이 모자라면 남은 문항으로 채운다
		pool.forEach((q) => {
			if (picked.length >= slots || taken.has(q.uid)) return;
			picked.push(q);
			taken.add(q.uid);
		});
		return [...reviewQs, ...picked];
	}, [reviewQs]);
	const reviewUids = useMemo(() => new Set(reviewQs?.map((q) => q.uid) ?? []), [reviewQs]);
	// 시작 전 미리 보여 줄 오늘의 주제 (복습 문항끼리 주제가 겹칠 수 있어 한 번씩만)
	const todayTopics = useMemo(
		() => [...new Set(questions.map((q) => q.domain))].filter((d) => LearnHubService.isValidCategory(d)).map((d) => ({ key: d, title: LearnHubService.getDomainTitle(d), meta: LearnHubService.getDomain(d).meta })),
		[questions],
	);

	useEffect(() => {
		AsyncStorage.getItem(ALARM_KEY).then((v) => setAlarmOn(v === '1'));
		GetTodayQuizReminderTime().then(setAlarmTime);
	}, []);

	// '오전 9:00' 꼴 표기 — 알림 설정 팝업과 같은 형식
	const alarmTimeText = t('modal.dailyAlarm.timeLabel', {
		ampm: t(alarmTime.hour < 12 ? 'modal.dailyAlarm.am' : 'modal.dailyAlarm.pm'),
		hour: alarmTime.hour % 12 === 0 ? 12 : alarmTime.hour % 12,
		minute: `${alarmTime.minute}`.padStart(2, '0'),
	});

	// 결과 필터 기본값을 이미 맞춰준 날짜 — 같은 날 재진입 때 사용자의 선택을 덮어쓰지 않는다
	const filterSyncedRef = useRef<string | null>(null);
	// 오늘 완료 여부 + 결과 스냅샷 로드 (포커스마다 갱신)
	const loadDone = useCallback(() => {
		const today = DateUtils.getLocalDateString();
		AsyncStorage.getItem('TODAY_QUIZ_DONE_DATE').then((d) => setDoneToday(d === today));
		AsyncStorage.getItem('TODAY_QUIZ_RESULT').then((raw) => {
			if (!raw) return setResult(null);
			try {
				const r = JSON.parse(raw) as TodayResult & { date: string };
				setResult(r.date === today ? r : null);
				// 오답이 없으면 '오답' 필터가 빈 목록을 보여주므로 전체로 시작한다.
				// 포커스마다 강제로 되돌리면 사용자가 고른 필터가 매번 초기화되므로 결과가 바뀔 때 한 번만.
				if (r.date === today && filterSyncedRef.current !== r.date) {
					filterSyncedRef.current = r.date;
					setResultFilter(r.correct < r.total ? 'wrong' : 'all');
				}
			} catch {
				setResult(null);
			}
		});
	}, []);
	useFocusEffect(useCallback(() => loadDone(), [loadDone]));

	// 자정까지 남은 시간 카운트다운
	useEffect(() => {
		if (!doneToday) return;
		// 화면을 켜둔 채 자정을 넘기면 '오늘 완료' 상태에 갇히므로 날짜가 바뀌면 다시 읽는다
		let day = DateUtils.getLocalDateString();
		const tick = () => {
			const nowDay = DateUtils.getLocalDateString();
			if (nowDay !== day) {
				day = nowDay;
				loadDone();
				return;
			}
			const diff = DateUtils.getMillisecondsUntilNextLocalDay();
			const h = Math.floor(diff / 3600000);
			const m = Math.floor((diff % 3600000) / 60000);
			const s = Math.floor((diff % 60000) / 1000);
			setRemain(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
		};
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [doneToday, loadDone]);

	// 즐겨찾기(별) 상태 — 포커스마다 갱신
	const [bmUids, setBmUids] = useState<Set<string>>(new Set());
	const reloadBookmarks = useCallback(() => {
		LearnProgressService.getBookmarks().then((bm) => setBmUids(new Set(bm.map((b) => b.uid))));
	}, []);
	useFocusEffect(useCallback(() => reloadBookmarks(), [reloadBookmarks]));

	// 결과 문항 → 원본 학습카드 조회(uid 우선, answer/prompt 폴백)
	const cardOf = useCallback((it: TodayResultItem) => {
		if (!LearnHubService.isValidCategory(it.domain)) return null;
		if (it.uid) {
			const byUid = LearnHubService.getStudyCardByUid(it.domain, it.uid);
			if (byUid) return byUid;
		}
		const cards = LearnHubService.getDomain(it.domain).getStudyCards();
		return (
			cards.find((c) => c.title === it.answer) ??
			cards.find((c) => c.title === it.prompt) ??
			null
		);
	}, []);

	const toggleTodayBookmark = useCallback(async (card: NonNullable<ReturnType<typeof cardOf>>) => {
		const now = await LearnProgressService.toggleBookmark({
			uid: card.uid,
			domain: card.domain,
			domainTitle: LearnHubService.getDomainTitle(card.domain),
			title: card.title,
			subTitle: card.subTitle,
			meaning: card.meaning || card.description || card.title,
		});
		reloadBookmarks();
		playPop();
		showToast(now ? t('common.bookmarkSaved') : t('common.bookmarkUnsaved'), now ? 'star' : 'star-border');
	}, [reloadBookmarks, showToast, t]);

	// 결과 문항 → 검색 탭과 동일한 풍부한 DetailItem 구성
	const buildDetailItem = useCallback((it: TodayResultItem): DetailItem => {
		const card = cardOf(it);
		if (card) {
			return {
				domain: card.domain,
				uid: card.uid,
				domainTitle: LearnHubService.getDomainTitle(card.domain),
				categoryLabel: card.categoryLabel,
				levelLabel: card.levelLabel,
				title: card.title,
				subTitle: card.subTitle,
				meaning: card.meaning,
				description: card.description,
				examples: card.examples,
				tags: card.tags,
				options: card.options,
				// 보기가 있을 때만 정답(=표제)을 넘겨 정답 강조 동작
				answer: card.options && card.options.length >= 2 ? card.title : undefined,
				infoRows: card.infoRows,
			};
		}
		// 폴백: 문항 자체 정보
		return {
			domain: it.domain,
			domainTitle: LearnHubService.isValidCategory(it.domain) ? LearnHubService.getDomainTitle(it.domain) : undefined,
			title: it.prompt,
			answer: it.answer,
			explanation: it.explanation,
		};
	}, [cardOf]);

	useEffect(() => {
		if (!doneToday) return;
		doneAnim.setValue(0);
		const spring = Animated.spring(doneAnim, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true });
		spring.start();
		return () => spring.stop();
	}, [doneToday, doneAnim]);

	/** 완료 화면 지표 */
	const pct = result && result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
	const allPerfect = !!result && result.total > 0 && result.correct === result.total;
	// 완료 화면 강조색 — 만점만 금색, 그 외에는 브랜드 컬러(정답률 노란 계열은 상단이 지저분해 보인다)
	const doneColor = allPerfect ? Colors.goldDeep : Colors.primary;
	// 결과·해설 목록은 기본 3개까지만 — 5문제 전체를 펼치면 화면이 지나치게 길어진다
	const filteredResultItems = result ? result.items.filter((it) => resultFilter === 'all' || (resultFilter === 'correct' ? it.correct : !it.correct)) : [];
	const visibleResultItems = resultExpanded ? filteredResultItems : filteredResultItems.slice(0, RESULT_PREVIEW);

	const detailItem = useMemo(() => (detail ? buildDetailItem(detail) : null), [detail, buildDetailItem]);
	const detailAccent = detail && LearnHubService.isValidCategory(detail.domain) ? LearnHubService.getDomain(detail.domain).meta.color : Colors.primary;

	const toggleAlarm = async (next: boolean) => {
		if (next) {
			const ok = await RequestNotificationPermission();
			if (!ok) {
				showAlert(t('quiz.today.permTitle'), t('quiz.today.permMsg'), 'notifications-off');
				return;
			}
			await ScheduleTodayQuizReminder(alarmTime.hour, alarmTime.minute);
		} else {
			await CancelTodayQuizReminder();
		}
		setAlarmOn(next);
		AsyncStorage.setItem(ALARM_KEY, next ? '1' : '0');
		playPop();
		showToast(next ? t('quiz.today.alarmOn') : t('quiz.today.alarmOff'), next ? 'notifications-active' : 'notifications-off');
	};

	/** 알림 시각 변경 — 저장 후 켜져 있으면 새 시각으로 다시 예약한다 */
	const onPickAlarmTime = async (_e: unknown, date?: Date) => {
		if (Platform.OS === 'android') setShowTimePicker(false);
		if (!date) return;
		const { hour, minute } = DateUtils.getZonedParts(date);
		if (hour === alarmTime.hour && minute === alarmTime.minute) return;
		const next = { hour, minute };
		setAlarmTime(next);
		await SetTodayQuizReminderTime(next).catch(() => {});
		if (alarmOn) await ScheduleTodayQuizReminder(hour, minute);
		const text = t('modal.dailyAlarm.timeLabel', {
			ampm: t(hour < 12 ? 'modal.dailyAlarm.am' : 'modal.dailyAlarm.pm'),
			hour: hour % 12 === 0 ? 12 : hour % 12,
			minute: `${minute}`.padStart(2, '0'),
		});
		showToast(t('quiz.today.alarmTimeChanged', { time: text }), 'schedule');
	};

	/** 알림 설정 카드 — 완료/미완료 화면 양쪽에서 같은 모양으로 쓴다 */
	const alarmCardNode = (
		<View style={styles.alarmCard}>
			<View style={styles.alarmTop}>
				<View style={[styles.alarmIcon, { backgroundColor: Colors.primarySoft }]}>
					<IconComponent type="materialIcons" name="notifications-active" size={scaledSize(22)} color={Colors.primary} />
				</View>
				<View style={styles.alarmBody}>
					<Text style={styles.alarmTitle}>{t('quiz.today.alarmTitle')}</Text>
					<Text style={styles.alarmDesc}>{t('quiz.today.alarmDesc', { time: alarmTimeText })}</Text>
				</View>
				<Switch value={alarmOn} onValueChange={toggleAlarm} trackColor={{ true: Colors.primary, false: isDark() ? Colors.textMuted : Colors.borderStrong }} thumbColor={isDark() ? Colors.textStrong : Colors.textInverse} />
			</View>
			{/* 알림이 켜져 있을 때만 시각을 고른다 — iOS 는 인라인 컴팩트 피커, 안드로이드는 시스템 시계 다이얼로그 */}
			{alarmOn && (
				<View style={styles.alarmTimeRow}>
					<Text style={styles.alarmTimeLabel}>{t('quiz.today.alarmTime')}</Text>
					{Platform.OS === 'ios' ? (
						<DateTimePicker
							value={DateUtils.getLocalTimeToday(alarmTime.hour, alarmTime.minute)}
							mode="time"
							display="compact"
							themeVariant={isDark() ? 'dark' : 'light'}
							accentColor={Colors.primary}
							onChange={onPickAlarmTime}
						/>
					) : (
						<TouchableOpacity style={styles.alarmTimeBtn} activeOpacity={0.8} onPress={() => setShowTimePicker(true)} accessibilityRole="button" accessibilityLabel={t('quiz.today.alarmTime')}>
							<IconComponent type="materialIcons" name="schedule" size={scaledSize(16)} color={Colors.primary} />
							<Text style={styles.alarmTimeValue}>{alarmTimeText}</Text>
						</TouchableOpacity>
					)}
				</View>
			)}
			{Platform.OS === 'android' && showTimePicker && (
				<DateTimePicker value={DateUtils.getLocalTimeToday(alarmTime.hour, alarmTime.minute)} mode="time" is24Hour={false} display="default" onChange={onPickAlarmTime} />
			)}
		</View>
	);

	if (started) {
		return (
			<LearnQuizPlayer
				title={t('quiz.modes.today')}
				accent={Colors.primary}
				modeLabel={t('quiz.common.resultOf', { title: t('quiz.modes.today') })}
				mode="daily"
				generate={() => questions}
				onAnswered={({ uid, correct }) => {
					// 복습으로 낸 문항만 간격 반복 스케줄에 반영
					if (reviewUids.has(uid)) LearnProgressService.applyReviewResult([{ uid, correct }]).catch(() => {});
				}}
				suggestTimeChallenge={false}
				homeHref="/home"
				hideTimer
				noExplain
				// 플레이어 결과 화면 대신 '다음 퀴즈까지' 완료 화면으로 바로 넘어간다
				onFinish={() => {
					setStarted(false);
					loadDone();
				}}
			/>
		);
	}

	return (
		<SafeAreaView style={styles.safe} edges={[]}>
			<View style={{ flex: 1 }}>
			<ScrollView ref={scrollTop.ref} onScroll={scrollTop.onScroll} scrollEventThrottle={16} style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
				<FadeInUp>
					{doneToday ? (
						<>
							<Animated.View style={[styles.heroDone, { opacity: doneAnim, transform: [{ scale: doneScale }] }]}>
								<View style={[styles.heroDoneBadge, { backgroundColor: withAlpha(doneColor, '1A') }]}>
									<IconComponent type="materialIcons" name={allPerfect ? 'emoji-events' : 'check-circle'} size={scaledSize(26)} color={doneColor} />
								</View>
								<Text style={styles.heroDoneDate}>{todayLabel()}</Text>
								<Text style={[styles.heroDoneTitle, { color: doneColor }]} numberOfLines={1} ellipsizeMode="tail">{allPerfect ? t('quiz.today.perfect') : t('quiz.today.doneTitle')}</Text>
								{result ? (
									<>
										<View style={styles.heroDonut}>
											<DonutChart
												// 태블릿은 안쪽 글자(h2)가 1.25배로 커지므로 도넛도 같은 배율로 키운다 (폰은 기존 값)
												size={isTablet ? scaleWidth(124) : 124}
												strokeWidth={isTablet ? scaleWidth(12) : 12}
												percent={pct}
												color={doneColor}
												trackColor={Colors.border}>
												<CountUp value={pct} duration={900} format={(v) => `${v}%`} style={[styles.heroDonutPct, { color: doneColor }]} />
												<Text style={styles.heroDonutLabel}>{t('quiz.common.accuracy')}</Text>
											</DonutChart>
										</View>
										<View style={styles.heroStatRow}>
											{([
												{ label: t('quiz.common.correct'), value: result.correct, icon: 'check-circle', color: Colors.success },
												{ label: t('quiz.common.wrong'), value: result.total - result.correct, icon: 'cancel', color: Colors.error },
												{ label: t('quiz.today.statItems'), value: result.total, icon: 'quiz', color: Colors.textSecondary },
											] as const).map((st) => (
												// 정답 → 오답 → 문항 순으로 하나씩 올라오게 (완료 연출)
												<View key={st.icon} style={styles.heroStat}>
													<IconComponent type="materialIcons" name={st.icon} size={scaledSize(15)} color={st.color} />
													<CountUp value={st.value} duration={800} style={styles.heroStatNum} />
													<Text style={styles.heroStatLabel} numberOfLines={1} ellipsizeMode="tail">{st.label}</Text>
												</View>
											))}
										</View>
									</>
								) : (
									<View style={styles.heroDoneIcon}>
										<IconComponent type="materialIcons" name="check-circle" size={scaledSize(34)} color={Colors.success} />
									</View>
								)}
								<View>
									<Text style={styles.heroDoneDesc} numberOfLines={2} ellipsizeMode="tail">{allPerfect ? t('quiz.today.descPerfect') : t('quiz.today.descDone')}</Text>
								</View>
							</Animated.View>

							<View style={styles.infoCard}>
								<View style={styles.infoRow}>
									<IconComponent type="materialIcons" name="schedule" size={scaledSize(20)} color={Colors.primary} />
									<Text style={styles.infoText}>{t('quiz.today.nextIn', { time: remain })}</Text>
								</View>
							</View>

							{!!result && result.items.length > 0 && (
								<View style={styles.resultList}>
									<View style={styles.resultListHead}>
										<Text style={styles.resultListTitle}>{t('quiz.today.resultTitle')}</Text>
										<View style={styles.resultFilterRow}>
											{([
												{ key: 'all', label: t('common.all'), n: result.items.length },
												{ key: 'correct', label: t('quiz.common.correct'), n: result.correct },
												{ key: 'wrong', label: t('quiz.common.wrong'), n: result.total - result.correct },
											] as const).map((f) => {
												const on = resultFilter === f.key;
												return (
													<TouchableOpacity key={f.key} style={[styles.resultFilterChip, on && styles.resultFilterChipOn]} activeOpacity={0.8} onPress={() => setResultFilter(f.key)}>
														<Text style={[styles.resultFilterText, on && styles.resultFilterTextOn]}>{f.label} {f.n}</Text>
													</TouchableOpacity>
												);
											})}
										</View>
									</View>
									<AdaptiveGrid>
									{visibleResultItems.map((it) => {
										const card = cardOf(it);
										// 이름/설명/더 알아보기 — 문제·정답 대신 표제어와 설명 노출
										const word = card ? card.title : it.answer;
										const desc = card ? card.meaning : it.explanation;
										const examples = card?.examples ?? [];
										const catLabel = card?.categoryLabel;
										const lvlLabel = card?.levelLabel;
										const saved = card ? bmUids.has(card.uid) : false;
										return (
											<View key={`${it.domain}-${it.uid}`} style={isTablet ? styles.gridFill : undefined}>
												<LearnItemCard
													style={isTablet ? styles.gridFill : undefined}
													domain={it.domain}
													categoryLabel={catLabel}
													levelLabel={lvlLabel}
													title={word}
													statusMark={it.correct ? 'correct' : 'wrong'}
													explanation={desc}
													imageRef={card?.imageRef}
													examples={examples}
													bookmarked={card ? saved : undefined}
													onToggleBookmark={card ? () => toggleTodayBookmark(card) : undefined}
													onPress={() => setDetail(it)}
												/>
											</View>
										);
									})}
									</AdaptiveGrid>
									{filteredResultItems.length > RESULT_PREVIEW && (
										<TouchableOpacity style={styles.resultMoreBtn} activeOpacity={0.85} onPress={() => setResultExpanded((v) => !v)}>
											<Text style={styles.resultMoreText}>{resultExpanded ? t('quiz.today.collapse') : t('quiz.today.moreCount', { count: filteredResultItems.length - RESULT_PREVIEW })}</Text>
											<IconComponent type="materialIcons" name={resultExpanded ? 'expand-less' : 'expand-more'} size={scaledSize(18)} color={Colors.primary} />
										</TouchableOpacity>
									)}
								</View>
							)}

							{/* 오답이 있으면 복습 동선 유지 */}
							{!!result && result.correct < result.total && (
								<TouchableOpacity style={styles.reviewBtn} activeOpacity={0.85} onPress={() => router.push('/quiz/wrong-review' as never)}>
									<IconComponent type="materialIcons" name="history-edu" size={scaledSize(18)} color={Colors.error} />
									<Text style={styles.reviewBtnText}>{t('quiz.today.reviewWrong', { count: result.total - result.correct })}</Text>
								</TouchableOpacity>
							)}

							{alarmCardNode}
						</>
						) : (
							<>
								<ExpoImage source={require('@/src/assets/selection/today-quiz-hero.webp')} style={styles.heroIllustration} contentFit="cover" accessible={false} />
								<View style={styles.hero}>
								<Text style={styles.heroDate}>{todayLabel()}</Text>
								<Text style={styles.heroTitle}>{t('quiz.today.heroTitle', { count: DAILY_COUNT })}</Text>
								<Text style={styles.heroDesc}>{t('quiz.today.heroDesc', { count: DAILY_COUNT })}</Text>
								{todayTopics.length > 0 && (
									<View style={styles.topicBox}>
										<Text style={styles.topicLabel}>{t('quiz.today.topicsLabel')}</Text>
										<View style={styles.topicRow}>
											{todayTopics.map(({ key, title, meta }, i) => (
												// 한 칩씩 차례로 올라오게
												<FadeInUp key={key} delay={120 + i * 70} distance={8}>
													<View style={[styles.topicChip, { backgroundColor: withAlpha(meta.color, '14') }]}>
														<DomainIcon mainIcon={meta.mainIcon} icon={meta.icon} iconType={meta.iconType} size={scaledSize(14)} color={accentInk(meta.color)} />
														<Text style={[styles.topicChipText, { color: accentInk(meta.color) }]} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
													</View>
												</FadeInUp>
											))}
										</View>
									</View>
								)}
							</View>

							<View style={styles.infoCard}>
								<View style={styles.infoRow}>
									<IconComponent type="materialIcons" name="quiz" size={scaledSize(20)} color={Colors.primary} />
									<Text style={styles.infoText}>{t('quiz.today.infoCount', { count: DAILY_COUNT })}</Text>
								</View>
								<View style={styles.infoDivider} />
								<View style={styles.infoRow}>
									<IconComponent type="materialIcons" name="lightbulb" size={scaledSize(20)} color={Colors.primary} />
									<Text style={styles.infoText}>{t('quiz.today.infoExplain')}</Text>
								</View>
							</View>

							{alarmCardNode}
						</>
					)}
				</FadeInUp>
			</ScrollView>
			<ScrollTopButton visible={scrollTop.visible} toTop={scrollTop.toTop} progress={scrollTop.progress} inset={false} />
			</View>

			{/* 주 행동(시작)은 하단 고정 — 스크롤 끝에 묻히지 않게 한다 */}
			{doneToday ? (
				<BottomButton label={t('quiz.common.home')} icon="home" onPress={() => router.replace('/(tabs)/home' as never)} />
			) : (
				<BottomButton
					label={t('quiz.today.start')}
					icon="play-arrow"
					onPress={() => setStarted(true)}
					secondaryLabel={t('quiz.common.home')}
					secondaryIcon="home"
					onSecondary={() => router.replace('/(tabs)/home' as never)}
				/>
			)}

			{/* 오늘의 퀴즈 안내 — 최초 1회 */}
			<CharacterGuide
				visible={guide.visible && !doneToday}
				onClose={guide.close}
				lines={[t('quiz.today.guide.count', { count: DAILY_COUNT }), t('quiz.today.guide.image'), t('quiz.today.guide.result')]}
				title={t('quiz.today.guideTitle')}
			/>

			{/* 결과 문항 선택 시 검색 탭과 동일한 공용 상세 팝업 */}
			<DetailSheet visible={!!detail} item={detailItem} accent={detailAccent} onClose={() => { setDetail(null); reloadBookmarks(); }} onBookmarkChange={() => reloadBookmarks()} />
		</SafeAreaView>
	);
};

export default TodayChallenge;

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },
	scroll: { flex: 1 },
	// 하단 고정 버튼과 마지막 카드가 붙어 보이지 않도록 한 섹션만큼 더 띄운다
	container: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	hero: { ...CardSurface, alignItems: 'center', borderRadius: Radius.lg, paddingVertical: SpacingV.xxl, paddingHorizontal: Spacing.xl, marginBottom: Layout.sectionGap },
	// 태블릿 가득 폭에서 16:9 면 높이가 390~550pt 가 되어 본문을 밀어낸다 — 더 납작하게 (폰은 그대로)
	heroIllustration: { width: '100%', aspectRatio: isTablet ? Layout.heroAspectTablet : 16 / 9, borderRadius: Radius.lg, marginBottom: SpacingV.md },
	heroDone: { ...CardSurface, overflow: 'hidden', alignItems: 'center', borderRadius: Radius.lg, paddingTop: SpacingV.xl, paddingBottom: SpacingV.xxl, paddingHorizontal: Spacing.xl, marginBottom: Layout.sectionGap },
	heroDoneBadge: { width: scaleWidth(52), height: scaleWidth(52), borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: SpacingV.sm },
	heroDoneDate: { color: Colors.textSecondary, fontSize: Typography.footnote, fontWeight: '800' },
	heroDoneTitle: { fontSize: Typography.h1, fontWeight: '900', marginTop: SpacingV.xxs },
	heroDonut: { marginTop: SpacingV.lg },
	heroDonutPct: { fontSize: Typography.h2, fontWeight: '900' },
	heroDonutLabel: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary, marginTop: SpacingV.xxs },
	heroStatRow: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'center', gap: Spacing.sm, marginTop: SpacingV.lg },
	heroStat: { flex: 1, alignItems: 'center', gap: SpacingV.xxs, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, paddingVertical: SpacingV.md },
	heroStatNum: { fontSize: Typography.h3, fontWeight: '900', color: Colors.textStrong },
	heroStatLabel: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary },
	heroDoneIcon: { width: scaleWidth(64), height: scaleWidth(64), borderRadius: Radius.xl, backgroundColor: Colors.successSoft, alignItems: 'center', justifyContent: 'center', marginTop: SpacingV.lg },
	heroDoneDesc: { color: Colors.textSecondary, fontSize: Typography.body, fontWeight: '700', textAlign: 'center', marginTop: SpacingV.lg, lineHeight: scaleHeight(20) },
	heroDate: { color: Colors.textSecondary, fontSize: Typography.body, fontWeight: '700' },
	heroTitle: { color: Colors.textStrong, fontSize: Typography.h1, fontWeight: '900', marginTop: SpacingV.xs },
	heroDesc: { color: Colors.textSecondary, fontSize: Typography.body, textAlign: 'center', marginTop: SpacingV.sm, lineHeight: scaleHeight(20) },
	// 오늘의 주제 — 설명 아래 옅은 구분선 뒤에 칩을 가운데 정렬로 감싼다
	topicBox: { alignSelf: 'stretch', alignItems: 'center', marginTop: SpacingV.lg, paddingTop: SpacingV.lg, borderTopWidth: 1, borderTopColor: Colors.border },
	topicLabel: { color: Colors.textSecondary, fontSize: Typography.footnote, fontWeight: '800', marginBottom: SpacingV.sm },
	topicRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm },
	topicChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs, borderRadius: Radius.pill },
	topicChipText: { fontSize: Typography.footnote, fontWeight: '800', maxWidth: scaleWidth(120) },
	resultList: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: SpacingV.md },
	resultListTitle: { fontSize: Typography.body, fontWeight: '900', color: Colors.textStrong },
	resultListHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: SpacingV.md },
	resultFilterRow: { flexDirection: 'row', gap: Spacing.sm },
	resultFilterChip: { paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs, borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt },
	resultFilterChipOn: { backgroundColor: Colors.primary },
	resultMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs, paddingVertical: SpacingV.md },
	resultMoreText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.primary },
	resultFilterText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary },
	resultFilterTextOn: { color: Colors.onFill },
	// 단독 버튼 — 태블릿은 화면 끝까지 늘어나지 않게 다이얼로그 폭으로 가운데 (폰은 그대로)
	reviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.errorSoft, borderRadius: Radius.lg, paddingVertical: SpacingV.lg, marginBottom: SpacingV.md, ...(isTablet && { alignSelf: 'center' as const, width: '100%' as const, maxWidth: Layout.dialogMaxWidth }) },
	reviewBtnText: { fontSize: Typography.body, fontWeight: '800', color: Colors.error, flexShrink: 1, textAlign: 'center' },
	// 좌우 안쪽 여백은 같은 화면의 알림 카드(padding: Spacing.lg)와 맞춘다 — 문구가 길면 카드 테두리에 붙었다
	infoCard: { ...CardSurface, flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, paddingVertical: SpacingV.lg, paddingHorizontal: Spacing.lg, marginBottom: SpacingV.md },
	infoRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
	// 아이콘 옆 긴 문구가 카드 밖으로 밀리지 않게 줄어들며 줄바꿈한다
	infoText: { flexShrink: 1, fontSize: Typography.body, fontWeight: '800', color: Colors.textStrong },
	infoDivider: { width: 1, height: scaleHeight(28), backgroundColor: Colors.border },
	alarmCard: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg },
	alarmTop: { flexDirection: 'row', alignItems: 'center' },
	alarmTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SpacingV.md, paddingTop: SpacingV.md, borderTopWidth: 1, borderTopColor: Colors.border },
	alarmTimeLabel: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary },
	alarmTimeBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.primarySoft, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs },
	alarmTimeValue: { fontSize: Typography.callout, fontWeight: '800', color: Colors.primary },
	alarmIcon: { width: scaleWidth(46), height: scaleWidth(46), borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
	alarmBody: { flex: 1 },
	alarmTitle: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	alarmDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs },
	// 태블릿 2열: 같은 줄 두 카드 높이를 맞춘다 (셀은 줄 높이로 늘어나므로 카드가 셀을 채우게)
	gridFill: { flexGrow: 1 },
}));
