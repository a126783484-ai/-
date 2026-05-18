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

function readBoolean(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true";
}

function parsePositiveInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function buildSearchParams(input: Record<string, string>) {
  return new URLSearchParams(input).toString();
}

function fail(code: string): never {
  redirect(`/services?${buildSearchParams({ error: code })}`);
}

export async function updateServiceAction(formData: FormData) {
  const serviceId = readRequired(formData, "serviceId");
  const name = readRequired(formData, "name");
  const category = readOptional(formData, "category");
  const description = readOptional(formData, "description");
  const priceRaw = readRequired(formData, "price");
  const durationRaw = readRequired(formData, "durationMin");
  const addOn = readBoolean(formData, "addOn");
  const enabled = readBoolean(formData, "enabled");

  const price = parseNonNegativeInteger(priceRaw);
  const durationMin = parsePositiveInteger(durationRaw);
  if (price === null || durationMin === null) {
    fail("service_update_invalid_input");
  }

  const supabase = await createSupabaseServerClient().catch(() => null);
  if (!supabase) {
    fail("service_update_config_missing");
  }

  let workspaceId = "";
  let role: Role = "staff";

  try {
    const context = await getCurrentWorkspaceContext(supabase);
    workspaceId = context.workspace.id;
    role = context.membership.role;
  } catch {
    fail("service_update_failed");
  }

  if (!can(role, "services")) {
    fail("service_update_forbidden");
  }

  try {
    let categoryId: string | null = null;

    if (category) {
      const { data: existingCategory, error: categoryLookupError } = await supabase
        .from("service_categories")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("name", category)
        .maybeSingle();

      if (categoryLookupError) {
        throw categoryLookupError;
      }

      if (existingCategory?.id) {
        categoryId = existingCategory.id;
      } else {
        const { data: insertedCategory, error: categoryInsertError } = await supabase
          .from("service_categories")
          .insert({
            workspace_id: workspaceId,
            name: category,
            sort_order: 0
          })
          .select("id")
          .single();

        if (categoryInsertError) {
          throw categoryInsertError;
        }

        categoryId = insertedCategory.id;
      }
    }

    const { error } = await supabase
      .from("services")
      .update({
        category_id: categoryId,
        name,
        price,
        duration_min: durationMin,
        description,
        enabled,
        is_add_on: addOn
      })
      .eq("workspace_id", workspaceId)
      .eq("id", serviceId);

    if (error) {
      if (String(error.message).includes("0 rows")) {
        fail("service_update_invalid_input");
      }
      throw error;
    }
  } catch (error) {
    console.error("service update failed", error);
    fail("service_update_failed");
  }

  redirect(`/services?${buildSearchParams({ message: "service_updated" })}`);
}
