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

function fail(code: string): never {
  redirect(`/customers?${buildSearchParams({ error: code })}`);
}

export async function updateCustomerAction(formData: FormData) {
  const customerId = readRequired(formData, "customerId");
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
    fail("customer_update_config_missing");
  }

  let workspaceId = "";
  let role: Role = "staff";

  try {
    const context = await getCurrentWorkspaceContext(supabase);
    workspaceId = context.workspace.id;
    role = context.membership.role;
  } catch {
    fail("customer_update_failed");
  }

  if (!can(role, "customers")) {
    fail("customer_update_forbidden");
  }

  try {
    const { data: customer, error: lookupError } = await supabase
      .from("customers")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("id", customerId)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (!customer) {
      fail("customer_update_invalid_input");
    }

    const { error } = await supabase
      .from("customers")
      .update({
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
      })
      .eq("workspace_id", workspaceId)
      .eq("id", customerId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("customer update failed", error);
    fail("customer_update_failed");
  }

  redirect(`/customers?${buildSearchParams({ message: "customer_updated" })}`);
}
