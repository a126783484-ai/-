"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function readRequired(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function buildSearchParams(input: Record<string, string>) {
  return new URLSearchParams(input).toString();
}

export async function acceptStaffInviteAction(formData: FormData) {
  const token = readRequired(formData, "token");
  const supabase = await createSupabaseServerClient().catch(() => null);

  if (!supabase) {
    redirect(`/login?${buildSearchParams({ error: "auth_config_missing", next: `/staff/invite/${token}` })}`);
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    redirect(`/login?${buildSearchParams({ next: `/staff/invite/${token}` })}`);
  }

  let rpcError: { code?: string; message?: string } | null = null;

  try {
    const { error } = await supabase.rpc("accept_workspace_member_invite", {
      invite_token: token
    });

    if (error) {
      rpcError = error;
    }
  } catch (error) {
    rpcError = error as { code?: string; message?: string };
  }

  if (rpcError) {
    if (rpcError.code === "PGRST202" || rpcError.message?.includes("accept_workspace_member_invite")) {
      redirect(`/staff/invite/${token}?${buildSearchParams({ error: "staff_invite_unavailable" })}`);
    }
    if (rpcError.code === "P0001" || rpcError.code === "28000") {
      redirect(`/staff/invite/${token}?${buildSearchParams({ error: "staff_invite_invalid" })}`);
    }
    console.error("acceptStaffInviteAction failed", rpcError);
    redirect(`/staff/invite/${token}?${buildSearchParams({ error: "staff_invite_failed" })}`);
  }

  redirect(`/staff?${buildSearchParams({ message: "staff_invite_accepted" })}`);
}
