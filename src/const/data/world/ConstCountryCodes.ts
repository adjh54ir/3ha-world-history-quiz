/**
 * 나라 이름 → 국기 코드 — 국기를 글자 옆에 붙이기 위한 대응표.
 * -------------------------------------------------
 * 국기 파일은 수도 주제의 `fields.code`(두 자리 코드)로 찾는다. 그런데 위인·랜드마크·월드컵·올림픽은
 * 코드를 들고 있지 않고 나라를 **한국어 이름**으로만 적어 둔다. 그 사이를 잇는 것이 여기다.
 *
 * 대응표는 capital.json 의 표제에서 그대로 만든다 (나라 242개가 이미 이름과 코드를 짝지어 들고 있다).
 * 이 파일은 JSON 을 직접 들이지 않는다 — `node --test` 가 그림·JSON import 문법 없이 이 로직만
 * 읽어 갈 수 있어야 하기 때문이다. 짝을 지어 주는 일은 ConstFlagImages 가 한다.
 */

/**
 * capital.json 의 표제와 다르게 적힌 이름들.
 *
 * 지금 남은 것은 **사라진 나라**뿐이다. 한때 주제마다 같은 나라를 다르게 부르던 것(대한민국/한국,
 * 오스트레일리아/호주)은 데이터를 원전 표기로 통일해 없앴다 — 별칭으로 덮으면 국기는 붙어도
 * 화면에는 여전히 두 이름이 보인다.
 *
 * 서독은 지금의 독일 국기와 같은 깃발을 썼다 (검정·빨강·금색). 그래서 de 로 잇는다.
 * 소련·독립국가연합·체코슬로바키아·잉글랜드는 일부러 뺐다 — 앞의 셋은 국기 파일이 아예 없고,
 * 잉글랜드는 영국(gb, 유니언잭)과 깃발이 달라서 gb 를 걸면 틀린 깃발을 보여 주게 된다.
 */
export const COUNTRY_CODE_ALIASES: Record<string, string> = {
	서독: 'de',
};

/** capital.json 을 받아 이름 → 코드 표를 만든다 (별칭이 표제를 덮어쓴다) */
export const buildCountryCodes = (entries: { name: string; fields: Record<string, string> }[]): Record<string, string> => {
	const codes: Record<string, string> = {};
	entries.forEach((entry) => {
		if (entry.fields.code) {
			codes[entry.name] = entry.fields.code;
		}
	});
	return { ...codes, ...COUNTRY_CODE_ALIASES };
};

/**
 * 값 하나에 걸린 나라 코드들 — '미국·캐나다·멕시코' 처럼 여럿이 함께 연 대회가 있어 목록으로 준다.
 *
 * **하나라도 못 찾으면 전부 버린다.** 셋 중 둘만 국기가 뜨면 나머지 하나가 나라가 아닌 것처럼 보인다.
 */
export const selectCountryCodes = (value: string, codes: Record<string, string>): string[] => {
	const found = value.split('·').map((name) => codes[name.trim()]);
	return found.every((code) => !!code) ? found : [];
};
