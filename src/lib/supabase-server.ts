import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { getSupabaseConfig } from "@/lib/supabase";

export async function createSupabaseServerClient() {
  const config = getSupabaseConfig();

  if (!config.url || !config.anonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.anonKey, {
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
