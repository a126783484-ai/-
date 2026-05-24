export const dynamic = "force-dynamic";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/ui";
import { ReportsView } from "@/components/ModuleViews";
import { buildDailyCloseoutSummary, loadAppData } from "@/lib/app-data";
import { can } from "@/lib/permissions";

export default async function ReportsPage() {
  const data = await loadAppData();
  const role = data.currentMember?.role ?? "staff";

  if (!can(role, "reports")) {
    return (
      <AppShell
        title="報表分析"
        subtitle="月營收、排行、待收與回訪摘要只開放給管理角色。"
        workspace={data.workspace}
        role={role}
      >
        <EmptyState
          title="你的角色無法查看報表分析"
          action="只有店主與管理員可以使用這個頁面。若你只是要看今天的交接事項，請改看營運總覽。"
        />
      </AppShell>
    );
  }

  const now = new Date();
  const closeout = buildDailyCloseoutSummary(data, now);
  return <ReportsView data={data} closeout={closeout} />;
}
