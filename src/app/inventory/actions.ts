"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import { getCurrentWorkspaceContext } from "@/lib/workspace";
import type { InventoryMovementType } from "@/lib/types";

type AppSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function readRequired(formData: FormData, key: string, errorCode = "inventory_invalid_input") {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(errorCode);
  }
  return value.trim();
}

function readOptional(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function buildSearchParams(input: Record<string, string>) {
  return new URLSearchParams(input).toString();
}

function fail(code: string): never {
  redirect(`/inventory?${buildSearchParams({ error: code })}`);
}

function parseQuantity(raw: string) {
  const quantity = Number.parseFloat(raw);
  return Number.isFinite(quantity) ? quantity : null;
}

function inventoryMovementType(value: string): InventoryMovementType | null {
  return value === "purchase" || value === "consume" || value === "adjust" ? value : null;
}

async function getContext(supabase: AppSupabaseClient) {
  try {
    return await getCurrentWorkspaceContext(supabase);
  } catch {
    fail("inventory_movement_failed");
  }
}

function refreshInventory() {
  for (const path of ["/", "/inventory", "/operations", "/reports"]) {
    revalidatePath(path);
  }
}

async function assertInventoryItem(
  supabase: AppSupabaseClient,
  workspaceId: string,
  itemId: string,
) {
  const { count, error } = await supabase
    .from("inventory_items")
    .select("id", { count: "exact", head: true })
    .eq("id", itemId)
    .eq("workspace_id", workspaceId)
  ;

  if (error) {
    throw new Error(`inventory item lookup failed: ${error.message}`);
  }

  if ((count ?? 0) <= 0) {
    throw new Error("找不到此工作區內的庫存品項，請重新選擇。");
  }
}

export async function saveInventoryItemAction(formData: FormData) {
  const supabase = await createSupabaseServerClient().catch(() => null);
  if (!supabase) {
    fail("inventory_config_missing");
  }

  const context = await getContext(supabase);
  if (!can(context.membership.role, "inventory")) {
    fail("inventory_forbidden");
  }

  const id = readOptional(formData, "id");
  const name = readRequired(formData, "name", "inventory_item_invalid_input");
  const category = readRequired(formData, "category", "inventory_item_invalid_input");
  const brand = readOptional(formData, "brand");
  const cost = readNumber(formData, "cost");
  const retailPrice = readNumber(formData, "retail_price");
  const quantity = readNumber(formData, "quantity");
  const lowStockThreshold = readNumber(formData, "low_stock_threshold");

  if (cost === null || cost < 0) {
    fail("inventory_item_invalid_input");
  }

  if (retailPrice === null || retailPrice < 0) {
    fail("inventory_item_invalid_input");
  }

  if (quantity === null || quantity < 0) {
    fail("inventory_item_invalid_input");
  }

  if (lowStockThreshold === null || lowStockThreshold < 0) {
    fail("inventory_item_invalid_input");
  }

  try {
    const payload = {
      workspace_id: context.workspace.id,
      brand,
      category,
      name,
      cost,
      retail_price: retailPrice,
      quantity,
      low_stock_threshold: lowStockThreshold,
    };

    if (id) {
      await assertInventoryItem(supabase, context.workspace.id, id);
      const { error } = await supabase
        .from("inventory_items")
        .update(payload)
        .eq("id", id)
        .eq("workspace_id", context.workspace.id);

      if (error) {
        throw new Error(`儲存庫存品項失敗：${error.message}`);
      }
    } else {
      const { error } = await supabase.from("inventory_items").insert(payload);
      if (error) {
        throw new Error(`建立庫存品項失敗：${error.message}`);
      }
    }
  } catch (error) {
    console.error("saveInventoryItemAction failed", error);
    if (error instanceof Error && error.message.includes("找不到此工作區內的庫存品項")) {
      fail("inventory_item_invalid_input");
    }
    fail("inventory_item_failed");
  }

  refreshInventory();
  redirect(`/inventory?${buildSearchParams({ message: "inventory_item_saved" })}`);
}

export async function recordInventoryMovementAction(formData: FormData) {
  const itemId = readRequired(formData, "item_id");
  const movementType = inventoryMovementType(readRequired(formData, "movement_type"));
  const quantityRaw = readRequired(formData, "quantity");
  const note = readOptional(formData, "note");

  if (!movementType) {
    fail("inventory_invalid_input");
  }

  const quantity = parseQuantity(quantityRaw);
  if (quantity === null || quantity === 0) {
    fail("inventory_invalid_input");
  }

  if ((movementType === "purchase" || movementType === "consume") && quantity < 0) {
    fail("inventory_invalid_input");
  }

  const supabase = await createSupabaseServerClient().catch(() => null);
  if (!supabase) {
    fail("inventory_config_missing");
  }

  const context = await getContext(supabase);
  if (!can(context.membership.role, "inventory")) {
    fail("inventory_forbidden");
  }

  const { count: itemCount, error: itemError } = await supabase
    .from("inventory_items")
    .select("id", { count: "exact", head: true })
    .eq("id", itemId)
    .eq("workspace_id", context.workspace.id);

  if (itemError) {
    console.error("inventory item lookup failed", itemError);
    fail("inventory_movement_failed");
  }

  if ((itemCount ?? 0) <= 0) {
    fail("inventory_invalid_input");
  }

  try {
    const { error } = await (supabase as typeof supabase & {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    }).rpc("record_inventory_movement", {
      p_item_id: itemId,
      p_movement_type: movementType,
      p_quantity: quantity,
      p_note: note,
    });

    if (error) {
      if (String(error.message).includes("庫存不足")) {
        throw new Error("inventory_insufficient_stock");
      }
      throw error;
    }
  } catch (error) {
    console.error("recordInventoryMovementAction failed", error);
    if (error instanceof Error && error.message === "inventory_insufficient_stock") {
      fail("inventory_insufficient_stock");
    }
    fail("inventory_movement_failed");
  }

  refreshInventory();
  redirect(`/inventory?${buildSearchParams({ message: "inventory_movement_recorded" })}`);
}
