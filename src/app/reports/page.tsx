export const dynamic = "force-dynamic";

import { ReportsView } from "@/components/ModuleViews";
import { loadAppData } from "@/lib/app-data";

export default async function ReportsPage() {
  const data = await loadAppData();
  return <ReportsView data={data} />;
}
