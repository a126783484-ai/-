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

function buildSearchParams(input: Record<string, string>) {
  return new URLSearchParams(input).toString();
}

export async function updateWorkspaceSettingsAction(formData: FormData) {
  const name = readRequired(formData, "name");
  const phone = readOptional(formData, "phone");
  const address = readOptional(formData, "address");
  const brandColor = readOptional(formData, "brandColor");
  const businessHours = readOptional(formData, "businessHours");
  const next = readOptional(formData, "next") ?? "/settings";

  const supabase = await createSupabaseServerClient().catch(() => null);

  if (!supabase) {
    redirect(`/settings?${buildSearchParams({ error: "settings_config_missing" })}`);
  }

  let workspaceId = "";
  let role: Role = "staff";

  try {
    const { workspace, membership } = await getCurrentWorkspaceContext(supabase);
    workspaceId = workspace.id;
    role = membership.role;
  } catch {
    redirect(`/settings?${buildSearchParams({ error: "settings_save_failed" })}`);
  }

  if (!can(role, "settings")) {
    redirect(`/settings?${buildSearchParams({ error: "settings_forbidden" })}`);
  }

  try {
    const { error } = await supabase
      .from("workspaces")
      .update({
        name,
        phone,
        address,
        brand_color: brandColor,
        business_hours: businessHours
      })
      .eq("id", workspaceId);

    if (error) {
      throw error;
    }
  } catch {
    redirect(`/settings?${buildSearchParams({ error: "settings_save_failed" })}`);
  }

  redirect(`${next}?${buildSearchParams({ message: "workspace_saved" })}`);
}
