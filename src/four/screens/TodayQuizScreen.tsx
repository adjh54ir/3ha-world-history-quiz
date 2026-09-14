/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import {
	Alert,
	Linking,
	StyleSheet,
	Switch,
	Text,
	View,
	TouchableOpacity,
	ScrollView,
	NativeSyntheticEvent,
	NativeScrollEvent,
	ActivityIndicator,
	Animated,
	Easing,
	Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import notifee from '@notifee/react-native';
import { MODAL_MAX_WIDTH, scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils';
import { useFocusEffect, useIsFocused } from '@/src/four/navigation/compat';
import { startBgm, stopBgm } from '@/src/four/utils/BgmUtils';
import { MainDataType } from '@/src/four/types/MainDataType';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IconComponent from './common/atomic/IconComponent';
import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';
import { CONST_BADGES } from '@/src/four/const/ConstBadges';
import { TodayQuizBadgeInterceptor } from '@/src/four/services/interceptor/TodayQuizBadgeInterceptor';
import NewBadgeModal from './modal/NewBadgeModal';
import { useBlockBackHandler } from '@/src/four/hooks/useBlockBackHandler';
import useAnimationCleanup from '@/src/four/hooks/useAnimationCleanup';
import DateUtils from '@/src/four/utils/DateUtils';
import FastImage from '@/src/four/components/FastImage';
import FourImages from '@/src/four/assets/FourImages';
import ProverbServices from '@/src/four/services/ProverbServices';
import { pickByLevelPlan, shuffle } from '@/src/four/utils/PickUtils';
import { FIELD_DROPDOWN_ITEMS, LevelBadge } from './common/CommonProverbModule';
import ProverbDetailModal from './modal/ProverbDetailModal';
import ProverbDetailContent from './common/ProverbDetailContent';

import { getFavorites, toggleFavorite } from '@/src/four/utils/favoriteUtils';
import Icon from 'react-native-vector-icons/FontAwesome6';
import FavoriteToast from './common/FavoriteToast';
import { showToast } from '@/src/four/components/AppToast';
import { playCorrect, playWrong, playFinish } from '@/src/four/utils/SoundUtils';
import { Typography, FontWeight, Spacing, SpacingV, Radius, HitSlop } from '@/src/four/const/ConstDesign';
import ScrollTopButton from './common/atomic/ScrollTopButton';
import { Colors, withAlpha } from '@/src/four/const/ConstColors';

type GroupedPrevQuiz = {
	date: string;
	formattedDate: string;
	quizList: MainDataType.ProverbType[];
	answerResults: { [quizId: number]: boolean }; // ✅ 추가
};

import CharacterGuide, { useCharacterGuideOnce, CharacterGuideButton } from './common/CharacterGuide';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { getHanjaTextStyle } from '@/src/four/const/ConstHanjaFont';
import { bridgeAnswer, bridgeDailyDone } from '@/src/four/services/LifeBridge';
import { useStreak } from '@/src/hooks/useLife';
import { dailyShareText } from '@/src/services/life/LifeRules';
import { cancelAppReminder, readAppReminder, scheduleAppReminder } from '@/src/four/services/ReminderBridge';

const TODAY_QUIZ_COMPLETE_IMAGE = require('@/src/assets/illustrations/today-quiz-complete.webp');

const TodayQuizScreen = () => {
	const STORAGE_KEY = MainStorageKeyType.TODAY_QUIZ_LIST;
	const SETTING_KEY = MainStorageKeyType.SETTING_INFO;


	const scrollRef = useRef<ScrollView>(null); // 전체 스크롤
	const hourScrollRef = useRef<ScrollView>(null); // 알람 시간 선택 스크롤
	const modalScrollRef = useRef<ScrollView>(null); // 모달 내부 스크롤
	const cardAnim = useRef(new Animated.Value(1)).current; // ✅ 문제 카드 진입 애니메이션 값
	// "오늘의 퀴즈 시작" 버튼은 useEffect 밖에서 cardAnim 을 돌린다 — 그 직후 화면을 벗어나면 정리할 곳이 없다
	useAnimationCleanup(cardAnim);
	// 퀴즈(id)별 랜덤 이미지 매핑
	const [randImageMap, setRandImageMap] = useState<{ [id: number]: any }>({});

	const [imageModalVisible, setImageModalVisible] = useState(false);
	const [selectedImage, setSelectedImage] = useState<any>(null);
	const [selectedDog, setSelectedDog] = useState<MainDataType.ProverbType | null>(null);

	const [showDetailModal, setShowDetailModal] = useState(false);
	const guide = useCharacterGuideOnce('today-quiz');
	const [isTodayUnsolved, setIsTodayUnsolved] = useState(false);
	const [hasStarted, setHasStarted] = useState(false);

	// TodayQuizScreen 컴포넌트 상단
	const [detailModalVisible, setDetailModalVisible] = useState(false);
	const [detailQuiz, setDetailQuiz] = useState<MainDataType.ProverbType | null>(null);

	const [isAlarmEnabled, setIsAlarmEnabled] = useState(false);
	const [alarmTime, setAlarmTime] = useState(DateUtils.createLocalDateAtTime(15));
	const [quizList, setQuizList] = useState<MainDataType.ProverbType[]>([]);
	const [answerResults, setAnswerResults] = useState<{ [id: number]: boolean | null }>({});
	const [selectedAnswers, setSelectedAnswers] = useState<{
		[id: number]: { value: string; index: number };
	}>({});
	const [quizOptionsMap, setQuizOptionsMap] = useState<{ [id: number]: string[] }>({});
	const [currentIndex, setCurrentIndex] = useState(0); // 현재 문제 번호
	const [progressPercent, setProgressPercent] = useState(
		quizList.length > 0 ? (currentIndex / quizList.length) * 100 : 0,
	);
	const labelColors = [Colors.primary, Colors.primary, Colors.accentOrange, Colors.warning];
	const [showAlarmModal, setShowAlarmModal] = useState(false);
	// 즐겨찾기 관련 state
	const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
	// 즐겨찾기 토스트는 '지난 오늘의 퀴즈' 모달 안에서만 뜬다.
	// 전역 토스트는 모달 밖(앱 루트)에 있어 안드로이드에서 모달 창에 가리므로 여기서는 로컬 토스트를 쓴다.
	const [favoriteToastVisible, setFavoriteToastVisible] = useState(false);
	const [toastMessage, setToastMessage] = useState('');

	const [showScrollTop, setShowScrollTop] = useState(false);

	const [tempIsAlarmEnabled, setTempIsAlarmEnabled] = useState(false);
	const [tempAlarmTime, setTempAlarmTime] = useState(DateUtils.createLocalDateAtTime(15));

	const [showPrevQuizModal, setShowPrevQuizModal] = useState(false);

	const [groupedPrevQuizzes, setGroupedPrevQuizzes] = useState<GroupedPrevQuiz[]>([]);
	const [highlightAnswerId, setHighlightAnswerId] = useState<number | null>(null);
	// 오답 강조를 2초 뒤 끄는 타이머 — 화면을 먼저 벗어나도 남지 않게 핸들을 들고 있는다
	const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
	useEffect(
		() => () => {
			if (highlightTimerRef.current) {
				clearTimeout(highlightTimerRef.current);
			}
		},
		[],
	);

	const [showTodayReview, setShowTodayReview] = useState(false);
	const [todayDate, setTodayDate] = useState(DateUtils.now());

	const [tempSelectedHour, setTempSelectedHour] = useState(DateUtils.getLocalHour(tempAlarmTime));

	const total = quizList.length;
	const solved = Object.keys(answerResults).length;
	const correct = Object.values(answerResults).filter((v) => v === true).length;

	const isQuizCompleted = Object.keys(answerResults).length === quizList.length;

	/** 결과 공유 — 워들처럼 🟩🟥 줄과 연속 출석을 글로 보낸다 (문제 순서 그대로) */
	const { streak } = useStreak();
	const onShareResult = () => {
		const results = quizList.map((item) => answerResults[item.id] === true);
		Share.share({ message: dailyShareText(results, DateUtils.getLocalDateString(todayDate), streak) }).catch(() => {});
	};

	// 🏅 오늘의 퀴즈 뱃지 획득 모달
	const [badgeModalVisible, setBadgeModalVisible] = useState(false);
	const [newlyEarnedBadges, setNewlyEarnedBadges] = useState<MainDataType.UserBadge[]>([]);

	const { getLocalDateString, getLocalParamDateToString } = DateUtils;

	useBlockBackHandler(true); // 뒤로가기 모션 막기

	/**
	 * 🎵 배경음 — 다른 퀴즈 화면과 맞춘다. 문제를 푸는 동안에만 깔고,
	 * 도착 카드·다 푼 뒤 결과에서는 조용히 둔다. 탭을 옮기면 바로 끊는다.
	 */
	const isFocused = useIsFocused();
	useEffect(() => {
		if (!isFocused || !hasStarted || isQuizCompleted) {
			stopBgm();
			return;
		}
		startBgm('quiz');
		return stopBgm;
	}, [isFocused, hasStarted, isQuizCompleted]);

	useFocusEffect(
		useCallback(() => {
			// 앱을 켠 채 자정을 넘기면 todayDate 가 어제로 굳어 어제 퀴즈를 '오늘의 퀴즈'로 보여 준다.
			// 화면에 들어올 때마다 날짜가 바뀌었는지 확인해 갱신한다(바뀌면 아래 effect들이 다시 돈다).
			const now = DateUtils.now();
			if (getLocalParamDateToString(now) !== getLocalParamDateToString(todayDate)) {
				setTodayDate(now);
				return;
			}

			const resetIfUnsolved = async () => {
				const todayStr = getLocalParamDateToString(todayDate);
				const storedJson = await AsyncStorage.getItem(STORAGE_KEY);
				const storedArr: MainDataType.TodayQuizList[] = storedJson ? JSON.parse(storedJson) : [];
				const todayData = storedArr.find((q) => getLocalParamDateToString(q.quizDate) === todayStr);

				// 한 문제라도 풀었으면 초기화하면 안 된다. (예전엔 < 5 여서 3/5 풀고 나갔다 오면 답이 다 날아갔다)
				// 아직 손도 안 댄 경우에만 문제를 새로 뽑는다.
				if (todayData && Object.keys(todayData.answerResults ?? {}).length === 0) {
					await handleResetTodayQuiz();
				}
			};

			resetIfUnsolved();

			loadSetting();
			// 탭을 옮겼다 돌아오면 펼쳐 둔 목록·팝업을 접고 맨 위에서 시작한다
			setShowTodayReview(false);
			setShowPrevQuizModal(false);
			setDetailModalVisible(false);
			setShowScrollTop(false);
			scrollRef.current?.scrollTo({ y: 0, animated: false });
		}, [todayDate]),
	);

	useEffect(() => {
		initQuiz();
	}, [todayDate]);

	useEffect(() => {
		if (quizList.length > 0) {
			setProgressPercent((solved / quizList.length) * 100);
		} else {
			setProgressPercent(0);
		}
	}, [solved, quizList.length]);

	// 👇 현재 문제 인덱스가 변경되면 ScrollView를 최상단으로 이동 + 카드 진입 애니메이션
	useEffect(() => {
		const scrollTimer = setTimeout(() => {
			scrollRef.current?.scrollTo({ y: 0, animated: true });
		}, 50);

		// ✅ 문제 전환 시 카드 페이드 + 슬라이드 인
		cardAnim.setValue(0);
		const anim = Animated.timing(cardAnim, {
			toValue: 1,
			duration: 380,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		});
		anim.start();

		// ✅ 언마운트/전환 시 타이머·애니메이션 정리 (메모리 누수 방지)
		return () => {
			clearTimeout(scrollTimer);
			anim.stop();
		};
	}, [currentIndex]);

	/**
	 * 알림 설정 읽기.
	 * 원본은 이 화면만의 저장소(SETTING_INFO)와 예약된 알림을 뒤져 상태를 맞췄다.
	 * 이 앱은 설정 탭도 같은 알림을 켜고 끄므로 **앱의 알림 설정(redux)** 을 기준으로 삼는다 —
	 * 그러지 않으면 설정 탭에서 알림을 켜도 이 화면은 잠긴 채로 남는다.
	 */
	const loadSetting = async () => {
		try {
			const reminder = readAppReminder();
			const localAlarmTime = DateUtils.createLocalDateAtTime(reminder.hour, reminder.minute);

			setIsAlarmEnabled(reminder.enabled);
			setAlarmTime(localAlarmTime);
			setTempAlarmTime(localAlarmTime);
			setTempSelectedHour(reminder.hour);

			// 화면 안에서 읽고 쓰는 저장소도 같은 값으로 맞춰 둔다 (원본 코드가 이 값을 본다)
			await saveSettingInfo({
				isUseAlarm: reminder.enabled,
				alarmTime: localAlarmTime.toISOString(),
				alarmHour: reminder.hour,
				timeZone: DateUtils.getTimeZone(),
			});
		} catch (e) {
			console.error('알림 설정 로딩 실패:', e);
			return null;
		}
	};

	/**
	 * 오늘의 퀴즈 5문제를 뽑는다.
	 * 난이도가 뒤섞여 나오면 첫 문제부터 특급이 걸려 시작이 막히므로, 초급부터 한 단계씩 올라가게 뽑는다.
	 * 해당 난이도에 남은 문제가 없으면 그 자리는 남은 문제에서 채운다.
	 */
	const getTodayQuiz = (excludeIds: number[] = []) => {
		const allProverbs = ProverbServices.selectProverbList();
		const filtered = allProverbs.filter((p) => !excludeIds.includes(p.id)); // ✅ 이전 문제 제외

		// 5문제를 초급 2 · 중급 1 · 고급 1 · 특급 1 로 배치해 난이도가 낮은 쪽부터 올라가게 한다
		const levelPlan: MainDataType.ProverbType['level'][] = ['초급', '초급', '중급', '고급', '특급'];
		const picked = pickByLevelPlan(filtered, levelPlan, (p) => p.level);

		// 부족한 만큼은 아직 안 쓴 문제에서 채운다
		if (picked.length < 5) {
			const usedIds = new Set(picked.map((p) => p.id));
			picked.push(...shuffle(filtered.filter((p) => !usedIds.has(p.id))).slice(0, 5 - picked.length));
		}

		// 모자란 자리를 채운 문제까지 포함해 항상 쉬운 난이도부터 나오도록 정렬한다
		const levelRank = ['초급', '중급', '고급', '특급'];
		return picked.slice(0, 5).sort((a, b) => levelRank.indexOf(a.level) - levelRank.indexOf(b.level));
	};
	const saveSettingInfo = async (setting: MainDataType.SettingInfo) => {
		try {

			await AsyncStorage.setItem(SETTING_KEY, JSON.stringify(setting));
		} catch (e) {
			console.error('알림 설정 저장 실패:', e);
		}
	};

	const saveTodayQuizToStorage = async (newData: MainDataType.TodayQuizList) => {
		try {
			const existingJson = await AsyncStorage.getItem(STORAGE_KEY);
			const existing: MainDataType.TodayQuizList[] = existingJson ? JSON.parse(existingJson) : [];

			// 같은 날짜가 있는 경우 제외하고 새로 저장
			const updated = [
				...existing.filter((q) => getLocalParamDateToString(q.quizDate) !== getLocalParamDateToString(todayDate)),
				newData,
			];

			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
			// 👇 상태 즉시 반영
			// selectProverbByIds 가 넘긴 순서를 지키므로 한 번에 조회한다 (예전엔 순서가 뒤집혀 한 건씩 찾았다)
			const savedQuizList = ProverbServices.selectProverbByIds(newData.todayQuizIdArr);
			setQuizList(savedQuizList);
			generateQuizOptions(savedQuizList);
		} catch (error) {
			console.error('퀴즈 저장 실패:', error);
		}
	};

	const formatQuizDate = (isoDate: string) => {
		const date = new Date(isoDate);
		const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
		const { month, day } = DateUtils.getLocalDateParts(date);
		const dayOfWeek = dayNames[DateUtils.getLocalDayOfWeek(date)];
		return {
			formattedDate: `${month}월 ${day}일`,
			dayOfWeek,
		};
	};

	/**
	 * 지난 문제 리스트
	 */
	const loadLastTodayQuizList = async () => {
		const storedJson = await AsyncStorage.getItem(STORAGE_KEY);
		const stored: MainDataType.TodayQuizList[] = storedJson ? JSON.parse(storedJson) : [];

		const sorted = [...stored].sort((a, b) => new Date(b.quizDate).getTime() - new Date(a.quizDate).getTime());

		const todayStr = getLocalParamDateToString(todayDate);
		const pastQuizzes = sorted.filter((q) => getLocalParamDateToString(q.quizDate) !== todayStr);

		const grouped: GroupedPrevQuiz[] = pastQuizzes.map((entry) => {
			const formatted = formatQuizDate(entry.quizDate);
			const quizList = ProverbServices.selectProverbByIds(entry.todayQuizIdArr);
			return {
				date: getLocalParamDateToString(entry.quizDate),
				formattedDate: `${formatted.formattedDate}(${formatted.dayOfWeek})`,
				quizList,
				answerResults: entry.answerResults,
			};
		});

		setGroupedPrevQuizzes(grouped);
		await loadFavorites(); // ✅ 추가
		setShowPrevQuizModal(true);
	};

	const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const offsetY = event.nativeEvent.contentOffset.y;
		setShowScrollTop(offsetY > 100);
	};

	const initQuiz = async () => {
		const todayISO = getLocalDateString();

		if (showTodayReview) {
			setShowTodayReview(false);
		} // 👈 이 줄 추가

		const settings = await notifee.getNotificationSettings();
		const hasPermission = settings.authorizationStatus >= 1;

		// 퀴즈 생성/복원은 알림 권한과 무관하다. 권한이 없다고 여기서 막으면
		// (알림을 켠 뒤 OS 설정에서 권한을 끈 경우) 화면이 '퀴즈를 준비 중입니다...'에서 영영 멈춘다.
		{
			const todayStr = getLocalDateString();
			const storedJson = await AsyncStorage.getItem(STORAGE_KEY);
			const storedArr: MainDataType.TodayQuizList[] = storedJson ? JSON.parse(storedJson) : [];
			// 여기서 KST 기준 비교로 todayData 찾기
			const todayData = storedArr.find((q) => getLocalParamDateToString(q.quizDate) === todayStr); // ✅ 중요

			// ✅ 오늘 문제를 아직 안 푼 상태 판별
			const unsolved = !!todayData && (!todayData.answerResults || Object.keys(todayData.answerResults).length === 0);

			setIsTodayUnsolved(unsolved && hasPermission);

			const shouldGenerateNewQuiz =
				!todayData ||
				todayData.todayQuizIdArr.length < 5 ||
				getLocalParamDateToString(todayData.quizDate) !== getLocalParamDateToString(todayDate);

			if (shouldGenerateNewQuiz) {
				// 새로운 퀴즈 생성
				const finalQuizList = getTodayQuiz(todayData?.todayQuizIdArr ?? []);
				const newQuizData: MainDataType.TodayQuizList = {
					quizDate: todayISO, // ✅ 이건 todayDate.toISOString() 기반으로 변경 가능
					isCheckedIn: false,
					todayQuizIdArr: finalQuizList.map((q) => q.id),
					correctQuizIdArr: [],
					worngQuizIdArr: [],
					answerResults: {},
					selectedAnswers: {},
					prevQuizIdArr: storedArr.length > 0 ? storedArr[storedArr.length - 1].todayQuizIdArr : [],
				};
				await saveTodayQuizToStorage(newQuizData);
				setQuizList(finalQuizList);
				generateQuizOptions(finalQuizList);
			} else {
				// 기존 퀴즈 복원
				const finalQuizList = ProverbServices.selectProverbByIds(todayData.todayQuizIdArr);
				// ⚠️ 매칭된 문제 개수가 5개가 아니면 새로 생성
				if (!finalQuizList || finalQuizList.length < 5) {
					console.warn('⚠️ 오늘의 퀴즈 데이터 누락 → 새 퀴즈 생성');
					const newQuiz = getTodayQuiz();

					const newQuizData: MainDataType.TodayQuizList = {
						quizDate: getLocalDateString(),
						isCheckedIn: todayData?.isCheckedIn ?? false,
						todayQuizIdArr: newQuiz.map((q) => q.id),
						correctQuizIdArr: [],
						worngQuizIdArr: [],
						answerResults: {},
						selectedAnswers: {},
					};
					await saveTodayQuizToStorage(newQuizData);
					setQuizList(newQuiz);
					generateQuizOptions(newQuiz);
					// 새로 뽑은 문제에 옛 답을 얹으면 안 된다 — 문제와 답이 어긋난다
					setAnswerResults({});
					setSelectedAnswers({});
					setCurrentIndex(0);
				} else {
					setQuizList(finalQuizList);
					generateQuizOptions(finalQuizList);
					setAnswerResults(todayData.answerResults ?? {});
					setSelectedAnswers(todayData.selectedAnswers ?? {});
				}
			}
		}
	};

	const generateQuizOptions = (quizListParam: MainDataType.ProverbType[]) => {
		const optionsMap: { [id: number]: string[] } = {};
		quizListParam.forEach((item) => {
			const wrongMeanings = ProverbServices.selectProverbList()
				.filter((p) => p.id !== item.id && !!p.meaning)
				.map((p) => p.meaning);
			const shuffledWrong = wrongMeanings.sort(() => Math.random() - 0.5).slice(0, 3);

			while (shuffledWrong.length < 3) {
				shuffledWrong.push('모름');
			}

			const options = [...shuffledWrong, item.meaning].sort(() => Math.random() - 0.5);
			optionsMap[item.id] = options;
		});
		setQuizOptionsMap(optionsMap);
	};

	/**
	 * 알림 예약.
	 * 원본은 이 화면만의 알림('daily-quiz-reminder')을 직접 걸었다. 이 앱은 설정 탭이 이미
	 * 매일 알림을 걸고 있어 그대로 두면 알림이 두 번 오므로, 앱의 알림 하나로 잇는다.
	 */
	const scheduleDailyQuizNotification = async (time: Date) => {
		await scheduleAppReminder(DateUtils.getLocalHour(time), DateUtils.getLocalMinute(time));
	};

	const cancelScheduledNotification = async () => {
		await cancelAppReminder();
	};

	const requestPermission = async () => {
		const settings = await notifee.requestPermission();

		return settings.authorizationStatus >= 1;
	};

	/**
	 * 알림 설정
	 * @param value
	 */
	const handleToggleAlarm = async (value: boolean) => {

		setIsAlarmEnabled(value);
		if (value) {
			const granted = await requestPermission();
			if (granted) {
				const todayStr = getLocalDateString();
				const storedJson = await AsyncStorage.getItem(STORAGE_KEY);
				const storedArr: MainDataType.TodayQuizList[] = storedJson ? JSON.parse(storedJson) : [];

				const newAlarmTime = DateUtils.createLocalDateAtTime(tempSelectedHour);
				const todayData = storedArr.find((q) => getLocalParamDateToString(q.quizDate) === todayStr);

				// 사용자가 지정한 로컬 시각 그대로 ISO로 저장 (임의 타임존 오프셋 보정 금지)
				await saveSettingInfo({
					isUseAlarm: true,
					alarmTime: newAlarmTime.toISOString(),
					alarmHour: tempSelectedHour,
					timeZone: DateUtils.getTimeZone(),
				});

				if (todayData) {
					const isAlreadySolved = todayData.answerResults && Object.keys(todayData.answerResults).length === 5;

					const todayProverbs = ProverbServices.selectProverbByIds(todayData.todayQuizIdArr);
					setQuizList(todayProverbs);
					setAnswerResults(todayData.answerResults ?? {});
					setSelectedAnswers(todayData.selectedAnswers ?? {});

				} else {
					// 새로운 퀴즈 생성
					const newQuiz = getTodayQuiz();
					const todayQuizData: MainDataType.TodayQuizList = {
						quizDate: DateUtils.now().toISOString(), // ✅ ISO 저장
						isCheckedIn: false,
						todayQuizIdArr: newQuiz.map((q) => q.id),
						correctQuizIdArr: [],
						worngQuizIdArr: [],
						answerResults: {},
						selectedAnswers: {},
					};

					await saveTodayQuizToStorage(todayQuizData);

					setQuizList(newQuiz);
					generateQuizOptions(newQuiz);

					setHasStarted(true); // ✅ 바로 문제 시작
				}

				// 저장된 사용자 지정 시각(newAlarmTime) 기준으로 스케줄링 (임시 상태값 사용 금지)
				await scheduleDailyQuizNotification(newAlarmTime);
				setAlarmTime(newAlarmTime);
				setTempAlarmTime(newAlarmTime);
				setIsAlarmEnabled(true);

				// ✅ 알림 설정 완료 토스트 피드백
				const hour = DateUtils.getLocalHour(newAlarmTime).toString().padStart(2, '0');
				showToast('알림을 설정했습니다', { subMessage: `매일 ${hour}시에 오늘의 퀴즈를 알려 드리겠습니다` });
			} else {
				// 권한을 거절하면 예약도 저장도 못 했으므로 스위치를 도로 내린다
				// (맨 위에서 미리 켜 둔 상태 그대로 두면 '켜짐' 화면인데 퀴즈가 없는 상태가 된다)
				setIsAlarmEnabled(false);
				// OS 기본 알림창은 곧바로 설정 화면으로 덮여 잘 보이지 않는다 — 앱 토스트로 알린다
				showToast('알림 권한이 필요합니다', { subMessage: '설정에서 알림을 허용해 주세요', type: 'info' });
				Linking.openSettings();
			}
		} else {
			await cancelScheduledNotification();

			// 🔁 알림 시간 기본값으로 초기화 (15:00)
			const defaultTime = DateUtils.createLocalDateAtTime(15);

			setAlarmTime(defaultTime);
			setTempAlarmTime(defaultTime); // ✅ DatePicker용 값도 초기화
			setShowTodayReview(false); // ✅ 문제 다시 보기 닫기
			setTempSelectedHour(15); // ✅ 텍스트용 시간도 15시로 설정

			setIsAlarmEnabled(false);
			// ✅ 끈 상태도 저장
			await saveSettingInfo({
				isUseAlarm: false,
				alarmTime: defaultTime.toISOString(),
				alarmHour: 15,
				timeZone: DateUtils.getTimeZone(),
			});


			// ✅ 알림 해제 토스트 피드백
			showToast('알림을 해제했습니다', { subMessage: '언제든 다시 켤 수 있습니다' });
		}
	};

	/**
	 * 🏅 오늘의 퀴즈 누적 완료 일수를 기준으로 신규 뱃지를 지급하고 모달을 띄운다.
	 */
	const checkAndAwardTodayQuizBadges = async (storedArr: MainDataType.TodayQuizList[]) => {
		// 오늘의 퀴즈를 모두 푼 '완료 일수' 집계
		const completedDayCount = storedArr.filter(
			(d) =>
				(d.todayQuizIdArr?.length ?? 0) > 0 &&
				Object.keys(d.answerResults ?? {}).length >= (d.todayQuizIdArr?.length ?? 0),
		).length;

		// 기존 퀴즈 히스토리 로드
		const historyJson = await AsyncStorage.getItem(MainStorageKeyType.USER_QUIZ_HISTORY);
		const history: MainDataType.UserQuizHistory = historyJson
			? JSON.parse(historyJson)
			: {
					correctProverbId: [],
					wrongProverbId: [],
					lastAnsweredAt: DateUtils.now(),
					quizCounts: {},
					badges: [],
					totalScore: 0,
			  };
		history.badges = history.badges ?? [];

		const newBadgeIds = TodayQuizBadgeInterceptor(completedDayCount, history.badges);
		if (newBadgeIds.length === 0) {
			return;
		}

		const earnedBadgeObjects = newBadgeIds
			.map((id) => CONST_BADGES.find((b) => b.id === id))
			.filter(Boolean) as MainDataType.UserBadge[];

		const updatedHistory: MainDataType.UserQuizHistory = {
			...history,
			badges: [...new Set([...history.badges, ...newBadgeIds])],
		};
		await AsyncStorage.setItem(MainStorageKeyType.USER_QUIZ_HISTORY, JSON.stringify(updatedHistory));

		setNewlyEarnedBadges(earnedBadgeObjects);
		setBadgeModalVisible(true);
	};

	const handleAnswer = async (quizId: number, selected: string, correct: string) => {
		if (answerResults[quizId] !== undefined) {
			return;
		} // 중복 처리 방지

		// 안전 비교(공백/유니코드 공백/줄바꿈 제거)
		const normalize = (s?: string) => (s ?? '').replace(/\s+/g, ' ').trim();
		const isCorrect = normalize(selected) === normalize(correct);

		const options = quizOptionsMap[quizId] || [];
		const selectedIndex = options.findIndex((opt) => normalize(opt) === normalize(selected));

		const newAnswerResults = {
			...answerResults,
			[quizId]: isCorrect,
		};

		const newSelectedAnswers = {
			...selectedAnswers,
			[quizId]: {
				value: selected,
				index: selectedIndex,
			},
		};

		setAnswerResults(newAnswerResults);
		setSelectedAnswers(newSelectedAnswers);

		// 🔊 정답/오답 효과음
		if (isCorrect) {
			playCorrect();
		} else {
			playWrong();
		}

		// 이 앱의 홈·나의 활동·펫은 redux 를 본다 — 채점 결과를 모아 둔다
		bridgeAnswer(quizId, 'meaning', isCorrect);

		if (!isCorrect) {
			setHighlightAnswerId(quizId);
			if (highlightTimerRef.current) {
				clearTimeout(highlightTimerRef.current);
			}
			highlightTimerRef.current = setTimeout(() => setHighlightAnswerId(null), 2000);
		}

		// 저장
		const storedJson = await AsyncStorage.getItem(STORAGE_KEY);
		const storedArr: MainDataType.TodayQuizList[] = storedJson ? JSON.parse(storedJson) : [];

		const todayStr = getLocalParamDateToString(todayDate);
		const todayIndex = storedArr.findIndex((q) => getLocalParamDateToString(q.quizDate) === todayStr);

		if (todayIndex !== -1) {
			const updatedToday = {
				...storedArr[todayIndex],
				answerResults: newAnswerResults,
				selectedAnswers: newSelectedAnswers,
				correctQuizIdArr: Object.entries(newAnswerResults)
					.filter(([_, v]) => v)
					.map(([k]) => Number(k)),
				worngQuizIdArr: Object.entries(newAnswerResults)
					.filter(([_, v]) => !v)
					.map(([k]) => Number(k)),
			};
			// @ts-ignore
			storedArr[todayIndex] = updatedToday;
			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storedArr));

			// 🏅 오늘의 퀴즈를 모두 푼 경우 뱃지 지급 체크
			const isTodayAllSolved =
				(updatedToday.todayQuizIdArr?.length ?? 0) > 0 &&
				Object.keys(newAnswerResults).length >= (updatedToday.todayQuizIdArr?.length ?? 0);
			if (isTodayAllSolved) {
				playFinish(); // 🎉 오늘의 퀴즈 완료 사운드
				bridgeDailyDone(); // 홈의 '오늘 완료' 표시·코인·경험치
				await checkAndAwardTodayQuizBadges(storedArr);
			}
		}
		// handleAnswer 내부 마지막 부분에 추가
		setTimeout(() => {
			scrollRef.current?.scrollToEnd({ animated: true });
		}, 200); // 약간의 딜레이 주면 UI 반응이 자연스러워짐
	};

	// ✅ 즐겨찾기 로드
	const loadFavorites = async () => {
		const favorites = await getFavorites();
		setFavoriteIds(favorites);
	};

	// ✅ 즐겨찾기 토글
	const handleToggleFavorite = async (id: number) => {
		const isNowFavorite = await toggleFavorite(id);
		await loadFavorites();

		setToastMessage(isNowFavorite ? '즐겨찾기 추가' : '즐겨찾기 제거');
		setFavoriteToastVisible(true);
	};

	const handleResetTodayQuiz = async () => {
		const storedJson = await AsyncStorage.getItem(STORAGE_KEY);
		const storedArr: MainDataType.TodayQuizList[] = storedJson ? JSON.parse(storedJson) : [];
		const todayStr = getLocalParamDateToString(todayDate);

		const todayData = storedArr.find((q) => getLocalParamDateToString(q.quizDate) === todayStr);
		const filteredArr = storedArr.filter((q) => getLocalParamDateToString(q.quizDate) !== todayStr);

		// 출석 정보 유지
		const preservedIsCheckedIn = todayData?.isCheckedIn ?? false;

		// 새로운 퀴즈 생성
		const newQuizList = getTodayQuiz();
		const newTodayData: MainDataType.TodayQuizList = {
			quizDate: getLocalDateString(),
			isCheckedIn: preservedIsCheckedIn, // ✅ 출석 정보 유지
			todayQuizIdArr: newQuizList.map((q) => q.id),
			correctQuizIdArr: [],
			worngQuizIdArr: [],
			answerResults: {},
			selectedAnswers: {},
			prevQuizIdArr: todayData?.todayQuizIdArr ?? [],
		};

		const updatedArr = [...filteredArr, newTodayData];
		await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedArr));

		// 상태 초기화
		setAnswerResults({});
		setSelectedAnswers({});
		setProgressPercent(0);
		setQuizList(newQuizList);
		setQuizOptionsMap({});
		setCurrentIndex(0);
		generateQuizOptions(newQuizList);

		// ✅ 여기서 핵심!
		setHasStarted(false); // 👉 다시 시작 전 상태로 전환
		setShowTodayReview(false); // 👉 리뷰 모드 닫기

		// 새로운 오늘 퀴즈 다시 생성
		initQuiz();
	};

	const getFormattedDate = () => {
		const date = todayDate;
		const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
		const { month, day } = DateUtils.getLocalDateParts(date);
		const dayOfWeek = dayNames[DateUtils.getLocalDayOfWeek(date)];
		return `${month}월 ${day}일(${dayOfWeek})`;
	};

	const handleImagePress = (image: any, item: MainDataType.ProverbType) => {
		setSelectedImage(image);
		setSelectedDog(item);
		setImageModalVisible(true);
	};

	const handleScrollToTop = () => {
		if (scrollRef.current) {
			requestAnimationFrame(() => {
				scrollRef.current?.scrollTo({ y: 0, animated: true });
			});
		}
	};

	const renderItem = ({ item }: { item: MainDataType.ProverbType }) => {
		const options = quizOptionsMap[item.id] || [];
		const result = answerResults[item.id];
		const selected = selectedAnswers[item.id];
		const isQuizCompleted = Object.keys(answerResults).length === quizList.length;

		// ✅ 전체 풀이 완료 + 해당 문항에 대한 선택이 끝난 상태를 해설 표시 조건으로 사용
		const showExplanation = result !== undefined && isQuizCompleted;

		return (
			<View style={styles.quizBox}>
				{/* 오늘의 퀴즈는 초급 → 특급으로 올라가게 뽑는다. 그 설계가 보이도록 진행·난이도를 함께 띄운다 */}
				<View style={styles.rampRow}>
					<Text style={styles.rampStep}>
						{currentIndex + 1} / {quizList.length}
					</Text>
					<LevelBadge level={item.level} />
				</View>

				{showExplanation ? (
					<View
						style={[
							styles.answerExplainBox,
							result ? styles.answerExplainCorrect : styles.answerExplainWrong,
						]}>
						{/* 결과 헤더 */}
						<View style={styles.explainHeaderRow}>
							<Text style={styles.questionMain}>{`${item.hangul}(${item.hanja})`}</Text>
							<View style={[styles.resultPill, result ? styles.pillCorrect : styles.pillWrong]}>
								<Text style={styles.resultPillText}>{result ? '정답' : '오답'}</Text>
							</View>
						</View>
						{/* ✅ 한자어 상세 팝업과 동일한 내용을 해설로 인라인 표시 */}
						<View style={styles.explainDetailWrap}>
							<ProverbDetailContent proverb={item} />
						</View>
					</View>
				) : (
					<>
						{/* 👉 문제 텍스트 출력 추가 */}
						<Text style={styles.questionCombined}>
							<Text style={styles.questionMain}>{`${item.hangul}(${item.hanja})`}</Text>
							{!isQuizCompleted && <Text style={styles.questionSub}> 의미는?</Text>}
						</Text>

						{result !== undefined && (
							<View style={styles.resultBannerWrap}>
								<View style={[styles.resultBanner, result ? styles.resultBannerCorrect : styles.resultBannerWrong]}>
									<View style={[styles.resultBannerIcon, { backgroundColor: result ? Colors.primary : Colors.error }]}>
										<IconComponent
											type="materialIcons"
											name={result ? 'check' : 'close'}
											size={scaledSize(16)}
											color={Colors.textInverse}
										/>
									</View>
									<Text style={[styles.resultBannerText, { color: result ? Colors.primaryDeep : Colors.errorDeep }]}>
										{result ? '정답입니다!' : '아쉽습니다, 오답입니다'}
									</Text>
								</View>
							</View>
						)}

						{options.map((option, idx) => {
							const isAnswered = result !== undefined;
							const isCorrectOption = option === item.meaning;
							const isUserSelected = selected?.value === option;
							const shouldHighlight = highlightAnswerId === item.id && isCorrectOption;

							return (
								<TouchableOpacity
									key={idx}
									onPress={() => handleAnswer(item.id, option, item.meaning)}
									disabled={isAnswered}
									style={[
										styles.optionBase,
										isUserSelected && (isCorrectOption ? styles.correctOption : styles.wrongOption),
										shouldHighlight && styles.highlightCorrectBorder,
									]}>
									<Text
										style={[styles.optionTextBase, isUserSelected && (isCorrectOption ? styles.correctText : styles.wrongText)]}>
										<Text style={{ color: labelColors[idx % labelColors.length], fontWeight: FontWeight.bold }}>
											{String.fromCharCode(65 + idx)}.
										</Text>{' '}
										{option}
									</Text>
								</TouchableOpacity>
							);
						})}
						{result !== undefined && currentIndex < quizList.length - 1 && (
							<TouchableOpacity
								style={styles.nextButton}
								onPress={() => {
									setCurrentIndex((prev) => prev + 1);
									scrollRef.current?.scrollTo({ y: 0, animated: true });
								}}>
								<Text style={styles.nextButtonText}>다음 문제</Text>
							</TouchableOpacity>
						)}
					</>
				)}
			</View>
		);
	};

	return (
		/* 상단 안전영역은 전역 배너(GlobalBannerAd)가 이미 확보한다 — top 을 쓰면 여백이 두 번 들어간다 */
		<SafeAreaView style={styles.main} edges={['left', 'right']}>
			<ScrollView
				ref={scrollRef}
				onScroll={onScroll}
				scrollEventThrottle={16}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{
					paddingBottom: SpacingV.xxxxl,
				}}>
				{/* '지난 오늘의 퀴즈'와 도움말은 같은 줄 오른쪽 끝에 나란히 둔다 */}
				<View style={styles.buttonRow}>
					<View style={styles.leftButtonWrapper} />

					<View style={styles.rightButtonWrapper}>
						{isAlarmEnabled && (
							<TouchableOpacity onPress={loadLastTodayQuizList}>
								<View style={styles.buttonContent}>
									<IconComponent name="book" type="FontAwesome" size={scaledSize(13)} color={Colors.textMuted} style={styles.iconSpacing} />
									<Text style={styles.buttonText}>지난 오늘의 퀴즈</Text>
								</View>
							</TouchableOpacity>
						)}
						<CharacterGuideButton onPress={guide.open} size={scaledSize(20)} />
					</View>
				</View>

				{!isAlarmEnabled && (
					<View style={styles.content}>
						<View style={styles.arrivalHero}>
							<View style={styles.arrivalCopy}>
								<View style={styles.arrivalBadge}>
									<IconComponent type="materialCommunityIcons" name="calendar-today" size={14} color={Colors.primary} />
									<Text style={styles.arrivalBadgeText}>매일 만나는 생활 한자</Text>
								</View>
								<Text style={styles.title}>오늘의 퀴즈가 매일 도착해요</Text>
								<Text style={styles.arrivalSubtitle}>
									원하는 시간에 알림을 받고, 짧은 퀴즈로 생활 한자어를 익혀 보세요.
								</Text>
							</View>

							<View style={styles.arrivalImageStage}>
								<FastImage
									source={FourImages.screen_fox_daily_quiz}
									style={styles.arrivalImage}
									resizeMode={FastImage.resizeMode.contain}
									accessible={false}
								/>
							</View>
						</View>

						<View style={styles.benefitStrip}>
							<View style={styles.benefitItem}>
								<IconComponent type="materialCommunityIcons" name="numeric-5-circle-outline" size={22} color={Colors.primary} />
								<Text style={styles.benefitText}>하루 5문제</Text>
							</View>
							<View style={styles.benefitDivider} />
							<View style={styles.benefitItem}>
								<IconComponent type="materialCommunityIcons" name="bell-outline" size={22} color={Colors.primary} />
								<Text style={styles.benefitText}>원하는 시각</Text>
							</View>
							<View style={styles.benefitDivider} />
							<View style={styles.benefitItem}>
								<IconComponent type="materialCommunityIcons" name="book-open-page-variant-outline" size={22} color={Colors.primary} />
								<Text style={styles.benefitText}>완료 후 해설</Text>
							</View>
						</View>

						{/*
						 * 한 번도 알림을 켠 적이 없으면 아래 시각 목록만 보이고 "그래서 뭘 하라는 건지"가 없다.
						 * 시각 고르기 -> 스위치 켜기 순서를 번호로 못 박아 둔다.
						 */}
						<View style={styles.setupNotice}>
							<View style={styles.setupNoticeHead}>
								<IconComponent name="bell-ring-outline" type="materialCommunityIcons" size={16} color={Colors.primaryDark} />
								<Text style={styles.setupNoticeTitle}>알림을 켜야 오늘의 퀴즈가 시작돼요</Text>
							</View>
							<View style={styles.setupStepRow}>
								<View style={styles.setupStepNo}>
									<Text style={styles.setupStepNoText}>1</Text>
								</View>
								<Text style={styles.setupStepText}>아래 시간표에서 퀴즈를 받을 시각을 골라요.</Text>
							</View>
							<View style={styles.setupStepRow}>
								<View style={styles.setupStepNo}>
									<Text style={styles.setupStepNoText}>2</Text>
								</View>
								<Text style={styles.setupStepText}>아래 '알림 설정/시간' 오른쪽 스위치를 켜요.</Text>
							</View>
							<View style={styles.setupStepRow}>
								<View style={styles.setupStepNo}>
									<Text style={styles.setupStepNoText}>3</Text>
								</View>
								<Text style={styles.setupStepText}>알림 권한을 허용하면 그 시각부터 매일 알려 드려요.</Text>
							</View>
						</View>

						<View style={styles.alarmRow}>
							<View style={{ flexDirection: 'column', marginTop: SpacingV.sm }}>
								<View style={styles.alarmRow}>
									<Text style={styles.switchLabel}>알림 설정/시간</Text>
									<Text style={styles.selectedHourText}>{tempSelectedHour.toString().padStart(2, '0')}시</Text>
									<Switch
										value={isAlarmEnabled}
										onValueChange={handleToggleAlarm}
										trackColor={{ false: Colors.textSecondary, true: Colors.secondaryPale }}
										thumbColor={isAlarmEnabled ? Colors.warningLight : Colors.surfaceAlt}
										ios_backgroundColor={Colors.text}
									/>
								</View>

								<ScrollView
									ref={hourScrollRef}
									key={currentIndex}
									horizontal
									showsHorizontalScrollIndicator={false}
									contentContainerStyle={styles.hourScrollContainer}>
									{Array.from({ length: 24 }).map((_, hour) => {
										const isSelected = tempSelectedHour === hour;
										return (
											<TouchableOpacity
												key={hour}
												onPress={() => {
													setTempSelectedHour(hour);
													setTempAlarmTime(DateUtils.createLocalDateAtTime(hour));
												}}
												style={[styles.hourButton, isSelected && styles.hourButtonSelected]}>
												<Text style={[styles.hourText, isSelected && styles.hourTextSelected]}>
													{hour.toString().padStart(2, '0')}시
												</Text>
											</TouchableOpacity>
										);
									})}

								</ScrollView>
							</View>
						</View>
					</View>
				)}

				{isAlarmEnabled && (
					<View style={styles.scoreBox}>
						<View style={styles.scoreRow}>
							<Text style={styles.scoreText}>{getFormattedDate()} 오늘의 퀴즈</Text>

							<View style={styles.scoreRightGroup}>
								<TouchableOpacity hitSlop={HitSlop}
									onPress={() => {
										setTempIsAlarmEnabled(isAlarmEnabled);
										setTempAlarmTime(alarmTime);
										setShowAlarmModal(true);
									}}
									accessibilityRole="button"
									accessibilityLabel="알림 시각 바꾸기"
									style={{ marginLeft: 0 }}>
									<View style={styles.bellWrapper}>
										<IconComponent name="bell" type="FontAwesome" size={scaledSize(15)} color={Colors.warningBright} />
									</View>
								</TouchableOpacity>
							</View>
						</View>
						<View style={styles.progressContainer}>
							<View style={styles.progressBarBackground}>
								<View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
							</View>
							<Text style={styles.progressText}>
								{solved} / {total}{' '}
							</Text>
						</View>
					</View>
				)}

				<View style={styles.container}>
					{isAlarmEnabled && quizList.length > 0 && Object.keys(quizOptionsMap).length > 0 && (
						<View style={styles.quizContainer2}>
							{!hasStarted && isTodayUnsolved ? (
								// 👉 아직 시작 안 했을 때는 "퀴즈 도착 카드"
								<View style={styles.emptyQuizBox}>
									<FastImage
										source={FourImages.screen_fox_daily_quiz}
										style={styles.emptyQuizImage}
										resizeMode={FastImage.resizeMode.contain}
									/>
									<Text style={styles.emptyQuizTitle}>오늘의 퀴즈가 도착했습니다</Text>
									<Text style={styles.emptyQuizSubtitle}>지금 바로 시작해 보세요!</Text>

									<TouchableOpacity
										style={styles.startQuizButton}
										onPress={async () => {
											if (quizList.length === 0) {
												await initQuiz();
											}
											setHasStarted(true); // ✅ 시작 상태 켜기
											setCurrentIndex(0);
											// ✅ 첫 문제 카드 진입 애니메이션을 명시적으로 실행
											// (currentIndex가 0으로 동일해 useEffect가 재실행되지 않아 cardAnim이
											//  중간값에서 멈춰 화면이 흐릿하게 보이던 버그 방지)
											cardAnim.setValue(0);
											Animated.timing(cardAnim, {
												toValue: 1,
												duration: 380,
												easing: Easing.out(Easing.cubic),
												useNativeDriver: true,
											}).start();
											scrollRef.current?.scrollTo({ y: 0, animated: true });
										}}>
										<Text style={styles.startQuizButtonText}>오늘의 퀴즈 시작</Text>
									</TouchableOpacity>
								</View>
							) : !isQuizCompleted ? (
								// 👉 시작했고 아직 안 끝났을 때는 문제 화면
								<Animated.View
								style={{
									paddingBottom: SpacingV.lg,
									opacity: cardAnim,
									transform: [
										{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(18), 0] }) },
									],
								}}>
								{renderItem({ item: quizList[currentIndex] })}
							</Animated.View>
							) : (
								// 👉 다 끝난 후 완료 화면
								<>
									<View style={styles.completedCard}>
										<FastImage
											source={TODAY_QUIZ_COMPLETE_IMAGE}
											style={styles.completedAsset}
											resizeMode={FastImage.resizeMode.contain}
											accessible
											accessibilityLabel="오늘의 퀴즈 완료 메달"
										/>
										<Text style={styles.completedTitle}>오늘의 문제 끝!</Text>
										<Text style={styles.completedSubtitle}>내일 또 만나요 👋</Text>
										<View style={styles.completedScorePill}>
											<IconComponent type="materialIcons" name="check-circle" size={scaledSize(16)} color={Colors.primary} />
											<Text style={styles.completedScoreText}>
												<Text style={styles.completedScoreNum}>{correct}</Text>
												<Text style={styles.completedScoreTotal}> / {quizList.length}</Text> 정답
											</Text>
										</View>
										{/*
										 * 문제별 결과 줄 — 네모 이모지는 기기마다 크기·색이 제각각이고 눌러도 아무 뜻이 없었다.
										 * 문제 번호가 든 동그라미로 바꾸고, 맞았는지는 오른쪽 아래 작은 도장으로 얹는다.
										 * 왼쪽부터 차례로 통통 튀어 들어와 "채점이 끝났다" 가 움직임으로도 읽힌다.
										 * (공유 글에는 워들식 🟩🟥 줄이 그대로 나간다 — onShareResult)
										 */}
										<Text style={styles.gradeCaption}>문제별 결과</Text>
										<View style={styles.gradeChips}>
											{quizList.map((item, at) => (
												<GradeDot key={item.id} index={at} ok={answerResults[item.id] === true} />
											))}
										</View>
										<TouchableOpacity style={styles.shareButton} onPress={onShareResult} activeOpacity={0.8} accessibilityRole="button">
											<IconComponent type="materialCommunityIcons" name="share-variant" size={scaledSize(16)} color={Colors.textInverse} />
											<Text style={styles.shareButtonText}>결과 공유하기</Text>
										</TouchableOpacity>
									</View>

									<TouchableOpacity onPress={() => setShowTodayReview((prev) => !prev)} style={styles.reviewToggleButton}>
										<IconComponent
											name={showTodayReview ? 'chevron-up' : 'chevron-down'}
											type="FontAwesome"
											size={scaledSize(16)}
											color={Colors.text}
											style={{ marginRight: Spacing.sm }}
										/>
										<Text style={styles.acodianTxt}>{showTodayReview ? '오늘의 퀴즈 접기' : '오늘의 퀴즈 다시 보기'}</Text>
									</TouchableOpacity>

									{showTodayReview && (
										<View style={styles.reviewList}>
											{quizList.map((item) => {
												const itemResult = answerResults[item.id];
												return (
													<TouchableOpacity
														key={item.id}
														activeOpacity={0.85}
														style={styles.reviewItemCard}
														onPress={() => {
															setDetailQuiz(item);
															setDetailModalVisible(true);
														}}>
														<View style={styles.reviewItemTextWrap}>
															<Text style={styles.reviewItemTitle} numberOfLines={1}>
																{item.hangul}
																<Text style={styles.reviewItemHanja}> ({item.hanja})</Text>
															</Text>
															<Text style={styles.reviewItemMeaning} numberOfLines={1}>
																{item.meaning}
															</Text>
														</View>
														<View style={[styles.reviewItemPill, itemResult ? styles.pillCorrect : styles.pillWrong]}>
															<Text style={styles.resultPillText}>{itemResult ? '정답' : '오답'}</Text>
														</View>
														<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
													</TouchableOpacity>
												);
											})}
										</View>
									)}
								</>
							)}
						</View>
					)}
					{/* ❗ fallback UI 추가 */}
					{isAlarmEnabled && quizList.length === 0 && (
						<View style={styles.loadingState}>
							<FastImage source={FourImages.screen_fox_loading} style={styles.loadingMascot} resizeMode="contain" />
							<Text style={{ color: Colors.textSecondary, fontSize: Typography.body }}>퀴즈를 준비 중입니다...</Text>
							<ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: SpacingV.md }} />
							<TouchableOpacity onPress={initQuiz} style={{ marginTop: SpacingV.md }}>
								<Text style={{ color: Colors.primary }}>🔄 다시 불러오기</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>
			</ScrollView>

			{/* 스크롤 최상단 이동 버튼 (공통 컴포넌트 — 등장/퇴장 애니메이션 포함) */}
			<ScrollTopButton visible={showScrollTop} onPress={handleScrollToTop} />
			<AppModal visible={showAlarmModal} transparent animationType="fade" onRequestClose={() => setShowAlarmModal(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.alarmModalCard}>
						<Text style={styles.modalTitle2}>🔔 오늘의 퀴즈 알림 설정</Text>

						<View style={styles.modalRow}>
							<Text style={styles.modalLabel}>알림 사용</Text>

							<Switch
								value={tempIsAlarmEnabled}
								onValueChange={setTempIsAlarmEnabled}
								trackColor={{ false: Colors.textSecondary, true: Colors.secondaryPale }}
								thumbColor={tempIsAlarmEnabled ? Colors.warningLight : Colors.surfaceAlt}
							/>
						</View>

						{/* 알림 시간은 스위치가 켜졌을 때만 보이게 */}
						{tempIsAlarmEnabled && (
							<View style={styles.modalRow}>
								<View style={{ width: '100%', marginTop: SpacingV.md }}>
									<View style={styles.timePickerRow}>
										<Text style={styles.modalLabel}>알림 시간</Text>
										<Text style={styles.selectedHourText}>{tempSelectedHour.toString().padStart(2, '0')}시</Text>
									</View>

									<ScrollView
										ref={modalScrollRef}
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={{
											paddingVertical: SpacingV.sm,
											paddingHorizontal: Spacing.xs,
										}}>
										{Array.from({ length: 24 }).map((_, hour) => {
											const isSelected = tempSelectedHour === hour;
											return (
												<TouchableOpacity
													key={hour}
													onPress={() => {
														setTempSelectedHour(hour);
													setTempAlarmTime(DateUtils.createLocalDateAtTime(hour));
													}}
													style={[styles.hourButton, isSelected && styles.hourButtonSelected]}>
													<Text style={[styles.hourText, isSelected && styles.hourTextSelected]}>
														{hour.toString().padStart(2, '0')}시
													</Text>
												</TouchableOpacity>
											);
										})}
									</ScrollView>
								</View>
							</View>
						)}

						<View style={styles.modalButtonRow}>
							<TouchableOpacity
								style={styles.cancelButton}
								onPress={() => {
									setShowAlarmModal(false);
									setTempIsAlarmEnabled(isAlarmEnabled);
									setTempSelectedHour(DateUtils.getLocalHour(alarmTime));
									// ✅ 임시값 초기화
									setTempAlarmTime(alarmTime);
								}}>
								<Text style={styles.cancelButtonText}>취소</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.saveButton}
								onPress={async () => {
									setShowAlarmModal(false);

									let finalAlarmTime = DateUtils.createLocalDateAtTime(tempSelectedHour);

									if (!tempIsAlarmEnabled) {
										// 알림 끈 경우 15:00으로 고정
										finalAlarmTime = DateUtils.createLocalDateAtTime(15);
										setTempSelectedHour(15); // ✅ 여기 추가
									}

									await saveSettingInfo({
										isUseAlarm: tempIsAlarmEnabled,
										alarmTime: finalAlarmTime.toISOString(),
										alarmHour: tempIsAlarmEnabled ? tempSelectedHour : 15,
										timeZone: DateUtils.getTimeZone(),
									});

									const hour = DateUtils.getLocalHour(finalAlarmTime).toString().padStart(2, '0');
									if (tempIsAlarmEnabled) {
										showToast('알림을 설정했습니다', { subMessage: `매일 ${hour}시에 오늘의 퀴즈를 알려 드리겠습니다` });
									} else {
										showToast('알림을 해제했습니다', { subMessage: '언제든 다시 켤 수 있습니다' });
									}

									if (tempIsAlarmEnabled) {
										await cancelScheduledNotification();
										await scheduleDailyQuizNotification(finalAlarmTime);
									} else {
										await cancelScheduledNotification();
									}

									setAlarmTime(finalAlarmTime); // ✅ 여기서 반영
									setTempAlarmTime(finalAlarmTime); // ✅ 임시 값도 갱신
									setIsAlarmEnabled(tempIsAlarmEnabled);
									setShowTodayReview(false);

									// ✅ 저장 완료 알림 추가
								}}>
								<Text style={styles.saveButtonText}>저장</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</AppModal>
			<AppModal
				visible={showPrevQuizModal}
				transparent
				animationType="fade"
				onRequestClose={() => setShowPrevQuizModal(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.alarmModalCard}>
						{/*
						 * 닫기 아이콘.
						 * AntDesign·FontAwesome 으로 두면 글리프가 안 나와 물음표로 찍히는 기기가 있었다.
						 * 앱의 다른 모든 닫기 버튼과 같은 MaterialIcons 로 맞춘다 (그쪽은 문제가 없다).
						 */}
						<TouchableOpacity hitSlop={HitSlop} style={styles.modalCloseIcon} onPress={() => setShowPrevQuizModal(false)} accessibilityRole="button" accessibilityLabel="닫기">
							<IconComponent name="close" type="materialIcons" size={scaledSize(22)} color={Colors.text} />
						</TouchableOpacity>

						<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SpacingV.md }}>
							<IconComponent name="book-open-page-variant-outline" type="materialCommunityIcons" size={scaledSize(20)} color={Colors.textMuted} style={{ marginRight: Spacing.sm }} />
							<Text style={styles.modalTitle}>지난 오늘의 퀴즈</Text>
						</View>

						<Text style={styles.modalNotice}>※ 오늘 날짜는 제외되며, 전날 퀴즈만 표시됩니다.</Text>

						<ScrollView ref={modalScrollRef} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
							{groupedPrevQuizzes.length === 0 ? (
								<View style={styles.emptyView}>
									<Text style={styles.emptyText}>오늘의 퀴즈를 아직 풀지 않았습니다.</Text>
								</View>
							) : (
								groupedPrevQuizzes.map((group) => {
									const { formattedDate, dayOfWeek } = formatQuizDate(group.date);
									return (
										<View key={group.date} style={styles.quizGroup}>
											{/* 섹션 헤더 */}
											<View style={styles.historySectionHeader}>
												<View style={styles.historySectionHeaderLeft}>
													<IconComponent
														name="calendar"
														type="FontAwesome"
														size={scaledSize(16)}
														color={Colors.primary}
														style={{ marginRight: Spacing.sm }}
													/>
													<Text style={styles.historySectionTitle}>
														{formattedDate} ({dayOfWeek}) 퀴즈
													</Text>
												</View>
												<View style={styles.historyDateChip}>
													<Text style={styles.historyDateChipText}>
														({Object.values(group.answerResults).filter((v) => v === true).length}/{group.quizList.length})
													</Text>
												</View>
											</View>

											{group.quizList.map((item) => {
												const isCorrect = group.answerResults?.[item.id] === true;
												const isWrong = group.answerResults?.[item.id] === false;
												const isFavorite = favoriteIds.includes(item.id);

												return (
													<View key={item.id} style={styles.historyCard}>
														<View style={styles.historyCardBody}>
															{/* 타이틀 + 정오답 배지 */}
															<View style={styles.historyHeaderRow}>
																<Text style={styles.historyIdiom}>
																	{item.hangul}({item.hanja})
																</Text>
																<View style={styles.historyHeaderRight}>
																	{/* 안 푼 문제까지 '오답'으로 보이던 문제 수정 */}
																	<View style={[styles.resultPill, isCorrect ? styles.pillCorrect : isWrong ? styles.pillWrong : styles.pillSkipped]}>
																		<Text style={styles.resultPillText}>{isCorrect ? '정답' : isWrong ? '오답' : '미응답'}</Text>
																	</View>
																</View>
															</View>

															{/* 의미 (한 줄 요약) */}
															<View style={styles.historyMeaningBox}>
																<Text style={styles.historyMeaningValue} numberOfLines={3}>{item.meaning}</Text>
															</View>
														</View>
														<TouchableOpacity
															style={styles.historyChevronButton}
															accessibilityRole="button"
															accessibilityLabel={`${item.hangul} 자세히 보기`}
															onPress={() => {
																setDetailQuiz(item);
																setDetailModalVisible(true);
															}}
															hitSlop={{ top: scaleHeight(10), bottom: scaleHeight(10), left: scaleWidth(10), right: scaleWidth(10) }}>
															<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(21)} color={Colors.textMuted} />
														</TouchableOpacity>

														{/* ✅ 우측 상단 오버레이 즐겨찾기 버튼 */}
														<TouchableOpacity
															style={styles.favoriteOverlayButton}
															accessibilityRole="button"
															accessibilityLabel={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
															onPress={(e) => {
																e.stopPropagation();
																handleToggleFavorite(item.id);
															}}
															hitSlop={{ top: scaleHeight(10), bottom: scaleHeight(10), left: scaleWidth(10), right: scaleWidth(10) }}>
															<Icon
																name="star"
																solid={isFavorite}
																size={scaledSize(18)}
																color={isFavorite ? Colors.warningBright : Colors.textMuted}
															/>
														</TouchableOpacity>
													</View>
												);
											})}
										</View>
									);
								})
							)}
						</ScrollView>

						<TouchableOpacity style={styles.modalFooterButton} onPress={() => setShowPrevQuizModal(false)}>
							<Text style={styles.modalFooterButtonText}>닫기</Text>
						</TouchableOpacity>
					</View>
				</View>
				<FavoriteToast visible={favoriteToastVisible} message={toastMessage} onHide={() => setFavoriteToastVisible(false)} />
			</AppModal>

			<ProverbDetailModal visible={detailModalVisible} proverb={detailQuiz} onClose={() => setDetailModalVisible(false)} />

			{/* 🏅 오늘의 퀴즈 뱃지 획득 모달 */}
			<NewBadgeModal
				visible={badgeModalVisible}
				badges={newlyEarnedBadges}
				onConfirm={() => setBadgeModalVisible(false)}
			/>

			{/* 상세 모달 */}

			{/* <IdiomDetailModal idiom={detailQuiz} visible={detailModalVisible} onClose={() => setDetailModalVisible(false)} /> */}

	<CharacterGuide
		visible={guide.visible}
		onClose={guide.close}
		lines={[
			'오늘의 퀴즈는 매일 새로 뽑히는 5문제를 가볍게 푸는 코너입니다.',
			'알림을 켜두면 원하는 시간에 알려 드립니다.',
			'오른쪽 위 "지난 오늘의 퀴즈"에서 예전에 푼 문제도 다시 볼 수 있습니다!',
		]}
		title="오늘의 퀴즈, 이렇게 씁니다"
	/>
</SafeAreaView>
	);
};

/**
 * 문제 하나의 채점 결과 — 번호가 든 동그라미 + 맞았는지 도장.
 * 왼쪽부터 순서대로 통통 튀며 들어온다 (index 만큼 늦게 시작).
 */
const GradeDot = ({ index, ok }: { index: number; ok: boolean }) => {
	const pop = useRef(new Animated.Value(0)).current;
	useAnimationCleanup(pop);

	useEffect(() => {
		const anim = Animated.spring(pop, { toValue: 1, friction: 6, tension: 150, delay: index * 70, useNativeDriver: true });
		anim.start();
		return () => anim.stop();
	}, [index, pop]);

	return (
		<Animated.View
			style={[
				styles.gradeDot,
				ok ? styles.gradeDotOk : styles.gradeDotNo,
				{ opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
			]}
			accessible
			accessibilityLabel={`${index + 1}번 문제 ${ok ? '정답' : '오답'}`}>
			<Text style={[styles.gradeDotNum, ok ? styles.gradeDotNumOk : styles.gradeDotNumNo]} allowFontScaling={false}>
				{index + 1}
			</Text>
			<View style={[styles.gradeDotMark, { backgroundColor: ok ? Colors.success : Colors.error }]}>
				<IconComponent type="materialIcons" name={ok ? 'check' : 'close'} size={scaledSize(9)} color={Colors.textInverse} />
			</View>
		</Animated.View>
	);
};

export default TodayQuizScreen;

const makeStyles = () => StyleSheet.create({
	main: {
		flex: 1,
		backgroundColor: Colors.background, // ✅ 화면 기본 배경 (전 화면 공통)
	},
	content: {
		marginHorizontal: Spacing.lg,
		// padding 한 방에 scaleHeight 를 쓰면 좌우 여백까지 세로 스케일을 먹어 태블릿에서 얇아진다
		paddingHorizontal: Spacing.lg,
		paddingVertical: SpacingV.xxl,
		borderRadius: Radius.lg,
		backgroundColor: Colors.surface,
		justifyContent: 'center', // ✅ 수직 가운데 정렬
		alignItems: 'center', // ✅ 수평 가운데 정렬
		borderWidth: 1,
		borderColor: Colors.border,
	},
	arrivalHero: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.lg,
		marginBottom: SpacingV.lg,
	},
	arrivalCopy: {
		flex: 1,
		alignItems: 'flex-start',
	},
	arrivalBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.xs,
		paddingHorizontal: Spacing.sm,
		paddingVertical: SpacingV.xs,
		marginBottom: SpacingV.sm,
		borderRadius: Radius.pill,
		backgroundColor: Colors.primaryBg,
	},
	arrivalBadgeText: {
		fontSize: Typography.caption,
		fontWeight: FontWeight.semibold,
		color: Colors.primary,
	},
	arrivalImageStage: {
		width: scaleWidth(104),
		height: scaleWidth(104),
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: Radius.xl,
		backgroundColor: Colors.accentAmberSoft,
		overflow: 'hidden',
	},
	arrivalImage: {
		width: scaleWidth(94),
		height: scaleWidth(94),
	},
	title: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
		lineHeight: scaledSize(26),
	},
	arrivalSubtitle: {
		marginTop: SpacingV.sm,
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		lineHeight: scaledSize(20),
	},
	benefitStrip: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'stretch',
		paddingVertical: SpacingV.md,
		borderRadius: Radius.md,
		backgroundColor: Colors.surfaceAlt,
	},
	benefitItem: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: SpacingV.xs,
		paddingHorizontal: Spacing.xs,
	},
	benefitDivider: {
		width: 1,
		backgroundColor: Colors.border,
	},
	benefitText: {
		fontSize: Typography.caption,
		fontWeight: FontWeight.semibold,
		color: Colors.textStrong,
		textAlign: 'center',
	},
	description: {
		fontSize: Typography.body,
		color: Colors.textSecondary,
		lineHeight: scaledSize(22),
		textAlign: 'left',
		marginBottom: SpacingV.md,
	},
	switchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
	},
	switchLabel: {
		fontSize: Typography.body,
		color: Colors.text,
	},
	timeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
	},
	timeText: {
		fontSize: Typography.body,
		color: Colors.primary,
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.md,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.sm,
		minWidth: scaleWidth(70),
		textAlign: 'center',
	},
	container: {
		// 좌우 8을 주면 안쪽 quizContainer2(marginHorizontal 16)와 합쳐져 24가 되고,
		// 위쪽 '지난 오늘의 퀴즈' 줄(16)과 왼쪽 끝이 어긋난다 — 세로 여백만 담당한다
		paddingVertical: SpacingV.sm,
	},
	quizBox: {
		marginBottom: SpacingV.md,
		padding: SpacingV.lg,
		borderRadius: Radius.sm,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	quizSubContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: SpacingV.xl,
	},
	rampRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: SpacingV.md,
	},
	rampStep: {
		fontSize: Typography.caption,
		fontWeight: FontWeight.heavy,
		color: Colors.textMuted,
		letterSpacing: 0.5,
	},

	question: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		marginBottom: SpacingV.md,
	},
	option: {
		padding: SpacingV.md,
		borderRadius: Radius.sm,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		marginBottom: SpacingV.sm,
	},
	resultBannerWrap: {
		alignItems: 'center',
		marginTop: scaleHeight(-2),
		marginBottom: SpacingV.md,
	},
	resultBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.lg,
		borderRadius: Radius.xxl,
		borderWidth: 1,
	},
	resultBannerCorrect: {
		backgroundColor: Colors.successBg,
		borderColor: Colors.successBorder,
	},
	resultBannerWrong: {
		backgroundColor: Colors.errorBg,
		borderColor: Colors.errorBorder,
	},
	resultBannerIcon: {
		width: scaleWidth(22),
		height: scaleWidth(22),
		borderRadius: Radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: Spacing.sm,
	},
	resultBannerText: {
		fontSize: Typography.body,
		fontWeight: FontWeight.heavy,
	},
	correct: {
		color: Colors.success,
		fontWeight: FontWeight.bold,
		marginBottom: SpacingV.xs,
	},
	wrong: {
		color: Colors.error,
		fontWeight: FontWeight.bold,
		marginBottom: SpacingV.xs,
	},
	alarmRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		width: '100%',
		paddingVertical: SpacingV.xs,
		marginBottom: SpacingV.sm,
	},
	selectedOption: {
		backgroundColor: Colors.secondaryBg, // 연한 하늘색
		borderColor: Colors.primary, // 진한 민트 계열
		borderWidth: 2,
	},
	scoreBox: {
		marginTop: SpacingV.sm,
		marginHorizontal: Spacing.xxl,
		padding: SpacingV.lg,
		borderRadius: Radius.md,
		backgroundColor: Colors.surface,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: Colors.border,
	},
	scoreText: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.text,
	},
	feedbackText: {
		marginTop: SpacingV.xs,
		fontSize: Typography.subtitle,
		color: Colors.textSecondary,
	},
	questionGuideCombined: {
		fontSize: Typography.subtitle,
		color: Colors.text,
		fontWeight: FontWeight.bold,
	},
	questionCombined: {
		flexShrink: 1,
		flexWrap: 'wrap',
		marginTop: SpacingV.xs,
		marginBottom: SpacingV.lg,
	},
	// 문제는 화면에서 가장 먼저 읽혀야 한다 — 보기 글씨보다 한참 크게 세운다
	questionMain: {
		fontSize: Typography.h2,
		fontWeight: FontWeight.heavy,
		color: Colors.secondaryDark, // ✅ 파란색
		marginBottom: SpacingV.md,
	},
	questionSub: {
		fontSize: Typography.subtitle,
		color: Colors.textSecondary,
	},

	characterGridContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between', // 또는 'center'
		flexWrap: 'wrap',
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.md,
		marginBottom: SpacingV.md,
		borderWidth: 1,
	},

	characterColumn: {
		alignItems: 'center',
		width: scaleWidth(50),
	},

	charText: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
	},

	hangulText: {
		fontSize: Typography.subtitle,
		color: Colors.text,
		marginTop: SpacingV.xxs,
	},

	meaningText: {
		fontSize: Typography.footnote,
		color: Colors.textSecondary,
		marginTop: SpacingV.xxs,
		textAlign: 'center',
	},

	radicalText: {
		fontSize: Typography.footnote,
		color: Colors.textMuted,
		marginTop: SpacingV.xxs,
	},

	quizContainer: {
		marginHorizontal: Spacing.lg,
		marginTop: SpacingV.md,
		backgroundColor: Colors.surface,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.border,
	},

	quizContainer2: {
		marginHorizontal: Spacing.lg,
		backgroundColor: Colors.surface,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.border,
	},

	header: {
		paddingTop: SpacingV.lg,
		paddingBottom: SpacingV.md,
		paddingHorizontal: Spacing.xl,
		backgroundColor: Colors.surface,
		borderBottomWidth: 1,
		borderBottomColor: Colors.border,
	},

	headerTitle: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
		textAlign: 'center',
	},

	scoreRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
		paddingHorizontal: Spacing.md,
		marginBottom: SpacingV.sm,
	},

	scoreValue: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
	},

	progressContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
		paddingHorizontal: Spacing.sm,
		marginTop: SpacingV.sm,
	},

	progressBarBackground: {
		flex: 1,
		height: scaleHeight(10),
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.xs,
		overflow: 'hidden',
		marginRight: Spacing.md,
	},

	progressBarFill: {
		height: '100%',
		backgroundColor: Colors.primary, // 초록색(브랜드 그린)
	},

	progressText: {
		fontSize: Typography.bodySm,
		color: Colors.text,
		fontWeight: FontWeight.medium,
	},

	explanationBox: {
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		borderRadius: Radius.md,
		padding: SpacingV.md,
		backgroundColor: Colors.background,
		marginTop: SpacingV.sm,
	},

	correctMeaning: {
		fontSize: Typography.subtitle,
		color: Colors.text,
		marginTop: SpacingV.sm,
		marginBottom: SpacingV.sm,
	},

	correctMeaningHighlight: {
		fontWeight: FontWeight.bold,
		color: Colors.primary,
		fontSize: Typography.callout,
	},

	correctMeaningHighlight2: {
		fontWeight: FontWeight.bold,
		color: Colors.primary,
		fontSize: Typography.callout,
		marginBottom: SpacingV.sm,
	},

	exampleSentence: {
		fontSize: Typography.body,
		fontStyle: 'italic',
		color: Colors.textSecondary,
		marginTop: SpacingV.sm,
	},

	bellButton: {
		position: 'absolute',
		right: scaleWidth(20),
		top: scaleHeight(16),
		padding: SpacingV.xs,
	},

	alarmRowExpanded: {
		marginHorizontal: Spacing.xl,
		marginTop: SpacingV.md,
		padding: SpacingV.lg,
		borderRadius: Radius.md,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
	},

	modalOverlay: {
		flex: 1,
		backgroundColor: Colors.scrim,
		justifyContent: 'center',
		alignItems: 'center',
	},

	modalContent: {
		width: '80%',
		backgroundColor: Colors.surface,
		borderRadius: Radius.md,
		padding: SpacingV.xxl,
		alignItems: 'center',
	},

	modalTitle2: {
		fontSize: Typography.title,
		marginBottom: SpacingV.xl,
		fontWeight: FontWeight.bold,
		color: Colors.text,
	},

	modalCloseText: {
		fontSize: Typography.body,
		color: Colors.text,
	},

	scoreRightGroup: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	alarmModalCard: {
		width: '85%',
		maxWidth: MODAL_MAX_WIDTH,
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		padding: SpacingV.xxl,
		alignItems: 'center',
	},

	modalRow: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginVertical: SpacingV.sm,
	},

	timeSelector: {
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.lg,
		borderRadius: Radius.sm,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		backgroundColor: Colors.surfaceAlt,
	},

	timeSelectorText: {
		fontSize: Typography.callout,
		color: Colors.primary,
	},

	modalButtonRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: SpacingV.xxl,
		width: '100%',
	},

	cancelButton: {
		flex: 1,
		padding: SpacingV.md,
		borderRadius: Radius.sm,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		marginRight: Spacing.sm,
		alignItems: 'center',
	},

	saveButton: {
		flex: 1,
		padding: SpacingV.md,
		borderRadius: Radius.sm,
		backgroundColor: Colors.secondarySurface,
		alignItems: 'center',
	},

	cancelButtonText: {
		flexShrink: 1,
		color: Colors.textSecondary,
		fontSize: Typography.callout,
	},

	saveButtonText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
	},

	prevQuizButton: {
		marginTop: SpacingV.md,
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.lg,
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.sm,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
	},

	prevQuizButtonText: {
		flexShrink: 1,
		fontSize: Typography.body,
		color: Colors.text,
		textAlign: 'center',
	},

	prevQuizFloatingButton: {
		padding: SpacingV.xs,
	},

	prevQuizFloatingText: {
		fontSize: Typography.footnote,
		color: Colors.textMuted,
		textDecorationLine: 'underline',
	},

	modalCloseIcon: {
		position: 'absolute',
		top: scaleHeight(18),
		right: scaleWidth(18),
		padding: SpacingV.xs,
		zIndex: 10,
	},

	modalFooterButton: {
		marginTop: SpacingV.lg,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		backgroundColor: Colors.background,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.xl,
		borderRadius: Radius.sm,
	},

	modalFooterButtonText: {
		flexShrink: 1,
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
		color: Colors.text,
	},

	highlightCorrectBorder: {
		borderColor: Colors.success,
		borderWidth: 3,
	},

	quizSectionHeader: {
		borderBottomWidth: 1,
		borderBottomColor: Colors.border,
		paddingBottom: SpacingV.sm,
		marginBottom: SpacingV.md,
	},

	quizSectionHeaderText: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
	},

	quizCard: {
		backgroundColor: Colors.background,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.md,
		padding: SpacingV.md,
		marginBottom: SpacingV.md,
	},

	quizTitle: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.semibold,
		color: Colors.text,
	},

	quizMeaning: {
		fontSize: Typography.body,
		color: Colors.text,
		marginBottom: SpacingV.xxs,
	},

	quizExample: {
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		fontStyle: 'italic',
	},

	optionText: {
		fontSize: Typography.body, // 기존보다 약간 크게 (기본 13~14 예상)
		color: Colors.text,
	},

	calendarContainer: {
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		padding: SpacingV.sm,
		marginBottom: SpacingV.lg,
		backgroundColor: Colors.surface,
	},

	buttonContainer: {
		alignItems: 'flex-end',
		marginHorizontal: Spacing.lg,
		marginTop: SpacingV.xs,
	},

	resetButton: {
		backgroundColor: Colors.surfaceAlt,
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.md,
		borderRadius: Radius.sm,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
	},

	iconSpacing: {
		marginRight: Spacing.xs,
	},

	completedCard: {
		alignItems: 'center',
		marginTop: SpacingV.xxl,
		marginHorizontal: Spacing.lg,
		paddingVertical: SpacingV.xxxl,
		paddingHorizontal: Spacing.xl,
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: Colors.surfaceMuted,
	},

	completedAsset: { width: scaleWidth(118), height: scaleWidth(118), marginBottom: SpacingV.md },

	completedTitle: {
		fontSize: Typography.h3,
		color: Colors.textStrong,
		fontWeight: FontWeight.heavy,
		textAlign: 'center',
	},

	completedSubtitle: {
		marginTop: SpacingV.xs,
		fontSize: Typography.body,
		color: Colors.textSecondary,
		fontWeight: FontWeight.medium,
		textAlign: 'center',
	},

	completedScorePill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		marginTop: SpacingV.lg,
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.lg,
		borderRadius: Radius.pill,
		backgroundColor: Colors.primaryBg,
		borderWidth: 1,
		borderColor: Colors.primaryTint,
	},

	/** 문제별 결과 칩 한 줄 — 정답은 초록, 오답은 붉은 테로 문제 번호까지 읽힌다 */
	// 결과 줄 머리말 — 동그라미가 무엇을 뜻하는지 한 단어로 짚어 준다
	gradeCaption: { marginTop: SpacingV.lg, fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textMuted },
	gradeChips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		// 도장이 동그라미 밖으로 조금 나오므로 가로 간격을 세로보다 넉넉히 준다
		columnGap: Spacing.md,
		rowGap: SpacingV.md,
		marginTop: SpacingV.sm,
	},
	gradeDot: {
		width: scaleWidth(38),
		height: scaleWidth(38),
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: Radius.pill,
		borderWidth: scaleWidth(2),
	},
	gradeDotOk: { borderColor: Colors.success, backgroundColor: Colors.successSoft },
	gradeDotNo: { borderColor: Colors.error, backgroundColor: Colors.errorSoft },
	gradeDotNum: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, fontVariant: ['tabular-nums'], includeFontPadding: false },
	gradeDotNumOk: { color: Colors.successDark },
	gradeDotNumNo: { color: Colors.errorDark },
	// 맞았는지 도장 — 오른쪽 아래에 반쯤 걸쳐 붙는다
	gradeDotMark: {
		position: 'absolute',
		right: scaleWidth(-3),
		bottom: scaleWidth(-3),
		width: scaleWidth(16),
		height: scaleWidth(16),
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: Radius.pill,
		borderWidth: scaleWidth(1.5),
		borderColor: Colors.surface,
	},
	shareButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		marginTop: SpacingV.md,
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.xl,
		borderRadius: Radius.pill,
		backgroundColor: Colors.primary,
	},
	shareButtonText: {
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.bold,
		color: Colors.textInverse,
	},
	completedScoreText: {
		fontSize: Typography.body,
		color: Colors.text,
		fontWeight: FontWeight.semibold,
	},

	completedScoreNum: {
		fontSize: Typography.subtitle,
		color: Colors.primaryDark,
		fontWeight: FontWeight.heavy,
	},

	completedScoreTotal: {
		color: Colors.textMuted,
		fontWeight: FontWeight.bold,
	},

	reviewItemCard: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.md,
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.lg,
		marginBottom: SpacingV.md,
		borderWidth: 1,
		borderColor: Colors.border,
	},

	reviewItemTextWrap: { flex: 1 },

	reviewItemTitle: {
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
	},

	reviewItemHanja: { ...getHanjaTextStyle(),
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.medium,
		color: Colors.textMuted,
	},

	reviewItemMeaning: {
		marginTop: SpacingV.xs,
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
	},

	reviewItemPill: {
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.sm,
		borderRadius: Radius.pill,
	},

	reviewToggleButton: {
		marginTop: SpacingV.md,
		marginBottom: SpacingV.md,
		alignSelf: 'center',
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.lg,
		borderRadius: Radius.xl,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
	},

	acodianTxt: { fontSize: Typography.body, fontWeight: FontWeight.semibold, color: Colors.text },

	reviewList: {
		marginTop: SpacingV.md,
		paddingHorizontal: Spacing.md,
	},

	modalNotice: {
		fontSize: Typography.bodySm,
		color: Colors.textMuted,
		marginTop: SpacingV.xs,
		marginBottom: SpacingV.lg,
		textAlign: 'center',
	},

	quizGroup: {
		marginBottom: SpacingV.xxl,
	},

	dayOfWeekText: {
		color: Colors.primary,
	},

	scrollView: {
		maxHeight: scaleHeight(540),
		width: '100%',
	},

	scrollContent: {
		paddingBottom: SpacingV.xl,
	},

	emptyView: {
		paddingVertical: SpacingV.xxxxl,
		alignItems: 'center',
	},

	emptyText: {
		fontSize: Typography.callout,
		color: Colors.textMuted,
	},
	bellWrapper: {
		width: scaleWidth(28),
		height: scaleWidth(28),
		borderRadius: Radius.lg,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: Colors.warning, // 골드 테두리 (GoldenRod)
	},
	// 알림을 한 번도 켜지 않았을 때만 보이는 순서 안내
	setupNotice: {
		width: '100%',
		marginTop: SpacingV.lg,
		marginBottom: SpacingV.sm,
		paddingHorizontal: Spacing.lg,
		paddingVertical: SpacingV.md,
		borderRadius: Radius.md,
		backgroundColor: Colors.primaryBg,
		gap: SpacingV.sm,
	},
	setupNoticeHead: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
	},
	setupNoticeTitle: {
		flexShrink: 1,
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.heavy,
		color: Colors.primaryDark,
	},
	setupStepRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: Spacing.sm,
	},
	setupStepNo: {
		width: scaleWidth(18),
		height: scaleWidth(18),
		marginTop: scaleHeight(1),
		borderRadius: Radius.pill,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.primary,
	},
	setupStepNoText: {
		fontSize: Typography.caption,
		fontWeight: FontWeight.heavy,
		color: Colors.textInverse,
	},
	setupStepText: {
		flex: 1,
		fontSize: Typography.caption,
		color: Colors.text,
		lineHeight: scaledSize(17),
	},
	alarmRow2: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	selectedHourText: {
		marginLeft: Spacing.xl,
		fontSize: Typography.body,
		color: Colors.primary,
		fontWeight: FontWeight.bold,
	},
	hourScrollContainer: {
		paddingVertical: SpacingV.sm,
	},
	hourButton: {
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.lg,
		marginRight: Spacing.sm,
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		backgroundColor: Colors.surfaceAlt,
	},
	hourButtonSelected: {
		backgroundColor: Colors.secondarySurface,
		borderColor: Colors.primary,
	},
	hourText: {
		fontSize: Typography.body,
		fontWeight: FontWeight.bold,
		color: Colors.text,
	},
	hourTextSelected: {
		color: Colors.textInverse,
	},

	timePickerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	buttonRow: {
		flexDirection: 'row',
		justifyContent: 'space-between', // 좌우 끝으로 배치
		alignItems: 'center',
		marginHorizontal: Spacing.lg,
	},

	leftButton: {
		padding: SpacingV.xs,
	},

	rightButton: {
		padding: SpacingV.xs,
	},
	leftButtonWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	rightButtonWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.md,
	},

	buttonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.md,
		borderRadius: Radius.sm,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		backgroundColor: Colors.surface,
	},
	buttonText: {
		fontSize: Typography.bodySm,
		color: Colors.text,
		fontWeight: FontWeight.semibold,
	},
	todayReviewBox: {
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.md,
		padding: SpacingV.md,
		marginHorizontal: Spacing.lg,
		backgroundColor: Colors.surface,
	},
	continent: {
		fontSize: Typography.footnote,
		color: Colors.primary,
		marginTop: SpacingV.xxs,
	},
	imageWrapper: {
		position: 'relative',
	},

	image: {
		width: scaleWidth(90), // 기존 70 → 확대
		height: scaleWidth(90), // 정사각 유지: 세로 스케일을 쓰면 기기에 따라 찌그러진다
		borderRadius: Radius.md,
		marginRight: Spacing.md,
	},

	zoomIconContainer: {
		position: 'absolute',
		bottom: scaleHeight(4),
		right: scaleWidth(8),
		backgroundColor: Colors.surface,
		borderRadius: Radius.md,
		padding: Spacing.xs,
	},
	fullscreenOverlay: {
		flex: 1,
		backgroundColor: Colors.scrimStrong,
		justifyContent: 'center',
		alignItems: 'center',
	},
	fullscreenImage: {
		width: '100%',
		height: '100%',
	},
	fullscreenCloseButton: {
		position: 'absolute',
		top: scaleHeight(40),
		right: scaleWidth(20),
		backgroundColor: Colors.scrim,
		padding: Spacing.sm,
		borderRadius: Radius.xl,
	},
	imageSourceContainer: {
		position: 'absolute',
		bottom: scaleHeight(20),
		left: scaleWidth(16),
		right: scaleWidth(16),
		alignItems: 'center',
	},

	imageSourceText: {
		color: Colors.textMuted,
		fontSize: Typography.caption,
		textAlign: 'center',
	},

	imageSourceLink: {
		color: Colors.primary,
		textDecorationLine: 'underline',
	},
	imageHintText: {
		fontSize: Typography.caption,
		color: Colors.textMuted,
		marginBottom: SpacingV.md,
	},

	dogNameText: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.sm,
	},
	// 보기는 손가락으로 누르는 칸이다 — 글씨와 높이를 함께 키워 한 줄이 시원하게 읽히게 한다
	optionBase: {
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.xl,
		borderRadius: Radius.xxl, // ✅ 둥근 버튼
		backgroundColor: Colors.surfaceAlt,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		marginBottom: SpacingV.md,
	},

	optionTextBase: {
		fontSize: Typography.subtitle,
		lineHeight: scaledSize(23),
		color: Colors.text,
		fontWeight: FontWeight.semibold,
		textAlign: 'left',
	},

	// 변경 → 테두리만 강조
	correctOption: {
		backgroundColor: Colors.successBg,
		borderColor: Colors.success,
		borderWidth: 3, // 테두리 두께 강조
	},
	wrongOption: {
		backgroundColor: Colors.surfaceAlt, // 기본 배경 유지
		borderColor: Colors.error,
		borderWidth: 3,
	},

	correctText: {
		color: Colors.successDeep,
		fontWeight: FontWeight.bold,
	},
	wrongText: {
		color: Colors.error,
		fontWeight: FontWeight.bold,
	},
	hintText: {
		fontSize: Typography.bodySm,
		color: Colors.text,
		marginTop: SpacingV.xxs,
	},
	hintHighlight: {
		fontWeight: FontWeight.bold,
		color: Colors.text,
	},
	dogInfoBox: {
		backgroundColor: Colors.background,
		padding: SpacingV.lg,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.border,
		marginBottom: SpacingV.md,
	},
	dogInfoTitle: {
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.md,
	},
	dogInfoRow: {
		flexDirection: 'row',
		marginBottom: SpacingV.sm,
		flexWrap: 'wrap',
	},
	dogInfoLabel: {
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		width: scaleWidth(60),
		fontWeight: FontWeight.bold,
	},
	dogInfoValue: {
		fontSize: Typography.body,
		marginBottom: SpacingV.sm,
		color: Colors.text,
		flexShrink: 1,
	},
	questionResultInline: {
		textAlign: 'center',
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
		marginLeft: Spacing.sm,
		lineHeight: scaledSize(20), // ✅ fontSize보다 조금 크게
	},
	scrollTopButton: {
		position: 'absolute',
		right: scaleWidth(16),
		bottom: scaleHeight(16),
		backgroundColor: Colors.secondarySurface,
		width: scaleWidth(40),
		height: scaleWidth(40),
		borderRadius: Radius.xl,
		justifyContent: 'center',
		alignItems: 'center',
	},
	catInfoBox: {
		width: '100%',
		backgroundColor: Colors.surface,
		padding: SpacingV.md,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.surfaceAlt,
		marginBottom: SpacingV.sm,
	},
	catInfoTitle: {
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.md,
	},
	catInfoRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginVertical: SpacingV.xs,
		flexWrap: 'nowrap', // ✅ 줄바꿈 방지 (라벨+값을 같은 줄에 고정)
	},
	catInfoIcon: {
		marginRight: Spacing.sm,
		marginTop: SpacingV.xxs,
	},
	catInfoLabel: {
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		fontWeight: FontWeight.semibold,
		width: scaleWidth(70),
	},
	catInfoValue: {
		fontSize: Typography.bodySm,
		color: Colors.textStrong,
		flexShrink: 1,
	},
	circleImageWrapper: {
		alignItems: 'center',
		marginBottom: SpacingV.md,
	},
	circleImage: {
		width: scaleWidth(88), // 크기는 취향에 맞게 조절
		height: scaleWidth(88),
		borderRadius: scaleWidth(44),
		borderWidth: 2,
		borderColor: Colors.surfaceAlt,
		// 살짝 그림자
	},
	answerExplainBox: {
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		borderRadius: Radius.md,
		padding: SpacingV.md,
		backgroundColor: Colors.background,
		marginTop: SpacingV.sm,
	},
	answerExplainCorrect: {
		backgroundColor: withAlpha(Colors.success, 0.12), // 연한 초록
		borderColor: Colors.success,
	},

	answerExplainWrong: {
		backgroundColor: withAlpha(Colors.error, 0.12), // 연한 빨강
		borderColor: Colors.error,
	},

	answerBadge: {
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
	},
	// 해설 헤더: 속담 + 배지
	explainHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: SpacingV.sm,
	},
	// ✅ 해설 내 상세 콘텐츠 래퍼 (상세 팝업과 동일한 흰 배경 위에 표시)
	explainDetailWrap: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.lg,
		marginTop: SpacingV.xs,
		borderWidth: 1,
		borderColor: Colors.border,
	},

	explainIdiom: {
		flexShrink: 1,
		flexWrap: 'wrap', // 👉 줄바꿈 허용
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
		lineHeight: scaledSize(24),
	},

	correctInline: {
		color: Colors.primary,
		fontWeight: FontWeight.bold,
		fontSize: Typography.body,
	},

	wrongInline: {
		color: Colors.errorDeep,
		fontWeight: FontWeight.bold,
		fontSize: Typography.body,
	},

	// 정오답 배지(오른쪽)
	resultPill: {
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.md,
		borderRadius: Radius.lg,
		borderWidth: 1,
	},
	pillCorrect: {
		backgroundColor: withAlpha(Colors.success, 0.12), // 연녹
		borderColor: Colors.success,
	},
	pillWrong: {
		backgroundColor: withAlpha(Colors.error, 0.12), // 연빨
		borderColor: Colors.error,
	},
	pillSkipped: {
		backgroundColor: Colors.surfaceAlt,
		borderColor: Colors.border,
	},
	resultPillText: {
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
	},

	// 구분선(선택)
	explainDivider: {
		height: 1,
		backgroundColor: Colors.border,
		marginVertical: SpacingV.sm,
	},

	// 정답 의미 라벨/값
	correctMeaningLabel: {
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		marginBottom: SpacingV.xs,
	},
	correctMeaningValue: {
		fontSize: Typography.callout,
		color: Colors.primary,
		fontWeight: FontWeight.bold,
		lineHeight: scaledSize(22),
	},
	// ✅ 추가 스타일
	historySectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: SpacingV.sm,
		marginBottom: SpacingV.md,
		borderBottomWidth: 1,
		borderBottomColor: Colors.surfaceAlt,
	},
	historySectionHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	historySectionTitle: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
	},
	historyDateChip: {
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.sm,
		backgroundColor: Colors.secondaryBg,
		borderWidth: 1,
		borderColor: Colors.secondaryBg,
		borderRadius: Radius.md,
	},
	historyDateChipText: {
		flexShrink: 1,
		fontSize: Typography.caption,
		color: Colors.textSecondary,
	},

	historyColorBar: {
		width: scaleWidth(5),
	},
	historyBarCorrect: {
		backgroundColor: Colors.secondarySurface,
	},
	historyBarWrong: {
		backgroundColor: Colors.error,
	},
	historyCardBody: {
		flex: 1,
		padding: SpacingV.md,
	},

	historyHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	historyIdiom: {
		flex: 1,
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
		paddingRight: Spacing.md,
	},

	historyMeaningBox: {
		marginTop: SpacingV.sm,
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.md,
		borderRadius: Radius.sm,
		backgroundColor: Colors.background,
		borderWidth: 1,
		borderColor: Colors.surfaceAlt,
	},
	historyMeaningLabel: {
		fontSize: Typography.footnote,
		color: Colors.textSecondary,
		marginBottom: SpacingV.xs,
	},
	historyMeaningValue: {
		fontSize: Typography.body,
		color: Colors.text,
		fontWeight: FontWeight.bold,
		lineHeight: scaledSize(20),
	},

	historySubTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	historySubTitle: {
		marginLeft: Spacing.sm,
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.bold,
		color: Colors.text,
	},

	phraseRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: SpacingV.xs,
		flexWrap: 'wrap',
	},
	phraseKr: {
		fontSize: Typography.bodySm,
		color: Colors.textStrong,
		fontWeight: FontWeight.semibold,
	},
	phraseMean: {
		fontSize: Typography.bodySm,
		color: Colors.text,
		flexShrink: 1,
	},

	exampleList: {
		marginTop: SpacingV.xs,
	},
	bulletItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: SpacingV.xs,
	},
	bulletDot: {
		fontSize: Typography.body,
		lineHeight: scaledSize(18),
		color: Colors.primary,
		marginRight: Spacing.sm,
	},
	exampleText: {
		flex: 1,
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		lineHeight: scaledSize(18),
	},

	// 작은 점(정오답 배지 왼쪽)
	resultDot: {
		width: scaleWidth(8),
		height: scaleWidth(8),
		borderRadius: Radius.xs,
		marginRight: Spacing.sm,
	},
	dotCorrect: { backgroundColor: Colors.success },
	dotWrong: { backgroundColor: Colors.error },
	sectionCard: {
		marginTop: SpacingV.md,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.md,
		borderRadius: Radius.md,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: SpacingV.sm,
	},
	sectionHeaderIcon: {
		marginRight: Spacing.sm,
	},
	sectionHeaderText: {
		fontSize: Typography.body,
		fontWeight: FontWeight.bold,
		color: Colors.textStrong,
	},
	sectionTag: {
		marginLeft: 'auto',
		paddingVertical: SpacingV.xxs,
		paddingHorizontal: Spacing.sm,
		borderRadius: Radius.md,
		backgroundColor: Colors.secondaryBg,
		borderWidth: 1,
		borderColor: Colors.secondarySoft,
	},
	sectionTagText: {
		fontSize: Typography.caption,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
	},

	// 어절 행
	sectionItemRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: SpacingV.xs,
		flexWrap: 'wrap',
	},
	sectionItemIndex: {
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		textAlign: 'left',
		marginRight: Spacing.sm,
	},
	sectionItemKey: {
		fontSize: Typography.bodySm,
		color: Colors.textStrong,
		fontWeight: FontWeight.bold,
	},
	sectionItemDash: {
		fontSize: Typography.bodySm,
		color: Colors.textMuted,
	},
	sectionItemValue: {
		fontSize: Typography.bodySm,
		color: Colors.text,
		flexShrink: 1,
	},

	// 예문 불릿
	sectionBulletRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: SpacingV.xs,
	},
	sectionBulletDot: {
		fontSize: Typography.body,
		lineHeight: scaledSize(18),
		color: Colors.primary,
		marginRight: Spacing.sm,
	},
	sectionBulletText: {
		flex: 1,
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		lineHeight: scaledSize(18),
	},
	detailButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: SpacingV.md,
		paddingVertical: SpacingV.sm,
		borderRadius: Radius.sm,
		backgroundColor: Colors.surfaceAlt,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	detailButtonText: {
		flexShrink: 1,
		fontSize: Typography.bodySm,
		color: Colors.text,
		fontWeight: FontWeight.semibold,
	},
	detailModalCard: {
		width: '85%',
		backgroundColor: Colors.surface,
		borderRadius: Radius.md,
		padding: SpacingV.xl,
	},
	detailTitle: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.md,
	},
	detailMeaning: {
		fontSize: Typography.callout,
		color: Colors.primary,
		fontWeight: FontWeight.semibold,
	},
	detailSubTitle: {
		fontSize: Typography.body,
		fontWeight: FontWeight.bold,
		marginBottom: SpacingV.xs,
		color: Colors.text,
	},
	detailPhrase: {
		fontSize: Typography.bodySm,
		color: Colors.text,
		marginBottom: SpacingV.xs,
	},
	detailExample: {
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		marginBottom: SpacingV.xs,
	},
	emptyQuizBox: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: SpacingV.xxxxl,
		paddingHorizontal: Spacing.lg,
	},
	emptyQuizImage: {
		width: scaleWidth(156),
		height: scaleWidth(156),
	},
	emptyQuizTitle: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginTop: SpacingV.lg,
	},
	emptyQuizSubtitle: {
		fontSize: Typography.body,
		color: Colors.textSecondary,
		marginTop: SpacingV.sm,
		marginBottom: SpacingV.xl,
		textAlign: 'center',
	},
	startQuizButton: {
		backgroundColor: Colors.secondarySurface,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.xxl,
		borderRadius: Radius.xxl,
	},
	startQuizButtonText: {
		flexShrink: 1,
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
		color: Colors.textInverse,
	},
	centerStartButton: {
		alignSelf: 'center',
		marginBottom: SpacingV.sm,
		backgroundColor: Colors.secondarySurface,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.xl,
		borderRadius: Radius.xxl,
	},
	centerStartButtonText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
	},
	nextButton: {
		marginTop: SpacingV.md,
		alignSelf: 'center',
		backgroundColor: Colors.secondarySurface,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.xl,
		borderRadius: Radius.xl,
	},
	nextButtonText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
	},
	modalContainer: {
		width: '90%',
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		overflow: 'hidden',
		maxHeight: '85%',
	},

	modalTitle: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		flexShrink: 1,
	},

	modalBody: {
		paddingHorizontal: Spacing.xl,
		paddingTop: SpacingV.lg,
		paddingBottom: SpacingV.lg,
	},

	modalSection: {
		marginBottom: SpacingV.lg,
		backgroundColor: Colors.background,
		padding: Spacing.md,
		borderRadius: Radius.md,
	},

	modalLabel: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
		marginBottom: SpacingV.sm,
	},
	modalText: {
		fontSize: Typography.subtitle, // ⬆️ 기존 15에서 증가
		color: Colors.text,
		lineHeight: scaledSize(26),
	},

	modalText2: {
		fontSize: Typography.body, // ⬆️ 기존 15에서 증가
		color: Colors.text,
		lineHeight: scaledSize(26),
	},
	modalHighlightTitle: {
		fontSize: Typography.body,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
		marginBottom: SpacingV.xs,
	},
	modalHighlightText: {
		fontSize: Typography.callout,
		color: Colors.text,
		lineHeight: scaledSize(22),
	},

	modalCloseButton: {
		backgroundColor: Colors.secondarySurface,
		paddingVertical: SpacingV.lg,
		alignItems: 'center',
		borderBottomLeftRadius: Radius.xl,
		borderBottomRightRadius: Radius.xl,
	},
	modalCloseButtonText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
	},
	modalHeader: {
		backgroundColor: Colors.surface,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.xl,
		borderBottomWidth: 1,
		borderColor: Colors.surfaceAlt,
	},

	modalHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'center', // 중앙 정렬
		alignItems: 'center',
		position: 'relative',
	},
	modalProverbTitle: {
		fontSize: Typography.h3,
		marginTop: SpacingV.xs,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		textAlign: 'center',
	},
	badgeRow: {
		flexDirection: 'row',
		gap: Spacing.sm,
		justifyContent: 'center',
		alignItems: 'center',
	},
	badge: {
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.xs,
		borderRadius: Radius.md,
		backgroundColor: Colors.surfaceAlt,
	},
	badge2: {
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.xs,
		borderRadius: Radius.md,
		backgroundColor: Colors.surfaceAlt,
	},
	badgeText: {
		color: Colors.textInverse,
		marginTop: SpacingV.xxs,
		fontSize: Typography.footnote,
		fontWeight: FontWeight.semibold,
	},
	tagsWrapper: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: Spacing.sm,
		marginTop: SpacingV.xs,
	},
	tagItem: {
		borderWidth: 1,
		borderColor: Colors.text, // ✅ 테두리 검정
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.xs,
		borderRadius: Radius.md,
		backgroundColor: Colors.surfaceAlt, // ✅ 연한 회색 배경
	},

	tagText: {
		color: Colors.text,
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.semibold,
	},
	modalCharacterGrid: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginTop: SpacingV.xs,
		marginBottom: SpacingV.xl,
		gap: Spacing.sm,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.md,
		backgroundColor: Colors.surfaceAlt, // 밝은 회색 배경
		borderRadius: Radius.md,
	},
	historyCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.md,
		overflow: 'hidden',
		marginBottom: SpacingV.md,
		marginHorizontal: Spacing.xs,
		position: 'relative', // ✅ 추가 (오버레이 기준점)
	},
	favoriteOverlayButton: {
		position: 'absolute',
		top: scaleHeight(10),
		right: scaleWidth(40),
		padding: Spacing.xs,
		zIndex: 10,
	},
	historyHeaderRight: {
		flexDirection: 'row',
		alignItems: 'center',
		marginRight: scaleWidth(62), // 별 + 상세 아이콘 공간 확보
	},
	historyChevronButton: {
		alignSelf: 'stretch',
		justifyContent: 'center',
		paddingHorizontal: Spacing.md,
		paddingRight: Spacing.md,
	},
	loadingState: {
		padding: Spacing.xl,
		alignItems: 'center',
	},
	loadingMascot: {
		width: scaleWidth(120),
		height: scaleWidth(120),
		marginBottom: SpacingV.md,
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
