export const ENV = {
  APP_MODE: process.env.EXPO_PUBLIC_APP_MODE!,
  BASE_API_URL: process.env.EXPO_PUBLIC_API_URL!,
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
} as const;
