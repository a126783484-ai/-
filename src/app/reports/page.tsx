export const dynamic = "force-dynamic";

import { ReportsView } from "@/components/ModuleViews";
import { buildDailyCloseoutSummary, loadAppData } from "@/lib/app-data";

export default async function ReportsPage() {
  const data = await loadAppData();
  const closeout = buildDailyCloseoutSummary(data, new Date());
  return <ReportsView data={data} closeout={closeout} />;
}
