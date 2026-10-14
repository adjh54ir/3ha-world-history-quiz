import { WORLD_I18N } from '@/src/const/data/world/i18n';
import { WORLD_ENTRIES } from '@/src/const/data/world/ConstWorldEntries';

/** 언어 묶음이 한국어 원본과 어긋나지 않는지 — 항목 빠짐, 곁가지·이야기 수, 남은 한글, 설명에 정답 이름 */
describe('세계 데이터 번역 묶음', () => {
	const HANGUL = /[가-힣]/;
	Object.entries(WORLD_I18N).forEach(([lang, pack]) => {
		it(`${lang}: 모든 항목·용어가 번역돼 있다`, () => {
			Object.entries(WORLD_ENTRIES).forEach(([topic, entries]) => {
				entries.forEach((e) => {
					const t = pack!.topics[topic as keyof typeof WORLD_ENTRIES]?.[e.id];
					expect(t).toBeDefined();
					expect(t!.facts).toHaveLength(e.facts.length);
					expect(t!.stories?.length ?? 0).toBe(e.stories?.length ?? 0);
					expect(HANGUL.test(JSON.stringify(t))).toBe(false);
					const name = pack!.terms[e.name];
					expect(name).toBeDefined();
					if (name.length > 1) expect(t!.summary.toLowerCase()).not.toContain(name.toLowerCase());
					Object.entries(e.fields).forEach(([k, v]) => k !== 'image' && HANGUL.test(v) && expect(pack!.terms[v]).toBeDefined());
				});
			});
		});
	});
});
