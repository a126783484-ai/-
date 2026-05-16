"use server";

import { redirect } from "next/navigation";
import { normalizeAuthRedirectTarget } from "@/lib/auth-routes";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { bootstrapOwnerWorkspace } from "@/lib/workspace";

function readRequired(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function readOptional(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function buildSearchParams(input: Record<string, string>) {
  return new URLSearchParams(input).toString();
}

export async function signInAction(formData: FormData) {
  const email = readRequired(formData, "email");
  const password = readRequired(formData, "password");
  const next = normalizeAuthRedirectTarget(formData.get("next"));
  const supabase = await createSupabaseServerClient().catch(() => null);

  if (!supabase) {
    redirect(`/login?${buildSearchParams({ error: "auth_config_missing", next })}`);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?${buildSearchParams({ error: "invalid_login", next })}`);
  }

  redirect(next);
}

export async function signOutAction() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } finally {
    redirect("/login?message=signed_out");
  }
}

export async function createAccountAction(formData: FormData) {
  const workspaceName = readRequired(formData, "workspaceName");
  const email = readRequired(formData, "email");
  const password = readRequired(formData, "password");
  const phone = readOptional(formData, "phone");
  const displayName = readOptional(formData, "displayName");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const supabase = await createSupabaseServerClient().catch(() => null);

  if (!supabase) {
    redirect(`/register?${buildSearchParams({ error: "auth_config_missing" })}`);
  }

  const result = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=/`,
      data: {
        workspace_name: workspaceName,
        display_name: displayName ?? undefined,
        phone: phone ?? undefined
      }
    }
  });

  if (result.error || !result.data.user) {
    redirect(`/register?${buildSearchParams({ error: "signup_failed" })}`);
  }

  if (!result.data.session) {
    redirect("/login?message=check_email");
  }

  try {
    await bootstrapOwnerWorkspace({
      user: result.data.user,
      workspaceName,
      phone,
      displayName
    });
  } catch {
    redirect(`/login?${buildSearchParams({ error: "workspace_bootstrap_failed" })}`);
  }

  redirect("/");
}
