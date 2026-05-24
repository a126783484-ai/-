export const dynamic = "force-dynamic";

import { DashboardDeferredView } from "@/components/DeferredViews";
import { loadAppData } from "@/lib/app-data";

export default async function DashboardPage() {
  const data = await loadAppData();
  return <DashboardDeferredView data={data} />;
}
