/**
 * 세계 데이터 번역 묶음 — 언어 폴더(<lang>/terms.json·<topic>.json)를 정적으로 묶는다 (Metro 는 동적 require 를 못 한다).
 * terms  : 한국어 값 → 번역 (이름·대륙·나라·시대 같은 필드 값). 같은 값은 어느 주제에서나 같은 말로 옮긴다.
 * topics : 항목 id → 설명·곁가지·이야기 번역.
 * 한국어는 원본 JSON 이라 여기 없다. 빠진 값은 한국어로 남는다.
 */
import type { Language } from '@/src/hooks/language/schema';
import type { WorldType } from '@/src/types/data/WorldType';
import enENTerms from './en-EN/terms.json';
import enEN_capital from './en-EN/capital.json';
import enEN_landmark from './en-EN/landmark.json';
import enEN_nature from './en-EN/nature.json';
import enEN_figure from './en-EN/figure.json';
import enEN_event from './en-EN/event.json';
import enEN_myth from './en-EN/myth.json';
import enEN_space from './en-EN/space.json';
import enEN_constellation from './en-EN/constellation.json';
import enEN_worldcup from './en-EN/worldcup.json';
import enEN_olympic from './en-EN/olympic.json';
import enEN_winter from './en-EN/winter.json';
import zhCNTerms from './zh-CN/terms.json';
import zhCN_capital from './zh-CN/capital.json';
import zhCN_landmark from './zh-CN/landmark.json';
import zhCN_nature from './zh-CN/nature.json';
import zhCN_figure from './zh-CN/figure.json';
import zhCN_event from './zh-CN/event.json';
import zhCN_myth from './zh-CN/myth.json';
import zhCN_space from './zh-CN/space.json';
import zhCN_constellation from './zh-CN/constellation.json';
import zhCN_worldcup from './zh-CN/worldcup.json';
import zhCN_olympic from './zh-CN/olympic.json';
import zhCN_winter from './zh-CN/winter.json';
import jaJPTerms from './ja-JP/terms.json';
import jaJP_capital from './ja-JP/capital.json';
import jaJP_landmark from './ja-JP/landmark.json';
import jaJP_nature from './ja-JP/nature.json';
import jaJP_figure from './ja-JP/figure.json';
import jaJP_event from './ja-JP/event.json';
import jaJP_myth from './ja-JP/myth.json';
import jaJP_space from './ja-JP/space.json';
import jaJP_constellation from './ja-JP/constellation.json';
import jaJP_worldcup from './ja-JP/worldcup.json';
import jaJP_olympic from './ja-JP/olympic.json';
import jaJP_winter from './ja-JP/winter.json';
import frFRTerms from './fr-FR/terms.json';
import frFR_capital from './fr-FR/capital.json';
import frFR_landmark from './fr-FR/landmark.json';
import frFR_nature from './fr-FR/nature.json';
import frFR_figure from './fr-FR/figure.json';
import frFR_event from './fr-FR/event.json';
import frFR_myth from './fr-FR/myth.json';
import frFR_space from './fr-FR/space.json';
import frFR_constellation from './fr-FR/constellation.json';
import frFR_worldcup from './fr-FR/worldcup.json';
import frFR_olympic from './fr-FR/olympic.json';
import frFR_winter from './fr-FR/winter.json';
import esESTerms from './es-ES/terms.json';
import esES_capital from './es-ES/capital.json';
import esES_landmark from './es-ES/landmark.json';
import esES_nature from './es-ES/nature.json';
import esES_figure from './es-ES/figure.json';
import esES_event from './es-ES/event.json';
import esES_myth from './es-ES/myth.json';
import esES_space from './es-ES/space.json';
import esES_constellation from './es-ES/constellation.json';
import esES_worldcup from './es-ES/worldcup.json';
import esES_olympic from './es-ES/olympic.json';
import esES_winter from './es-ES/winter.json';

export type WorldEntryText = { summary: string; facts: string[]; stories?: string[] };
export type WorldLangPack = { terms: Record<string, string>; topics: Partial<Record<WorldType.TopicKey, Record<string, WorldEntryText>>> };

export const WORLD_I18N: Partial<Record<Language, WorldLangPack>> = {
	'en-EN': { terms: enENTerms, topics: { capital: enEN_capital, landmark: enEN_landmark, nature: enEN_nature, figure: enEN_figure, event: enEN_event, myth: enEN_myth, space: enEN_space, constellation: enEN_constellation, worldcup: enEN_worldcup, olympic: enEN_olympic, winter: enEN_winter } },
	'zh-CN': { terms: zhCNTerms, topics: { capital: zhCN_capital, landmark: zhCN_landmark, nature: zhCN_nature, figure: zhCN_figure, event: zhCN_event, myth: zhCN_myth, space: zhCN_space, constellation: zhCN_constellation, worldcup: zhCN_worldcup, olympic: zhCN_olympic, winter: zhCN_winter } },
	'ja-JP': { terms: jaJPTerms, topics: { capital: jaJP_capital, landmark: jaJP_landmark, nature: jaJP_nature, figure: jaJP_figure, event: jaJP_event, myth: jaJP_myth, space: jaJP_space, constellation: jaJP_constellation, worldcup: jaJP_worldcup, olympic: jaJP_olympic, winter: jaJP_winter } },
	'fr-FR': { terms: frFRTerms, topics: { capital: frFR_capital, landmark: frFR_landmark, nature: frFR_nature, figure: frFR_figure, event: frFR_event, myth: frFR_myth, space: frFR_space, constellation: frFR_constellation, worldcup: frFR_worldcup, olympic: frFR_olympic, winter: frFR_winter } },
	'es-ES': { terms: esESTerms, topics: { capital: esES_capital, landmark: esES_landmark, nature: esES_nature, figure: esES_figure, event: esES_event, myth: esES_myth, space: esES_space, constellation: esES_constellation, worldcup: esES_worldcup, olympic: esES_olympic, winter: esES_winter } },
};
