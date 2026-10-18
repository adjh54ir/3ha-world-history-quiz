import type { Language } from '@/src/hooks/language/schema';
import type { WorldType } from '@/src/types/data/WorldType';
import i18n, { resources } from '@/src/translations';
import { entryIn } from '@/src/const/data/world/ConstWorldEntries';
import { selectTopic, WORLD_TOPICS } from '@/src/const/data/world/ConstWorldTopics';
import { toInitialHint } from '@/src/services/LearnHubService';

/**
 * 저장해 둔 글자를 지금 언어로 되짚기 (오답노트용)
 * -------------------------------------------------
 * 오답노트는 문항을 글자째 저장한다 — 발문·정답·해설이 모드마다 달라 id 만으로는 다시 만들 수 없다.
 * 그래서 그 항목 하나를 모든 언어로 옮겨 '글자 → 자리(이름·설명·필드·발문…)' 표를 만들고,
 * 저장된 글자가 어느 자리였는지 찾아 지금 언어의 같은 자리 글자로 바꾼다. 못 찾은 글자는 그대로 둔다.
 *
 * 되짚는 것: 이름·설명·곁가지·필드 값(정답·카테고리), 해설("이름 — 설명" / "이름: 값\n설명"), 모드 발문,
 *           OX 발문·O/X 보기, 초성 발문·힌트, 오답 복습 발문, 난이도, 주제 이름.
 * 못 되짚는 것: 빈칸 문장(값을 가린 문장), OX 해설처럼 글자를 이어 붙인 해설 — 저장한 언어로 남는다.
 */

const LANGUAGES = Object.keys(resources) as Language[];
const LEVEL_KEYS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
const isTopic = (key: string): key is WorldType.TopicKey => WORLD_TOPICS.some((t) => t.key === key);

/** 항목과 무관한 글자(주제 이름·발문·O/X·난이도) — 언어·주제마다 한 번만 만든다 */
const topicSlotsCache = new Map<string, [string, string][]>();
const topicSlotsIn = (language: Language, topic: WorldType.TopicKey): [string, string][] => {
	const key = `${language}:${topic}`;
	const cached = topicSlotsCache.get(key);
	if (cached) return cached;
	// 모드 키가 string 이라 키 타입 검사를 풀어 둔다 (키는 ConstWorldText 와 같은 꼴)
	const t = i18n.getFixedT(language) as unknown as (key: string, options?: Record<string, unknown>) => string;
	const slots: [string, string][] = [
		['domain', t(`world.topic.${topic}.label`)],
		['ox:true', t('svc.learnHub.oxTrue')],
		['ox:false', t('svc.learnHub.oxFalse')],
		['chosung', t('svc.learnHub.chosungGuide')],
		['review:default', t('svc.learnHub.wrongReviewGuide', { guide: t('svc.learnHub.wrongReviewDefault') })],
		...LEVEL_KEYS.map((k, i): [string, string] => [`level:${i}`, t(`special.levelTest.grades.${k}.title`)]),
		...selectTopic(topic).modes.flatMap((m): [string, string][] => {
			const question = t(`world.topic.${topic}.modes.${m.key}.question`);
			return [
				[`mode:${m.key}`, question],
				[`ox:${m.key}`, t('svc.learnHub.oxGuide', { guide: question })],
				[`review:${m.key}`, t('svc.learnHub.wrongReviewGuide', { guide: question })],
			];
		}),
	];
	topicSlotsCache.set(key, slots);
	return slots;
};

/** 한 언어에서 그 항목의 자리 → 글자 */
const slotsIn = (language: Language, topic: WorldType.TopicKey, id: string): Map<string, string> => {
	const slots = new Map<string, string>(topicSlotsIn(language, topic));
	const entry = entryIn(language, topic, id);
	if (!entry) return slots;
	const put = (slot: string, text: string | undefined) => text && slots.set(slot, text);

	put('name', entry.name);
	put('summary', entry.summary);
	put('hint', toInitialHint(entry.name, language));
	put('explain:name', `${entry.name} — ${entry.summary}`);
	entry.facts.forEach((fact, i) => put(`fact:${i}`, fact));
	entry.stories?.forEach((story, i) => put(`story:${i}`, story));
	Object.entries(entry.fields).forEach(([k, v]) => {
		if (typeof v !== 'string') return;
		put(`field:${k}`, v);
		put(`explain:${k}`, `${entry.name}: ${v}\n${entry.summary}`);
	});
	return slots;
};

/**
 * 그 항목에 딸린 글자를 지금 언어로 바꾸는 함수를 돌려준다.
 * 주제가 아니거나 항목을 못 찾으면 글자를 그대로 돌려준다.
 */
export const relocalizer = (topic: string, id: string): (<T extends string | undefined>(text: T) => T) => {
	if (!isTopic(topic)) return (text) => text;
	const current = slotsIn(i18n.language as Language, topic, id);
	const currentTexts = new Set(current.values());
	// 다른 언어 표는 지금 언어에 없는 글자를 만났을 때만 만든다 — 대부분은 저장한 언어가 지금 언어라 여기까지 오지 않는다
	let slotOf: Map<string, string> | null = null;
	const otherSlots = () => {
		if (slotOf) return slotOf;
		const map = new Map<string, string>();
		LANGUAGES.forEach((language) => {
			if (language === i18n.language) return;
			slotsIn(language, topic, id).forEach((text, slot) => {
				if (!map.has(text)) map.set(text, slot);
			});
		});
		slotOf = map;
		return map;
	};
	return (text) => {
		if (!text || currentTexts.has(text)) return text;
		const slot = otherSlots().get(text);
		return ((slot && current.get(slot)) ?? text) as typeof text;
	};
};
