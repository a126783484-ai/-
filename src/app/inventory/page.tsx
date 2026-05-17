export const dynamic = "force-dynamic";

import { InventoryView } from "@/components/ModuleViews";
import { loadAppData } from "@/lib/app-data";
import { getInventoryError, getInventoryMessage, readInventoryParam } from "@/lib/inventory-feedback";

interface InventoryPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const data = await loadAppData();
  const params = searchParams ? await searchParams : undefined;
  const message = getInventoryMessage(readInventoryParam(params?.message));
  const error = getInventoryError(readInventoryParam(params?.error));
  const notice = error ? { kind: "error" as const, message: error } : message ? { kind: "success" as const, message } : undefined;

  return <InventoryView data={data} notice={notice} />;
}
