// services/WorldTopicService.ts
import { WORLD_ENTRIES } from '@/src/const/data/world/ConstWorldEntries';
import { selectTopic } from '@/src/const/data/world/ConstWorldTopics';
import { WORLD_TOPIC_TEXT, fieldLabel } from '@/src/const/data/world/ConstWorldText';
import { makeImageRef, selectEntryImageRef } from '@/src/const/data/world/ConstWorldImages';
import { DIFFICULTY_LABELS } from '@/src/const/ConstQuizMeta';
import { buildQuestions, pick } from '@/src/services/world/WorldQuizFactory';
import { LearnType } from '@/src/types/data/LearnType';
import { WorldType } from '@/src/types/data/WorldType';
import { shuffle } from './LearnQuizFactory';

/**
 * 세계 상식 주제 하나를 통합 학습 도메인 모양(StudyCard / QuizQuestion)으로 바꿔 주는 어댑터.
 * -------------------------------------------------
 * 한국어 퀴즈 화면은 도메인마다 "원본 → 학습 카드 / 퀴즈 문항" 서비스를 하나씩 둔다.
 * 세계 상식은 주제마다 JSON 모양이 같아서 서비스를 주제 수만큼 복사하지 않고 이 공장 하나로 만든다.
 *
 * 문항은 LearnQuizFactory(보기 자동 추출)가 아니라 WorldQuizFactory 가 만든다 —
 * 세계 데이터는 "무엇을 묻고 무엇을 답으로 쓸지"가 주제별 모드로 정해져 있고,
 * 같은 갈래에서 오답을 뽑거나 정답이 둘인 문항을 거르는 규칙이 거기 있다 (ConstWorldData.test.ts 가 지킨다).
 *
 * uid 는 항목 id 그대로다 ('capital-npl', 'figure-001'). 즐겨찾기·오답노트·학습 진도가 이 값으로 저장된다.
 */

/** 항목 → 숫자 id (도메인 안 순번). 화면 key·정렬에만 쓰이고 저장 열쇠는 uid 다 */
const numericId = (topic: WorldType.TopicKey, entry: WorldType.Entry): number => WORLD_ENTRIES[topic].indexOf(entry) + 1;

const levelLabel = (level: WorldType.Level): string => DIFFICULTY_LABELS[level];

export const createWorldTopicService = (key: WorldType.TopicKey) => {
	const topic = selectTopic(key);
	const text = WORLD_TOPIC_TEXT[key];
	const data = WORLD_ENTRIES[key];

	/** 세부 카테고리 = 오답을 가르는 갈래 값 (수도는 대륙, 위인은 시대, 사건은 갈래) */
	const categoryOf = (entry: WorldType.Entry): string | undefined => (topic.groupBy ? entry.fields[topic.groupBy] || undefined : undefined);

	const infoRowsOf = (entry: WorldType.Entry): { label: string; value: string }[] =>
		Object.entries(entry.fields)
			.map(([field, value]) => ({ label: fieldLabel(key, field), value }))
			.filter((row): row is { label: string; value: string } => !!row.label && !!row.value);

	const service = {
		selectAll(): WorldType.Entry[] {
			return data;
		},

		selectCategoryList(): string[] {
			return [...new Set(data.map(categoryOf).filter((c): c is string => !!c))];
		},

		filter(opts?: LearnType.BuildOptions): WorldType.Entry[] {
			return opts?.category ? data.filter((entry) => categoryOf(entry) === opts.category) : data;
		},

		/** 원본 → 학습 카드: 표제=이름, 뜻=한 줄 설명, 예문 자리=곁가지 두 줄 */
		toStudyCard(entry: WorldType.Entry): LearnType.StudyCard {
			return {
				id: numericId(key, entry),
				uid: entry.id,
				domain: key,
				title: entry.name,
				meaning: entry.summary,
				examples: entry.facts,
				stories: entry.stories,
				levelLabel: levelLabel(entry.level),
				categoryLabel: categoryOf(entry),
				infoRows: infoRowsOf(entry),
				imageRef: selectEntryImageRef(key, entry),
			};
		},

		/** 세계 문항 → 화면 문항. 그림 문항은 prompt 에 파일 이름이 들어 있으므로 발문으로 바꾸고 그림 참조를 단다 */
		toQuizQuestion(q: WorldType.Question): LearnType.QuizQuestion {
			const mode = topic.modes.find((m) => m.key === q.mode);
			const question = text.modes[q.mode]?.question ?? text.label;
			const imageRef = mode?.askAs ? makeImageRef(mode.askAs, q.prompt) : undefined;
			const answerIndex = q.options.indexOf(q.answer);
			// 해설은 "정답 — 이 항목이 무엇인지" 로 쓴다. 답이 이름이 아닌 문항(수도·대륙)은 이름을 앞에 붙여 무엇의 답인지 알린다
			const answerIsName = mode?.answer === 'name';
			return {
				id: numericId(key, q.entry),
				uid: q.entry.id,
				domain: key,
				kind: 'choice',
				guide: question,
				prompt: imageRef ? question : q.prompt,
				options: q.options,
				answerIndex,
				explanation: answerIsName ? `${q.entry.name} — ${q.entry.summary}` : `${q.entry.name}: ${q.answer}\n${q.entry.summary}`,
				level: levelLabel(q.entry.level),
				// 카테고리 칩(대륙·시대·갈래)이 곧 정답인 모드(대륙 맞히기·언제 살았나)에서는 칩을 숨긴다 — 문제 위에 답이 붙는다
				categoryLabel: mode?.answer === topic.groupBy ? undefined : categoryOf(q.entry),
				examples: q.entry.facts,
				imageRef,
				optionFlags: mode?.answerAs === 'flag' && !imageRef?.startsWith('flag:'),
			};
		},

		getStudyCards(opts?: LearnType.BuildOptions): LearnType.StudyCard[] {
			const pool = shuffle(service.filter(opts));
			const sliced = opts?.count ? pool.slice(0, opts.count) : pool;
			return sliced.map((entry) => service.toStudyCard(entry));
		},

		/**
		 * 4지선다 생성 — 항목마다 모드를 돌려 가며 낸다.
		 * 낼 수 없는 항목(값이 없거나 답이 문제에 들어 있는 것)은 건너뛰므로 요청 수보다 넉넉히 뽑아 자른다.
		 */
		generateQuiz(opts?: LearnType.BuildOptions): LearnType.QuizQuestion[] {
			const count = opts?.count ?? 10;
			const targets = shuffle(service.filter(opts));
			return buildQuestions(targets.slice(0, Math.min(targets.length, count * 2 + 4)), topic, data)
				.slice(0, count)
				.map((q) => service.toQuizQuestion(q));
		},

		/**
		 * 그림 문항만 — 국기·초상·사진·천체 그림을 보고 이름 맞히기. 그림 모드가 없는 주제는 빈 목록이다.
		 */
		generateImageQuiz(count = 10): LearnType.QuizQuestion[] {
			const modes = topic.modes.filter((m) => m.askAs);
			if (modes.length === 0) return [];
			const targets = shuffle(data);
			return buildQuestions(targets.slice(0, Math.min(targets.length, count * 2 + 4)), topic, data, Math.random, modes)
				.slice(0, count)
				.map((q) => service.toQuizQuestion(q));
		},

		/**
		 * 오답 복습용 오답 보기 — 저장된 정답이 항목의 어느 자리 값인지 되짚어 같은 자리 값에서 뽑는다.
		 * (수도 문제의 오답 복습에 대륙 이름이 보기로 섞이면 읽지 않고도 답이 보인다)
		 */
		distractorsFor(uid: string, answer: string, count = 3): string[] {
			const entry = data.find((e) => e.id === uid);
			if (!entry) return [];
			// 즐겨찾기 퀴즈는 '이름 → 설명' 으로 묻는다 — summary 도 자리로 본다
			const slot = ['name', 'summary', ...Object.keys(entry.fields)].find((k) => pick(entry, k) === answer);
			if (!slot) return [];
			const group = topic.groupBy ? pick(entry, topic.groupBy) : undefined;
			const values = (list: WorldType.Entry[]) => [...new Set(list.map((e) => pick(e, slot)).filter((v) => v && v !== answer))];
			const same = shuffle(values(group ? data.filter((e) => pick(e, topic.groupBy!) === group) : []));
			const rest = shuffle(values(data)).filter((v) => !same.includes(v));
			return [...same, ...rest].slice(0, count);
		},

		/**
		 * 빈칸 채우기 재료 — 설명·곁가지 문장 안에 들어 있는 값(수도 이름·나라 이름 등)을 가린다.
		 * 오답 보기는 같은 주제의 같은 자리 값에서 뽑는다 (수도 빈칸의 오답은 다른 수도).
		 */
		getBlankCandidates(): { entry: WorldType.Entry; slot: string; sentence: string; answer: string }[] {
			const out: { entry: WorldType.Entry; slot: string; sentence: string; answer: string }[] = [];
			const slots = ['name', ...Object.keys(data[0]?.fields ?? {})].filter((slot) => slot === 'name' || !!fieldLabel(key, slot));
			data.forEach((entry) => {
				const sentences = [entry.summary, ...entry.facts];
				for (const slot of slots) {
					const answer = pick(entry, slot);
					// 두 글자 미만은 문장 속 다른 낱말과 겹치기 쉽다 ('미국' 은 되고 '영' 은 안 된다)
					if (!answer || answer.length < 2) continue;
					// 문장 안에 값이 두 번 나오면 하나를 가려도 다른 하나가 답을 드러낸다 ('체코 말로 … 체코어 철자법')
					const sentence = sentences.find((s) => s.split(answer).length === 2);
					if (sentence) {
						out.push({ entry, slot, sentence, answer });
						return;
					}
				}
			});
			return out;
		},
	};
	return service;
};

export type WorldTopicService = ReturnType<typeof createWorldTopicService>;
