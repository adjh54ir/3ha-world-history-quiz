import FourImages from '@/src/four/assets/FourImages';
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { FIELD_DROPDOWN_ITEMS, LEVEL_DROPDOWN_ITEMS } from '@/src/four/screens/common/CommonProverbModule';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Easing, InteractionManager, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import Carousel from 'react-native-reanimated-carousel';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IconComponent from './common/atomic/IconComponent';
import { useIsFocused, useNavigation, useFocusEffect } from '@/src/four/navigation/compat';
import { router, useLocalSearchParams } from 'expo-router';
import { LIFE_CATEGORIES } from '@/src/const/data/life/ConstLifeCategories';
import { selectStudyScene } from '@/src/const/data/life/ConstStudyImages';
import type { MainDataType } from '@/src/four/types/MainDataType';
import { formatProverbExamples } from '@/src/four/utils/ProverbExampleUtils';
import { refineCharacters } from '@/src/four/utils/HanjaDictUtils';
import { shuffle } from '@/src/four/utils/PickUtils';
import FastImage from '@/src/four/components/FastImage';
import NewBadgeModal from './modal/NewBadgeModal';
import StudyCompletionModal from '@/src/screens/life/modal/StudyCompletionModal';
import DropDownPicker from 'react-native-dropdown-picker';
import { CONTENT_MAX_WIDTH, isTablet, MODAL_MAX_WIDTH, scaledSize, scaleHeight, scaleWidth, screenHeight } from '@/src/four/utils/DementionUtils';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// 카드 뒷면 스크롤은 gesture-handler의 ScrollView를 쓴다.
// RN 기본 ScrollView는 Carousel의 PanGesture에 세로 제스처를 뺏겨 스크롤이 먹지 않는다.
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import ProverbServices from '@/src/four/services/ProverbServices';
import { StudyBadgeInterceptor } from '@/src/four/services/interceptor/StudyBadgeInterceptor';
import { CONST_BADGES } from '@/src/four/const/ConstBadges';
import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';
import { useHangulReading } from '@/src/four/hooks/useHangulReading';
import DateUtils from '@/src/four/utils/DateUtils';
import { playComplete, playFlip, playSwipe } from '@/src/four/utils/SoundUtils';
import { startBgm, stopBgm } from '@/src/four/utils/BgmUtils';
import { Typography, FontWeight, Spacing, SpacingV, Radius, HitSlop } from '@/src/four/const/ConstDesign';
// 그림자는 이식 화면 토큰에 없다 — 앱 공통 프리셋(테마 전환 때 함께 갈린다)을 쓴다
import { Shadow } from '@/src/const/ConstDesign';
import { Colors, isDarkTheme, onSurface } from '@/src/four/const/ConstColors';
import { bridgeStudied } from '@/src/four/services/LifeBridge';

interface ProverbCharacter {
	/** 한자 한 글자 */
	char: string;

	/** 한자 의미 예: "돌 석" */
	meaning: string;

	/** 총 획수 */
	strokes: number;

	/** 부수 예: "石" */
	radical: string;
}

interface ProverbType {
	/** 고유 ID */
	id: number;

	/** 한자어 한자 */
	hanja: string;

	/** 한자어 한글 발음 */
	hangul: string;

	shortMeaning: string;
	/** 한자어 뜻 */
	meaning: string;

	/** 한자어 예시 */
	example: string[];

	// 사자성의 유래
	originWord?: string;

	/** 한자어 카테고리 (예: 인간관계, 지혜, 운 등) */
	category: string;

	/** 난이도 (예: 초급, 중급, 고급) */
	level: '초급' | '중급' | '고급';

	/** 한자어 구성 한자 배열 */
	characters: ProverbCharacter[];

	/** 연관 키워드 (예: 성과, 효율 등) */
	relatedWords: string[];
}
// 예시: 카드 높이 다르게 적용
const isAndroid = Platform.OS === 'android';
/**
 * 캐러셀은 높이를 `screenHeight * 0.65` 로 잡는다(아래 Carousel 의 height).
 * 태블릿에서 상한(1.35배)이 걸린 카드 높이가 그 뷰포트보다 커지는 기기가 있어
 * (아이패드 미니 736 < 783, 짧은 변 600dp 태블릿 624 < 686) 카드 아래가 잘렸다.
 * 뷰포트 안쪽으로 묶어 어떤 태블릿에서도 카드가 통째로 보이게 한다.
 */
const CARD_HEIGHT = isTablet
	? Math.min(scaleHeight(580), screenHeight * 0.65 - scaleHeight(16))
	: isAndroid
		? scaleHeight(560) // 📌 iOS 대비 20 높게
		: scaleHeight(540);

/**
 * 장면 그림 칸의 높이.
 *
 * 예전에는 카드 높이가 허락하는 만큼(288~304) 키웠는데, 카드가 뷰포트에 맞춰 줄어드는 기기
 * (짧은 폰, 분할 화면)에서는 이 칸만 그대로라 남는 높이를 아래 한자 칸이 다 뺏겼다.
 * 한자 줄이 제 높이를 못 받아 위아래가 잘렸다 — 그림을 한 단계 줄여 한자 칸에 여유를 준다.
 * 카드의 주인공은 그림이 아니라 한자다.
 */
const IMAGE_HEIGHT = isAndroid
	? scaleHeight(256) // 📌 안드로이드에서만 조금 더 여유 있게
	: scaleHeight(246);

/**
 * 구성 한자 박스 너비 — 성어가 2~9자로 제각각이라 글자 수에 맞춰 한 줄에 채운다.
 * 5자 이상은 4개씩 줄바꿈되므로 4자와 같은 너비를 쓴다.
 */
const charBoxWidth = (count: number) => ({ width: count <= 1 ? '100%' : count === 2 ? '46%' : count === 3 ? '30%' : '22%' } as const);

import CharacterGuide, { useCharacterGuideOnce, CharacterGuideButton } from './common/CharacterGuide';
import useAnimationCleanup from '@/src/four/hooks/useAnimationCleanup';
import { bumpActivity } from '@/src/four/utils/DailyActivityUtils';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { getHanjaTextStyle } from '@/src/four/const/ConstHanjaFont';
import { useDecorSkin } from '@/src/screens/life/common/LifeDecor';

/**
 * 성어 길이(2~9자)에 맞춘 한자 크기와 줄 높이.
 * adjustsFontSizeToFit 은 안드로이드에서 letterSpacing 까지 폭으로 계산해 과하게 줄어든다 —
 * 글자 수로 직접 정해 두 OS 에서 같은 크기가 나오게 한다.
 *
 * 줄 높이를 함께 못 박는 이유 — 고른 서체(명조·해서 등)마다 기본 줄 높이가 달라
 * 같은 크기에서도 어떤 서체는 글자 위아래가 잘렸다. 크기에 비례한 값을 직접 준다.
 *
 * 두 자짜리 낱말은 이 앱에서 가장 흔하다 — 한 단계 더 크게 세워 카드의 주인공으로 둔다.
 */
const hanjaTextSize = (length: number): { fontSize: number; lineHeight: number } => {
	const fontSize = length <= 2 ? Typography.heroLg : length <= 4 ? Typography.hero : length <= 6 ? Typography.h1 : Typography.h2;
	return { fontSize, lineHeight: Math.round(fontSize * 1.34) };
};

const QuizStudyScreen = () => {
	const STORAGE_KEY = MainStorageKeyType.USER_STUDY_HISTORY;
	const scrollViewRef = useRef<GHScrollView>(null);

	const navigation = useNavigation();
	const insets = useSafeAreaInsets();
	/**
	 * 캐러셀이 실제로 쓸 수 있는 세로 공간.
	 * 예전에는 `screenHeight * 0.65` 로 못 박아서, 학습 현황 박스가 높아지는 기기(상세 필터를 펼쳤을 때 등)에서
	 * 남는 공간보다 카드가 커졌다. 캐러셀 컨테이너가 가운데 정렬이라 넘친 만큼 위아래로 삐져나가
	 * 카드가 학습 현황 박스를 덮었다. 그려진 높이를 재서 그 안에 카드를 가둔다.
	 */
	const [viewportHeight, setViewportHeight] = useState(0);
	const { showHangul, setShowHangul } = useHangulReading();
	/** 사 둔 카드 테 — 없으면 null 이라 카드 테두리가 원래 색으로 남는다 (상점 > 꾸미기 > 카드 테) */
	const cardSkin = useDecorSkin();
	const carouselRef = useRef<any>(null);
	const toastAnim = useRef(new Animated.Value(0)).current;
	const scaleAnim = useRef(new Animated.Value(0)).current;

	/** 완료 토스트의 진도 막대 — 새 값으로 차오른다 (width 라 네이티브 드라이버를 못 쓴다) */
	const progressAnim = useRef(new Animated.Value(0)).current;

	useAnimationCleanup(toastAnim, scaleAnim, progressAnim);
	const isFocused = useIsFocused();
	const flipAnimRefs = useRef<Record<string, Animated.Value>>({});
	const pressAnimRefs = useRef<Record<string, Animated.Value>>({});
	const glowAnimRefs = useRef<Record<string, Animated.Value>>({});
	const buttonAnimRefs = useRef<Record<string, Animated.Value>>({});

	/**
	 * 카드마다 만들어지는 Animated.Value 와 지연 실행 타이머 정리.
	 *
	 * 카드 수만큼 값이 쌓이는데다 완료 콜백에서 setState 를 부르므로,
	 * 화면을 벗어난 뒤에도 애니메이션·타이머가 살아 있으면 사라진 컴포넌트를 갱신하려 든다.
	 * useAnimationCleanup 은 첫 렌더의 고정 목록만 잡으므로 여기서 직접 훑는다.
	 */
	const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
	const runLater = (fn: () => void, ms: number) => {
		timersRef.current.push(setTimeout(fn, ms));
	};

	/**
	 * 카드를 코드로 옮긴다 — 화면 진입·필터 변경·초기화가 여기로 온다.
	 * onSnapToItem 은 손으로 넘긴 것과 코드로 옮긴 것을 구분해 주지 않아서, 그대로 두면
	 * 화면에 들어올 때마다 넘김 소리가 난다. 옮기기 직전에 표시를 세워 그 한 번을 삼킨다.
	 * 이미 그 자리에 있으면 onSnapToItem 이 아예 오지 않으므로, 표시는 시간이 지나면 스스로 풀린다.
	 */
	const skipSwipeSfxRef = useRef(false);
	const jumpToCard = (index: number, animated = false) => {
		skipSwipeSfxRef.current = true;
		carouselRef.current?.scrollTo({ index, animated });
		runLater(() => {
			skipSwipeSfxRef.current = false;
		}, 400);
	};
	const cardAnimRefs = [flipAnimRefs, pressAnimRefs, glowAnimRefs, buttonAnimRefs];
	useEffect(
		() => () => {
			timersRef.current.forEach(clearTimeout);
			timersRef.current = [];
			cardAnimRefs.forEach((ref) => {
				Object.values(ref.current).forEach((anim) => anim.stopAnimation());
				ref.current = {};
			});
		},
		[],
	);

	/**
	 * 카드 애니메이션 값 캐시 상한.
	 * 목록이 4,000장이 넘는데 카드를 훑을 때마다 맵에 값이 하나씩 쌓여 그대로 남는다.
	 * Carousel 은 windowSize 만큼만 그리므로 창 밖 값은 다시 필요해질 때 새로 만들면 된다.
	 */
	const CARD_ANIM_CACHE = 24;
	const pruneCardAnims = () => {
		cardAnimRefs.forEach((ref) => {
			if (Object.keys(ref.current).length <= CARD_ANIM_CACHE) {
				return;
			}
			Object.values(ref.current).forEach((anim) => anim.stopAnimation());
			ref.current = {};
		});
	};

	const completionImages = FourImages.screen_fox_study_complete;
	/** 복습은 축하가 아니다 — 트로피 대신 책을 든 판다로 다시 공부하는 상태를 보여 준다 */
	const reviewImage = FourImages.screen_fox_review_start;

	const [isLoading, setIsLoading] = useState(true);
	const guide = useCharacterGuideOnce('quiz-study');
	const [flippedCard, setFlippedCard] = useState<number | null>(null);
	const [completedCardId, setCompletedCardId] = useState<number | null>(null);

	const [proverbList, setProverbList] = useState<MainDataType.ProverbType[]>([]);
	const [newlyEarnedBadges, setNewlyEarnedBadges] = useState<MainDataType.UserBadge[]>([]);

	const [studyHistory, setStudyHistory] = useState<MainDataType.UserStudyHistory>({
		studyProverbs: [],
		studyCounts: {},
		lastStudyAt: DateUtils.now(),
	});

	/** 방금 누른 카드가 '처음 학습'인지 '다시 학습(복습)'인지 — 완료 토스트의 배지·문구 색이 갈린다 */
	const isFirstStudy = typeof completedCardId === 'number' && studyHistory.studyProverbs.includes(completedCardId);

	const [filter, setFilter] = useState<'all' | 'learning' | 'learned'>('learning');
	const [badgeModalVisible, setBadgeModalVisible] = useState(false);
	/** 지금 보고 있는 범위를 다 끝냈을 때 띄우는 학습 완료 팝업 — 범위 이름·카드 수를 담아 둔다 */
	const [studyDone, setStudyDone] = useState<{ label: string; scopeTotal: number } | null>(null);
	const [showToast, setShowToast] = useState(false);
	const [praiseText, setPraiseText] = useState('');
	const [levelFilter, setLevelFilter] = useState<'전체' | '초급' | '중급' | '고급' | '특급'>('전체');
	const [isButtonDisabled, setIsButtonDisabled] = useState(false);
	// 홈·학습 탭에서 분야를 골라 들어오면(`/study?category=daily`) 그 분야로 바로 좁혀 준다.
	// `shuffle=1` 로 들어오면(학습 탭의 "전체 랜덤 학습") 분야를 좁히지 않고 카드 순서를 섞는다.
	const { category: enteredCategory, shuffle: shuffleParam } = useLocalSearchParams<{ category?: string; shuffle?: string }>();
	const isShuffled = shuffleParam === '1';
	const initialRegion = LIFE_CATEGORIES.find((item) => item.key === enteredCategory)?.label ?? '전체';
	const [regionFilter, setRegionFilter] = useState<string>(initialRegion);

	const [isDetailFilterOpen, setIsDetailFilterOpen] = useState(false);
	const progress = proverbList.length > 0 ? (studyHistory.studyProverbs ?? []).length / proverbList.length : 0;

	/**
	 * 지금 보고 있는 범위(급수·분야)의 진도 — 완료 토스트 아래에 한 줄로 붙인다.
	 * 완료했다는 사실만 알려 주면 "몇 장 남았지?" 를 확인하러 토스트가 사라지길 기다려야 했다.
	 */
	const scopeProgress = useMemo(() => {
		const scope = proverbList.filter(
			(item) => (levelFilter === '전체' || item.level === levelFilter) && (regionFilter === '전체' || item.category === regionFilter),
		);
		const learned = new Set(studyHistory.studyProverbs ?? []);
		return { done: scope.filter((item) => learned.has(item.id)).length, total: scope.length };
	}, [proverbList, levelFilter, regionFilter, studyHistory.studyProverbs]);

	// 학습 기록 저장이 토스트가 뜬 뒤에 끝난다 — 막대가 눈앞에서 한 칸 차오르는 연출이 된다
	const scopeRatio = scopeProgress.total > 0 ? scopeProgress.done / scopeProgress.total : 0;
	useEffect(() => {
		const anim = Animated.timing(progressAnim, {
			toValue: scopeRatio,
			duration: 420,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false,
		});
		anim.start();
		return () => anim.stop();
	}, [scopeRatio, progressAnim]);
	const [levelOpen, setLevelOpen] = useState(false);
	const [regionOpen, setRegionOpen] = useState(false);

	// 추가
	const [showExitModal, setShowExitModal] = useState(false);

	const praiseMessages = [
		'학문의 길에 한 걸음 더 나아갔습니다! 🧠',
		'지혜가 쌓이고 있습니다! 📚',
		'성실한 배움이 빛을 발하고 있습니다! ✨',
		'오늘도 주경야독의 모범입니다! 🌙',
		'노력은 결코 배신하지 않습니다! 💪',
		'한자어 달인이 되어가고 있습니다! 🧾',
		'꾸준한 학습이 인과응보를 만듭니다! 🔁',
		'어제보다 한층 성장했습니다! ⏫',
		'글자 속 깊은 뜻을 꿰뚫었습니다! 🔍',
		'한자 한 획, 의미 한 줄이 쌓이고 있습니다! 🖋️',
	];

	// 이미 학습한 항목을 다시 학습하는 경우
	const reviewPraiseMessages = [
		'복습도 중요하죠! 👍',
		'기억을 더 단단하게! 🧱',
		'멋진 복습입니다! 🔁',
		'한 번 더 보면 완벽해집니다! 🏆',
		'지속적인 학습, 최고입니다! 🌟',
	];
	useEffect(() => {
		if (carouselRef.current && getFilteredData().length > 0) {
			// ✅ Carousel이 업데이트 된 다음에 호출
			InteractionManager.runAfterInteractions(() => {
				jumpToCard(0);
			});
		}
	}, [proverbList, filter]);

	useEffect(() => {
		// 뱃지 모달 열릴 때 애니메이션 및 빵빠레 실행
		if (!badgeModalVisible) {
			return;
		}
		scaleAnim.setValue(0);
		const anim = Animated.spring(scaleAnim, {
			toValue: 1,
			bounciness: 12,
			useNativeDriver: true,
		});
		anim.start();
		return () => anim.stop(); // 모달이 닫히거나 언마운트되면 진행 중 애니메이션 정리
	}, [badgeModalVisible]);

	useEffect(() => {
		if (carouselRef.current && getFilteredData().length > 0) {
			jumpToCard(0);
			setFlippedCard(null);
			setCompletedCardId(null); // ✅ 추가
		}
	}, [levelFilter, regionFilter]);

	// deps 가 비어 있어 마운트 때 한 번만 돌았다. 설정 초기화·다른 화면 학습 후 돌아오면 기록이 낡은 채로 남는다.
	useEffect(() => {
		if (isFocused) {
			fetchData();
		}
	}, [isFocused]);

	/**
	 * 🎵 배경음 — 학습 전용 앰비언트를 깐다. (설정에서 꺼 두면 startBgm 이 안에서 그냥 돌아간다)
	 * 퀴즈 트랙을 그대로 쓰면 읽고 넘기기만 하는 화면이 시험처럼 들리고, 퀴즈에서 넘어와도 장면이 바뀐 느낌이 없다.
	 * 완료 팝업이 떠도 끄지 않는다. 팝업을 닫으면 학습이 이어지는 자리라,
	 * 껐다 켜면 '퀴즈 풀기'로 나갈 때 루프가 한 번 튀어 오히려 거슬린다.
	 */
	useEffect(() => {
		if (!isFocused) {
			stopBgm();
			return;
		}
		startBgm('study');
		return stopBgm;
	}, [isFocused]);

	// 화면에 다시 들어오면 상세 필터를 접고 카드도 첫 장으로 되돌린다 (초기화 버튼과 같은 동작)
	useFocusEffect(
		useCallback(() => {
			resetCard();
			setBadgeModalVisible(false);
			setShowExitModal(false);
			setStudyDone(null);
		}, []),
	);

	const fetchData = async () => {
		try {
			const proverbList2 = ProverbServices.selectProverbList();
			// 섞기는 여기서 한 번만 한다 — 필터가 바뀔 때마다 섞으면 보고 있던 카드가 튄다
			setProverbList(isShuffled ? shuffle(proverbList2) : proverbList2);

			const savedData = await AsyncStorage.getItem(STORAGE_KEY);
			if (savedData) {
				const parsed = JSON.parse(savedData);
				const fixed: MainDataType.UserStudyHistory = {
					studyProverbs: parsed.studyProverbs ?? [],
					studyCounts: parsed.studyCounts ?? {},
					badges: parsed.badges ?? [],
					lastStudyAt: parsed.lastStudyAt ? new Date(parsed.lastStudyAt) : DateUtils.now(),
				};
				setStudyHistory(fixed);
			} else {
				setStudyHistory({ studyProverbs: [], studyCounts: {}, badges: [], lastStudyAt: DateUtils.now() });
			}

			scrollViewRef.current?.scrollTo({ y: 0, animated: true });
		} catch (error) {
			console.error(error);
		} finally {
			setIsLoading(false);

			// ✅ 카드 맨 앞으로 이동
			InteractionManager.runAfterInteractions(() => {
				jumpToCard(0);
			});
		}
	};

	const completeStudy = async (id: number) => {
		const isAlreadyLearned = studyHistory.studyProverbs.includes(id);

		if (!isAlreadyLearned) {
			playComplete(); // 🎓 학습 완료 사운드 (다시 학습하기는 제외)
			bumpActivity('study'); // 요일 미션(화요일) 진행도
			bridgeStudied(id); // 홈·펫이 보는 앱 상태에도 반영 (코인·경험치)
		}
		const prevFiltered = getFilteredData();
		const prevIndex = prevFiltered.findIndex((c) => c.id === id);

		// 1. 학습 상태 업데이트
		const updatedCountries = isAlreadyLearned
			? studyHistory.studyProverbs.filter((code) => code !== id)
			: [...studyHistory.studyProverbs, id];

		const updatedCounts = {
			...studyHistory.studyCounts,
			[id]: (studyHistory.studyCounts?.[id] || 0) + (isAlreadyLearned ? 0 : 1),
		};

		const updatedHistory: MainDataType.UserStudyHistory = {
			studyProverbs: updatedCountries,
			studyCounts: updatedCounts,
			badges: studyHistory.badges || [],
			lastStudyAt: DateUtils.now(), // ✅ 마지막 학습일자 추가
		};

		// 2. UI 상태 먼저 빠르게 업데이트
		setStudyHistory(updatedHistory);

		if (flipAnimRefs.current[id]) {
			const anim = flipAnimRefs.current[id];
			anim.stopAnimation(() => {
				Animated.timing(anim, {
					toValue: 0,
					duration: 100,
					easing: Easing.ease,
					useNativeDriver: true,
				}).start(({ finished }) => {
					// 정리(stop) 로 끝났으면 이미 떠난 화면이라 setState 하지 않는다
					finished && setFlippedCard(null);
				});
			});
		} else {
			setFlippedCard(null);
		}

		// 3. AsyncStorage, 뱃지, 토스트 등은 InteractionManager 이후 처리
		InteractionManager.runAfterInteractions(() => {
			// 상태 저장
			AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));

			// 뱃지 검사 및 모달
			checkAndHandleNewStudyBadges(updatedHistory, setStudyHistory, setBadgeModalVisible, setNewlyEarnedBadges);
		});

		// 4. 학습 완료 상태일 경우만 토스트 및 이동 처리
		const nextFiltered = getFilteredDataByHistory(updatedCountries);
		const nextIndex = Math.min(prevIndex, nextFiltered.length - 1);

		setCompletedCardId(id);
		setPraiseText(
			isAlreadyLearned
				? reviewPraiseMessages[Math.floor(Math.random() * reviewPraiseMessages.length)]
				: praiseMessages[Math.floor(Math.random() * praiseMessages.length)],
		);
		// 지금 보고 있는 범위(분야·난이도)를 이번 카드로 다 끝냈으면 토스트 대신 완료 팝업을 띄운다.
		// 둘을 같이 띄우면 팝업 위로 토스트가 겹쳐 글자가 읽히지 않는다.
		const scope = proverbList.filter(
			(item) => (levelFilter === '전체' || item.level === levelFilter) && (regionFilter === '전체' || item.category === regionFilter),
		);
		const scopeCleared = !isAlreadyLearned && scope.length > 0 && scope.every((item) => updatedCountries.includes(item.id));
		if (scopeCleared) {
			setStudyDone({ label: regionFilter === '전체' ? '전체' : regionFilter, scopeTotal: scope.length });
		} else {
			showEncourageToast();
		}

		// 👉 자동 넘김을 원하지 않을 경우 주석처리
		// 또는 조건부 실행
		const AUTO_SCROLL_ENABLED = false;
		if (AUTO_SCROLL_ENABLED) {
			runLater(() => {
				jumpToCard(nextIndex, true);
				InteractionManager.runAfterInteractions(() => {
					setCompletedCardId(null);
				});
			}, 800);
		}
	};
	// 🔹 필터별 재사용 가능한 헬퍼 함수
	const getFilteredDataByHistory = (customCountries: number[]) => {
		if (filter === 'learned') {
			return proverbList.filter((c) => customCountries.includes(c.id));
		}
		if (filter === 'learning') {
			return proverbList.filter((c) => !customCountries.includes(c.id));
		}
		return proverbList;
	};
	/**
	 * 새로 획득한 학습 뱃지를 인터셉터로 확인 후 업데이트 및 모달 처리
	 */
	const checkAndHandleNewStudyBadges = (
		updatedHistory: MainDataType.UserStudyHistory,
		setter: React.Dispatch<React.SetStateAction<MainDataType.UserStudyHistory>>,
		setBadgeModalVisible: (v: boolean) => void,
		setNewlyEarnedBadges: (badges: MainDataType.UserBadge[]) => void,
	) => {
		const currentBadges = updatedHistory.badges ?? [];

		const newBadgeIds = StudyBadgeInterceptor(updatedHistory);
		const newBadges = newBadgeIds.filter((id) => !currentBadges.includes(id));

		if (newBadges.length > 0) {
			const earnedBadges = CONST_BADGES.filter((b) => newBadges.includes(b.id));
			setNewlyEarnedBadges(earnedBadges);
			setBadgeModalVisible(true);

			updatedHistory.badges = [...new Set([...currentBadges, ...newBadges])];
		}

		AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
		setter(updatedHistory);
	};

	// 토스트 유지 타이머는 화면을 벗어나도 살아남으므로 ref 로 잡아 두고 언마운트에서 정리한다
	const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (toastTimerRef.current) {
				clearTimeout(toastTimerRef.current);
			}
			toastAnim.stopAnimation();
		},
		[toastAnim],
	);

	const showEncourageToast = () => {
		setShowToast(true);
		if (toastTimerRef.current) {
			clearTimeout(toastTimerRef.current);
		}
		// 톡 튀어 오르는 등장 — 살짝 넘겼다가 제자리로 돌아온다(스케일 보간이 1을 넘겨 받는다)
		toastAnim.setValue(0);
		Animated.spring(toastAnim, {
			toValue: 1,
			friction: 6,
			tension: 130,
			useNativeDriver: true,
		}).start(({ finished }) => {
			if (!finished) {
				return;
			}
			toastTimerRef.current = setTimeout(() => {
				Animated.timing(toastAnim, {
					toValue: 0,
					duration: 240,
					easing: Easing.in(Easing.cubic),
					useNativeDriver: true,
				}).start(({ finished: hidden }) => hidden && setShowToast(false));
			}, 1800); // 보여지는 시간 — 진도 줄이 붙어 읽을 것이 늘었다
		});
	};

	const flipCard = (id: number) => {
		if (isButtonDisabled) {
			return;
		} // ✅ 버튼 잠김 시 flip 차단

		if (!flipAnimRefs.current[id]) {
			flipAnimRefs.current[id] = new Animated.Value(0);
		}
		const anim = flipAnimRefs.current[id];
		const isCurrentlyFlipped = flippedCard === id;

		playFlip(); // 🔊 카드 뒤집기

		Animated.timing(anim, {
			toValue: isCurrentlyFlipped ? 0 : 180,
			duration: 150,
			easing: Easing.ease,
			useNativeDriver: true,
		}).start(({ finished }) => {
			finished && setFlippedCard(isCurrentlyFlipped ? null : id);
		});
	};

	/**
	 * 화면에 세울 목록.
	 * 렌더마다 다시 거르면 카드 한 장 그릴 때마다 전체 목록을 훑게 된다 — 필터가 바뀔 때만 계산한다.
	 */
	const filteredData = useMemo<MainDataType.ProverbType[]>(() => {
		let filtered = proverbList;

		if (filter === 'learned') {
			filtered = filtered.filter((c) => studyHistory.studyProverbs.includes(c.id));
		} else if (filter === 'learning') {
			filtered = filtered.filter((c) => !studyHistory.studyProverbs.includes(c.id));
		}

		if (levelFilter !== '전체') {
			filtered = filtered.filter((c) => c.level === levelFilter);
		}

		if (regionFilter !== '전체') {
			filtered = filtered.filter((c) => c.category === regionFilter);
		}

		return filtered;
	}, [proverbList, filter, studyHistory.studyProverbs, levelFilter, regionFilter]);

	const getFilteredData = (): MainDataType.ProverbType[] => filteredData;

	const resetCard = () => {
		setIsDetailFilterOpen(false); // 상세 필터 닫기
		setLevelOpen(false); // 드롭다운 강제 닫기
		setRegionOpen(false);
		setFilter('learning'); // 학습중으로 기본 필터 변경
		setLevelFilter('전체'); // 상세 필터 초기화
		setRegionFilter('전체');

		// ✅ 추가: 캐러셀 첫 번째로 이동
		runLater(() => {
			const data = getFilteredData();
			if (carouselRef.current && data.length > 0) {
				jumpToCard(0);
			}
		}, 100); // dropDownPicker와 충돌을 피하기 위한 약간의 delay
	};

	const handleAnimatedButtonPress = (proverbId: number, action: () => void) => {
		if (!buttonAnimRefs.current[proverbId]) {
			buttonAnimRefs.current[proverbId] = new Animated.Value(1);
		}
		const buttonAnim = buttonAnimRefs.current[proverbId];

		Animated.sequence([
			Animated.timing(buttonAnim, {
				toValue: 0.95,
				duration: 100,
				useNativeDriver: true,
			}),
			Animated.timing(buttonAnim, {
				toValue: 1,
				duration: 100,
				useNativeDriver: true,
			}),
		]).start(({ finished }) => {
			// stop() 으로 끊긴 경우엔 화면이 사라진 것이므로 후속 동작(저장·이동)을 실행하지 않는다
			finished && action();
		});
	};

	// 잰 값이 들어오기 전 첫 프레임에만 예전 상수를 쓴다
	const cardHeight = viewportHeight > 0 ? viewportHeight : CARD_HEIGHT;

	const renderItem = ({ item }: { item: ProverbType; index: number }) => {
		const studyScene = selectStudyScene(item.category, String(item.id));

		const proverbId = item.id;
		const isLearned = studyHistory.studyProverbs.includes(proverbId);

		if (!buttonAnimRefs.current[proverbId]) {
			buttonAnimRefs.current[proverbId] = new Animated.Value(1);
		}
		// flipAnim 및 pressAnim 초기화
		const flipAnim = flipAnimRefs.current[proverbId] ?? new Animated.Value(0);
		const pressAnim = pressAnimRefs.current[proverbId] ?? new Animated.Value(1);
		const glowAnim = glowAnimRefs.current[proverbId] ?? new Animated.Value(0);

		if (!flipAnimRefs.current[proverbId]) {
			flipAnimRefs.current[proverbId] = flipAnim;
		}
		if (!pressAnimRefs.current[proverbId]) {
			pressAnimRefs.current[proverbId] = pressAnim;
		}
		if (!glowAnimRefs.current[proverbId]) {
			glowAnimRefs.current[proverbId] = glowAnim;
		}

		const handleCardPress = () => {
			Animated.parallel([
				Animated.sequence([
					Animated.timing(pressAnim, {
						toValue: 0.95,
						duration: 80,
						useNativeDriver: true,
					}),
					Animated.timing(pressAnim, {
						toValue: 1,
						duration: 80,
						useNativeDriver: true,
					}),
				]),
				Animated.sequence([
					Animated.timing(glowAnim, {
						toValue: 1,
						duration: 100,
						useNativeDriver: false, // shadow 관련은 false
					}),
					Animated.timing(glowAnim, {
						toValue: 0,
						duration: 300,
						useNativeDriver: false,
					}),
				]),
			]).start(({ finished }) => {
				finished && flipCard(proverbId); // 카드 flip 실행
			});
		};
		// ✅ rotateY(3D 회전)는 기기에 따라 뒷면 글씨가 거울 반전되어 깨지므로 사용하지 않음.
		//    앞/뒷면 모두 회전 없이 스케일 + 페이드(크로스페이드)로 전환 → 글씨가 항상 똑바로 보임.
		const frontScale = flipAnim.interpolate({ inputRange: [0, 90, 180], outputRange: [1, 0.97, 0.94] });
		const backScale = flipAnim.interpolate({ inputRange: [0, 90, 180], outputRange: [0.94, 0.97, 1] });
		const frontOpacity = flipAnim.interpolate({ inputRange: [0, 80, 90, 180], outputRange: [1, 1, 0, 0] });
		const backOpacity = flipAnim.interpolate({ inputRange: [0, 90, 100, 180], outputRange: [0, 0, 1, 1] });

		return (
			<View style={[styles.cardWrapper, { height: cardHeight }]}>
				<Pressable onPress={handleCardPress} style={[styles.cardFront, { height: cardHeight }]}>
					<Animated.View
						pointerEvents={flippedCard === proverbId ? 'none' : 'auto'}
						style={[
							styles.cardFace,
							cardSkin,
							{
								height: cardHeight,
								opacity: frontOpacity,
								transform: [{ scale: frontScale }], // ✅ 회전 제거 → 글씨가 항상 똑바로 보임
								zIndex: flippedCard === proverbId ? 0 : 1, // 보이는 면이 위로
								position: 'absolute',
							},
						]}
					>
						<View style={styles.flagSection}>
							<View style={styles.flagContainer}>
								{/*
								 * 장면 그림만 둔다. 예전에는 오른쪽 위에 장면용 한자(入門 등)를 얹었는데,
								 * 그 글자가 지금 학습하는 단어인 줄 읽혀 바로 아래 한자와 헷갈렸다.
								 */}
								<FastImage source={studyScene.image} style={styles.flagImageSquare} resizeMode="contain" />
							</View>
						</View>
						{flippedCard !== proverbId && (
							// JSX 내부
							<View style={styles.cardMiddle}>
								<View style={styles.hanjaWrap}>
									{/*
									 * 한자(독음) 를 한 덩어리로 읽힌다 — 電話(전화).
									 * 훈음 가리기를 켜면 괄호째 사라져 한자만 남는다.
									 * 한자 자료가 비어 있으면 독음을 대신 크게 띄운다(빈 카드 방지).
									 */}
									<Text style={[styles.hanjaText, hanjaTextSize(item.hanja?.trim() ? item.hanja.length : 4)]} numberOfLines={1}>
										{item.hanja?.trim() ? item.hanja : item.hangul}
										{item.hanja?.trim() && showHangul ? <Text style={styles.hanjaReading}>{`(${item.hangul})`}</Text> : null}
									</Text>
									<View style={styles.hanjaAccent} />
								</View>
								<Text style={styles.cardHint}>카드를 탭하면 자세한 뜻이 나옵니다 👆</Text>
							</View>
						)}

						<TouchableOpacity
							style={[
								styles.button,
								{ width: '100%', alignSelf: 'center' }, // ✅ 수정된 부분
								isLearned ? styles.learnedButton : styles.learningButton,
								{ opacity: isButtonDisabled ? 0.6 : 1 },
							]}
							onPress={(e) => {
								e.stopPropagation(); // ✅ 여기서 이벤트 버블링 차단
								if (isButtonDisabled) {
									return;
								}
								setIsButtonDisabled(true); // ✅ 중복 방지
								handleAnimatedButtonPress(proverbId, () => {
									completeStudy(proverbId);
									runLater(() => setIsButtonDisabled(false), 1000); // 1초 후 재활성화
								});
							}}
							disabled={isButtonDisabled}
							hitSlop={HitSlop} // 여유 클릭 범위
						>
							<Text style={[styles.buttonText, isLearned && { color: onSurface(Colors.warning) }]}>{isLearned ? '다시 학습하기' : '학습 완료'}</Text>
						</TouchableOpacity>
					</Animated.View>

					<Animated.View
						pointerEvents={flippedCard === proverbId ? 'auto' : 'none'}
						style={[
							styles.cardFace2,
							cardSkin,
							{
								height: cardHeight,
								opacity: backOpacity,
								transform: [{ scale: backScale }], // ✅ 회전 제거 → 글씨가 항상 똑바로 보임
								// 카드 테를 사 두면 그 색이 이긴다 — 뒤에 오는 값이 앞을 덮으므로 스킨 뒤에 두지 않는다
								borderWidth: cardSkin?.borderWidth ?? 1,
								borderColor: cardSkin?.borderColor ?? Colors.border,
								zIndex: flippedCard === proverbId ? 1 : 0, // 보이는 면이 위로
								position: 'absolute',
							},
						]}
					>
						<View style={{ flex: 1, minHeight: 0, width: '100%' }}>
							<GHScrollView
								ref={scrollViewRef}
								style={styles.cardBackScroll}
								contentContainerStyle={{
									paddingVertical: 0,
									paddingHorizontal: 0,
									paddingRight: Spacing.sm,
									paddingBottom: SpacingV.md,
								}}
								scrollIndicatorInsets={{ right: scaleWidth(2) }}
								// 검정 고정이면 다크 모드 카드 위에서 스크롤바가 보이지 않는다
								indicatorStyle={isDarkTheme() ? 'white' : 'black'}
								persistentScrollbar
								removeClippedSubviews={false}
								nestedScrollEnabled
								showsVerticalScrollIndicator
							>
								{/* <View style={[styles.badge, { backgroundColor: getLevelColor(item.level) }]}>
								<Text style={styles.badgeText}>{item.level}</Text>
							</View> */}

								<View style={styles.cardBackContainer}>
									{/* 앞면과 같은 순서로 읽힌다 — 生活(생활). 뒷면 첫 줄이라 앞면 다음으로 크게 둔다 */}
									{/* 한자(한글) — 한자를 크게 세우고 독음은 한 단계 낮춰 괄호째 뒤에 붙인다 */}
								<Text style={styles.cardBackTitle} numberOfLines={2}>
									{item.hanja?.trim() ? item.hanja : item.hangul}
									{item.hanja?.trim() && showHangul ? <Text style={styles.cardBackTitleReading}>{`(${item.hangul})`}</Text> : null}
								</Text>

									{/* 구성 한자 */}
									<View style={styles.cardBackCharacterRow}>
										{/* 새김·획수·부수는 급수 자료 기준으로 보정해서 쓴다 */}
										{refineCharacters(item).map((char, idx) => (
											<View key={idx} style={[styles.charBoxInline, charBoxWidth(item.characters.length)]}>
												<Text style={styles.charBoxChar}>{char.char}</Text>
												<Text style={styles.charBoxMeaning} numberOfLines={1}>
													{char.hun} <Text style={styles.charBoxEum}>{char.eum}</Text>
												</Text>
												{/* 획수·부수는 급수 자료에 있는 글자만 채워진다 — 없으면 '0획'이 나가므로 줄을 감춘다 */}
												{char.strokes > 0 && (
													<Text style={styles.charBoxDetail}>
														{char.strokes}획{char.radical ? ` / ${char.radical}` : ''}
													</Text>
												)}
											</View>
										))}
									</View>

									{/* 뜻 풀이 + 예문 */}
									<View style={styles.cardBackInfoBox}>
										{/* 뜻 풀이 강조 */}
										<View style={styles.meaningHighlightBox}>
											<View style={styles.cardBackTitleRow}>
												<View style={[styles.cardBackTitleIcon, { backgroundColor: Colors.primarySoft }]}>
													<IconComponent type="materialIcons" name="lightbulb" size={scaledSize(14)} color={Colors.primaryDark} />
												</View>
												<Text style={styles.cardBackInfoTitle}>뜻 풀이</Text>
											</View>
											<Text style={styles.cardBackInfoText}>{item.meaning}</Text>
										</View>

										{/* 유래 — 데이터에 있는데 상세 팝업까지 들어가야만 보이던 정보. 뜻과 함께 봐야 잘 붙는다 */}
										{!!item.originWord && (
											<>
												<View style={styles.cardBackDivider} />
												<View style={{ marginTop: SpacingV.lg }}>
													<View style={styles.cardBackTitleRow}>
														<View style={[styles.cardBackTitleIcon, { backgroundColor: Colors.warningSoft }]}>
															<IconComponent type="materialCommunityIcons" name="script-text-outline" size={scaledSize(14)} color={Colors.warningDark} />
														</View>
														<Text style={styles.cardBackInfoTitle}>유래</Text>
													</View>
													<Text style={styles.cardBackInfoText}>{item.originWord}</Text>
												</View>
											</>
										)}

										<View style={styles.cardBackDivider} />

										{/* 예문 */}
										<View style={{ marginTop: SpacingV.lg }}>
											<View style={styles.cardBackTitleRow}>
												<View style={[styles.cardBackTitleIcon, { backgroundColor: Colors.secondaryBg }]}>
													<IconComponent type="materialIcons" name="menu-book" size={scaledSize(14)} color={Colors.secondaryDark} />
												</View>
												<Text style={styles.cardBackInfoTitle}>예문</Text>
											</View>
											<Text style={styles.cardBackExampleText}>{formatProverbExamples(item.example)}</Text>
										</View>
									</View>
								</View>

								{/* 뜻 풀이 */}
								{/* <View style={styles.meaningBox}>
										<Text style={styles.sectionContent}>💡 {item.meaning}</Text>
									</View> */}
								{/* 구성 한자 */}
								{/* <View style={styles.charList}>
										{item.characters.map((char, i) => (
											<View key={i} style={styles.charRow}>
												<Text style={styles.charMain}>{char.char}</Text>
												<Text style={styles.charMeaning}>{char.meaning}</Text>
												<Text style={styles.charSub}>
													({char.strokes}획, 부수: {char.radical})
												</Text>
											</View>
										))}
									</View> */}

								{/* 예문 */}
								{/* <View style={styles.exampleBox}>
										<Text style={styles.sectionTitle}>📝 예문</Text>
										<Text style={styles.sectionContent}>{formatProverbExamples(item.example)}</Text>
									</View> */}
							</GHScrollView>
						</View>

						{/* ✅ 하단 버튼 영역 고정 — 카드 안쪽 바닥에 붙인다(화면 인셋과 무관) */}
						<View style={styles.fixedBottomButton}>
							<TouchableOpacity
								style={[
									styles.button,
									isLearned ? styles.learnedButton : styles.learningButton,
									{ opacity: isButtonDisabled ? 0.6 : 1 },
								]}
								onPress={(e) => {
									e.stopPropagation(); // 필수!
									if (isButtonDisabled) {
										return;
									}
									setIsButtonDisabled(true);
									handleAnimatedButtonPress(proverbId, () => {
										completeStudy(proverbId);
										runLater(() => setIsButtonDisabled(false), 1000);
									});
								}}
								disabled={isButtonDisabled}
								hitSlop={HitSlop} // 여유 클릭 범위
							>
								<Text style={[styles.buttonText, isLearned && { color: onSurface(Colors.warning) }]}>{isLearned ? '다시 학습하기' : '학습 완료'}</Text>
							</TouchableOpacity>
						</View>
					</Animated.View>
				</Pressable>
			</View>
		);
	};

	// ================================================================================================================================================
	return (
		<>
			{/* 상단 안전영역은 전역 배너가 이미 확보한다 — top 을 쓰면 여백이 두 번 들어간다 */}
			<SafeAreaView style={styles.main} edges={['left', 'right']}>
				<View style={styles.container}>
					{/* 바깥 여백은 감싸는 칸이 준다 — 박스에 width:100% 와 marginHorizontal 을 같이 주면 오른쪽 테두리가 화면 밖으로 나간다 */}
					<View style={styles.progressHeaderOuter}>
						<View style={styles.progressHeader}>
							{/* 왼쪽 훈음 토글 · 가운데 제목+진도 · 오른쪽 도움말. 좌우 칸 폭을 같게 잡아 가운데가 진짜 가운데에 온다 */}
							<View style={styles.progressTopRow}>
								<View style={styles.progressTopSide}>
									{/* 훈음 가리기 — 켜면 카드에서 한글을 걷어내고 한자만 남긴다 */}
									<TouchableOpacity
										hitSlop={HitSlop}
										onPress={() => setShowHangul(!showHangul)}
										style={[styles.readingToggle, !showHangul && styles.readingToggleOff]}
										accessibilityRole="button"
										accessibilityLabel={showHangul ? '훈음 가리기' : '훈음 다시 보기'}
									>
										<IconComponent
											type="materialCommunityIcons"
											name={showHangul ? 'eye-outline' : 'eye-off-outline'}
											size={scaledSize(14)}
											color={showHangul ? Colors.primaryDark : Colors.textInverse}
										/>
										<Text style={[styles.readingToggleText, !showHangul && styles.readingToggleTextOff]}>훈음</Text>
									</TouchableOpacity>
								</View>
								<View style={styles.progressTopCenter}>
									<Text style={styles.progressTitle} numberOfLines={1}>
										학습 현황
									</Text>
									<View style={styles.progressBadge}>
										<Text style={styles.progressBadgeText} numberOfLines={1}>
											{studyHistory.studyProverbs.length} / {proverbList.length}
										</Text>
									</View>
								</View>
								<View style={[styles.progressTopSide, styles.progressTopSideRight]}>
									<CharacterGuideButton onPress={guide.open} size={scaledSize(18)} />
								</View>
							</View>

							<View style={styles.progressBarWrapper}>
								<View
									style={[
										styles.progressBarFill,
										{ width: isLoading ? '0%' : `${progress * 100}%`, backgroundColor: isLoading ? Colors.borderStrong : Colors.primary },
									]}
								/>
							</View>

							{/* 기본 필터: 전체 / 학습 중 / 학습 완료 */}
							<View style={styles.filterContainer}>
								{['전체', '학습 중', '학습 완료'].map((label, i) => {
									const value = i === 0 ? 'all' : i === 1 ? 'learning' : 'learned';
									const isActive = filter === value;
									return (
										<TouchableOpacity
											key={label}
											onPress={() => setFilter(value)}
											style={[styles.filterButton, isActive && styles.filterButtonActive]}
										>
											<Text style={[styles.filterText, isActive && styles.filterTextActive]}>{label}</Text>
										</TouchableOpacity>
									);
								})}

								{/* 상세 열기 버튼 */}
								<TouchableOpacity hitSlop={HitSlop}
									onPress={() => {
										// 업데이터 안에서 다른 setState 를 부르면 업데이터가 두 번 실행될 때 필터가 두 번 초기화된다
										const nextOpen = !isDetailFilterOpen;
										setIsDetailFilterOpen(nextOpen);
										if (nextOpen) {
											setLevelFilter('전체');
											setRegionFilter('전체');
										} else {
											// 아코디언 닫히는 순간 드롭다운도 강제 닫기
											setLevelOpen(false);
											setRegionOpen(false);
										}
									}}
									style={styles.detailToggleButton}
								>
									<IconComponent
										type="materialIcons"
										name={isDetailFilterOpen ? 'expand-less' : 'expand-more'}
										size={scaledSize(24)}
										color={Colors.text}
									/>
								</TouchableOpacity>
								{/* 🔻 초기화 버튼 추가 */}
								<TouchableOpacity hitSlop={HitSlop} onPress={resetCard} style={styles.resetButton} accessibilityRole="button" accessibilityLabel="필터 초기화">
									<IconComponent type="materialIcons" name="restart-alt" size={scaledSize(24)} color={Colors.error} />
								</TouchableOpacity>
							</View>

							{/* 상세 필터 영역 (자연 높이 — 펼칠 때 레이아웃 깨짐 방지) */}
							{isDetailFilterOpen && (
								<View style={styles.detailFilterWrapper}>
									<View style={styles.subFilterRow}>
										<View style={{ flex: 1, zIndex: regionOpen ? 1000 : 2000 }}>
											{' '}
											{/* zIndex 역전 방지 */}
											<DropDownPicker
												open={isDetailFilterOpen && levelOpen}
												setOpen={setLevelOpen}
												value={levelFilter}
												setValue={setLevelFilter}
												items={LEVEL_DROPDOWN_ITEMS} // ✅ 아이콘이 포함된 항목 사용
												placeholder="난이도"
												style={styles.dropdown}
												textStyle={{
													fontSize: Typography.body, // 더 작게
													color: Colors.text,
													fontWeight: FontWeight.medium,
												}}
												placeholderStyle={{ color: Colors.textMuted, fontSize: Typography.body }}
												dropDownContainerStyle={styles.dropdownList}
												containerStyle={{ zIndex: 3000 }}
												zIndex={9999} // 높게 설정
												zIndexInverse={1000} // 반대 드롭다운일 경우 대비
												listMode="SCROLLVIEW" /* 스크롤뷰 모드로 변경 */
											/>
										</View>
										<View style={{ width: Spacing.sm }} />
										<View style={{ flex: 1, zIndex: levelOpen ? 1000 : 2000 }}>
											<DropDownPicker
												listMode="MODAL"
												open={isDetailFilterOpen && regionOpen}
												value={regionFilter}
												modalTitle="카테고리 선택"
												items={FIELD_DROPDOWN_ITEMS}
												setOpen={setRegionOpen}
												setValue={setRegionFilter}
												dropDownDirection="BOTTOM"
												scrollViewProps={{ nestedScrollEnabled: true }}
												style={styles.dropdownField}
												dropDownContainerStyle={{
													overflow: 'visible',
													zIndex: 3000,
													...styles.dropdownListField,
													maxHeight: scaleHeight(200),
												}}
												zIndex={5000}
												zIndexInverse={4000}
												containerStyle={{ zIndex: 5000 }}
												labelStyle={{ fontSize: Typography.body, color: Colors.text }}
												iconContainerStyle={{ marginRight: Spacing.sm }}
												showArrowIcon={true}
												showTickIcon={false}
												renderListItem={({ item, onPress }) => (
													<TouchableOpacity
														//@ts-ignore
														onPress={() => onPress(item)}
														style={{
															flexDirection: 'row',
															alignItems: 'center',
															paddingVertical: SpacingV.lg,
															paddingHorizontal: Spacing.lg,
															borderBottomWidth: 1,
															borderBottomColor: Colors.surfaceAlt,
														}}
													>
														<View style={{ width: scaleWidth(28), alignItems: 'center', marginRight: Spacing.md }}>
															{typeof item.icon === 'function' ? item.icon() : item.icon}
														</View>
														<Text style={{ fontSize: Typography.callout, color: Colors.text, flex: 1 }}>{item.label}</Text>
													</TouchableOpacity>
												)}
												modalProps={{
													animationType: 'fade',
													presentationStyle: 'overFullScreen',
													transparent: true,
												}}
												modalContentContainerStyle={{
													marginTop: '25%',
													width: '85%',
													alignSelf: 'center',
													maxHeight: scaleHeight(500),
													backgroundColor: Colors.surface,
													borderWidth: 1,
													borderColor: Colors.borderStrong,
													borderRadius: Radius.xl,
													paddingHorizontal: 0,
													paddingVertical: SpacingV.xl,
													position: 'relative',
												}}
												modalTitleStyle={{
													fontSize: Typography.subtitle,
													fontWeight: FontWeight.bold,
													color: Colors.text,
													textAlign: 'center',
													paddingVertical: SpacingV.md,
													paddingHorizontal: Spacing.lg,
													paddingRight: Spacing.xxxxl,
												}}
												closeIconStyle={{
													marginTop: SpacingV.xs,
													width: scaleWidth(24),
													height: scaleWidth(24),
												}}
												closeIconContainerStyle={{
													position: 'absolute',
													right: scaleWidth(12),
													top: scaleHeight(12),
													padding: Spacing.xs,
													zIndex: 1,
												}}
											/>
										</View>
									</View>
								</View>
							)}
						</View>
					</View>

					{isLoading ? (
						<View style={styles.loadingContainer}>
							<ActivityIndicator size="large" color={Colors.primary} />
							<Text style={styles.loadingText}>한자어 정보를 불러오는 중...</Text>
						</View>
					) : getFilteredData().length === 0 ? (
						<View style={styles.emptyWrapper}>
							<Image source={FourImages.no_data} style={styles.emptyImage} contentFit="contain" />
							<Text style={styles.emptyText}>
								{filter === 'learned'
									? '학습 완료된 한자어가 없습니다\n완료 버튼을 눌러 학습을 완료해보세요!'
									: filter === 'learning'
										? '학습 중인 한자어가 없습니다\n다시 학습하기 버튼을 눌러보세요!'
										: '한자어 목록이 비어 있습니다!'}
							</Text>
						</View>
					) : (
						<>
							<Animated.View
								style={[styles.carouselContainer, { zIndex: 1, alignSelf: 'center' }]}
								onLayout={(e) => {
									// 소수점 높이는 카드가 1px 씩 잘려 보인다 — 정수로 끊는다
									const next = Math.floor(e.nativeEvent.layout.height);
									setViewportHeight((prev) => (prev === next ? prev : next));
								}}
							>
								{!(Platform.OS === 'android' && (badgeModalVisible || showExitModal || !!studyDone)) && (
									<Carousel
										ref={carouselRef}
										width={scaleWidth(370)}
										height={cardHeight}
										// @ts-ignore
										data={getFilteredData()}
										renderItem={renderItem}
										mode="parallax"
										loop={false}
										windowSize={3}
										pagingEnabled={true}
										scrollAnimationDuration={600}
										removeClippedSubviews={false}
										// 가로로 확실히 끌었을 때만 카드가 넘어간다 — 세로 드래그는 뒷면 스크롤에 넘긴다
										onConfigurePanGesture={(pan) => {
											'worklet';
											pan.activeOffsetX([-12, 12]);
											pan.failOffsetY([-10, 10]);
										}}
										modeConfig={{
											parallaxScrollingScale: 0.92,
											parallaxScrollingOffset: 30,
											parallaxAdjacentItemScale: 0.9,
										}}
										onSnapToItem={() => {
											// 손으로 넘겼을 때만 소리를 낸다 (코드로 옮긴 직후면 표시를 내리고 넘어간다)
											if (skipSwipeSfxRef.current) {
												skipSwipeSfxRef.current = false;
											} else {
												playSwipe(); // 🔊 다음 카드로 넘어감
											}
											// 뒤집힌 카드는 한 장뿐이다 — 맵 전체를 훑으면 카드 수만큼 네이티브 애니메이션이 동시에 뜬다
											const flipped = flippedCard !== null ? flipAnimRefs.current[flippedCard] : undefined;
											if (flipped) {
												Animated.timing(flipped, {
													toValue: 0,
													duration: 100,
													useNativeDriver: true,
												}).start();
											}
											setFlippedCard(null);
											pruneCardAnims();
										}}
									/>
								)}
							</Animated.View>
						</>
					)}
					<View style={[styles.studyEndWrapper, { paddingBottom: insets.bottom + SpacingV.md }]}>
						<TouchableOpacity
							style={styles.studyEndButton}
							onPress={() => {
								setLevelOpen(false);
								setRegionOpen(false);
								runLater(() => {
									setShowExitModal(true); // ✅ 약간의 delay를 주면 Modal 정상 출력
								}, 200);
							}}
						>
							<Text style={styles.studyEndText}>학습 종료</Text>
						</TouchableOpacity>
					</View>
				</View>

				<CharacterGuide
					visible={guide.visible}
					onClose={guide.close}
					lines={[
						'학습 화면에서는 한자어를 카드로 하나씩 익힐 수 있습니다.',
						'위 필터로 학습 중·학습 완료만 골라 볼 수 있습니다.',
						'읽은 카드는 학습 완료로 표시돼 진도가 쌓입니다!',
					]}
					title="학습, 이렇게 합니다"
				/>
			</SafeAreaView>

			<AppModal visible={showExitModal} transparent animationType="fade" onRequestClose={() => setShowExitModal(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.exitModalBox}>
						<Text style={styles.exitTitle}>진행중인 학습을 종료하시겠어요?</Text>
						<Text style={styles.exitSub}>홈 화면으로 이동합니다</Text>
						<View style={styles.exitButtonRow}>
							<TouchableOpacity
								style={[styles.exitButton, { backgroundColor: Colors.textMuted }]}
								onPress={() => setShowExitModal(false)}
							>
								<Text style={[styles.exitButtonText, { color: onSurface(Colors.textMuted) }]}>취소</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.exitButton, { backgroundColor: Colors.error }]}
								onPress={() => {
									setShowExitModal(false);
									navigation.goBack();
								}}
							>
								<Text style={[styles.exitButtonText, { color: onSurface(Colors.error) }]}>종료</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</AppModal>

			{showToast && (
				<View style={styles.toastWrapper} pointerEvents="none">
					<Animated.View
						style={[
							styles.toastCard,
							{
								opacity: toastAnim,
								transform: [
									{ scale: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
									{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(18), 0] }) },
								],
							},
						]}
					>
						{/* 상태 배지 — 카드 위쪽 테두리에 걸쳐 떠 있다 */}
						<View style={[styles.toastBadge, !isFirstStudy && styles.toastBadgeReview]}>
							<IconComponent
								type="materialCommunityIcons"
								name={isFirstStudy ? 'check-bold' : 'book-open-page-variant'}
								size={scaledSize(22)}
								color={onSurface(isFirstStudy ? Colors.success : Colors.secondarySurface)}
							/>
						</View>

						<Image source={isFirstStudy ? completionImages : reviewImage} style={styles.toastImage} contentFit="contain" />
						<Text style={[styles.toastTitle, !isFirstStudy && styles.toastTitleReview]}>{isFirstStudy ? '학습 완료' : '복습 시작'}</Text>
						<Text style={styles.toastText}>{praiseText}</Text>

						{/* 이 범위의 진도 — 막대가 차오르는 것만 봐도 몇 장 남았는지 안다 */}
						{scopeProgress.total > 0 && (
							<View style={styles.toastProgress}>
								<View style={styles.toastProgressTrack}>
									<Animated.View
										style={[
											styles.toastProgressFill,
											{
												width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
												backgroundColor: isFirstStudy ? Colors.success : Colors.secondarySurface,
											},
										]}
									/>
								</View>
								<Text style={styles.toastProgressText}>
									{regionFilter === '전체' ? '전체' : regionFilter} {scopeProgress.done} / {scopeProgress.total}
								</Text>
							</View>
						)}
					</Animated.View>
				</View>
			)}

			<NewBadgeModal
				visible={badgeModalVisible}
				badges={newlyEarnedBadges}
				onConfirm={() => setBadgeModalVisible(false)}
			/>

			{/* 학습 완료 — 지금 범위를 다 끝냈을 때 한 번 축하한다 */}
			<StudyCompletionModal
				visible={!!studyDone}
				scopeLabel={studyDone?.label ?? '전체'}
				scopeTotal={studyDone?.scopeTotal ?? 0}
				learnedAll={studyHistory.studyProverbs.length}
				totalAll={proverbList.length}
				onClose={() => setStudyDone(null)}
				onQuiz={() => {
					setStudyDone(null);
					const categoryKey = LIFE_CATEGORIES.find((item) => item.label === studyDone?.label)?.key;
					router.push({ pathname: '/quiz', params: { source: 'category', ...(categoryKey ? { category: categoryKey } : {}) } } as never);
				}}
			/>
		</>
	);
};
const makeStyles = () => StyleSheet.create({
	main: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	container: {
		flex: 1,
		backgroundColor: Colors.surface,
	},
	cardWrapper: {
		height: scaleHeight(812 * 0.7),
		width: '100%',
		alignItems: 'center',
		justifyContent: 'flex-start',
		// 음수 padding 은 Yoga 가 무시하므로 위로 당기는 효과가 없었다 — 제거
	},
	cardFront: {
		width: scaleWidth(370), // ✅ 내부 카드(cardFace)와 같은 크기로
		height: scaleHeight(540),
		borderRadius: Radius.xl,
		alignItems: 'center',
		justifyContent: 'center',
	},
	learningStatusOverlay: {
		position: 'absolute',
		top: scaleHeight(20),
		left: 0,
		right: 0,
		zIndex: 1,
		paddingHorizontal: Spacing.xl,
		alignItems: 'center',
		backgroundColor: 'transparent',
	},
	flagContainer: {
		// 그림 칸은 자기 자리(flagSection) 높이를 넘지 않는 정사각형이다.
		// 예전에는 260 으로 못 박아 200 짜리 자리를 60 넘겼고, 넘친 만큼이 바로 아래 한자·독음 위를 덮었다.
		// 좁은 기기에서는 높이보다 카드 폭이 먼저 모자란다 — 폭을 넘지 않게 묶어 둔다.
		height: '100%',
		maxWidth: '100%',
		aspectRatio: 1,
		backgroundColor: Colors.background,
		borderRadius: Radius.md,
		overflow: 'hidden',
		borderColor: Colors.border,
		borderWidth: 1,
	},
	flag: {
		width: '100%',
		height: '100%',
		resizeMode: 'contain',
	},
	cardContent: {
		alignItems: 'center',
	},
	countryName: {
		fontSize: Typography.h2,
		fontWeight: FontWeight.bold,
		color: Colors.text,
	},
	// 좌우 여백은 바깥 칸이 준다 — 안쪽 박스가 width:100% 라 여기에 margin 을 주면 테두리가 화면 밖으로 밀린다
	progressHeaderOuter: {
		paddingHorizontal: Spacing.lg,
		marginTop: SpacingV.md,
	},
	progressHeader: {
		// 태블릿: 아래 카드 캐러셀과 좌우 선을 맞춘다 (캐러셀은 이미 폭이 묶여 있다)
		maxWidth: CONTENT_MAX_WIDTH,
		alignSelf: 'center',
		width: '100%',
		paddingTop: SpacingV.md,
		backgroundColor: Colors.surface,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		borderRadius: Radius.lg,
		paddingBottom: 0,
	},
	progressTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: SpacingV.xs,
		// 부모가 alignItems:'center'라 폭이 내용만큼만 잡힌다 — 늘려야 좌우 칸이 양 끝에 붙는다
		alignSelf: 'stretch',
		paddingHorizontal: Spacing.lg,
		gap: Spacing.sm,
	},
	/**
	 * 좌우 칸은 폭을 같게 못 박는다.
	 * 예전에는 두 칸을 position:absolute 로 띄웠는데, 가운데 제목·진도가 길어지면
	 * 그 위로 겹쳐 글씨가 서로 먹혔다(큰 글씨 모드·문항 수가 네 자리일 때).
	 */
	progressTopSide: { width: scaleWidth(62), justifyContent: 'center' },
	progressTopSideRight: { alignItems: 'flex-end' },
	progressTopCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
	readingToggle: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: scaleWidth(4),
		paddingHorizontal: Spacing.sm,
		height: scaleHeight(26),
		borderRadius: Radius.pill,
		backgroundColor: Colors.primarySoft,
	},
	// 가린 상태는 면을 반전시켜 "지금 감춰 둔 중"이 한눈에 보이게 한다
	readingToggleOff: { backgroundColor: Colors.textSecondary },
	readingToggleText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.primaryDark },
	readingToggleTextOff: { color: Colors.textInverse },
	progressTitle: {
		flexShrink: 1,
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.semibold,
		color: Colors.text,
	},
	progressBadge: {
		backgroundColor: Colors.secondarySurface,
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.md,
		borderRadius: Radius.md,
	},
	progressBadgeText: {
		color: Colors.textInverse,
		fontSize: Typography.body,
		fontWeight: FontWeight.semibold,
	},
	filterContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: SpacingV.sm,
	},
	filterButton: {
		borderWidth: 1,
		borderColor: Colors.primary,
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.md,
		marginHorizontal: Spacing.xs,
		backgroundColor: Colors.surface,
		minHeight: scaleHeight(20),
		justifyContent: 'center',
		marginBottom: SpacingV.md,
	},

	filterText: {
		fontSize: Typography.footnote,
		color: Colors.primary,
		lineHeight: scaledSize(18),
		textAlign: 'center',
	},
	filterButtonActive: {
		backgroundColor: Colors.secondarySurface,
	},
	filterTextActive: {
		color: Colors.textInverse,
	},
	button: {
		height: scaleHeight(50),
		marginTop: SpacingV.lg,
		borderRadius: scaleWidth(30),
		backgroundColor: Colors.secondarySurface,
		justifyContent: 'center',
		alignItems: 'center', // ✅ 변경 (기존 `alignContent` → `alignItems`)
		width: '100%', // ✅ 항상 100% 사용
		alignSelf: 'center', // ✅ 중앙 정렬
	},
	learnedButton: {
		backgroundColor: Colors.warning,
	},
	learningButton: {
		backgroundColor: Colors.primary,
	},
	buttonText: {
		color: Colors.textInverse,
		fontSize: Typography.title,
		fontWeight: FontWeight.semibold,
		letterSpacing: 0.5,
		textAlign: 'center',
	},
	infoText: {
		color: Colors.textInverse,
		fontSize: Typography.subtitle,
		marginTop: SpacingV.xs,
		marginBottom: SpacingV.md,
	},
	copyButtonContainer: { marginTop: SpacingV.md, alignItems: 'center' },
	copyButton: {
		backgroundColor: Colors.secondarySurface,
		padding: Spacing.md,
		borderRadius: Radius.xs,
	},
	copyButtonText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontWeight: FontWeight.semibold,
		fontSize: Typography.body,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: SpacingV.xxxxl,
	},
	loadingText: {
		marginTop: SpacingV.md,
		fontSize: Typography.subtitle,
		color: Colors.textSecondary,
	},
	completeMessageContainer: {
		position: 'absolute',
		bottom: scaleHeight(40),
		left: 0,
		right: 0,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 2,
	},
	completeImage: {
		width: scaleWidth(100),
		height: scaleWidth(100),
		marginBottom: SpacingV.md,
	},
	completeMessageText: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
	},
	progressText: {
		fontSize: Typography.title,
		fontWeight: FontWeight.semibold,
		color: Colors.text,
	},
	progressBarWrapper: {
		width: '80%',
		height: scaleHeight(10),
		borderRadius: Radius.xs,
		backgroundColor: Colors.borderStrong,
		marginTop: SpacingV.md,
		overflow: 'hidden',
	},
	progressBarFill: {
		height: '100%',
		borderRadius: Radius.xs,
		backgroundColor: Colors.secondarySurface,
	},
	carouselContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		// 카드가 남는 높이보다 커지는 경우에도 위쪽 학습 현황 박스를 덮지 않게 잘라 낸다
		overflow: 'hidden',
	},
	highlightCapital: {
		color: Colors.warningBright,
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		marginBottom: SpacingV.md,
	},
	capitalText: {
		color: Colors.textInverse,
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
	},
	buttonBottomWrapper: {
		position: 'absolute',
		bottom: scaleHeight(20),
		left: scaleWidth(20),
		right: scaleWidth(20),
		alignItems: 'center',
		zIndex: 10,
	},
	cardFace: {
		width: scaleWidth(370),
		height: CARD_HEIGHT, // ✅ 여기 반영
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		padding: Spacing.xl,
		justifyContent: 'space-between',
		alignSelf: 'center',
		borderWidth: 1,
		borderColor: Colors.border, // ✅ 테두리 추가
	},

	cardFace2: {
		width: scaleWidth(370),
		height: CARD_HEIGHT, // ✅ 여기 반영
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		padding: Spacing.md,
		flexDirection: 'column',
		alignSelf: 'center',
		borderWidth: 1,
		borderColor: Colors.border, // ✅ 테두리 추가
	},
	cardBackScroll: {
		flex: 1,
		width: '100%',
	},
	flipIconContainer: {
		position: 'absolute',
		top: scaleHeight(12),
		right: scaleWidth(12),
		borderRadius: Radius.xl,
		padding: Spacing.sm,
		zIndex: 3,
	},
	flipIcon: {
		fontSize: Typography.title,
	},
	capitalEngWrapper: {
		position: 'absolute',
		bottom: scaleHeight(20),
		width: '100%',
		alignItems: 'center',
	},
	capitalEngText: {
		fontSize: Typography.subtitle,
		color: Colors.textMuted,
		fontStyle: 'italic',
	},
	capitalTitle: {
		fontSize: Typography.display,
		fontWeight: FontWeight.bold,
		color: Colors.textInverse,
		textAlign: 'center',
		marginBottom: SpacingV.xs,
	},
	capitalSub: {
		fontSize: Typography.title,
		color: Colors.textMuted,
		textAlign: 'center',
		marginBottom: SpacingV.xxxxxl,
		fontStyle: 'italic',
	},
	progressHeaderTop: {
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
	},
	progressTextWithIcon: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
	},
	tooltipIcon: {
		padding: Spacing.xs,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: Colors.scrim, // 어두운 배경 복원
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 99999,
	},
	flagSection: {
		position: 'relative',
		width: '100%',
		height: IMAGE_HEIGHT, // ✅ 조건부 높이 적용
		alignItems: 'center',
		marginBottom: SpacingV.md, // 👈 이미지 아래 공간 확보
	},
	flipIconOutside: {
		position: 'absolute',
		top: scaleHeight(-12),
		right: scaleWidth(20),
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		padding: Spacing.sm,
	},
	capitalInfo: {
		marginBottom: SpacingV.xxxxl,
	},

	capitalWrapper: {
		alignItems: 'center',
		marginTop: SpacingV.xxxxl,
		marginBottom: SpacingV.xl,
		paddingHorizontal: Spacing.xxxl,
	},

	sectionLabel: {
		fontSize: Typography.title,
		color: Colors.warningBright,
		fontWeight: FontWeight.semibold,
		marginBottom: SpacingV.sm,
		textAlign: 'center',
	},
	cardHint: {
		fontSize: Typography.bodySm,
		color: Colors.textMuted, // ✅ 더 흐릿한 회색
		opacity: 0.8,
		marginTop: SpacingV.sm,
	},
	modalCloseIcon: {
		position: 'absolute',
		top: scaleHeight(12),
		right: scaleWidth(12),
		padding: Spacing.sm,
		zIndex: 10,
	},
	tooltipModal: {
		width: '85%',
		maxHeight: '80%',
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		padding: Spacing.xl,
	},

	tooltipScrollContainer: {
		paddingBottom: SpacingV.xl,
	},

	tooltipTitle: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		marginBottom: SpacingV.md,
		color: Colors.text,
		textAlign: 'center',
	},

	tooltipContent: {
		fontSize: Typography.body,
		color: Colors.text,
		lineHeight: scaledSize(22),
	},

	closeButton: {
		marginTop: SpacingV.xl,
		backgroundColor: Colors.secondarySurface,
		paddingVertical: SpacingV.md,
		borderRadius: Radius.sm,
		alignItems: 'center',
	},

	closeButtonText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontWeight: FontWeight.semibold,
		fontSize: Typography.callout,
	},
	modalText: {
		fontSize: Typography.body,
		color: Colors.text,
		lineHeight: scaledSize(22),
		textAlign: 'left',
		marginTop: SpacingV.md,
		marginBottom: SpacingV.xl,
	},
	boldText: {
		fontWeight: FontWeight.bold,
	},
	tooltipContentContainer: {
		flex: 1,
		width: '100%',
	},
	// 학습 완료 토스트 — 화면 한가운데 뜨는 카드. 배지가 위 테두리에 걸리므로 위쪽 여백을 더 준다
	toastCard: {
		width: '100%',
		maxWidth: Math.min(scaleWidth(300), MODAL_MAX_WIDTH),
		backgroundColor: Colors.surface,
		borderRadius: Radius.xxl,
		borderWidth: 1,
		borderColor: Colors.border,
		// 배지가 카드 안쪽으로 24 만큼 들어온다 — 40 을 줘야 배지 아래로 16 의 숨통이 남는다
		paddingTop: SpacingV.xxxxl,
		paddingBottom: SpacingV.xxl,
		paddingHorizontal: Spacing.xxl,
		alignItems: 'center',
		...Shadow.floating,
		// 안드로이드는 shadow* 를 그리지 않는다 — 떠 보이게 하려면 elevation 이 따로 필요하다
		elevation: 12,
	},
	toastBadge: {
		position: 'absolute',
		top: -scaleWidth(24),
		width: scaleWidth(48),
		height: scaleWidth(48),
		borderRadius: scaleWidth(24),
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.success,
		// 카드 면과 같은 색 링을 둘러 배지가 카드 위에 떠 보이게 한다
		borderWidth: scaleWidth(4),
		borderColor: Colors.surface,
	},
	toastBadgeReview: { backgroundColor: Colors.secondarySurface },
	badgeModal: {
		backgroundColor: Colors.surface,
		padding: Spacing.xl,
		borderRadius: Radius.xl,
		width: '85%',
		maxHeight: '80%',
		alignItems: 'center',
	},
	badgeModalTitle: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.lg,
		textAlign: 'center',
	},
	badgeItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.md,
		marginBottom: SpacingV.md,
		width: '100%',
		borderRadius: Radius.md,
		borderWidth: 1.2,
		borderColor: Colors.secondarySoft,
		backgroundColor: Colors.secondaryBg,
	},
	badgeIconWrap: {
		marginRight: Spacing.md,
		width: scaleWidth(40),
		height: scaleWidth(40),
		borderRadius: Radius.xl,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: Colors.secondaryPale,
	},
	badgeName: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
		marginBottom: SpacingV.xxs,
	},
	badgeTextWrap: {
		flexShrink: 1,
		flexGrow: 1,
		minWidth: 0,
		maxWidth: '85%',
	},
	badgeDescription: {
		fontSize: Typography.body,
		color: Colors.textSecondary,
		lineHeight: scaledSize(20),
	},
	modalConfirmText2: {
		color: Colors.textInverse,
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.semibold,
	},
	modalConfirmButton2: {
		backgroundColor: Colors.secondarySurface,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.xxxxl,
		borderRadius: scaleWidth(30),
	},
	toastImage: {
		// 그림이 정사각이라 상자도 정사각으로 둔다 — 세로를 줄이면 위아래 여백만 비뚤어진다
		width: scaleWidth(88),
		height: scaleWidth(88),
		marginBottom: SpacingV.md,
	},
	toastTitle: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.heavy,
		color: Colors.successDark,
		letterSpacing: -0.3,
		marginBottom: SpacingV.sm,
		textAlign: 'center',
	},
	toastTitleReview: { color: Colors.secondaryDark },
	// 진도 줄 — 칭찬 문구와 붙지 않도록 위로 한 칸 띄우고, 카드 좌우 여백에 맞춰 폭을 다 쓴다
	toastProgress: { width: '100%', marginTop: SpacingV.lg, gap: SpacingV.xs },
	toastProgressTrack: {
		height: scaleHeight(6),
		borderRadius: Radius.pill,
		backgroundColor: Colors.surfaceAlt,
		overflow: 'hidden',
	},
	toastProgressFill: { height: '100%', borderRadius: Radius.pill },
	toastProgressText: {
		fontSize: Typography.caption,
		fontWeight: FontWeight.semibold,
		color: Colors.textMuted,
		textAlign: 'right',
	},
	toastText: {
		fontSize: Typography.body,
		color: Colors.textSecondary,
		lineHeight: scaledSize(21),
		textAlign: 'center',
	},
	// 화면 정중앙 — 예전에는 top 40% 에 두고 transform 으로 다시 끌어올려 기기마다 위치가 달랐다
	toastWrapper: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: 'center',
		justifyContent: 'center',
		// 작은 기기에서도 카드가 화면 양옆에 붙지 않도록 좌우 여백은 감싸는 쪽이 갖는다
		paddingHorizontal: Spacing.xxl,
		zIndex: 999,
	},
	emptyWrapper: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: Spacing.xxl,
		backgroundColor: Colors.secondaryBg,
	},
	emptyImage: {
		width: scaleWidth(100),
		height: scaleWidth(100),
		marginBottom: SpacingV.xl,
		opacity: 0.6,
	},
	emptyText: {
		fontSize: Typography.subtitle,
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: scaledSize(24),
	},
	filterSection: {
		paddingTop: SpacingV.md,
		backgroundColor: Colors.surface,
	},
	basicFilterRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	detailToggleButton: {
		marginLeft: Spacing.sm,
		padding: Spacing.xs,
		marginBottom: SpacingV.md,
	},
	detailFilterWrapper: {
		width: '100%',
		backgroundColor: Colors.surface,
		paddingBottom: SpacingV.sm,
		paddingHorizontal: Spacing.lg,
		zIndex: 9999,
	},
	subFilterRow: {
		flexDirection: 'row',
		paddingHorizontal: Spacing.xs,
		marginTop: SpacingV.xxs,
	},
	resetButton: {
		marginLeft: Spacing.sm,
		padding: Spacing.xs,
		marginBottom: SpacingV.md,
	},
	badgeCardActive: {
		borderColor: Colors.primary,
		backgroundColor: Colors.secondaryBg,
	},
	iconBox: {
		width: scaleWidth(32),
		height: scaleWidth(32),
		borderRadius: Radius.lg,
		backgroundColor: Colors.border,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: Spacing.md,
	},
	iconBoxActive: {
		backgroundColor: Colors.secondarySoft,
	},
	badgeTitleActive: {
		color: Colors.primary,
	},
	badgeDescActive: {
		color: Colors.primary,
	},
	statusCardValue: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.text,
	},
	badgeCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: Colors.background,
		borderRadius: Radius.md,
		padding: Spacing.md,
		marginBottom: SpacingV.md,
		borderWidth: 1,
		borderColor: Colors.border,
		width: '100%',
	},
	dropdown: {
		backgroundColor: Colors.surface,
		borderColor: Colors.border,
		borderWidth: 1,
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.sm, // 여백도 줄임
	},
	dropdownList: {
		backgroundColor: Colors.surface,
		borderColor: Colors.border,
		borderWidth: 1,
		borderRadius: Radius.md,
		paddingBottom: 0,
		marginBottom: 0,
	},
	studyEndWrapper: {
		width: '100%',
		alignItems: 'center',
		paddingVertical: SpacingV.md,
		// 하단 여백은 기기마다 다른 내비게이션 바 높이를 따라야 한다 — 실제 값은 렌더에서 insets 로 덧붙인다
		borderTopWidth: 1,
		borderColor: Colors.surfaceAlt,
	},
	studyEndButton: {
		// textSecondary 는 다크에서 밝은 회색이라 흰 글씨가 묻힌다 — 두 테마 모두 흰 글씨가 살아나는 반전 표면을 쓴다
		backgroundColor: Colors.inverseSurface,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.xxl,
		borderRadius: Radius.xxl,
	},
	studyEndText: {
		color: Colors.textInverse,
		fontSize: Typography.body,
		fontWeight: FontWeight.bold,
	},
	exitModal: {
		width: '85%',
		maxHeight: '80%',
		// backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		padding: Spacing.xl,
	},
	exitTitle: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.sm,
	},
	exitSub: {
		fontSize: Typography.body,
		color: Colors.textSecondary,
		marginBottom: SpacingV.xl,
	},
	exitButtonRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
	},
	flagImage: {
		width: '100%',
		aspectRatio: 1.6,
		borderRadius: Radius.md,
		backgroundColor: Colors.surfaceAlt,
		borderColor: Colors.border,
		borderWidth: 1,
	},
	exitButton: {
		flex: 1,
		marginHorizontal: Spacing.xs,
		paddingVertical: SpacingV.md,
		borderRadius: Radius.sm,
		alignItems: 'center',
	},
	exitButtonText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontWeight: FontWeight.bold,
		fontSize: Typography.callout,
	},
	retryButton: {
		backgroundColor: Colors.warning,
		paddingVertical: SpacingV.md,
		borderRadius: Radius.pill,
		marginBottom: SpacingV.md,
	},
	cardMiddle: {
		// 에셋 바로 아래 칸 — 위쪽 여백을 주면 한자·독음이 카드 밖으로 밀려 안 보였다
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: Spacing.md, // ✅ 좌우 여백
		width: '100%', // ✅ 부모 크기에 맞추기
	},

	cardCompleteButton: {
		backgroundColor: Colors.secondarySurface,
		paddingVertical: SpacingV.md,
		borderRadius: Radius.pill,
		marginBottom: SpacingV.md,
	},
	exitModalBox: {
		width: '80%',
		maxWidth: MODAL_MAX_WIDTH,
		backgroundColor: Colors.surface,
		padding: Spacing.xxl,
		borderRadius: Radius.lg,
		alignItems: 'center',
	},
	// 카드 바닥 고정 버튼 — 스크롤 영역이 flex:1로 남은 높이를 차지하고, 이 블록이 항상 마지막 줄에 온다
	fixedBottomButton: {
		width: '100%',
		alignItems: 'center',
		paddingTop: SpacingV.sm,
		paddingHorizontal: Spacing.md,
	},
	subMascotImage: {
		width: '100%',
		aspectRatio: 1,
		resizeMode: 'contain',
		alignSelf: 'center',
	},
	flagImageSquare: {
		// width: '100%',
		width: '100%',
		aspectRatio: 1, // 정사각형
		alignSelf: 'center',
	},
	hanjaWrap: {
		alignItems: 'center',
		marginBottom: SpacingV.sm,
	},
	hanjaAccent: {
		marginTop: SpacingV.md,
		width: scaleWidth(44),
		height: scaleHeight(4),
		borderRadius: Radius.xs,
		backgroundColor: Colors.primary,
	},
	hanjaText: { ...getHanjaTextStyle(),
		fontSize: Typography.hero,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
		textAlign: 'center',
		// 자간을 4 로 두면 넉 자 낱말에서 마지막 글자가 한 줄 폭을 넘어 잘렸다
		letterSpacing: 2,
		flexShrink: 1,
		width: '100%',
	},

	// 한자 뒤에 붙는 (독음) — 한자보다 훨씬 작게 둬서 한자가 계속 주인공으로 남는다
	hanjaReading: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.primaryDeep,
		letterSpacing: 0,
	},

	badge: {
		maxWidth: '60%',
		alignSelf: 'center',
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.xs,
		borderRadius: Radius.md,
		backgroundColor: Colors.surfaceAlt,
		marginBottom: SpacingV.md,
	},
	badgeText: {
		color: Colors.textInverse,
		fontSize: Typography.body,
		fontWeight: 600,
	},
	cardBackContainer: {
		flexGrow: 1,
		paddingHorizontal: Spacing.md,
		paddingTop: SpacingV.xl,
		paddingBottom: SpacingV.xl,
		backgroundColor: Colors.surface,
		borderRadius: Radius.xxl,
		borderWidth: 1,
		borderColor: Colors.surfaceMuted,
		width: '100%',
		minHeight: CARD_HEIGHT - scaleHeight(96),
	},

	cardTitle: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
		textAlign: 'center',
		marginBottom: SpacingV.lg,
	},

	charList: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.lg, // ⬅️ 좌우 여백 명확히
		marginHorizontal: Spacing.lg, // ⬅️ 바깥쪽 여백도 추가
		marginBottom: SpacingV.xs,
	},
	charRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: SpacingV.sm,
	},

	charMain: {
		fontSize: Typography.h3, // ⬅ 기존 22 → 18
		fontWeight: FontWeight.semibold,
		color: Colors.primary,
		width: scaleWidth(26), // ⬅ 한자 크기 줄이면서 폭도 줄임
	},

	charMeaning: {
		fontSize: Typography.body, // ⬅ 기존 16 → 14
		color: Colors.text,
		marginLeft: Spacing.sm,
	},

	charSub: {
		fontSize: Typography.footnote, // ⬅ 기존 14 → 12
		color: Colors.textSecondary,
		marginLeft: Spacing.xs,
	},

	sectionTitle: {
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.sm,
	},

	meaningBox: {
		borderRadius: Radius.lg,
		backgroundColor: Colors.warningSoft, // 밝은 크림색
		borderWidth: 1,
		borderColor: Colors.warningPale,
		padding: Spacing.lg,
		marginBottom: SpacingV.md,
	},

	exampleBox: {
		backgroundColor: Colors.secondaryBg, // 연한 하늘색
		borderRadius: Radius.lg,
		padding: Spacing.lg,
		marginBottom: SpacingV.lg,
	},

	sectionContent: {
		fontSize: Typography.callout,
		color: Colors.text,
		lineHeight: scaledSize(22),
		textAlign: 'left',
	},
	modalCharacterGrid: {
		flexDirection: 'row',
		padding: Spacing.sm,
		backgroundColor: Colors.surfaceAlt, // 밝은 연두톤
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		marginBottom: SpacingV.lg,
	},

	characterColumn: {
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
		width: scaleWidth(60), // 한 글자 너비 고정 (조정 가능)
	},

	charText: {
		fontSize: Typography.h1, // ⬆️ 기존 24에서 증가
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.xs,
	},

	meaningText: {
		fontSize: Typography.callout, // ⬆️ 기존 13에서 증가
		color: Colors.text,
		textAlign: 'center',
		marginBottom: SpacingV.xxs,
	},

	radicalText: {
		fontSize: Typography.footnote, // ⬆️ 기존 11에서 증가
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	combinedBox: {
		backgroundColor: Colors.warningBg, // 부드러운 배경색
		borderWidth: 1,
		borderColor: Colors.warningPale,
		borderRadius: Radius.lg,
		padding: Spacing.lg,
		marginBottom: SpacingV.lg,
	},

	separatorLine: {
		height: 1,
		backgroundColor: Colors.warningPale,
		marginVertical: SpacingV.md,
	},
	meaningTitle: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.sm,
	},

	meaningContent: {
		fontSize: Typography.callout,
		color: Colors.text,
		lineHeight: scaledSize(22),
		textAlign: 'left',
	},

	exampleTitle: {
		fontSize: Typography.body,
		fontWeight: FontWeight.semibold,
		color: Colors.textSecondary,
		marginTop: SpacingV.xs,
		marginBottom: SpacingV.xs,
	},

	exampleContent: {
		fontSize: Typography.body,
		color: Colors.textMuted,
		lineHeight: scaledSize(20),
		textAlign: 'left',
	},
	cardBackTitle: {
		// 뒷면에서 가장 먼저 읽히는 줄 — 앞면과 같은 한자 서체로 크게 세운다
		...getHanjaTextStyle(),
		fontSize: Typography.display,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
		textAlign: 'center',
		marginBottom: SpacingV.lg,
		letterSpacing: 2,
	},
	// (독음) — 한자보다 확실히 작게 둬야 한자가 주인공으로 남는다
	cardBackTitleReading: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.primaryDeep,
		letterSpacing: 0,
	},

	cardBackCharacterGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: Spacing.sm,
		justifyContent: 'space-between',
		paddingHorizontal: Spacing.sm,
		marginBottom: SpacingV.lg,
	},

	cardBackCharacterBox: {
		width: scaleWidth(70),
		alignItems: 'center',
		marginBottom: SpacingV.md,
	},

	cardBackChar: {
		fontSize: Typography.h2,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.xs,
	},

	cardBackCharMeaning: {
		fontSize: Typography.bodySm,
		color: Colors.text,
		textAlign: 'center',
	},

	cardBackCharDetail: {
		fontSize: Typography.caption,
		color: Colors.textMuted,
		textAlign: 'center',
		marginTop: SpacingV.xxs,
	},

	cardBackInfoBox: {
		backgroundColor: Colors.background,
		borderRadius: Radius.lg,
		padding: Spacing.lg,
		borderWidth: 1,
		borderColor: Colors.surfaceMuted,
	},

	cardBackTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		marginBottom: SpacingV.sm,
	},
	cardBackTitleIcon: {
		width: scaleWidth(24),
		height: scaleWidth(24),
		borderRadius: Radius.sm,
		justifyContent: 'center',
		alignItems: 'center',
	},
	// 제목이 본문보다 작으면 위계가 뒤집힌다 — 제목·본문·예문을 같은 callout 스케일로 맞추고 굵기로 구분한다
	cardBackInfoTitle: {
		fontSize: Typography.callout,
		fontWeight: FontWeight.heavy,
		color: Colors.text,
	},

	cardBackInfoText: {
		fontSize: Typography.callout,
		color: Colors.text,
		lineHeight: scaledSize(20),
		marginBottom: SpacingV.md,
	},

	cardBackExampleText: {
		fontSize: Typography.callout,
		color: Colors.textSecondary,
		lineHeight: scaledSize(18),
	},

	cardBackDivider: {
		height: 1,
		backgroundColor: Colors.surfaceMuted,
		marginVertical: SpacingV.md,
	},
	cardBackCharacterRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		// 글자 수가 2~9자로 달라 space-between 은 2·3자에서 좌우로 벌어진다. 가운데 정렬 + 고정 간격으로 통일
		justifyContent: 'center',
		columnGap: Spacing.sm,
		rowGap: SpacingV.sm,
		marginBottom: SpacingV.lg,
	},

	charBoxInline: {
		minWidth: scaleWidth(66),
		paddingVertical: SpacingV.md,
		borderRadius: Radius.lg,
		alignItems: 'center',
		backgroundColor: Colors.secondaryBg,
	},

	charBoxChar: {
		fontSize: Typography.h2,
		fontWeight: FontWeight.heavy,
		color: Colors.secondaryStrong,
		marginBottom: SpacingV.xs,
	},

	charBoxMeaning: {
		fontSize: Typography.body,
		color: Colors.text,
		textAlign: 'center',
	},
	charBoxEum: {
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
	},

	charBoxDetail: {
		fontSize: Typography.caption,
		color: Colors.textMuted,
		textAlign: 'center',
		marginTop: SpacingV.xxs,
	},
	meaningHighlightBox: {
		backgroundColor: Colors.primaryTintBg,
		borderRadius: Radius.md,
		padding: Spacing.md,
	},
	dropdownField: {
		backgroundColor: Colors.surface,
		borderColor: Colors.border,
		borderWidth: 1,
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.sm, // 여백도 줄임
	},
	dropdownListField: {
		backgroundColor: Colors.surface,
		borderColor: Colors.borderStrong,
		borderWidth: 1,
		borderRadius: Radius.md,
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});

export default QuizStudyScreen;
