export const dynamic = "force-dynamic";

import { AppShell } from "@/components/AppShell";
import { DashboardDeferredView } from "@/components/DeferredViews";
import { EmptyState } from "@/components/ui";
import { loadAppData } from "@/lib/app-data";
import { can } from "@/lib/permissions";

export default async function DashboardPage() {
  const data = await loadAppData();
  const role = data.currentMember?.role ?? "staff";

  if (!can(role, "dashboard")) {
    return (
      <AppShell
        title="營運總覽"
        subtitle="桌面與手機都能快速看今天重點，但這個頁面只開放給有營運權限的角色。"
        workspace={data.workspace}
        role={role}
      >
        <EmptyState
          title="你的角色無法查看營運總覽"
          action="只有店主、管理員與櫃台可以使用這個頁面。若你需要今天的交接資訊，請改看預約、結帳或技師工作台。"
        />
      </AppShell>
    );
  }

  return <DashboardDeferredView data={data} />;
}
