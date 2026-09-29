import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { ENV } from '@/env';

/** .env 에 EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 가 있어야 랭킹이 동작 */
export const isSupabaseConfigured = !!ENV.SUPABASE_URL && !!ENV.SUPABASE_ANON_KEY;

/** 미설정 시에도 앱이 죽지 않도록 placeholder 로 생성(실제 호출은 isSupabaseConfigured 로 가드) */
export const supabase = createClient(
	ENV.SUPABASE_URL || 'https://placeholder.supabase.co',
	ENV.SUPABASE_ANON_KEY || 'public-anon-key',
	{
		auth: {
			storage: AsyncStorage as unknown as undefined,
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: false,
		},
	},
);
