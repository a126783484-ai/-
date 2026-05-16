import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { assertSupabaseProductionConfig, getSupabaseConfig } from "@/lib/supabase";

export async function createSupabaseServerClient() {
  const config = getSupabaseConfig();

  assertSupabaseProductionConfig(config);

  const cookieStore = await cookies();

  return createServerClient<Database, "public">(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies. Middleware / route handlers handle refresh writes.
        }
      }
    }
  });
}
