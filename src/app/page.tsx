export const dynamic = "force-dynamic";

import { DashboardView } from "@/components/ModuleViews";
import { loadAppData } from "@/lib/app-data";

export default async function DashboardPage() {
  const data = await loadAppData();
  return <DashboardView data={data} />;
}
