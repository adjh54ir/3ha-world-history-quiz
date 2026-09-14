/**
 * 빈칸 채우기 보기 만들기
 * -------------------------------------------------
 * 오답 3개를 각자 다른 한자어에서 한 글자씩 뽑으면 두 가지가 어긋난다.
 *  1) 흔한 글자(一·不·之)가 겹쳐 같은 보기가 두 번 나온다
 *  2) 뽑은 글자가 정답과 같아 걸러지면 보기가 3개로 줄어든다
 * 겹치지 않는 글자로 채워 항상 서로 다른 `size` 개를 돌려준다.
 */
export const buildBlankChoices = (
	correctWord: string,
	distractorWords: string[],
	sparePool: string[],
	size: number = 4,
): string[] => {
	const picked = new Set<string>();
	if (correctWord.trim()) {
		picked.add(correctWord);
	}
	for (const word of distractorWords) {
		if (picked.size >= size) {
			break;
		}
		if (word && word.trim()) {
			picked.add(word);
		}
	}
	for (const char of sparePool) {
		if (picked.size >= size) {
			break;
		}
		if (char && char.trim()) {
			picked.add(char);
		}
	}
	return [...picked];
};
