import type { defaultNS } from '@/src/translations';

/**
 * 번역 타입 선언.
 * -------------------------------------------------
 * 처음에는 ko-KR.json 을 그대로 읽어 키를 리터럴 유니온으로 좁혔다. 오타를 컴파일에서 잡을 수 있었지만,
 * 키가 300개를 넘어가자 TypeScript 가 `Type instantiation is excessively deep` 로 멈춰 섰다.
 * 앞으로 더 늘어날 키를 타입으로 버티게 하려면 화면 코드가 아니라 컴파일러를 돌보게 된다.
 *
 * 그래서 키 검사는 타입이 아니라 테스트가 한다 (`src/translations/keys.test.ts`).
 *  - 세 언어가 같은 키를 갖는지
 *  - 코드에서 부르는 `t('…')` 키가 실제로 번역 파일에 있는지
 *  - 자리표시자 이름이 어긋나지 않는지
 * 셋 다 `yarn test` 한 번으로 걸린다.
 */
declare module 'i18next' {
	interface CustomTypeOptions {
		defaultNS: typeof defaultNS;
		// 문구는 언제나 문자열로 받는다 — t() 가 객체를 돌려주는 분기를 타지 않게 한다
		returnNull: false;
		returnObjects: false;
	}
}
