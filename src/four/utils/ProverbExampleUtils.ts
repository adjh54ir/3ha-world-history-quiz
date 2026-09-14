import type { MainDataType } from '@/src/four/types/MainDataType';

type ProverbExample = MainDataType.ProverbType['example'];

export const getProverbExamples = (example?: ProverbExample | null): string[] => {
	if (!example) {
		return [];
	}

	return example.map((item) => item.trim()).filter(Boolean);
};

export const formatProverbExamples = (example?: ProverbExample | null): string =>
	getProverbExamples(example)
		.map((item) => `- ${item}`)
		.join('\n');
