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

function isWrongProductionProject(url?: string) {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const actualProjectRef = getSupabaseProjectRef(url);
  return Boolean(actualProjectRef && actualProjectRef !== EXPECTED_PRODUCTION_SUPABASE_PROJECT_REF);
}

export function assertSupabaseProductionConfig(config: SupabaseConfig): asserts config is SupabaseConfig & { url: string; anonKey: string } {
  if (!config.url || !config.anonKey) {
    throw new SupabaseConfigError("Supabase environment variables are missing.");
  }

  const publicProjectRef = getSupabaseProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serverProjectRef = getSupabaseProjectRef(process.env.SUPABASE_URL);
  const configuredProjectRef = firstDefined(
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF,
    process.env.SUPABASE_PROJECT_REF,
    EXPECTED_PRODUCTION_SUPABASE_PROJECT_REF
  );

  if (publicProjectRef && serverProjectRef && publicProjectRef !== serverProjectRef) {
    throw new SupabaseConfigError(
      "Supabase URL mismatch: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_URL point to different projects."
    );
  }

  const actualProjectRef = getSupabaseProjectRef(config.url);

  if (configuredProjectRef && actualProjectRef && configuredProjectRef !== actualProjectRef) {
    throw new SupabaseConfigError(
      "Supabase project mismatch: production must point to the expected Supabase project."
    );
  }
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = firstDefined(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL);
  const anonKey = firstDefined(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, process.env.SUPABASE_ANON_KEY);

  return {
    url,
    anonKey,
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

  if (isWrongProductionProject(config.url)) {
    throw new SupabaseConfigError("Production Supabase project mismatch.");
  }

  const clientKey = `${config.url}|${config.anonKey}`;

  if (!browserClient || browserClientKey !== clientKey) {
    browserClient = createBrowserClient<Database, "public">(config.url, config.anonKey);
    browserClientKey = clientKey;
  }

  return browserClient;
}
