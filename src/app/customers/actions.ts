"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { getCurrentWorkspaceContext } from "@/lib/workspace";

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

function splitList(value: string | null) {
  return value
    ? value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function buildSearchParams(input: Record<string, string>) {
  return new URLSearchParams(input).toString();
}

export async function createCustomerAction(formData: FormData) {
  const name = readRequired(formData, "name");
  const phone = readRequired(formData, "phone");
  const tier = readOptional(formData, "tier") ?? "一般";
  const birthday = readOptional(formData, "birthday");
  const lineId = readOptional(formData, "lineId");
  const note = readOptional(formData, "note");
  const nextReminder = readOptional(formData, "nextReminder");
  const preferences = splitList(readOptional(formData, "preferences"));
  const cautions = splitList(readOptional(formData, "cautions"));
  const tags = splitList(readOptional(formData, "tags"));

  const supabase = await createSupabaseServerClient().catch(() => null);

  if (!supabase) {
    redirect(`/customers?${buildSearchParams({ error: "customer_config_missing" })}`);
  }

  let workspaceId = "";
  let role: Role = "staff";

  try {
    const context = await getCurrentWorkspaceContext(supabase);
    workspaceId = context.workspace.id;
    role = context.membership.role;
  } catch {
    redirect(`/customers?${buildSearchParams({ error: "customer_create_failed" })}`);
  }

  if (!can(role, "customers")) {
    redirect(`/customers?${buildSearchParams({ error: "customer_forbidden" })}`);
  }

  try {
    const { error } = await supabase.from("customers").insert({
      workspace_id: workspaceId,
      name,
      phone,
      birthday,
      line_id: lineId,
      note,
      preferences,
      cautions,
      tier,
      tags,
      next_reminder: nextReminder
    });

    if (error) {
      throw error;
    }
  } catch {
    redirect(`/customers?${buildSearchParams({ error: "customer_create_failed" })}`);
  }

  redirect(`/customers?${buildSearchParams({ message: "customer_created" })}`);
}
