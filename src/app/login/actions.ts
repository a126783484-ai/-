"use server";

import { redirect } from "next/navigation";
import { normalizeAuthRedirectTarget } from "@/lib/auth-routes";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function readRequired(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function params(input: Record<string, string>) {
  return new URLSearchParams(input).toString();
}

export async function loginAction(formData: FormData) {
  const email = readRequired(formData, "email");
  const secret = readRequired(formData, "password");
  const next = normalizeAuthRedirectTarget(formData.get("next"));
  const supabase = await createSupabaseServerClient().catch(() => null);

  if (!supabase) {
    redirect(`/login?${params({ error: "auth_config_missing", next })}`);
  }

  const result = await supabase.auth.signInWithPassword({ email, password: secret });

  if (result.error) {
    redirect(`/login?${params({ error: "invalid_login", next })}`);
  }

  redirect(next);
}
