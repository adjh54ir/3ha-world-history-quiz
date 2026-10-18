/**
 * 설정에서 언어를 바꾸면 앱을 다시 켜지 않고 바로 따라가는지 — 모듈이 읽힐 때 번역해 둔 값이 이전 언어로 굳으면 깨진다.
 */
import i18n from '@/src/translations';
import { WORLD_ENTRIES, selectEntry } from '@/src/const/data/world/ConstWorldEntries';
import { DIFFICULTY_LABELS } from '@/src/const/ConstQuizMeta';
import { appFonts, bodyFont, DisplayText, KO_FONTS, LATIN_FONTS } from '@/src/const/ConstDesign';
import LearnHubService from '@/src/services/LearnHubService';
import LearnProgressService from '@/src/services/LearnProgressService';

afterEach(() => i18n.changeLanguage('ko-KR'));

describe('언어 즉시 전환', () => {
	it('세계 데이터·주제 이름·난이도·카드·서체가 새 언어로 바뀐다', async () => {
		const id = WORLD_ENTRIES.capital[0].id;
		const ko = { name: WORLD_ENTRIES.capital[0].name, topic: LearnHubService.getDomainTitle('capital'), level: DIFFICULTY_LABELS[1] };
		const koCard = LearnHubService.getStudyCardByUid('capital', id);
		expect(appFonts()).toBe(KO_FONTS);

		await i18n.changeLanguage('en-EN');

		expect(WORLD_ENTRIES.capital[0].name).not.toBe(ko.name);
		expect(selectEntry(id)?.name).toBe(WORLD_ENTRIES.capital[0].name);
		expect(LearnHubService.getDomainTitle('capital')).not.toBe(ko.topic);
		expect(DIFFICULTY_LABELS[1]).not.toBe(ko.level);
		// 카드 캐시도 비워져 새 언어 카드를 돌려준다 (오늘의 상식이 이 길로 다시 찾는다)
		expect(LearnHubService.getStudyCardByUid('capital', id)?.title).not.toBe(koCard?.title);
		// 서체도 언어를 따라간다 — 영어는 Nunito, 한자·가나 서체가 없는 일본어는 시스템 서체 + 굵기
		expect({ ...DisplayText }).toEqual({ fontFamily: LATIN_FONTS.display, fontWeight: '400' });
		expect(bodyFont('bold')).toEqual({ fontFamily: LATIN_FONTS.bold });
		await i18n.changeLanguage('ja-JP');
		expect(appFonts()).toBeUndefined();
		expect(bodyFont('bold')).toEqual({ fontWeight: '700' });

		await i18n.changeLanguage('ko-KR');
		expect(WORLD_ENTRIES.capital[0].name).toBe(ko.name);
		expect(LearnHubService.getStudyCardByUid('capital', id)?.title).toBe(koCard?.title);
	});

	it('다른 언어로 저장한 오답노트를 지금 언어로 되짚는다', async () => {
		await LearnProgressService.clearWrongNotes();
		await i18n.changeLanguage('en-EN');
		const q = LearnHubService.getDomain('capital').generateQuiz({ count: 1 })[0];
		await LearnProgressService.addWrongNotes([
			{ uid: q.uid, domain: q.domain, domainTitle: LearnHubService.getDomainTitle('capital'), prompt: q.prompt, answer: q.options[q.answerIndex], explanation: q.explanation, level: q.level, categoryLabel: q.categoryLabel, examples: q.examples, guide: q.guide },
		]);

		await i18n.changeLanguage('ko-KR');
		const [w] = await LearnProgressService.getWrongNotes();
		const entry = selectEntry(q.uid)!;
		expect(w.domainTitle).toBe(LearnHubService.getDomainTitle('capital'));
		expect(w.examples).toEqual(entry.facts);
		expect(w.level).toBe(DIFFICULTY_LABELS[entry.level]);
		// 수도 주제는 발문·문제·정답·해설이 모두 한글이 된다 (영어로 남으면 되짚기 실패)
		[w.guide, w.prompt, w.answer, w.explanation].forEach((v) => expect(v).toMatch(/[가-힣]/));
	});
});
