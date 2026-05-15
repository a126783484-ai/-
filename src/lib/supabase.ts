export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
  demoMode: boolean;
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false"
  };
}
