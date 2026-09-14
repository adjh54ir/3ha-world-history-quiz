/* eslint-disable react-native/no-inline-styles */
/* eslint-disable @typescript-eslint/no-shadow */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Keyboard,
	ScrollView,
	Animated,
	FlatList,
} from 'react-native';
import { RouteProp, useIsFocused, useNavigation, useRoute } from '@/src/four/navigation/compat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CircularProgress from '@/src/four/components/CircularProgress';
import { MY_PROVERB_BOOK, Paths } from '@/src/four/navigation/conf/Paths';
import type { MainDataType } from '@/src/four/types/MainDataType';
import FastImage from '@/src/four/components/FastImage';
import IconComponent from './common/atomic/IconComponent';
import { CONTENT_MAX_WIDTH, MODAL_MAX_WIDTH, scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils/DementionUtils';
import deviceInfoUtils from '@/src/four/utils/deviceInfoUtils';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CONST_BADGES } from '@/src/four/const/ConstBadges';
import ProverbServices from '@/src/four/services/ProverbServices';
import { QuizBadgeInterceptor } from '@/src/four/services/interceptor/QuizBadgeInterceptor';
import { useBlockBackHandler } from '@/src/four/hooks/useBlockBackHandler';
import { useHangulReading } from '@/src/four/hooks/useHangulReading';
import { useModalHandoff } from '@/src/four/hooks/useModalHandoff';
import { checkScoreLevelUp } from '@/src/four/services/interceptor/ScoreTitleInterceptor';
import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';
import { getProverbExamples } from '@/src/four/utils/ProverbExampleUtils';
import { CategoryBadge, LevelBadge } from './common/CommonProverbModule';
import ComboBurst from './common/ComboBurst';
import { REWARD } from '@/src/const/data/life/ConstLifeRewards';
import QuizCompletionModal from './modal/QuizCompletionModal';
import QuizHintModal from './modal/QuizHintModal';
import QuizResultModal from './modal/QuizResultModal';
import QuizStartModal from './modal/QuizStartModal';
import DateUtils from '@/src/four/utils/DateUtils';
import NewBadgeModal from './modal/NewBadgeModal';
import AdmobFrontAd from './common/ads/AdmobFrontAd';
import { playCorrect, playWrong, playTimeout, playTick, playWhoosh, playFinish, playPop } from '@/src/four/utils/SoundUtils';
import { startBgm, stopBgm } from '@/src/four/utils/BgmUtils';
import { useScreenActive } from '@/src/four/hooks/useScreenActive';
import { Typography, FontWeight, Spacing, SpacingV, Radius, HitSlop } from '@/src/four/const/ConstDesign';
import { Colors, onSurface } from '@/src/four/const/ConstColors';
import useAnimationCleanup from '@/src/four/hooks/useAnimationCleanup';
import { bumpActivity } from '@/src/four/utils/DailyActivityUtils';
import { applyCorrect, applyWrong, backfillSchedule, describeDue, loadSchedule, saveSchedule, MAX_BOX } from '@/src/four/utils/ReviewScheduleUtils';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { buildBlankChoices } from '@/src/four/utils/QuizOptionUtils';
import { getHanjaTextStyle } from '@/src/four/const/ConstHanjaFont';
import { bridgeAnswer, flushQuiz, isWrongGuardActive, resetQuizBuffer } from '@/src/four/services/LifeBridge';
import type { LifeType } from '@/src/types/data/LifeType';
import { resolveQuizParams } from '@/src/four/services/QuizEntry';
import { useLocalSearchParams } from 'expo-router';

// Params 타입에 practiceBookId 추가
type Params = {
	questionPool: MainDataType.ProverbType[];
	title: string;
	mode: 'meaning' | 'proverb' | 'blank' | 'example';
	selectedLevel: string;
	levelKey: string;
	isWrongReview?: boolean;
	selectedCategory?: string;
	isPracticeMode?: boolean;
	practiceBookId?: string; // ✅ 추가
};

/**
 * 틀렸을 때 붙이는 해설 한 줄.
 * -------------------------------------------------
 * 4지선다는 틀린 이유를 모르면 다음 판에서 또 틀린다. 오답 노트를 열지 않아도
 * 그 자리에서 정답과 뜻이 한 번 눈에 들어오게 한다. 맞혔을 때는 아무것도 붙이지 않는다.
 */
const answerHint = (question: MainDataType.ProverbType | null, mode: string, blankWord: string): string => {
	if (!question) {
		return '';
	}
	// 빈칸 모드의 정답은 문제의 한 글자다 — 단어 전체를 답이라고 알려 주면 어긋난다
	const answer = mode === 'blank' ? blankWord : `${question.hanja} (${question.hangul})`;
	return answer ? `\n정답 ${answer} · ${question.meaning}` : '';
};

/** 이 연속 정답부터 콤보 칸이 달아오른다 */
const COMBO_HOT = 3;


/**
 * 문제 글씨 크기 — 한자어 몇 글자짜리는 크게, 문장으로 길어질수록 한 단계씩 줄인다.
 * 한 크기로 못 박으면 '電話' 는 너무 작게, 예문 한 줄은 판을 넘치게 나온다.
 *
 * 짧은 한자어 상한을 h1(28) 에서 h2(24) 로 한 단계 더 낮췄다 — 두 글자 문제가 판을 꽉 채워
 * 보기 네 칸을 아래로 밀어냈다. 문제가 주인공인 건 그대로지만 한 화면에 같이 들어오는 쪽이 먼저다.
 */
const questionTextSize = (text: string) => {
	const size = text.length <= 6 ? Typography.h2 : text.length <= 12 ? Typography.h3 : text.length <= 30 ? Typography.title : Typography.subtitle;
	return { fontSize: size, lineHeight: Math.round(size * 1.35) };
};

const STORAGE_KEY = MainStorageKeyType.USER_QUIZ_HISTORY;
const USER_PROVERB_PRACTICE_RECORDS = 'USER_PROVERB_PRACTICE_RECORDS';

const QuizScreen = () => {
	useBlockBackHandler(true); // 뒤로가기 모션 막기

	const isFocused = useIsFocused();
	// 포커스 + 앱 포그라운드를 함께 본다 — 백그라운드에서도 시간이 깎이던 문제 방지
	const isActive = useScreenActive();
	// 하단 종료 버튼이 제스처 바 아래로 숨지 않게 — 기기별 인셋을 쓴다(안드로이드 55/ iOS 20 고정값 대체)
	const insets = useSafeAreaInsets();
	const navigation = useNavigation();
	const route = useRoute<RouteProp<Record<string, Params>, string>>();
	// 앞 화면이 문제 목록을 통째로 넘겨 주기도 하고, 홈·오늘의 퀴즈처럼 주소만 던지고 들어오기도 한다.
	// 목록이 없으면 주소(source/category/modes/count)를 보고 여기서 만들어 채운다.
	const search = useLocalSearchParams<{ source?: string; category?: string; modes?: string; count?: string }>();
	const entryParams = useMemo(
		() => resolveQuizParams(route.params, search),
		// 진입 시 한 번만 정한다 — 풀다가 다시 계산되면 문제가 통째로 갈린다
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);
	// route.params에서 practiceBookId 받기
	const {
		questionPool,
		title,
		mode,
		selectedLevel,
		levelKey,
		isWrongReview,
		selectedCategory: passedCategory,
		isPracticeMode,
		practiceBookId, // ✅ 추가
	} = entryParams;
	const comboAnim = useRef(new Animated.Value(0)).current;
	/** 콤보가 붙은 채로 맞히면 화면 가장자리가 한 번 번쩍인다 (0 → 1 → 0) */
	const comboFlashAnim = useRef(new Animated.Value(0)).current;
	const hasAnsweredRef = useRef(false);
	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const scaleAnim = useRef(new Animated.Value(0)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const scaleAnims = useRef<Animated.Value[]>([]);
	const flatListRef = useRef<FlatList>(null);

	// QuizScreen 함수 내부 state 추가
	const [showCompletionModal, setShowCompletionModal] = useState(false);
	// 판을 끝내지 않고 나가도 푼 만큼은 앱 상태에 남는다
	useEffect(() => () => void flushQuiz(isWrongReview ? 'wrong' : 'category', search.category), [isWrongReview, search.category]);
	/** 이번 판 보너스(번개·콤보) — 완료 모달에 보여 준다 */
	const [quizBonusResult, setQuizBonusResult] = useState<LifeType.QuizBonus | null>(null);
	const [completionData, setCompletionData] = useState({
		correct: 0,
		wrong: 0,
		total: 0,
		accuracy: 0,
	});

	const [questionText, setQuestionText] = useState('');
	const scoreBonusAnim = useRef(new Animated.Value(0)).current;
	// 타이머가 노란색(경고) 구간에 들어오면 힌트 전구가 빛나는 애니메이션
	const hintGlowAnim = useRef(new Animated.Value(0)).current;
	/** 간격 반복 진행 안내 (정답 시 다음 복습 예정) — 같은 턴에서 읽어야 해 ref 로 보관한다 */
	const reviewFeedbackRef = useRef<{ box: number; due: string } | null>(null);
	const setReviewFeedback = (value: { box: number; due: string } | null) => {
		reviewFeedbackRef.current = value;
	};

	// 문제 카드 등장 애니메이션 — 문제가 바뀔 때마다 살짝 떠오르며 나타난다
	const questionEnterAnim = useRef(new Animated.Value(1)).current;

	useAnimationCleanup(comboAnim, comboFlashAnim, scaleAnim, fadeAnim, scoreBonusAnim, hintGlowAnim, questionEnterAnim);

	/**
	 * 지연 실행 타이머 모음.
	 * 결과 팝업(900ms)·다음 문제 로드(400ms) 같은 지연 호출이 화면을 벗어난 뒤에도 살아 있으면
	 * 사라진 화면에 setState 가 들어가 팝업이 되살아난다. 언마운트 때 한 번에 걷어낸다.
	 */
	const pendingTimersRef = useRef<NodeJS.Timeout[]>([]);
	const runLater = (fn: () => void, ms: number) => {
		pendingTimersRef.current.push(setTimeout(fn, ms));
	};
	const handoff = useModalHandoff();
	const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

	const [question, setQuestion] = useState<MainDataType.ProverbType | null>(null);
	const [options, setOptions] = useState<MainDataType.ProverbType[]>([]);
	const [selected, setSelected] = useState<string | null>(null);
	const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
	const [combo, setCombo] = useState(0);

	const [practiceRecordSaved, setPracticeRecordSaved] = useState(false);
	const [resultMessage, setResultMessage] = useState('');
	const [selectedCategory, setSelectedCategory] = useState<string>('전체'); // 기본값 '전체'
	const [resultTitle, setResultTitle] = useState('');
	const [resultType, setResultType] = useState<'correct' | 'wrong' | 'timeout' | 'done'>('correct');
	// 설정의 '독음 표시'와 연동: 독음 표시 OFF = 퀴즈 한글 숨기기 ON
	const { showHangul, setShowHangul } = useHangulReading();
	const hideCountryName = !showHangul;
	const setHideCountryName = (value: boolean | ((prev: boolean) => boolean)) => {
		const next = typeof value === 'function' ? value(hideCountryName) : value;
		setShowHangul(!next);
	};
	const hideCountryNameRef = useRef(hideCountryName);

	// state 추가 (최상단 state 선언 부분에)
	const [practiceCorrectIds, setPracticeCorrectIds] = useState<number[]>([]);
	const [practiceWrongIds, setPracticeWrongIds] = useState<number[]>([]);
	const [showMeaning, setShowMeaning] = useState(mode === 'blank'); // 빈칸 모드일 경우 true로 초기화

	// 한 문제당 제한 시간과 같아야 한다. 10이면 첫 프레임에 "10초"와 2/3 찬 링이 잠깐 보인다.
	const [remainingTime, setRemainingTime] = useState(30);
	const [quizHistory, setQuizHistory] = useState<MainDataType.UserQuizHistory>({
		correctProverbId: [],
		wrongProverbId: [],
		lastAnsweredAt: DateUtils.now(),
		quizCounts: {},
		badges: [],
		totalScore: 0,
		bestCombo: 0,
	});
	const quizHistoryRef = useRef(quizHistory);
	const [showHintModal, setShowHintModal] = useState(false);
	const [showStartModal, setShowStartModal] = useState(true); // 시작 모달 상태
	const [resultModalVisible, setResultModalVisible] = useState(false);
	const [showExitModal, setShowExitModal] = useState(false);
	const [badgeModalVisible, setBadgeModalVisible] = useState(false);
	const [newlyEarnedBadges, setNewlyEarnedBadges] = useState<MainDataType.UserBadge[]>([]);
	const [confettiKey, setConfettiKey] = useState(0);
	const [showAdBeforeHint, setShowAdBeforeHint] = useState(false);
	// ✅ 현재 문제에서 힌트 광고를 이미 본 경우 재노출 없이 힌트만 표시
	const [hintAdQuestionId, setHintAdQuestionId] = useState<number | null>(null);

	const filteredQuestionPool = useMemo(() => {
		return questionPool.filter((q) => !!q.hanja?.trim() && !!q.hangul?.trim() && !!q.meaning?.trim());
	}, [questionPool]);


	const [showScoreBonus, setShowScoreBonus] = useState(false);
	const [reviewIndex, setReviewIndex] = useState(0);

	const [blankWord, setBlankWord] = useState('');
	const praiseMessages = [
		'정답입니다! 한자어의 고수네요! 🎉\n깊은 뜻을 정확히 이해하고 있습니다!',
		'대단합니다! 완벽한 정답입니다! 🏆\n한자어 마스터까지 얼마 남지 않았습니다!',
		'굿잡! 멋집니다! 💯\n지금까지의 학습이 제대로 빛을 발하고 있네요!',
		'정확한 해석력! 🤓✨\n한자 실력이 날로 늘고 있습니다!',
		'한자어를 쏙쏙 맞히네요! 🌟\n꾸준한 학습의 결과입니다!',
		'👏 대단합니다!\n이 실력이면 고급 한자어도 문제없습니다!',
		'정말 똑똑하군요! 📚\n깊은 의미까지 꿰뚫는 눈을 가졌네요!',
		'정확히 알고 있네요! 🧠\n이제 진정한 한자 도사에 가까워지고 있습니다!',
	];

	const canShowResultModal = useMemo(() => {
		return resultModalVisible && !badgeModalVisible && !showExitModal && !showStartModal && !showHintModal;
	}, [resultModalVisible, badgeModalVisible, showExitModal, showStartModal, showHintModal]);

	useEffect(() => {
		deviceInfoUtils.hardwareBackRemove(navigation); // 뒤로가기 버튼 막기
	}, []);

	useEffect(() => {
		if (badgeModalVisible) {
			setConfettiKey(Math.random()); // key 변경 → 강제 리렌더
		}
	}, [badgeModalVisible]);

	useEffect(() => {
		if (passedCategory) {
			setSelectedCategory(passedCategory);
		}
	}, [passedCategory]);

	// 보기가 바뀌거나 화면을 떠날 때 눌림(press) 스프링이 남아 돌지 않게 정리한다.
	// 값 자체는 renderItem 에서 인덱스별로 채우므로(보기 4개) 여기서는 멈추고 비우기만 한다.
	useEffect(
		() => () => {
			scaleAnims.current.forEach((value) => value.stopAnimation());
			scaleAnims.current = [];
		},
		[options],
	);

	useEffect(() => {
		hideCountryNameRef.current = hideCountryName;
	}, [hideCountryName]);

	useEffect(() => {
		if (isFocused) {
			setShowStartModal(true); // 포커싱 될 때마다 모달 표시
			loadHistory(); // 기록만 먼저 로딩
			// 포커스 해제 시 타이머 제거
			timerRef.current && clearInterval(timerRef.current);
			hasAnsweredRef.current = true; // 중복 응답 방지
		}
		return () => {
			// 🔥 모든 타이머 및 플래그 정리
			timerRef.current && clearInterval(timerRef.current);
			hasAnsweredRef.current = false;
			stopBgm(); // 🎵 화면을 벗어나면 BGM 정리
		};
	}, [isFocused]);

	useEffect(() => {
		if (question) {
			startTimer(); // ✅ question이 실제로 설정된 후 타이머 시작
		}
	}, [question]);
	useEffect(() => {
		return () => {
			// 🔥 컴포넌트 언마운트 시 타이머 종료 (안전망)
			timerRef.current && clearInterval(timerRef.current);
			pendingTimersRef.current.forEach(clearTimeout);
			pendingTimersRef.current = [];
		};
	}, []);

	// 새 문제가 들어오면 문제 카드를 페이드 + 살짝 위로 올리며 보여 준다
	useEffect(() => {
		if (!question) {
			return;
		}
		questionEnterAnim.setValue(0);
		const anim = Animated.timing(questionEnterAnim, {
			toValue: 1,
			duration: 260,
			useNativeDriver: true,
		});
		anim.start();
		return () => anim.stop();
	}, [question, questionEnterAnim]);

	useEffect(() => {
		if (combo > 0) {
			triggerComboAnimation(combo);
		}
	}, [combo]);

	useEffect(() => {
		quizHistoryRef.current = quizHistory;
	}, [quizHistory]);

	useEffect(() => {
		if (!badgeModalVisible) {
			return;
		}
		scaleAnim.setValue(0);
		fadeAnim.setValue(0);
		const anim = Animated.parallel([
			Animated.spring(scaleAnim, {
				toValue: 1,
				useNativeDriver: true,
				bounciness: 14,
			}),
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 300,
				useNativeDriver: true,
			}),
		]);
		anim.start();
		return () => anim.stop(); // 모달이 닫히거나 언마운트되면 진행 중 애니메이션 정리
	}, [badgeModalVisible]);

	const loadFavorites = async () => {
		try {
			const stored = await AsyncStorage.getItem(MainStorageKeyType.FAVORITES_STORAGE_KEY);
			if (stored) {
				// ✅ FavoriteItem[] 파싱 후 id만 추출
				const favorites: { id: number; addedAt: number }[] = JSON.parse(stored);
				setFavoriteIds(favorites.map((item) => item.id));
			} else {
				setFavoriteIds([]);
			}
		} catch (e) {
			console.error('즐겨찾기 로드 실패', e);
		}
	};
	// 앱 진입 시 즐겨찾기 로드
	useEffect(() => {
		loadFavorites();
	}, []);

	const startQuiz = async () => {
		playWhoosh(); // 🎬 퀴즈 시작 사운드
		startBgm('quiz'); // 🎵 퀴즈 BGM 시작
		setRemainingTime(30);
		await loadHistory();

		await loadQuestion();
		setShowStartModal(false);
	};

	const loadQuestion = async () => {
		hasAnsweredRef.current = false;

		const solvedSet = isPracticeMode
			? new Set([...practiceCorrectIds, ...practiceWrongIds])
			: new Set(
					isWrongReview ? quizHistory.correctProverbId : [...quizHistory.correctProverbId, ...quizHistory.wrongProverbId],
				);

		if (question?.id) {
			solvedSet.add(question.id);
		}

		const remainingQuestions = filteredQuestionPool.filter((q) => !solvedSet.has(q.id));

		// ✅ 퀴즈 완료 처리 (연습 모드 & 일반 모드 모두)
		if (remainingQuestions.length === 0) {

			// 연습 모드일 때만 기록 저장
			if (isPracticeMode && practiceBookId) {
				await savePracticeRecord();
			}

			const data = calculateCompletionData();
			setCompletionData(data);

			playFinish(); // 🎉 퀴즈 완료 사운드
			// 모아 둔 정오답을 앱 상태로 넘긴다 (코인·경험치·오답 노트) — 돌아온 보너스는 완료 모달에 보여 준다
			setQuizBonusResult(flushQuiz(isWrongReview ? 'wrong' : 'category', search.category));
			setShowCompletionModal(true);
			return;
		}

		const newQuestion = remainingQuestions[Math.floor(Math.random() * remainingQuestions.length)];

		// 오답 보기는 걸러 낸 풀에서 뽑는다. questionPool 을 그대로 쓰면 한자·뜻이 빈 항목이 섞여
		// 빈칸 모드에서 글자 없는 보기가 나온다.
		const distractors = filteredQuestionPool
			.filter((q) => q.id !== newQuestion.id)
			.sort(() => Math.random() - 0.5)
			.slice(0, 3);

		let options: MainDataType.ProverbType[] = [];
		let displayText = '';

		if (mode === 'meaning') {
			options = [...distractors, newQuestion];
			displayText = hideCountryNameRef.current ? `${newQuestion.hanja}` : `${newQuestion.hangul}(${newQuestion.hanja})`;
		} else if (mode === 'proverb') {
			options = [...distractors, newQuestion];
			displayText = newQuestion.meaning!;
		} else if (mode === 'example') {
			options = [...distractors, newQuestion];
			const examples = getProverbExamples(newQuestion.example);
			displayText = examples.some((example) => example.includes(newQuestion.hangul))
				? examples
						// 빈칸 길이를 단어 길이에 맞춘다 — 원본은 네 글자 성어라 '◯◯◯◯' 로 고정돼 있었다
						.map((example) => `- ${example.replace(new RegExp(newQuestion.hangul, 'g'), '◯'.repeat(newQuestion.hangul.length))}`)
						.join('\n')
				: `"${newQuestion.meaning}" — 이 뜻을 가진 한자어는?`;
		} else if (mode === 'blank') {
			const correctWord = pickBlankWord(newQuestion.hanja);
			setBlankWord(correctWord);
			displayText = newQuestion.hanja.replace(correctWord, '(_)');

			// 겹치는 글자·모자란 개수는 buildBlankChoices 가 정리한다 (QuizOptionUtils)
			options = buildBlankChoices(
				correctWord,
				distractors.map((d) => pickBlankWord(d.hanja)),
				filteredQuestionPool.flatMap((q) => [...q.hanja]).sort(() => Math.random() - 0.5),
			)
				.sort(() => Math.random() - 0.5)
				.map((word, index) => ({
					id: index,
					hanja: word,
					hangul: word,
					meaning: '',
					level: newQuestion.level,
				})) as MainDataType.ProverbType[];
		}

		setQuestionText(displayText);
		const shuffledOptions = [...options].sort(() => Math.random() - 0.5);

		runLater(() => {
			setQuestion(newQuestion);
			if (mode === 'blank') {
				setOptions(shuffledOptions);
			} else {
				const blankedOptions = shuffledOptions.map((opt) => {
					const blank = pickBlankWord(opt.hanja ?? '');
					return {
						...opt,
						blankedHanja: opt.hanja?.replace(blank, '(____)'),
					};
				});
				setOptions(blankedOptions);
			}
			setSelected(null);
			setIsCorrect(null);
			setRemainingTime(30);
			flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
		}, 50);
	};
	const pickBlankWord = (proverb: string) => {
		if (!proverb) {
			return '';
		}
		const chars = proverb.split('');
		const index = Math.floor(Math.random() * chars.length);
		return chars[index];
	};

	const loadHistory = async (): Promise<void> => {
		const stored = await AsyncStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed: MainDataType.UserQuizHistory = JSON.parse(stored);

			const safeParsed: MainDataType.UserQuizHistory = {
				correctProverbId: parsed.correctProverbId || [],
				wrongProverbId: parsed.wrongProverbId || [],
				lastAnsweredAt: parsed.lastAnsweredAt ? new Date(parsed.lastAnsweredAt) : DateUtils.now(),
				quizCounts: parsed.quizCounts || {},
				badges: parsed.badges || [],
				totalScore: parsed.totalScore || 0,
				bestCombo: parsed.bestCombo || 0,
			};
			setQuizHistory(safeParsed);
		}
	};

	const handleSelect = async (
		selectedCapital: string,
		selectedCountry: MainDataType.ProverbType,
		isTimeout: boolean = false,
	) => {
		if (hasAnsweredRef.current) {
			return;
		}

		hasAnsweredRef.current = true;

		if (isWrongReview) {
			setReviewIndex((prev) => prev + 1);
		}

		if (timerRef.current) {
			clearInterval(timerRef.current);
		}

		const correct = isTimeout
			? false
			: mode === 'blank'
				? selectedCountry.hanja === blankWord
				: selectedCountry.id === question?.id;

		setSelected(selectedCapital);
		setIsCorrect(correct);

		// 앱 상태(코인·오답 노트)로 넘길 기록을 모아 둔다 — 판이 끝날 때 한 번에 반영된다
		// 한 문제 30초 중 3초 안에 맞히면 번개 보너스
		if (question?.id) {
			bridgeAnswer(question.id, mode, correct, remainingTime >= 27);
		}

		// 🔊 정답/오답/시간초과 효과음
		if (isTimeout) {
			playTimeout();
		} else if (correct) {
			playCorrect();
		} else {
			playWrong();
		}

		const newCombo = correct ? combo + 1 : 0;

		// ✅ 연습 모드 처리
		if (isPracticeMode) {
			setCombo(newCombo);

			if (question?.id) {
				if (correct) {
					setPracticeCorrectIds((prev) => (prev.includes(question.id) ? prev : [...prev, question.id]));
				} else {
					setPracticeWrongIds((prev) => (prev.includes(question.id) ? prev : [...prev, question.id]));
				}
			}

			if (correct) {
				setShowScoreBonus(true);
				scoreBonusAnim.setValue(0);
				triggerComboAnimation(newCombo);
				Animated.timing(scoreBonusAnim, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: true,
				}).start(({ finished }) => {
					// 정리(stop) 로 끝난 경우엔 이미 사라진 화면이라 setState 하지 않는다
					finished && setShowScoreBonus(false);
				});
			} else {
				setCombo(0);
			}

			setResultType(isTimeout ? 'timeout' : correct ? 'correct' : 'wrong');
			const title = isTimeout ? '⏰ 시간 초과!' : correct ? '🎉 정답입니다!' : '😢 오답입니다';
			const message =
				(isTimeout
					? '시간 초과로 오답 처리됐습니다!'
					: correct
						? praiseMessages[Math.floor(Math.random() * praiseMessages.length)]
						: '앗, 다음엔 맞힐 수 있습니다!') + (correct ? '' : answerHint(question, mode, blankWord));

			setResultMessage(message);
			setResultTitle(title);

			runLater(() => {
				setResultModalVisible(true);
			}, 900);

			return;
		}

		// ⬇️ 일반 모드 (기존 로직 유지하되 완료 체크 제거)
		// 시도 횟수는 '문제'의 id 로 세야 한다. 보기의 id(빈칸 모드에선 0~3인 임시값)로 세면 기록이 망가진다.
		const newQuizCounts = { ...quizHistory.quizCounts };
		if (question?.id !== undefined) {
			newQuizCounts[question.id] = (newQuizCounts[question.id] || 0) + 1;
		}

		// ── 오답 간격 반복(Leitner) ─────────────────────────────
		// 예전에는 복습에서 한 번만 맞혀도 목록에서 바로 지웠다. 우연히 맞힌 문제까지 사라져
		// 실제로 외웠는지 확인할 수 없었으므로, 박스3을 통과해야 목록에서 빠지게 한다.
		let wrongProverbIds = [...quizHistory.wrongProverbId];
		if (question?.id) {
			const todayStr = DateUtils.getLocalDateString();
			// 오답 목록에는 있는데 일정이 없는 문제(기능 도입 전 오답)를 먼저 채운다.
			// 이걸 빼먹으면 일반 퀴즈에서 한 번 맞힌 것만으로 오답 목록에서 사라져 간격 반복이 무의미해진다.
			const schedule = backfillSchedule(await loadSchedule(), quizHistory.wrongProverbId, todayStr);

			if (correct) {
				if (isWrongReview) {
					bumpActivity('wrongReview'); // 요일 미션(목요일) 진행도
				}
				const result = applyCorrect(schedule, question.id, todayStr);
				await saveSchedule(result.schedule);
				setReviewFeedback(
					result.graduated
						? null
						: { box: result.box, due: result.schedule[String(question.id)]?.due ?? todayStr },
				);
				// 졸업(박스3 통과)했을 때만 오답 목록에서 제거한다
				if (result.graduated) {
					wrongProverbIds = wrongProverbIds.filter((code) => code !== question.id);
				}
			} else {
				// 오답 방패 — 아직 오답 노트에 없던 문제라면 이번 판에는 올리지 않는다.
				// 이미 노트에 있던 문제(복습 중)는 원래 규칙대로 단계를 되돌린다.
				const shielded = isWrongGuardActive() && !wrongProverbIds.includes(question.id);
				if (!shielded) {
					await saveSchedule(applyWrong(schedule, question.id, todayStr));
					if (!wrongProverbIds.includes(question.id)) {
						wrongProverbIds.push(question.id);
					}
				}
				setReviewFeedback(null);
			}
		}

		let updatedCorrectCountries =
			question?.id && correct && !quizHistory.correctProverbId.includes(question.id)
				? [...quizHistory.correctProverbId, question.id]
				: [...quizHistory.correctProverbId];

		if (isWrongReview && correct && question?.id && !updatedCorrectCountries.includes(question.id)) {
			updatedCorrectCountries = [...updatedCorrectCountries, question.id];
		}

		const updatedHistory: MainDataType.UserQuizHistory = {
			...quizHistory,
			correctProverbId: updatedCorrectCountries,
			wrongProverbId: wrongProverbIds,
			quizCounts: newQuizCounts,
			lastAnsweredAt: DateUtils.now(),
			totalScore: quizHistory.totalScore + (correct ? 10 : 0),
			bestCombo: correct ? Math.max(newCombo, quizHistory.bestCombo || 0) : quizHistory.bestCombo,
			badges: quizHistory.badges ?? [],
		};

		let finalHistory = updatedHistory;
		const allCountries = ProverbServices.selectProverbList();
		const newBadges = QuizBadgeInterceptor(updatedHistory, allCountries);

		if (newBadges.length > 0) {
			const earnedBadgeObjects = newBadges
				.map((id) => CONST_BADGES.find((b) => b.id === id))
				.filter(Boolean) as MainDataType.UserBadge[];

			const levelUp = checkScoreLevelUp(updatedHistory.totalScore, quizHistory.badges ?? []);

			// 등급 뱃지 id 는 score_400 처럼 일반 점수 뱃지와 같다 — 이미 목록에 있으면 또 넣지 않는다
			const levelBadge: MainDataType.UserBadge | null = levelUp?.id && !newBadges.includes(levelUp.id)
				? {
						id: levelUp.id,
						name: levelUp.name,
						description: levelUp.description,
						iconType: 'fontAwesome6',
						icon: levelUp.icon,
						type: 'quiz',
						condition: '점수 등급 달성',
						rarity: 'legendary',
						mascotImage: levelUp.mascotImage,
					}
				: null;

			setNewlyEarnedBadges(levelBadge ? [...earnedBadgeObjects, levelBadge] : [...earnedBadgeObjects]);
			setBadgeModalVisible(true);

			finalHistory = {
				...updatedHistory,
				badges: [...new Set([...updatedHistory.badges, ...newBadges])],
			};

			setQuizHistory(finalHistory);
			quizHistoryRef.current = finalHistory;
			setCombo(newCombo);
			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(finalHistory));

			// ❌ 제거: 뱃지 모달 후 완료 체크 중복 로직 삭제
			// 뱃지 모달이 닫힐 때 loadQuestion이 호출되면서 자동으로 완료 체크됨

			return;
		}

		if (correct) {
			setShowScoreBonus(true);
			scoreBonusAnim.setValue(0);
			setCombo(newCombo);
			triggerComboAnimation(newCombo);
			Animated.timing(scoreBonusAnim, {
				toValue: 1,
				duration: 1000,
				useNativeDriver: true,
			}).start(({ finished }) => {
				finished && setShowScoreBonus(false);
			});
		} else {
			setCombo(0);
		}

		setQuizHistory(finalHistory);
		await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(finalHistory));

		setResultType(isTimeout ? 'timeout' : correct ? 'correct' : 'wrong');
		if (isFocused && newBadges.length === 0) {
			const title = isTimeout ? '⏰ 시간 초과!' : correct ? '🎉 정답입니다!' : '😢 오답입니다';
			const baseMessage =
				(isTimeout
					? '시간 초과로 오답 처리됐습니다!'
					: correct
						? praiseMessages[Math.floor(Math.random() * praiseMessages.length)]
						: '앗, 다음엔 맞힐 수 있습니다!') + (correct ? '' : answerHint(question, mode, blankWord));

			// 오답 복습에서는 간격 반복 진행 상황을 함께 알려 준다
			let message = baseMessage;
			if (isWrongReview) {
				const todayStr = DateUtils.getLocalDateString();
				if (correct && reviewFeedbackRef.current) {
					const { box, due } = reviewFeedbackRef.current;
					message = `${baseMessage}\n복습 ${box}단계로 올라갔습니다 · ${describeDue(due, todayStr)}`;
				} else if (correct) {
					message = `${baseMessage}\n${MAX_BOX}단계까지 통과! 오답 목록에서 빠졌습니다 🎓`;
				} else {
					message = `${baseMessage}\n1단계로 돌아가 내일 다시 만나요`;
				}
			}

			setResultMessage(message);
			setResultTitle(title);

			runLater(() => {
				setResultModalVisible(true);
			}, 900);
		}
	};

	// safelyGoBack 함수에서 수정
	const safelyGoBack = async () => {
		try {
			// ✅ 저장되지 않았을 때만 저장
			if (isPracticeMode && practiceBookId && !practiceRecordSaved) {
				await savePracticeRecord();
			}

			setShowStartModal(false);
			setShowHintModal(false);
			setShowExitModal(false);
			setResultModalVisible(false);
			setBadgeModalVisible(false);

			hasAnsweredRef.current = false;
			clearInterval(timerRef.current!);
			Keyboard.dismiss();
			setSelected(null);
			setIsCorrect(null);
			setQuestion(null);

			if (isPracticeMode) {
				// @ts-ignore
				navigation.navigate(MY_PROVERB_BOOK);
			} else {
				// @ts-ignore
				navigation.navigate(Paths.MAIN_TAB, { screen: Paths.HOME });
			}
		} catch (error) {
			console.error('safeGoBack error:', error);
			navigation.goBack();
		}
	};

	const calculateCompletionData = useCallback(() => {

		// 일반 모드에서 전체 기록 길이를 쓰면 이번 퀴즈(레벨/카테고리)와 무관한 숫자가 나온다.
		// 이번에 출제된 문제 풀 안에서만 센다.
		const poolIds = new Set(filteredQuestionPool.map((p) => p.id));
		const correct = isPracticeMode
			? practiceCorrectIds.length
			: quizHistory.correctProverbId.filter((id) => poolIds.has(id)).length;
		const wrong = isPracticeMode
			? practiceWrongIds.length
			: quizHistory.wrongProverbId.filter((id) => poolIds.has(id)).length;
		const total = correct + wrong;
		const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

		return { correct, wrong, total, accuracy };
	}, [isPracticeMode, practiceCorrectIds, practiceWrongIds, quizHistory, filteredQuestionPool]);

	// 연습 기록 저장 함수 추가
	// 연습 기록 저장 함수 수정
	// 연습 기록 저장 함수 수정
	// QuizScreen에서 퀴즈 종료 시
	// ✅ 수정 (파라미터 없이 state 사용)
	const savePracticeRecord = async () => {
		try {
			if (!practiceBookId || practiceRecordSaved) {
				return;
			}

			const correctCount = practiceCorrectIds.length;
			const wrongCount = practiceWrongIds.length;


			if (correctCount + wrongCount === 0) {
				return;
			}

			const json = await AsyncStorage.getItem(USER_PROVERB_PRACTICE_RECORDS);
			const records: MainDataType.ProverbBookPracticeRecord[] = json ? JSON.parse(json) : [];

			const existingIndex = records.findIndex((r) => r.bookId === practiceBookId);
			const newAttempt: MainDataType.ProverbBookPracticeAttempt = {
				timestamp: DateUtils.now().toISOString(),
				correctCount,
				wrongCount,
				accuracy: Math.round((correctCount / (correctCount + wrongCount)) * 100),
			};


			if (existingIndex >= 0) {
				const updated = { ...records[existingIndex] };
				updated.attempts = [newAttempt, ...updated.attempts]; // ✅ slice 제거
				records[existingIndex] = updated;
			} else {
				records.push({
					bookId: practiceBookId,
					proverbIds: questionPool.map((p) => p.id),
					attempts: [newAttempt],
				});
			}

			await AsyncStorage.setItem(USER_PROVERB_PRACTICE_RECORDS, JSON.stringify(records));
			setPracticeRecordSaved(true); // ✅ 저장 완료 플래그 설정
		} catch (error) {
			console.error('❌ savePracticeRecord 에러:', error);
		}
	};
	const scoreBonusStyle = {
		opacity: scoreBonusAnim.interpolate({
			inputRange: [0, 1],
			outputRange: [1, 0],
		}),
		transform: [
			{
				translateY: scoreBonusAnim.interpolate({
					inputRange: [0, 1],
					outputRange: [0, -80], // 위로 더 멀리
				}),
			},
			{
				scale: scoreBonusAnim.interpolate({
					inputRange: [0, 0.3, 1],
					outputRange: [1, 1.5, 1], // 커졌다가 사라짐
				}),
			},
		],
		position: 'absolute',
		top: scaleHeight(-30),
	};

	const startTimer = () => {
		if (!question || hasAnsweredRef.current) {
			return;
		}

		if (timerRef.current) {
			clearInterval(timerRef.current);
		}
		// 업데이터는 숫자만 줄인다 — 안에서 채점까지 하면 업데이터가 두 번 실행될 때 시간초과가 두 번 걸린다
		timerRef.current = setInterval(() => {
			setRemainingTime((prev) => Math.max(prev - 1, 0));
		}, 1000);
	};

	// 시간이 0이 되면 채점(시간초과)은 여기서 한 번만 처리한다
	useEffect(() => {
		if (remainingTime > 0 || !question || hasAnsweredRef.current) {
			return;
		}
		if (timerRef.current) {
			clearInterval(timerRef.current);
		}
		setShowHintModal(false);
		if (isFocused) {
			handleSelect('', question, true);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [remainingTime, question, isFocused]);

	// 앱이 백그라운드로 가면 타이머를 멈추고, 돌아오면 이어서 센다.
	// (화면 이동은 위 isFocused 효과가 이미 정리한다)
	useEffect(() => {
		if (!isActive) {
			timerRef.current && clearInterval(timerRef.current);
			return;
		}
		if (question && !hasAnsweredRef.current) {
			startTimer();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isActive]);

	// ⏱️ 마지막 5초 카운트다운 효과음 (setState 업데이터는 순수해야 하므로 여기서 재생)
	useEffect(() => {
		if (remainingTime > 0 && remainingTime <= 5 && !hasAnsweredRef.current && !!question) {
			playTick();
		}
	}, [remainingTime, question]);

	// ⏱ 타이머가 노란색 구간(<=15초)에 들어오면 힌트 전구 글로우 시작 / 벗어나면 정지
	// remainingTime 을 그대로 의존성에 두면 1초마다 정리→재시작이 돌아 깜빡임만 남는다.
	// 구간 진입 여부(boolean)만 의존성으로 두어 루프를 한 번 켜고 한 번 끈다.
	const inHintWarning = remainingTime <= 15 && remainingTime > 0 && !selected && !!question;
	useEffect(() => {
		if (!inHintWarning) {
			return;
		}
		hintGlowAnim.setValue(0);
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(hintGlowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
				Animated.timing(hintGlowAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
			]),
		);
		loop.start();
		return () => {
			loop.stop();
			hintGlowAnim.setValue(0);
		};
	}, [inHintWarning, hintGlowAnim]);

	/**
	 * 정답 연출 — 콤보 칸이 튀고, 보상이 두 배가 되는 구간부터는 화면 가장자리까지 번쩍인다.
	 * 콤보로 코인이 두 배가 되는데 화면이 조용해서 그 사실이 전달되지 않았다.
	 */
	const triggerComboAnimation = (comboCount: number) => {
		comboAnim.setValue(0);
		Animated.sequence([
			Animated.timing(comboAnim, {
				toValue: 1,
				duration: 300,
				useNativeDriver: true,
			}),
			Animated.timing(comboAnim, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true,
			}),
		]).start();

		if (comboCount < REWARD.comboFrom) {
			return;
		}
		comboFlashAnim.setValue(0);
		Animated.sequence([
			Animated.timing(comboFlashAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
			Animated.timing(comboFlashAnim, { toValue: 0, duration: 460, useNativeDriver: true }),
		]).start();
	};

	const getSolvedCount = () => {
		// ✅ 연습 모드일 때는 임시 state 사용
		if (isPracticeMode) {
			return practiceCorrectIds.length + practiceWrongIds.length;
		}

		if (isWrongReview) {
			return reviewIndex;
		}

		if (!quizHistory || !filteredQuestionPool.length) {
			return 0;
		}

		const solvedSet = new Set([...(quizHistory.correctProverbId ?? []), ...(quizHistory.wrongProverbId ?? [])]);
		const filteredSolved = filteredQuestionPool.filter((p) => solvedSet.has(p.id));
		return filteredSolved.length;
	};

	const getModeLabel = (mode: 'meaning' | 'proverb' | 'blank' | 'example') => {
		switch (mode) {
			case 'meaning':
				return '뜻 맞추기';
			case 'proverb':
				return '한자어 맞추기';
			case 'blank':
				return '빈칸 채우기';
			case 'example':
				return '예문 빈칸';
			default:
				return '';
		}
	};

	// 컴포넌트 내부 상단
	const getDisplayQuestionText = () => {
		if (!question) {
			return '문제를 불러오는 중...';
		}

		switch (mode) {
			case 'blank':
				return questionText || '빈칸 문제 오류';
			case 'example':
				return questionText || question.meaning || '예문 정보 없음';
			case 'meaning':
				if (hideCountryName) {
					return question.hanja || '한자 없음';
				} else {
					const hangul = question.hangul || '발음 없음';
					const hanja = question.hanja || '한자 없음';
					return `${hangul}(${hanja})`;
				}
			default:
				return question.meaning || '뜻 정보 없음';
		}
	};
	const handleRetry = useCallback(async () => {
		// 새 판이므로 앱 상태로 못 넘긴 기록은 버린다
		resetQuizBuffer();
		// 연습 모드 임시 기록 초기화
		setPracticeCorrectIds([]);
		setPracticeWrongIds([]);
		setPracticeRecordSaved(false);

		// 일반 모드는 퀴즈 히스토리의 해당 문제들만 초기화
		if (!isPracticeMode) {
			const stored = await AsyncStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed: MainDataType.UserQuizHistory = JSON.parse(stored);
				const poolIds = new Set(filteredQuestionPool.map((q) => q.id));

				const updated: MainDataType.UserQuizHistory = {
					...parsed,
					correctProverbId: parsed.correctProverbId.filter((id) => !poolIds.has(id)),
					wrongProverbId: parsed.wrongProverbId.filter((id) => !poolIds.has(id)),
				};

				await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
				setQuizHistory(updated);
			}
		}

		// 공통 초기화
		setSelected(null);
		setIsCorrect(null);
		setCombo(0);
		setQuestion(null);
		hasAnsweredRef.current = false;
		setRemainingTime(30);

		// 바로 다음 문제 로드
		runLater(() => {
			loadQuestion();
		}, 100);
	}, [isPracticeMode, filteredQuestionPool]);

	return (
		<>
			{/* 상단 안전영역은 전역 배너(GlobalBannerAd)가 이미 확보한다 — 여기서 top 을 또 쓰면 여백이 두 번 들어간다 */}
			<SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['left', 'right']}>
				<View style={styles.container}>
					<View style={{ flex: 1 }}>
						<View style={styles.container}>
							<View style={styles.inner}>
								<View style={[styles.progressStatusWrapper]}>
									<View
										style={{
											flexDirection: 'row',
											justifyContent: 'space-between',
											alignItems: 'center',
											marginBottom: SpacingV.sm,
										}}
									>
										<View style={{ flexDirection: 'row', alignItems: 'center' }}>
											{isPracticeMode && (
												<IconComponent type='materialCommunityIcons' name='book-open-variant' size={scaledSize(15)} color={Colors.textSecondary} style={styles.modeLeadIcon} />
											)}
											<Text style={styles.progressText}>
												{getModeLabel(mode)}
												{isPracticeMode && ' (연습)'}
											</Text>
											{/* 난이도·분야 배지 — 서로 독립이다 (난이도가 비어도 분야는 나와야 한다) */}
											<View style={styles.metaChipRow}>
												{!!question?.level && (
													<LevelBadge level={question.level} />
												)}
												{!!question?.category && (
													<CategoryBadge category={question.category} />
												)}
											</View>
										</View>

										{/* 오른쪽: 진행률 표시 */}
										<Text style={styles.progressText}>
											{isPracticeMode
												? `${practiceCorrectIds.length + practiceWrongIds.length}/${filteredQuestionPool.length}`
												: `${getSolvedCount()}/${filteredQuestionPool.length}`}
										</Text>
									</View>

									<View style={styles.progressBarWrapper}>
										<View
											style={[
												styles.progressBarFill,
												{
													// 풀이 비어 있으면 0으로 나눠 NaN% 가 되고 진행바가 깨진다.
													width: `${
														filteredQuestionPool.length === 0
															? 0
															: ((isPracticeMode
																	? practiceCorrectIds.length + practiceWrongIds.length
																	: getSolvedCount()) /
																	filteredQuestionPool.length) *
																100
													}%`,
												},
											]}
										/>
									</View>

									<View style={styles.statusCardRow}>
										<View style={styles.statusCard}>
											<View style={[styles.statusCardIcon, { backgroundColor: Colors.secondarySoft }]}>
												<IconComponent type='materialIcons' name='quiz' size={scaledSize(16)} color={Colors.secondaryDark} />
											</View>
											<Text style={styles.statusCardTitle}>푼 퀴즈</Text>
											<Text style={styles.statusCardValue}>
												{isPracticeMode ? practiceCorrectIds.length + practiceWrongIds.length : getSolvedCount()}
												<Text style={styles.statusCardUnit}>개</Text>
											</Text>
										</View>
										<View style={styles.statusCard}>
											<View style={[styles.statusCardIcon, { backgroundColor: Colors.primarySoft }]}>
												<IconComponent type='materialIcons' name='star' size={scaledSize(16)} color={Colors.primary} />
											</View>
											<Text style={styles.statusCardTitle}>총점</Text>
											<View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
												<Text style={styles.statusCardValue}>
													{isPracticeMode ? practiceCorrectIds.length * 10 : quizHistory.totalScore}
													<Text style={styles.statusCardUnit}>점</Text>
												</Text>

												{showScoreBonus && (
													//@ts-ignore
													<Animated.Text style={[styles.scoreBonusText, scoreBonusStyle]}>+10점!</Animated.Text>
												)}
											</View>
										</View>
										<View style={[styles.statusCard, combo >= COMBO_HOT && styles.statusCardHot]}>
											<View style={[styles.statusCardIcon, { backgroundColor: Colors.warningSoft }]}>
												<IconComponent
													type='materialCommunityIcons'
													name='fire'
													size={scaledSize(16)}
													color={combo > 0 ? Colors.accentOrange : Colors.textMuted}
												/>
											</View>
											<Text style={styles.statusCardTitle}>콤보</Text>
											<Animated.View
												style={{
													transform: [
														{
															scale: comboAnim.interpolate({
																inputRange: [0, 1],
																outputRange: [1, 1.5],
															}),
														},
													],
												}}
											>
												<Text style={[styles.statusCardValue, { color: combo > 0 ? Colors.accentOrange : Colors.text }]}>
													{combo}
													<Text style={styles.statusCardUnit}>{combo >= REWARD.comboFrom ? ' Combo ×2' : ' Combo'}</Text>
												</Text>
											</Animated.View>
										</View>
									</View>
								</View>
								<Animated.View
									style={[
										styles.quizBox,
										{
											opacity: questionEnterAnim,
											transform: [
												{ translateY: questionEnterAnim.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(10), 0] }) },
											],
										},
									]}
								>
									{/* ✅ 한글 숨기기 토글: 작게, 우상단 최상단 */}
									{mode !== 'blank' && (
										<TouchableOpacity
											onPress={() => setHideCountryName((prev) => !prev)}
											style={styles.nameToggleChip}
											hitSlop={HitSlop}
										>
											<IconComponent
												type='MaterialIcons'
												name={hideCountryName ? 'visibility-off' : 'visibility'}
												size={scaledSize(13)}
												color={hideCountryName ? Colors.secondaryDark : Colors.textMuted}
												style={{ marginRight: Spacing.xs }}
											/>
											<Text style={[styles.nameToggleLabel, hideCountryName && { color: Colors.secondaryDark, fontWeight: FontWeight.bold }]}>
												{hideCountryName ? '한글 표시' : '한글 숨기기'}
											</Text>
										</TouchableOpacity>
									)}
									{/* 타이머 */}
									<View style={styles.headerBox}>
										<CircularProgress
											size={scaleWidth(70)} // ✅ 기존 90 → 70
											width={scaleWidth(6)} // ✅ 기존 8 → 6
											fill={((30 - remainingTime) / 30) * 100}
											tintColor={remainingTime > 15 ? Colors.secondaryDark : remainingTime > 7 ? Colors.warning : Colors.error}
											backgroundColor={Colors.surfaceAlt}
											duration={1000}
										>
											{() => (
												<Text
													style={[
														styles.timerText,
														{ color: remainingTime > 15 ? Colors.secondaryDark : remainingTime > 7 ? Colors.warning : Colors.error },
													]}
												>
													{remainingTime}초
												</Text>
											)}
										</CircularProgress>
									</View>
									{/* 문제 판 — 무엇을 묻는지 먼저 읽히고, 그 아래 큰 글씨로 문제가 온다 */}
									<View style={styles.questionPanel}>
										<View style={styles.questionAskRow}>
											{/* 안드로이드에서 <Text> 중첩은 글자 크기가 제멋대로 줄어드는 원인이라 한 겹으로 편다 */}
											<Text style={styles.titleText}>
												{question
													? mode === 'meaning'
														? '무슨 의미일까요?'
														: mode === 'proverb'
															? '무슨 한자어일까요?'
															: mode === 'blank'
																? '빈칸은 무엇일까요?'
																: mode === 'example'
																	? '빈칸에 들어갈 한자어는?'
																	: ''
													: '한자어를 찾고 있습니다...'}
											</Text>
											{question && (
												<TouchableOpacity hitSlop={HitSlop}
													onPress={() => {
														if (timerRef.current) {
															clearInterval(timerRef.current);
														}
														// 같은 문제에서 이미 광고를 봤다면 광고 없이 바로 힌트 표시
														if (question && hintAdQuestionId === question.id) {
															setShowHintModal(true);
														} else {
															setHintAdQuestionId(question?.id ?? null);
															setShowAdBeforeHint(true);
														}
													}}
												>
													<View style={styles.hintIconWrap}>
														<Animated.View
															style={[
																styles.hintGlow,
																{
																	opacity: hintGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }),
																	transform: [{ scale: hintGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.6] }) }],
																},
															]}
														/>
														<Animated.View
															style={{
																transform: [{ scale: hintGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
															}}
														>
															<IconComponent
																type='MaterialIcons'
																name={remainingTime <= 15 ? 'lightbulb' : 'lightbulb-outline'}
																size={scaledSize(20)}
																color={Colors.warning}
																style={styles.titleIcon}
															/>
														</Animated.View>
													</View>
												</TouchableOpacity>
											)}
										</View>

										{/* 문제 — 화면의 주인공. 글자 수에 맞춰 크기를 잡아 한자어는 크게, 예문은 판 안에 들어오게 한다 */}
										<Text
											style={[
												styles.questionText,
												questionTextSize(getDisplayQuestionText()),
												// 한자가 담기는 모드에만 한자 서체를 얹는다 (한글 문장에는 얹지 않는다)
												(mode === 'meaning' || mode === 'blank') && styles.hanjaFace,
											]}>
											{getDisplayQuestionText()}
										</Text>

										{mode === 'blank' && question?.meaning && (
											<>
												<TouchableOpacity onPress={() => setShowMeaning((prev) => !prev)} style={styles.meaningToggle} activeOpacity={0.85}>
													<IconComponent
														type='materialCommunityIcons'
														name={showMeaning ? 'eye-off-outline' : 'eye-outline'}
														size={scaledSize(15)}
														color={Colors.primaryDark}
													/>
													<Text style={styles.meaningToggleText}>{showMeaning ? '의미 감추기' : '의미 보기'}</Text>
												</TouchableOpacity>

												{showMeaning && (
													<Text style={styles.meaningText}>{question.meaning}</Text>
												)}
											</>
										)}
									</View>

									{/* 수도 이름 강조 */}
									<View style={[styles.optionsContainer, { width: '100%', marginTop: SpacingV.xs }]}>
										<FlatList
											data={options}
											ref={flatListRef}
											keyExtractor={(item) => String(item.id)}
											contentContainerStyle={{
												// 보기 네 칸이 한 화면에 들어와야 한다 — 아래 여백을 크게 두면 그만큼 마지막 칸이 밀린다
												paddingBottom: SpacingV.sm,
												flexGrow: 1,
											}}
											// ✅ 유계(bounded) 높이로 남은 공간을 채우며 내부 스크롤 → 안드로이드 태블릿 등에서 D 선택지가 잘리지 않음
											style={{ flex: 1, width: '100%', alignSelf: 'stretch' }}
											nestedScrollEnabled
											showsVerticalScrollIndicator
											renderItem={({ item, index }) => {
												// 렌더마다 새로 만들면 누름 스프링이 정리 목록(scaleAnims)에 안 잡혀 계속 남는다 — ref 에 채워 넣는다
												if (!scaleAnims.current[index]) {
													scaleAnims.current[index] = new Animated.Value(1);
												}
												const scaleAnim = scaleAnims.current[index];

												// ✅ 선택 키를 mode에 따라 분기
												const selectedKey = mode === 'blank' ? item.hanja : item.meaning;
												const isSelected = selected === selectedKey;
												const isAnswerCorrect = isCorrect && isSelected;
												const isAnswerWrong = !isCorrect && isSelected;
												// ✅ 답을 제출한 뒤에는 정답 보기를 항상 초록으로 표시(틀렸을 때도)
												const answered = !!selected;
												// 빈칸 모드의 보기는 id 가 0~3 임시값이라 question.id 와 비교하면 영원히 안 맞는다 — 글자로 비교한다
												const isTheCorrectAnswer = mode === 'blank' ? item.hanja === blankWord : item.id === question?.id;
												const showAsCorrect = answered && isTheCorrectAnswer;
												const showAsWrong = isAnswerWrong;

												// 답을 낸 뒤에는 배지도 카드와 같은 정답/오답 색으로 바꿔 피드백을 한 덩어리로 읽히게 한다
												/**
												 * A~D 배지 색 — 답을 내기 전에는 네 칸 모두 같은 파란 면이다.
												 * 예전에는 파랑·민트·주황·초록 네 색을 돌려 썼는데, 그 초록·주황이 정답 초록과
												 * 난이도 앰버와 같은 색이라 "이미 정답이 켜진 보기" 처럼 보였다.
												 */
												const badgeColor = showAsCorrect ? Colors.success : showAsWrong ? Colors.error : Colors.primarySoft;

												const handlePressIn = () => {
													Animated.spring(scaleAnim, {
														toValue: 0.97,
														useNativeDriver: true,
													}).start();
												};

												const handlePressOut = () => {
													Animated.spring(scaleAnim, {
														toValue: 1,
														useNativeDriver: true,
													}).start();
												};

												return (
													<Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
														<TouchableOpacity
															onPressIn={handlePressIn}
															onPressOut={handlePressOut}
															style={[
																styles.optionCard,
																showAsCorrect && styles.optionCorrectCard,
																showAsWrong && styles.optionWrongCard,
															]}
															// ✅ 선택할 때도 mode에 따라 키를 넘겨줌
															onPress={() => handleSelect(selectedKey, item)}
															disabled={!!selected}
														>
															<View style={styles.optionRow}>
																<View style={[styles.optionBadge, { backgroundColor: badgeColor }]}>
																	<Text style={[styles.optionBadgeText, { color: onSurface(badgeColor) }]}>{['A', 'B', 'C', 'D'][index]}</Text>
																</View>
																<View style={styles.optionTextBox}>
																	<Text style={[styles.optionContent, mode !== 'meaning' && styles.hanjaFace]}>
																		{mode === 'meaning' && item.meaning}
																		{mode === 'proverb' && <>{hideCountryName ? `${item.hanja}` : `${item.hangul} (${item.hanja})`}</>}
																		{mode === 'example' && <>{hideCountryName ? `${item.hanja}` : `${item.hangul} (${item.hanja})`}</>}
																		{mode === 'blank' && item.hanja}
																	</Text>
																</View>
																{(showAsCorrect || showAsWrong) && (
																	<IconComponent
																		type='MaterialIcons'
																		name={showAsCorrect ? 'check-circle' : 'cancel'}
																		size={scaledSize(22)}
																		color={showAsCorrect ? Colors.success : Colors.error}
																	/>
																)}
															</View>
														</TouchableOpacity>
													</Animated.View>
												);
											}}
										/>
									</View>
								</Animated.View>
							</View>
						</View>
						<View style={[styles.bottomExitWrapper, { paddingBottom: insets.bottom + SpacingV.sm }]}>
							<TouchableOpacity
								style={styles.exitButton}
								onPress={() => {
									if (timerRef.current) {
										clearInterval(timerRef.current); // ⏹️ 타이머 정지
									}
									setShowExitModal(true);
								}}
							>
								<Text style={styles.exitButtonText}>퀴즈 종료</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
				{/* 콤보 발광 — 테두리만 빛나 문제와 보기를 가리지 않는다. 터치는 그대로 통과 */}
				<Animated.View pointerEvents="none" style={[styles.comboFlash, { opacity: comboFlashAnim }]} />
				{/* 연속 정답 — 숫자가 크게 튀어 오른다. 보상이 두 배가 되는 구간부터는 그 사실도 함께 띄운다 */}
				<ComboBurst combo={combo} doubleFrom={REWARD.comboFrom} />
			</SafeAreaView>
			<QuizStartModal
				bgmTrack="quiz"
				visible={showStartModal}
				mode={mode}
				isPracticeMode={isPracticeMode}
				timeLimit={30}
				scorePerCorrect={10}
				showHint
				onStart={startQuiz}
				onBack={() => {
					setShowStartModal(false);
					runLater(() => {
						//@ts-ignore
						safelyGoBack();
					}, 200);
				}}
			/>
			{showExitModal && (
				<AppModal visible transparent animationType='fade' onRequestClose={() => { setShowExitModal(false); startTimer(); }}>
					<View style={styles.modalOverlay}>
						<View style={styles.exitModal}>
							<Text style={styles.exitModalTitle}>퀴즈를 종료하시겠어요?</Text>
							<Text style={styles.exitModalMessage}>진행 중인 퀴즈는 저장되지 않습니다.</Text>
							<View style={styles.modalButtonRow}>
								<TouchableOpacity
									style={styles.modalBackButton}
									onPress={() => {
										setShowExitModal(false);
										startTimer(); // ⏱ 타이머 재시작
									}}
								>
									{/* 취소는 옅은 표면 위에 놓이므로 흰 글씨(textInverse)를 쓰면 두 테마 모두 안 보인다 */}
									<Text style={[styles.modalButtonText, { color: Colors.textSecondary }]}>취소</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.exitModalConfirmButton}
									onPress={() => {
										setShowExitModal(false);
										if (isWrongReview) {
											//@ts-ignore
											navigation.replace(Paths.MAIN_TAB, { screen: Paths.HOME });
										} else {
											safelyGoBack();
										}
									}}
								>
									{/* 종료 버튼 면은 error — 다크에서 밝은 살몬이 되어 흰 글씨가 뭉개진다 */}
									<Text style={[styles.modalButtonText, { color: onSurface(Colors.error) }]}>종료하기</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</AppModal>
			)}
			<NewBadgeModal
				visible={badgeModalVisible}
				badges={newlyEarnedBadges}
				onConfirm={() => {
					// 뱃지 모달이 닫히는 도중 완료 모달을 열면 이전 모달이 번쩍인다. 닫힘이 끝난 뒤에 연다.
					handoff(
						() => {
							setBadgeModalVisible(false);
							hasAnsweredRef.current = false;
							setSelected(null);
							setIsCorrect(null);
							setRemainingTime(30);
							setQuestion(null);
						},
						() => {
							const solvedCountries = new Set(
								isWrongReview
									? quizHistoryRef.current.correctProverbId
									: [...quizHistoryRef.current.correctProverbId, ...quizHistoryRef.current.wrongProverbId],
							);

							const remaining = filteredQuestionPool.filter((q) => !solvedCountries.has(q.id));

							if (remaining.length === 0) {
								const data = calculateCompletionData();
								setCompletionData(data);
								playFinish(); // 🎉 퀴즈 완료 사운드
								setShowCompletionModal(true);
							} else {
								loadQuestion();
							}
						},
					);
				}}
			/>
			{showAdBeforeHint && (
				<AdmobFrontAd
					onAdClosed={() => {
						setShowAdBeforeHint(false);
						// 광고 dismiss가 끝난 뒤 모달을 열어야 iOS에서 정상 표시됨
						runLater(() => setShowHintModal(true), 300);
					}}
				/>
			)}
			<QuizHintModal
				visible={showHintModal}
				question={question}
				onClose={() => {
					setShowHintModal(false);
					startTimer(); // 힌트 닫힐 때 타이머 재시작
				}}
			/>
			<QuizCompletionModal
				visible={showCompletionModal}
				isPracticeMode={isPracticeMode}
				correct={completionData.correct}
				wrong={completionData.wrong}
				total={completionData.total}
				accuracy={completionData.accuracy}
				bonus={quizBonusResult}
				onConfirm={() => {
					setShowCompletionModal(false);
					safelyGoBack();
				}}
				onRetry={() => {
					// ✅ 추가
					setShowCompletionModal(false);
					handleRetry();
				}}
			/>
			<QuizResultModal
				visible={canShowResultModal && resultType !== 'done'}
				resultType={resultType as 'correct' | 'wrong' | 'timeout'}
				resultTitle={resultTitle}
				resultMessage={resultMessage}
				question={question}
				mode={mode}
				blankWord={blankWord}
				favoriteIds={favoriteIds} // ✅ 추가
				onToggleFavorite={async () => {
					// ✅ 추가
					if (!question) {
						return;
					}
					try {
						const stored = await AsyncStorage.getItem(MainStorageKeyType.FAVORITES_STORAGE_KEY);
						const favorites: { id: number; addedAt: number }[] = stored ? JSON.parse(stored) : [];
						const exists = favorites.some((f) => f.id === question.id);
						const updated = exists
							? favorites.filter((f) => f.id !== question.id)
							: [...favorites, { id: question.id, addedAt: DateUtils.now().getTime() }];
						await AsyncStorage.setItem(MainStorageKeyType.FAVORITES_STORAGE_KEY, JSON.stringify(updated));
						playPop(); // 🔊 즐겨찾기 저장/해제
						setFavoriteIds(updated.map((f) => f.id));
					} catch (e) {
						console.error('즐겨찾기 토글 실패', e);
					}
				}}
				onNext={() => {
					setResultModalVisible(false);
					runLater(() => {
						loadQuestion();
					}, 400);
				}}
			/>
		</>
	);
};

export default QuizScreen;

const makeStyles = () => StyleSheet.create({
	// 바탕은 한 단계 낮은 면 — 위에 얹는 흰 카드(상태판·보기)가 떠 보인다
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	inner: {
		// 태블릿: 본문을 가운데 한 기둥으로 묶는다 (CharacterGuide 와 같은 폭)
		width: '100%',
		maxWidth: CONTENT_MAX_WIDTH,
		alignSelf: 'center',
		flex: 1,
		justifyContent: 'flex-start',
		alignItems: 'center',
		paddingHorizontal: Spacing.lg,
		paddingTop: SpacingV.sm, // ✅ 위쪽 패딩만 줄임
		paddingBottom: SpacingV.xl, // 아래쪽 여유는 유지
	},
	// 문제와 보기를 담는 자리 — 바탕 위에 그대로 얹는다. 판을 한 겹 더 두면 카드 안의 카드가 된다
	quizBox: {
		width: '100%',
		maxWidth: scaleWidth(420),
		paddingTop: SpacingV.sm,
		alignItems: 'center',
		flex: 1, // ✅ 남은 세로 공간을 모두 차지 → 내부 옵션 리스트가 유계 높이로 스크롤 (D 선택지 짤림 방지)
	},

	option: {
		width: '100%',
		backgroundColor: Colors.surfaceAlt,
		paddingVertical: SpacingV.lg,
		borderRadius: Radius.xl,
		marginVertical: SpacingV.md,
		alignItems: 'center',
	},
	optionCorrect: {
		backgroundColor: Colors.secondarySurface,
	},
	optionWrong: {
		backgroundColor: Colors.error,
	},
	optionContainer: {
		width: '100%',
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
	},
	optionWrap: {
		width: '48%',
		marginVertical: SpacingV.sm,
	},

	backButtonWrapper: {
		position: 'absolute',
		top: scaleHeight(12),
		left: scaleWidth(16),
		zIndex: 10,
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.xs,
	},
	backButtonText: {
		flexShrink: 1,
		fontSize: Typography.body,
		color: Colors.text,
		marginLeft: Spacing.sm,
	},
	headerBox: {
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: SpacingV.xs,
	},
	nameToggleChip: {
		position: 'absolute',
		top: 0,
		right: 0,
		zIndex: 5,
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.sm,
		borderRadius: Radius.lg,
		backgroundColor: Colors.surfaceAlt,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	timerText: {
		fontSize: Typography.subtitle, // 확대
		fontWeight: FontWeight.bold,
		color: Colors.secondaryDark, // ✅ 타이머 = 파란색
	},
	flagImage: {
		width: scaleWidth(140), // 기존 110 → 140
		height: scaleHeight(90), // 기존 72 → 90
		marginVertical: SpacingV.sm,
		borderRadius: Radius.sm,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		backgroundColor: Colors.surface,
	},
	countryName: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.xs,
		minHeight: scaleHeight(26), // ✅ 글자 수 차이 보정
		minWidth: scaleWidth(120), // ✅ '???' 일 때도 영역 유지
		textAlign: 'center', // ✅ 중앙 정렬 고정
	},
	statusBox: {
		marginTop: SpacingV.xxl,
		alignItems: 'center',
		backgroundColor: Colors.surfaceAlt,
		padding: Spacing.md,
		borderRadius: Radius.md,
		width: '100%',
	},
	statusText: {
		fontSize: Typography.body,
		color: Colors.text,
		marginVertical: SpacingV.xxs,
	},
	// 상태 카드 3종은 배열/끝말잇기 퀴즈와 같은 규격을 쓴다 (화면 간 통일)
	statusCardRow: {
		flexDirection: 'row',
		gap: Spacing.sm,
		width: '100%',
	},

	statusCard: {
		flex: 1,
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.md,
		alignItems: 'center',
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.xs,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	/** 콤보가 붙으면 테두리까지 달아오른다 — 연속으로 맞히고 있다는 신호 */
	statusCardHot: {
		borderColor: Colors.accentOrange,
		backgroundColor: Colors.warningSoft,
	},
	statusCardIcon: {
		width: scaleWidth(28),
		height: scaleWidth(28),
		borderRadius: Radius.pill,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: SpacingV.xs,
	},
	statusCardTitle: {
		fontSize: Typography.caption,
		fontWeight: FontWeight.semibold,
		color: Colors.textMuted,
	},
	statusCardUnit: {
		fontSize: Typography.micro,
		fontWeight: FontWeight.semibold,
		color: Colors.textMuted,
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
		fontSize: Typography.callout,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
		marginTop: SpacingV.xxs,
		// 숫자가 바뀔 때 폭이 흔들리지 않게 — 계기판처럼 자리에 못 박아 둔다
		fontVariant: ['tabular-nums'],
	},
	// AppModal 이 화면 전체를 덮으므로 딤도 끝까지 채운다. 위쪽 여백을 주면 카드가 중앙에서 밀린다
	modalOverlay: {
		flex: 1,
		backgroundColor: Colors.scrim,
		justifyContent: 'center',
		alignItems: 'center',
	},
	startModal: {
		backgroundColor: Colors.surface,
		padding: Spacing.xxl,
		borderRadius: Radius.lg,
		width: '85%',
		alignItems: 'center',
	},
	startTitle: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		marginBottom: SpacingV.md,
		color: Colors.text,
	},
	startDescription: {
		marginTop: SpacingV.md,
		fontSize: Typography.bodySm,
		color: Colors.text,
		textAlign: 'center',
		marginBottom: SpacingV.md,
		lineHeight: scaledSize(22),
	},
	modalButtonRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
	},
	modalBackButton: {
		flex: 1,
		backgroundColor: Colors.surfaceAlt,
		padding: SpacingV.md,
		borderRadius: Radius.sm,
		marginRight: Spacing.sm,
		alignItems: 'center',
	},
	modalStartButton: {
		flex: 1,
		backgroundColor: Colors.secondarySurface,
		padding: SpacingV.md,
		borderRadius: Radius.sm,
		marginLeft: Spacing.sm,
		alignItems: 'center',
	},
	modalButtonText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontWeight: FontWeight.semibold,
		fontSize: Typography.callout,
	},
	bottomExitWrapper: {
		width: '100%',
		paddingVertical: SpacingV.sm, // ✅ 기존 14 → 8 (세로 여백 축소)
		alignItems: 'center',
		backgroundColor: Colors.surface,
		borderTopWidth: 1,
		borderTopColor: Colors.surfaceAlt,
		// 하단 여백은 화면에서 insets.bottom 을 더해 준다
	},
	// 텍스트 토큰(textSecondary)을 배경색으로 쓰면 다크에서 밝은 회색이 되어 흰 글씨가 사라진다
	exitButton: {
		backgroundColor: Colors.surfaceAlt,
		paddingVertical: SpacingV.md, // ✅ 기존 12 → 10
		paddingHorizontal: Spacing.xxxl, // ✅ 기존 40 → 28
		borderRadius: Radius.xxl, // ✅ 기존 30 → 24 (둥글기는 유지하면서 축소)
	},
	exitButtonText: {
		flexShrink: 1,
		color: Colors.textSecondary,
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.semibold,
	},
	resultModal: {
		backgroundColor: Colors.surface,
		padding: Spacing.xxl,
		borderRadius: Radius.xl,
		width: '85%',
		alignItems: 'center',
	},
	resultTitle: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.md,
	},
	resultMessage: {
		marginTop: SpacingV.md,
		fontSize: Typography.subtitle,
		color: Colors.text,
		textAlign: 'center',
		marginBottom: SpacingV.xl,
		lineHeight: scaledSize(22),
	},
	modalConfirmButton: {
		backgroundColor: Colors.secondarySurface,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.xxl,
		borderRadius: scaleWidth(30),
	},
	modalConfirmText: {
		color: Colors.textInverse,
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.semibold,
	},
	resultMessageContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: scaleHeight(90),
		marginBottom: SpacingV.xl,
	},
	capitalHighlight: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.error,
	},
	comboValue: {
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.bold,
		color: Colors.error, // 🔥 강조된 빨간색
		textShadowColor: Colors.shadow,
		textShadowOffset: { width: 1, height: 1 },
		textShadowRadius: 2,
		flexShrink: 1,
		flexWrap: 'nowrap',
		textAlign: 'center',
		includeFontPadding: false,
		maxWidth: '100%',
	},
	exitModal: {
		width: '85%',
		maxWidth: MODAL_MAX_WIDTH,
		maxHeight: '80%',
		backgroundColor: Colors.surface,
		// backgroundColor: Colors.error,
		borderRadius: Radius.lg,
		padding: Spacing.xl,
	},
	exitModalTitle: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.md,
		textAlign: 'center',
	},
	exitModalMessage: {
		fontSize: Typography.callout,
		color: Colors.textSecondary,
		marginBottom: SpacingV.xl,
		textAlign: 'center',
		lineHeight: scaledSize(22),
	},
	exitModalConfirmButton: {
		flex: 1,
		backgroundColor: Colors.error,
		padding: SpacingV.md,
		borderRadius: Radius.sm,
		marginLeft: Spacing.sm,
		alignItems: 'center',
	},
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
		flexShrink: 1,
		flexWrap: 'wrap',
		width: '100%',
	},
	// 상단 HUD — 문제 판·보기 카드와 같은 두꺼운 밑선을 써서 화면 전체가 한 벌로 읽힌다
	progressStatusWrapper: {
		width: '100%',
		maxWidth: '100%',
		backgroundColor: Colors.surface,
		padding: Spacing.lg,
		marginBottom: SpacingV.sm,
		borderRadius: Radius.lg,
		borderWidth: 1.5,
		borderBottomWidth: scaleHeight(4),
		borderColor: Colors.primarySoft,
	},
	progressText: {
		fontSize: Typography.body,
		color: Colors.text,
		fontWeight: FontWeight.semibold,
		marginBottom: SpacingV.sm,
		textAlign: 'center',
	},
	progressBarWrapper: {
		height: scaleHeight(10),
		width: '100%',
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.pill,
		overflow: 'hidden',
		marginBottom: SpacingV.md,
	},
	progressBarFill: {
		height: '100%',
		backgroundColor: Colors.secondarySurface,
		borderRadius: Radius.pill, // ✅ 둥글게 끝나는 효과 유지
	},
	scoreBonusText: {
		position: 'absolute',
		top: scaleHeight(-10),
		fontSize: Typography.h1,
		color: Colors.primary,
		fontWeight: FontWeight.bold,
		textShadowColor: Colors.shadow,
		textShadowOffset: { width: 1, height: 1 },
		textShadowRadius: 2,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: SpacingV.sm, // ✅ 기존 20 → 12
	},
	titleText: {
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.bold,
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	titleIcon: {},
	// 간격(marginLeft/Top)을 래퍼로 옮겨, 글로우와 전구 아이콘이 동일한 중심을 공유하도록 함
	hintIconWrap: {
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: Spacing.sm,
		marginTop: SpacingV.xxs,
	},
	hintGlow: {
		position: 'absolute',
		width: scaleWidth(30),
		height: scaleWidth(30),
		borderRadius: Radius.lg,
		backgroundColor: Colors.warningLight,
	},
	replayText: {
		marginTop: SpacingV.md,
		fontSize: Typography.bodySm,
		textAlign: 'center',
		color: Colors.primary,
		fontWeight: FontWeight.semibold,
		textDecorationLine: 'underline',
	},
	resultMascot: {
		width: scaleWidth(120),
		height: scaleWidth(120),
	},
	correctHighlight: {
		color: Colors.primary,
		fontWeight: FontWeight.bold,
		fontSize: Typography.subtitle,
	},

	checkboxWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-end',
		marginBottom: SpacingV.sm,
	},
	checkboxWrapper2: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-end',
		marginBottom: SpacingV.xs,
	},
	checkboxBox: {
		width: scaleWidth(18),
		height: scaleWidth(18),
		borderRadius: Radius.xs,
		borderWidth: 1,
		borderColor: Colors.textSecondary,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.surface,
		marginRight: Spacing.sm,
	},
	checkboxBoxChecked: {
		backgroundColor: Colors.secondarySurface,
	},
	checkboxInnerDot: {
		width: scaleWidth(10),
		height: scaleWidth(10),
		backgroundColor: Colors.surface,
	},
	checkboxLabel: {
		fontSize: Typography.bodySm,
		color: Colors.text,
	},
	nameToggleWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-end',
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.sm,
	},
	nameToggleLabel: {
		fontSize: Typography.caption,
		color: Colors.textMuted,
		fontWeight: FontWeight.semibold,
	},
	/**
	 * 콤보 발광 — 화면을 덮되 안쪽은 비어 있는 굵은 테두리다.
	 * 배경을 칠하면 문제가 가려지고, 테두리만 쓰면 시야 가장자리로만 들어온다.
	 */
	comboFlash: {
		...StyleSheet.absoluteFillObject,
		borderWidth: scaleWidth(10),
		borderColor: Colors.accentOrange,
	},

	/** 난이도·분야 배지 줄 — 모드 라벨 오른쪽에 붙는다 */
	metaChipRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.xs,
		marginLeft: Spacing.sm,
	},
	optionsContainer: {
		width: '100%',
		flex: 1, // ✅ 남은 공간을 모두 활용하여 FlatList가 유계 높이로 스크롤 (태블릿에서 D 선택지 짤림 방지)
	},
	/**
	 * 보기 한 칸 — 게임 버튼처럼 두툼하게.
	 * 아래 테두리만 두껍게 남겨(borderBottomWidth) 눌리기 전 두께가 보이게 하고,
	 * minHeight + justifyContent 로 글자가 버튼 높이 가운데에 오게 한다 (예전에는 위로 붙었다).
	 */
	/**
	 * 보기 한 칸.
	 * 네 칸을 한 화면에 넣으려 높이를 46 까지 줄였더니 손가락보다 작고 글자도 답답했다.
	 * 보기 목록은 FlatList 라 넘치면 스크롤되므로, 누르기 편한 크기(54)로 한 단계 되돌린다.
	 */
	optionCard: {
		backgroundColor: Colors.surface,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.md,
		borderRadius: Radius.lg,
		borderWidth: 1.5,
		borderBottomWidth: scaleHeight(3),
		borderColor: Colors.border,
		minHeight: scaleHeight(54),
		justifyContent: 'center',
		// 보기 네 칸이 서로 붙어 한 덩어리로 읽혔다 — 칸 사이를 한 단계 벌려 고르는 줄이 또렷해진다
		marginBottom: SpacingV.md,
	},
	optionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: Spacing.md,
	},
	optionTextBox: { flex: 1, justifyContent: 'center' },
	/** A~D 를 동그란 배지로 — 어디를 누르는지 한눈에 보이는 게임 UI */
	optionBadge: {
		width: scaleWidth(27),
		height: scaleWidth(27),
		borderRadius: Radius.pill,
		alignItems: 'center',
		justifyContent: 'center',
	},
	optionBadgeText: {
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.heavy,
	},
	// 정답/오답 피드백은 모든 퀴즈 화면에서 success/error 시맨틱 토큰으로 통일한다
	optionCorrectCard: {
		borderColor: Colors.success,
		backgroundColor: Colors.successSoft,
	},
	optionWrongCard: {
		borderColor: Colors.error,
		backgroundColor: Colors.errorSoft,
	},
	optionContent: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		lineHeight: scaledSize(22),
		flexShrink: 1,
		flexGrow: 1,
		flexWrap: 'wrap',
		textAlign: 'left',
	},
	/** 한자만(또는 한자+독음) 담기는 글에만 얹는다 — 설정에서 고른 한자 서체 */
	hanjaFace: getHanjaTextStyle(),
	/**
	 * 문제 판 — 묻는 말과 문제를 한 장에 묶는다.
	 * 안쪽 여백을 사방 같은 값으로 두고 두 줄 사이만 gap 으로 벌린다.
	 */
	questionPanel: {
		width: '100%',
		alignItems: 'center',
		gap: SpacingV.sm,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.lg,
		marginBottom: SpacingV.md,
		borderRadius: Radius.lg,
		backgroundColor: Colors.primaryBg,
		borderWidth: 1,
		// 보기 카드와 같은 두꺼운 밑선 — 문제 판과 보기가 한 벌로 읽힌다
		borderBottomWidth: scaleHeight(4),
		borderColor: Colors.primarySoft,
	},
	// 연습 모드 표시 아이콘 — 제목 글자가 아래 여백을 갖고 있어 같은 값만큼 맞춰 준다
	modeLeadIcon: { marginRight: Spacing.xs, marginBottom: SpacingV.sm },
	// 빈칸 모드의 '의미 보기' — 힌트 성격이라 브랜드 톤 칩으로 둔다
	meaningToggle: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.xs,
		marginTop: SpacingV.xs,
		marginBottom: SpacingV.md,
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.md,
		borderRadius: Radius.pill,
		backgroundColor: Colors.primarySoft,
	},
	meaningToggleText: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold, color: Colors.primaryDark },
	meaningText: {
		fontSize: Typography.body,
		color: Colors.textSecondary,
		textAlign: 'center',
		marginTop: SpacingV.sm,
		lineHeight: scaledSize(20),
	},
	questionAskRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
	questionText: {
		// 크기·줄 높이는 글자 수에 맞춰 questionTextSize 가 덮어쓴다
		fontSize: Typography.h3,
		lineHeight: scaledSize(28),
		fontWeight: FontWeight.heavy,
		textAlign: 'center',
		// 판이 연파랑이라 글자까지 색을 쓰면 둘 다 흐려진다 — 문제는 잉크색으로 또렷하게 둔다
		color: Colors.textStrong,
	},
	badgeRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	pillBadge: {
		borderWidth: 1,
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.xs,
		borderRadius: Radius.lg,
		marginHorizontal: Spacing.xs,
		backgroundColor: Colors.background,
	},
	pillBadgeText: {
		fontSize: Typography.footnote,
		fontWeight: FontWeight.semibold,
	},
	resultMessageBig: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
		textAlign: 'center',
		lineHeight: scaledSize(24),
		marginTop: SpacingV.md,
		marginBottom: SpacingV.lg,
	},
	correctInfoSubLabelInCard: {
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.md,
		textAlign: 'center',
	},
	correctInfoCard: {
		width: '100%',
		backgroundColor: Colors.secondaryBg,
		borderRadius: Radius.md,
		padding: Spacing.lg,
		marginTop: SpacingV.md,
		borderWidth: 1.2,
		borderColor: Colors.primary,
	},
	correctInfoLabel: {
		fontSize: Typography.body,
		fontWeight: FontWeight.semibold,
		color: Colors.primary,
		marginBottom: SpacingV.xs,
	},
	correctInfoText: {
		fontSize: Typography.callout,
		color: Colors.text,
		lineHeight: scaledSize(22),
		fontWeight: FontWeight.semibold,
	},
	mascotImage: {
		width: scaleWidth(60),
		height: scaleWidth(60),
		borderRadius: Radius.md,
		marginRight: Spacing.md,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	mascotImageWrapper: {
		width: '100%',
		alignItems: 'center',
		marginBottom: SpacingV.md,
	},

	mascotImageImproved: {
		width: scaleWidth(80),
		height: scaleWidth(80),
		borderRadius: scaleWidth(40),
		backgroundColor: Colors.surface,
		borderWidth: 2,
		borderColor: Colors.primary,
	},
	badgeTextCenteredWrap: {
		alignItems: 'center',
		marginTop: SpacingV.xs,
		paddingHorizontal: Spacing.sm,
	},

	badgeNameCentered: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
		textAlign: 'center',
		marginBottom: SpacingV.xs,
	},

	badgeDescriptionCentered: {
		fontSize: Typography.body,
		color: Colors.primary,
		textAlign: 'center',
		lineHeight: scaledSize(20),
	},
	hanjaHintText: {
		fontSize: Typography.footnote,
		color: Colors.textSecondary,
		textAlign: 'center',
		marginTop: SpacingV.xs,
		marginBottom: SpacingV.sm,
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
