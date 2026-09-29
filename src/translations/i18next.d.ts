import type { SupportedLanguages } from '@/src/hooks/language/schema';
import type { defaultNS, resources } from '@/src/translations';

type Join<K, P> = K extends number | string
  ? P extends number | string
  ? `${K}.${P}`
  : never
  : never;

type RecursiveKeys<T> = T extends object
  ? {
    [K in keyof T]: T[K] extends object ? Join<K, RecursiveKeys<T[K]>> : K;
  }[keyof T]
  : never;

// default 언어 지정
type defaultTranslations = (typeof resources)[SupportedLanguages.KR_KR];

export type TranslationKeys = RecursiveKeys<
  defaultTranslations[typeof defaultNS]
>;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: defaultTranslations;
  }
}
