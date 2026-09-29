import { Paths } from '@/src/navigation/conf/Paths';

type SearchParamValue = string | number | boolean | null | undefined | object;
type SearchParams = Record<string, SearchParamValue>;

export const toExpoPath = (path: Paths | string) => `/${path}`;

export const toHref = (path: Paths | string, params?: SearchParams) => ({
	pathname: toExpoPath(path),
	params: encodeParams(params),
});

export const encodeParams = (params?: SearchParams) => {
	if (!params) {
		return undefined;
	}

	return Object.entries(params).reduce<Record<string, string | number | undefined>>((acc, [key, value]) => {
		if (value === undefined || value === null) {
			return acc;
		}
		acc[key] = typeof value === 'object' || typeof value === 'boolean' ? JSON.stringify(value) : value;
		return acc;
	}, {});
};

export const parseJsonParam = <T,>(value: string | string[] | undefined, fallback: T): T => {
	const raw = Array.isArray(value) ? value[0] : value;
	if (!raw) {
		return fallback;
	}

	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
};

export const stringParam = (value: string | string[] | undefined, fallback = '') => {
	return (Array.isArray(value) ? value[0] : value) ?? fallback;
};

export const numberParam = (value: string | string[] | undefined, fallback: number) => {
	const raw = Array.isArray(value) ? value[0] : value;
	const parsed = Number(raw);
	return Number.isFinite(parsed) ? parsed : fallback;
};
