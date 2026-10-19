// const/ConstPet.ts
/**
 * 출석 펫 — 탐험가 앵무 '피코' (src/assets/illustrations/parrot/parrot-stage-N.webp, 1~5단계)
 * - 누적 출석일(연속이 아니어도 됨)로 자란다 → 하루 빠져도 펫이 작아지지 않는다
 * - 이름·설명은 번역 파일 pet.stages.N.*
 */
export const PET_STAGES = [
	{ stage: 1, days: 1, img: require('@/src/assets/illustrations/parrot/parrot-stage-1.webp') },
	{ stage: 2, days: 3, img: require('@/src/assets/illustrations/parrot/parrot-stage-2.webp') },
	{ stage: 3, days: 7, img: require('@/src/assets/illustrations/parrot/parrot-stage-3.webp') },
	{ stage: 4, days: 15, img: require('@/src/assets/illustrations/parrot/parrot-stage-4.webp') },
	{ stage: 5, days: 30, img: require('@/src/assets/illustrations/parrot/parrot-stage-5.webp') },
] as const;

export type PetStage = (typeof PET_STAGES)[number];

/** 누적 출석일 → 현재 단계 + 다음 단계(최고 단계면 null) */
export const getPetProgress = (days: number): { current: PetStage; next: PetStage | null } => {
	const idx = PET_STAGES.reduce((acc, s, i) => (days >= s.days ? i : acc), 0);
	return { current: PET_STAGES[idx], next: PET_STAGES[idx + 1] ?? null };
};
