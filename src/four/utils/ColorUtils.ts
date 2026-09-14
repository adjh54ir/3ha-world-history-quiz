import { ColorSchemeName } from 'react-native';

/**
 * 테마 팔레트 — 통합 컬러 시스템(src/const/ConstColors.ts) 기준
 * 모든 테마는 에메랄드 그린 톤을 기본으로 합니다.
 */
export const color = {
	dark: {
		backgroundColor: '#0F172A', // slate-900
		primaryColor: '#22C55E', // emerald-400 (다크 배경 대비 확보)
		secondaryColor: '#94A3B8', // slate-400
		textColor: '#F1F5F9', // slate-100
	},
	light: {
		backgroundColor: '#F8FAFC', // slate-50
		primaryColor: '#22C55E', // emerald-600
		secondaryColor: '#64748B', // slate-500
		textColor: '#334155', // slate-700
	},
	theme1: {
		backgroundColor: '#EFF6FF', // emerald-50
		primaryColor: '#22C55E', // emerald-500
		secondaryColor: '#BFDBFE', // emerald-200
		textColor: '#334155', // slate-700
	},
	theme2: {
		backgroundColor: '#EFF6FF', // blue-50
		primaryColor: '#22C55E', // blue-600
		secondaryColor: '#BFDBFE', // blue-200
		textColor: '#1E293B', // slate-800
	},
	theme3: {
		backgroundColor: '#FFFBEB', // amber-50
		primaryColor: '#D97706', // amber-600
		secondaryColor: '#FDE68A', // amber-200
		textColor: '#334155', // slate-700
	},
	theme4: {
		backgroundColor: '#F1F5F9', // slate-100
		primaryColor: '#22C55E', // emerald-700
		secondaryColor: '#CBD5E1', // slate-300
		textColor: '#1E293B', // slate-800
	},
};

export type Palette = (typeof color)[keyof typeof color];

export type Theme = ColorSchemeName | keyof typeof color;
