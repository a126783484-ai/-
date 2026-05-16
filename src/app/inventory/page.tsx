export const dynamic = "force-dynamic";

import { InventoryView } from "@/components/ModuleViews";
import { loadAppData } from "@/lib/app-data";

export default async function InventoryPage() {
  const data = await loadAppData();
  return <InventoryView data={data} />;
}
