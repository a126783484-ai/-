import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

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

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient() {
  const config = getSupabaseConfig();

  if (!config.url || !config.anonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(config.url, config.anonKey);
  }

  return browserClient;
}
