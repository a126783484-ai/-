export const dynamic = "force-dynamic";

import { ReportsView } from "@/components/ModuleViews";
import { buildDailyCloseoutSummary, loadAppData } from "@/lib/app-data";

export default async function ReportsPage() {
  const data = await loadAppData();
  const now = new Date();
  const closeout = buildDailyCloseoutSummary(data, now);
  return <ReportsView data={data} closeout={closeout} />;
}
