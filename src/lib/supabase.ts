import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
  demoMode: boolean;
}

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

const EXPECTED_PRODUCTION_SUPABASE_PROJECT_REF = "odzxyhaoehvhfximnwjh";
const EXPECTED_PRODUCTION_SUPABASE_URL = "https://odzxyhaoehvhfximnwjh.supabase.co";
const EXPECTED_PRODUCTION_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kenh5aGFvZWh2aGZ4aW1ud2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTEzMzcsImV4cCI6MjA5NDA4NzMzN30.MoUPUR1Fsjh3LqScqHqtGs008fH26orpekYQji5D--o";

function firstDefined(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

export function getSupabaseProjectRef(url?: string) {
  if (!url) {
    return null;
  }

  try {
    const hostname = new URL(url).hostname;
    const [projectRef, ...rest] = hostname.split(".");
    return rest.join(".") === "supabase.co" && projectRef ? projectRef : null;
  } catch {
    return null;
  }
}

function isWrongSupabaseProject(url?: string) {
  const actualProjectRef = getSupabaseProjectRef(url);
  return Boolean(actualProjectRef && actualProjectRef !== EXPECTED_PRODUCTION_SUPABASE_PROJECT_REF);
}

export function assertSupabaseProductionConfig(config: SupabaseConfig): asserts config is SupabaseConfig & { url: string; anonKey: string } {
  if (!config.url || !config.anonKey) {
    throw new SupabaseConfigError("Supabase environment variables are missing.");
  }

  const actualProjectRef = getSupabaseProjectRef(config.url);

  if (actualProjectRef && actualProjectRef !== EXPECTED_PRODUCTION_SUPABASE_PROJECT_REF) {
    throw new SupabaseConfigError(
      "Supabase project mismatch: configured project ref must match the canonical Supabase URL."
    );
  }
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = firstDefined(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL);
  const envAnonKey = firstDefined(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, process.env.SUPABASE_ANON_KEY);
  const shouldForceProductionSupabase = isWrongSupabaseProject(envUrl);

  return {
    url: shouldForceProductionSupabase ? EXPECTED_PRODUCTION_SUPABASE_URL : envUrl,
    anonKey: shouldForceProductionSupabase ? EXPECTED_PRODUCTION_SUPABASE_ANON_KEY : envAnonKey,
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false"
  };
}

let browserClient: SupabaseClient<Database> | null = null;
let browserClientKey: string | null = null;

export function getSupabaseBrowserClient() {
  const config = getSupabaseConfig();

  if (!config.url || !config.anonKey) {
    throw new SupabaseConfigError("Supabase environment variables are missing.");
  }

  const clientKey = `${config.url}|${config.anonKey}`;

  if (!browserClient || browserClientKey !== clientKey) {
    browserClient = createBrowserClient<Database, "public">(config.url, config.anonKey);
    browserClientKey = clientKey;
  }

  return browserClient;
}
