// services/LearnHubService.ts
import { LearnType } from '@/src/types/data/LearnType';
import { WORLD_TOPICS } from '@/src/const/data/world/ConstWorldTopics';
import { WORLD_TOPIC_TEXT } from '@/src/const/data/world/ConstWorldText';
import { createWorldTopicService, WorldTopicService } from './WorldTopicService';
import { selectFlagsByName } from '@/src/const/data/world/ConstFlagImages';
import { shuffle } from './LearnQuizFactory';

/**
 * 통합 학습 도메인 인터페이스
 * - 세계 상식 주제(수도·랜드마크·위인 …)를 동일한 형태로 노출하여 공용 화면에서 사용
 */
export interface LearnDomain {
	meta: LearnType.DomainMeta;
	selectCategoryList(): string[];
	getStudyCards(opts?: LearnType.BuildOptions): LearnType.StudyCard[];
	generateQuiz(opts?: LearnType.BuildOptions): LearnType.QuizQuestion[];
}

const services = {} as Record<LearnType.Domain, WorldTopicService>;

/** 주제 하나 = 도메인 하나. 이름·소개는 ConstWorldText, 아이콘·색은 ConstWorldTopics 에 있다 */
const domains = Object.fromEntries(
	WORLD_TOPICS.map((topic) => {
		const service = createWorldTopicService(topic.key);
		services[topic.key] = service;
		const domain: LearnDomain = {
			meta: {
				key: topic.key,
				title: WORLD_TOPIC_TEXT[topic.key].label,
				subtitle: WORLD_TOPIC_TEXT[topic.key].description,
				icon: topic.icon,
				iconType: 'materialCommunityIcons',
				color: topic.color,
				total: service.selectAll().length,
			},
			selectCategoryList: () => service.selectCategoryList(),
			getStudyCards: (opts) => service.getStudyCards(opts),
			generateQuiz: (opts) => service.generateQuiz(opts),
		};
		return [topic.key, domain];
	}),
) as Record<LearnType.Category, LearnDomain>;

const isCategory = (key: string): key is LearnType.Category => key in domains;

/**
 * 메인 영역(주제 그리드/데일리 믹스/검색/오늘의 상식/약점 집중 등)에 노출할 도메인 키.
 * - 스포츠 대회(월드컵·올림픽)는 항목 수가 적어(23~30) 메인 학습 통계에 섞지 않고 서브 퀴즈 허브에서만 노출한다.
 */
const SUB_QUIZ_KEYS: LearnType.Domain[] = ['worldcup', 'olympic', 'winter'];
const HIDDEN_FROM_MAIN: LearnType.Domain[] = SUB_QUIZ_KEYS;
const MAIN_DOMAIN_KEYS = (Object.keys(domains) as LearnType.Domain[]).filter((k) => !HIDDEN_FROM_MAIN.includes(k));
const mainDomains = (): LearnDomain[] => MAIN_DOMAIN_KEYS.map((k) => domains[k]);

// 도메인별 uid→학습카드 인덱스 캐시 (getStudyCardByUid 최초 1회 생성 후 재사용)
const studyCardIndexCache = new Map<string, Map<string, LearnType.StudyCard>>();

/** 도메인 키 → 표시 제목 */
const titleOf = (key: LearnType.Domain): string => domains[key].meta.title;

/** 통합 검색용 전체 카드 캐시 (최초 검색 시 1회 생성) */
let allCardsCache: LearnType.StudyCard[] | null = null;
/** 서브 퀴즈 주제까지 포함한 검색 캐시 (검색 탭 전용) */
let allCardsWithSubCache: LearnType.StudyCard[] | null = null;

/** 한글 초성 추출 (예: "카트만두" → "ㅋㅌㅁㄷ") */
const CHOSUNG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const toChosung = (text: string): string =>
	[...text]
		.map((ch) => {
			const code = ch.charCodeAt(0);
			if (code >= 0xac00 && code <= 0xd7a3) return CHOSUNG[Math.floor((code - 0xac00) / 588)];
			return ch === ' ' ? ' ' : ch;
		})
		.join('');

/** 빈칸 채우기에 쓰는 도메인 — 설명 문장 안에 수도·나라 같은 값이 들어 있는 주제 (메인 주제 전부) */
const BLANK_DOMAINS = (): LearnType.Domain[] => MAIN_DOMAIN_KEYS;

/**
 * 모든 도메인에서 골고루 4지선다 문항을 모은다
 * - fullPool=true 면 도메인별 전체 문항을 생성한다(난이도 필터 시 후보 확보용)
 */
const collectChoiceQuestions = (perDomain: number, fullPool = false): LearnType.QuizQuestion[] => {
	const all: LearnType.QuizQuestion[] = [];
	mainDomains().forEach((d) => {
		all.push(...d.generateQuiz({ count: fullPool ? d.meta.total : perDomain }));
	});
	return shuffle(all);
};

/**
 * 난이도 라벨(초급/중급/고급/특급)로 문항 필터링.
 * - level 이 없으면(전체) 원본을 그대로 반환
 */
const filterByLevel = (questions: LearnType.QuizQuestion[], level?: string): LearnType.QuizQuestion[] =>
	level ? questions.filter((q) => q.level === level) : questions;

/** 4지선다 → OX 문항으로 변환 */
const toOX = (q: LearnType.QuizQuestion): LearnType.QuizQuestion => {
	const correct = q.options[q.answerIndex];
	const others = q.options.filter((_, i) => i !== q.answerIndex);
	const showCorrect = Math.random() < 0.5;
	const shown = showCorrect ? correct : others[Math.floor(Math.random() * others.length)] ?? correct;
	const options = ['O (맞음)', 'X (틀림)'];
	return {
		id: q.id,
		uid: q.uid,
		domain: q.domain,
		kind: 'ox',
		// 세계 문항은 모드마다 묻는 것이 달라(수도·대륙·시대) 원래 발문을 앞에 남겨야 무엇이 맞는지 판단할 수 있다
		guide: `${q.guide} 제시된 답이 맞으면 O, 틀리면 X`,
		prompt: q.prompt,
		subPrompt: `"${shown}"`,
		options,
		answerIndex: showCorrect ? 0 : 1,
		explanation: `올바른 답: ${correct}\n${q.explanation}`,
		level: q.level,
		categoryLabel: q.categoryLabel,
		examples: q.examples,
		imageRef: q.imageRef,
	};
};

/**
 * 통합 학습 허브 서비스
 */
const LearnHubService = {
	/** 전체 도메인 메타 목록 */
	getDomainList(): LearnType.DomainMeta[] {
		return mainDomains().map((d) => d.meta);
	},

	/** 메인 학습과 분리된 스포츠 서브 퀴즈 목록 */
	getSubQuizDomainList(): LearnType.DomainMeta[] {
		return SUB_QUIZ_KEYS.map((key) => domains[key].meta);
	},

	/** 키로 도메인 조회 (없으면 세계 수도 기본) */
	getDomain(key: string): LearnDomain {
		return isCategory(key) ? domains[key] : domains.capital;
	},

	/** 도메인 키 → 표시 제목 (없으면 키 그대로) */
	getDomainTitle(key: string): string {
		return isCategory(key) ? titleOf(key) : key;
	},

	/** 무작위 학습 카드 1장 (오늘의 상식 등) — 주제를 먼저 고르고 그 안에서 뽑는다 (항목 많은 위인·수도로 쏠리지 않게) */
	getRandomStudyCard(): LearnType.StudyCard | undefined {
		const key = MAIN_DOMAIN_KEYS[Math.floor(Math.random() * MAIN_DOMAIN_KEYS.length)];
		return domains[key].getStudyCards({ count: 1 })[0];
	},

	/** 전 주제에서 섞은 학습 카드 (이야기 피드 등) */
	getMixedStudyCards(count = 20): LearnType.StudyCard[] {
		const all: LearnType.StudyCard[] = [];
		mainDomains().forEach((d) => all.push(...d.getStudyCards({ count: 4 })));
		return shuffle(all).slice(0, count);
	},

	/**
	 * 전 주제의 모든 학습 카드 (섞어서 전부 반환) — 숏폼 전체 보기 등
	 * @param includeSub true 면 서브 퀴즈 주제(월드컵·올림픽)까지 포함 (검색 탭용)
	 */
	getAllStudyCards(includeSub = false): LearnType.StudyCard[] {
		const all: LearnType.StudyCard[] = [];
		const list = includeSub ? [...mainDomains(), ...SUB_QUIZ_KEYS.map((k) => domains[k])] : mainDomains();
		list.forEach((d) => all.push(...d.getStudyCards()));
		return shuffle(all);
	},

	/** 검색 탭에서 고를 수 있는 주제 목록 (메인 + 서브 퀴즈) */
	getSearchDomainList(): LearnType.DomainMeta[] {
		return [...mainDomains().map((d) => d.meta), ...SUB_QUIZ_KEYS.map((k) => domains[k].meta)];
	},

	/**
	 * uid로 원본 학습 카드 1개 조회 (보관함/오답노트 상세 팝업을 검색과 동일하게 풍부히 표시)
	 * - 도메인별 uid→카드 맵을 1회 생성 후 캐시 → 대량 데이터에서도 매 조회가 O(1)
	 */
	getStudyCardByUid(domain: string, uid: string): LearnType.StudyCard | null {
		if (!isCategory(domain)) return null;
		let map = studyCardIndexCache.get(domain);
		if (!map) {
			map = new Map<string, LearnType.StudyCard>();
			try {
				domains[domain as LearnType.Domain].getStudyCards().forEach((c) => map!.set(c.uid, c));
			} catch {
				/* noop */
			}
			studyCardIndexCache.set(domain, map);
		}
		return map.get(uid) ?? null;
	},

	/**
	 * 지정 주제(들)에 집중한 4지선다 (약점 집중 코스)
	 * - level(초급/중급/고급/특급) 지정 시 해당 난이도만 출제. 전체(미지정)면 필터 없음
	 * - 난이도 필터가 있으면 도메인별 전체 문항을 생성해 충분한 후보를 확보한 뒤 필터링
	 */
	generateFocusedQuiz(keys: string[], count = 10, level?: string): LearnType.QuizQuestion[] {
		const valid = keys.filter((k) => isCategory(k)) as LearnType.Domain[];
		const pool = valid.length ? valid : MAIN_DOMAIN_KEYS;
		const per = Math.ceil(count / pool.length) + 2;
		const all: LearnType.QuizQuestion[] = [];
		// 난이도 필터가 있으면 도메인별 전체 문항을 생성(count=도메인 전체 수) → 필터 후에도 문항 수 확보
		// (generateQuiz 를 인자 없이 부르면 기본 10문제만 생성되어, 특정 난이도가 몇 개만 남는 버그가 있었음)
		pool.forEach((k) => all.push(...domains[k].generateQuiz({ count: level ? domains[k].meta.total : per })));
		return filterByLevel(shuffle(all), level).slice(0, count);
	},

	/** 초성 퀴즈: 설명을 보고 초성 힌트로 이름 맞히기 — 오답 보기는 같은 주제의 다른 이름 */
	generateInitialSoundQuiz(count = 10): LearnType.QuizQuestion[] {
		const cards: LearnType.StudyCard[] = [];
		MAIN_DOMAIN_KEYS.forEach((k) => cards.push(...domains[k].getStudyCards({ count: 20 })));
		const titlesByDomain: Record<string, string[]> = {};
		cards.forEach((c) => (titlesByDomain[c.domain] ??= []).push(c.title));

		return shuffle(cards)
			// 초성으로 바꿔도 글자가 거의 그대로인 이름(영문·숫자 위주)은 힌트가 되지 않는다
			.filter((card) => /[가-힣]/.test(card.title))
			// 설명에 이름이 그대로 들어 있으면 초성 힌트가 필요 없다
			.filter((card) => !card.meaning.includes(card.title))
			.slice(0, count)
			.map((card) => {
				const distractors = shuffle([...new Set(titlesByDomain[card.domain] ?? [])].filter((t) => t && t !== card.title)).slice(0, 3);
				const options = shuffle([card.title, ...distractors]);
				return {
					id: card.id,
					uid: card.uid,
					domain: card.domain,
					kind: 'choice' as LearnType.QuizKind,
					guide: '초성 힌트를 보고 알맞은 이름을 고르세요',
					prompt: card.meaning,
					subPrompt: toChosung(card.title),
					options,
					answerIndex: options.indexOf(card.title),
					explanation: `${card.title} — ${card.meaning}`,
					level: card.levelLabel,
					categoryLabel: card.categoryLabel,
					examples: card.examples,
				};
			})
			.filter((q) => q.options.length >= 2);
	},

	/**
	 * 통합 검색: 전 주제(또는 특정 주제) 표제어/뜻에서 질의어 포함 카드 검색
	 * @param includeSub true 면 서브 퀴즈 주제까지 검색 대상에 넣는다 (캐시를 따로 둔다)
	 */
	searchCards(query: string, limit = 40, domain?: string, includeSub = false): LearnType.StudyCard[] {
		const q = query.trim().toLowerCase();
		if (!q) return [];
		if (!allCardsCache) {
			allCardsCache = [];
			mainDomains().forEach((d) => allCardsCache!.push(...d.getStudyCards()));
		}
		if (includeSub && !allCardsWithSubCache) {
			allCardsWithSubCache = [...allCardsCache];
			SUB_QUIZ_KEYS.forEach((k) => allCardsWithSubCache!.push(...domains[k].getStudyCards()));
		}
		const pool = includeSub ? allCardsWithSubCache! : allCardsCache;
		const base = domain && isCategory(domain) ? pool.filter((c) => c.domain === domain) : pool;
		return base
			.filter((c) => c.title.toLowerCase().includes(q) || (c.subTitle ?? '').toLowerCase().includes(q) || c.meaning.toLowerCase().includes(q))
			.slice(0, limit);
	},

	/** 유효한 카테고리 키 여부 */
	isValidCategory(key: string): boolean {
		return isCategory(key);
	},

	/**
	 * 데일리 믹스: 전 주제에서 골고루 섞은 4지선다 (요청 개수에 맞게 도메인당 문항 수 자동 확장)
	 * - level(초급/중급/고급/특급) 지정 시 해당 난이도만 출제. 전체(미지정)면 필터 없음
	 */
	generateMixedQuiz(count = 10, level?: string): LearnType.QuizQuestion[] {
		const domainCount = mainDomains().length || 1;
		// 난이도 필터가 있으면 도메인당 넉넉히 생성해 필터 후에도 문항 수 확보
		const perDomain = level ? 60 : Math.max(4, Math.ceil(count / domainCount) + 2);
		// 난이도 지정 시에는 도메인별 전체 풀에서 생성해 해당 난이도 문항이 부족하지 않게 한다
		return filterByLevel(collectChoiceQuestions(perDomain, !!level), level).slice(0, count);
	},

	/** 그림 퀴즈: 국기·초상·사진·천체 그림만 보고 맞히기 (그림 모드가 있는 메인 주제에서 고르게) */
	generatePictureQuiz(count = 10): LearnType.QuizQuestion[] {
		const keys = MAIN_DOMAIN_KEYS.filter((k) => WORLD_TOPICS.find((t) => t.key === k)?.modes.some((m) => m.askAs));
		const per = Math.ceil(count / Math.max(1, keys.length)) + 2;
		return shuffle(keys.flatMap((k) => services[k].generateImageQuiz(per))).slice(0, count);
	},

	/** OX 퀴즈: 전 주제 기반 O/X 판단 */
	generateOXQuiz(count = 10): LearnType.QuizQuestion[] {
		return collectChoiceQuestions(4).slice(0, count).map(toOX);
	},

	/** 오답 복습: 저장된 오답 항목으로 4지선다 재구성 (보기는 다른 오답 정답에서 추출) */
	generateReviewQuiz(
		items: {
			uid: string;
			domain: LearnType.Domain;
			prompt: string;
			subTitle?: string;
			answer: string;
			explanation: string;
			level?: string;
			categoryLabel?: string;
			examples?: string[];
			guide?: string;
			imageRef?: string;
		}[],
		count = 10,
	): LearnType.QuizQuestion[] {
		const allAnswers = [...new Set(items.map((i) => i.answer))];
		// 오답 보기는 '저장된 오답' 안이 아니라 해당 주제 전체 문항의 정답에서 뽑는다.
		// 학습카드 title은 주제마다 의미가 달라(위인=이름, 서브퀴즈=문제문) 실제 퀴즈 정답을 그대로 후보로 쓴다.
		const domainAnswerCache: Record<string, string[]> = {};
		const domainAnswers = (domain: LearnType.Domain): string[] => {
			if (!domainAnswerCache[domain]) {
				try {
					const pool = domains[domain].generateQuiz({ count: domains[domain].meta.total });
					domainAnswerCache[domain] = [...new Set(pool.map((q) => q.options[q.answerIndex]).filter(Boolean))];
				} catch {
					domainAnswerCache[domain] = [];
				}
			}
			return domainAnswerCache[domain];
		};

		// 넘겨준 순서를 그대로 지킨다(호출부에서 '많이 틀린 순' 등으로 정렬해 보낸다 — 여기서 섞으면 의도가 사라짐)
		return items
			.slice(0, count)
			.map((it) => {
				// 세계 항목은 정답이 어느 자리 값인지 되짚어 같은 자리에서 먼저 뽑는다 (못 찾으면 예전처럼 주제 전체 정답에서)
				let distractors = isCategory(it.domain) ? services[it.domain].distractorsFor(it.uid, it.answer) : [];
				if (distractors.length < 3) {
					const sameDomain = domainAnswers(it.domain).filter((a) => a && a !== it.answer && !distractors.includes(a));
					distractors = [...distractors, ...shuffle(sameDomain).slice(0, 3 - distractors.length)];
				}
				if (distractors.length < 3) {
					const more = shuffle(allAnswers.filter((a) => a && a !== it.answer && !distractors.includes(a))).slice(0, 3 - distractors.length);
					distractors = [...distractors, ...more];
				}
				const options = shuffle([it.answer, ...distractors]);
				// 보기가 모두 나라 이름이면 국기를 붙인다 — 국기를 보고 맞히는 문항은 제외(보기 국기가 답을 알려 준다)
				const optionFlags = !it.imageRef?.startsWith('flag:') && options.every((o) => selectFlagsByName(o).length > 0);
				return {
					id: 0,
					uid: it.uid,
					domain: it.domain,
					kind: 'choice' as LearnType.QuizKind,
						guide: `오답 복습! ${it.guide ?? '올바른 답을 고르세요'}`,
						prompt: it.prompt,
						subPrompt: it.subTitle,
						options,
						answerIndex: options.indexOf(it.answer),
						explanation: it.explanation,
						level: it.level,
						categoryLabel: it.categoryLabel,
						examples: it.examples,
						imageRef: it.imageRef,
						optionFlags,
					};
			})
			.filter((q) => q.options.length >= 2);
	},

	/** 빈칸 채우기: 설명 문장에서 수도·나라 같은 값을 가린 뒤 보기로 고르기 */
	generateBlankQuiz(count = 10): LearnType.QuizQuestion[] {
		const candidates = BLANK_DOMAINS().flatMap((key) => services[key].getBlankCandidates().map((c) => ({ ...c, key })));
		// 같은 자리 값끼리 오답을 뽑는다 — 수도 빈칸의 오답은 다른 수도, 나라 빈칸의 오답은 다른 나라
		const answersBySlot = new Map<string, string[]>();
		candidates.forEach((c) => {
			const k = `${c.key}:${c.slot}`;
			const list = answersBySlot.get(k) ?? [];
			list.push(c.answer);
			answersBySlot.set(k, list);
		});

		return shuffle(candidates)
			.map(({ entry, slot, sentence, answer, key }) => {
				const pool = [...new Set(answersBySlot.get(`${key}:${slot}`) ?? [])].filter((a) => a && a !== answer && !sentence.includes(a));
				const distractors = shuffle(pool).slice(0, 3);
				if (distractors.length < 3) return null;
				const options = shuffle([answer, ...distractors]);
				const card = services[key].toStudyCard(entry);
				return {
					id: card.id,
					uid: card.uid,
					domain: key,
					kind: 'choice' as LearnType.QuizKind,
					guide: '빈칸에 들어갈 말을 고르세요',
					prompt: sentence.replace(answer, '( ㅇㅇ )'),
					subPrompt: slot === 'name' ? undefined : card.title,
					options,
					answerIndex: options.indexOf(answer),
					explanation: `${card.title} — ${card.meaning}`,
					level: card.levelLabel,
					// 가린 값이 곧 카테고리(대륙 등)면 칩이 답을 알려 준다
					categoryLabel: card.categoryLabel === answer ? undefined : card.categoryLabel,
					examples: card.examples,
				};
			})
			.filter((q): q is NonNullable<typeof q> => !!q)
			.slice(0, count);
	},
};

export default LearnHubService;
