import { z } from 'zod';

export const enum SupportedLanguages {
  KR_KR = 'ko-KR',
  EN_EN = 'en-EN',
  ZH_CN = 'zh-CN',
  JA_JP = 'ja-JP',
  FR_FR = 'fr-FR',
  ES_ES = 'es-ES',
}

export const languageSchema = z.enum([
  SupportedLanguages.KR_KR,
  SupportedLanguages.EN_EN,
  SupportedLanguages.ZH_CN,
  SupportedLanguages.JA_JP,
  SupportedLanguages.FR_FR,
  SupportedLanguages.ES_ES,
]);

export type Language = z.infer<typeof languageSchema>;
