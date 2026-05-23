import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EmptyState, MetricCard, StatusPill } from "@/components/ui";
import { dashboardMetrics } from "@/lib/analytics";
import { getWorkspaceSetupGuide, isWorkspaceEmpty, loadAppData } from "@/lib/app-data";
import { statusLabel } from "@/lib/appointments";
import { orderTotal, outstandingAmount } from "@/lib/orders";
import { currency, formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function SetupGuide({
  title,
  action,
  links,
}: {
  title: string;
  action: string;
  links?: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="card p-5">
      <h2 className="text-lg font-bold text-plum">{title}</h2>
      <p className="mt-1 text-sm text-ink/60">{action}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(links ?? [
          { href: "/settings?message=settings_setup_hint", label: "先去設定" },
          { href: "/services", label: "建立服務" },
          { href: "/staff", label: "建立員工" },
        ]).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="mobile-tap rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-plum"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ActionCard({
  title,
  action,
  links,
}: {
  title: string;
  action: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="rounded-3xl border border-champagne bg-white p-4">
      <h3 className="font-bold text-plum">{title}</h3>
      <p className="mt-1 text-sm text-ink/60">{action}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="mobile-tap rounded-2xl bg-plum px-4 py-2 text-sm font-semibold text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function OperationsCommandCenterPage() {
  const data = await loadAppData();
  const metrics = dashboardMetrics(
    new Date(),
    data.appointments,
    data.orders,
    data.customers,
    data.services,
    data.staff,
  );

  const pendingAppointments = data.appointments.filter((appointment) =>
    ["pending", "confirmed", "in_service"].includes(appointment.status),
  );
  const unpaidOrders = data.orders.filter((order) => order.status !== "paid");
  const lowStockItems = data.inventory.filter(
    (item) => item.quantity <= item.lowStockThreshold,
  );
  const reminderCustomers = data.customers.filter(Boolean).filter((customer) => {
    if (!customer.nextReminder) return false;
    const reminder = new Date(customer.nextReminder).getTime();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return reminder <= today.getTime();
  });

  const shellProps = {
    workspace: data.workspace,
    role: data.currentMember?.role ?? "owner",
    notice: data.needsWorkspace
      ? "尚未完成 workspace 初始化，請重新登入或聯絡管理員。"
      : data.demoMode
        ? "預覽資料模式：目前顯示的是範例 seed 資料，Supabase 實際資料仍會優先顯示。"
        : "營運指揮中心：集中查看今日重點、風險與下一步。",
  } as const;
  const workspaceEmpty = isWorkspaceEmpty(data);
  const setupGuide = !data.needsWorkspace ? getWorkspaceSetupGuide(data) : null;

  return (
    <AppShell
      title="營運指揮中心"
      subtitle="把今日重點、收款風險、庫存警示與回訪提醒集中在一頁。"
      {...shellProps}
    >
      {data.needsWorkspace ? (
        <EmptyState
          title="尚未完成 workspace 初始化"
          action="完成 workspace 後，這裡會顯示正式營運指標。"
        />
      ) : null}
      {workspaceEmpty && !setupGuide ? (
        <div className="mt-4">
          <SetupGuide
            title="這個工作區還沒有足夠的營運資料"
            action="先把店鋪設定、服務、員工與第一位客戶補齊，營運指揮中心才會開始反映真實狀態。"
          />
        </div>
      ) : null}
      {setupGuide ? (
        <div className="mt-4">
          <SetupGuide
            title={setupGuide.title}
            action={setupGuide.action}
            links={setupGuide.links}
          />
        </div>
      ) : null}
      {!data.needsWorkspace && !setupGuide && !workspaceEmpty ? (
        <div className="mt-4">
          <SetupGuide
            title="今天先做這三件事"
            action="先處理預約、收款與庫存，再回頭看回訪提醒。這些連結直接帶你到能動手的頁面。"
            links={[
              { href: "/appointments", label: "建立預約" },
              { href: "/checkout", label: "前往結帳" },
              { href: "/inventory", label: "查看庫存" },
            ]}
          />
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="今日預約" value={metrics.todayAppointments} hint="含待確認與已確認" />
        <MetricCard label="待確認 / 進行中" value={pendingAppointments.length} hint="需要店長或櫃檯跟進" />
        <MetricCard label="待收款" value={currency.format(metrics.pendingPayment)} hint="未付款與部分付款" />
        <MetricCard label="低庫存" value={lowStockItems.length} hint="低於安全庫存門檻" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-plum">今日處理清單</h2>
              <p className="mt-1 text-sm text-ink/60">
                優先處理會影響營收與客戶體驗的項目。共 {pendingAppointments.length} 筆，僅顯示前 5 筆。
              </p>
            </div>
            <Link href="/appointments" className="mobile-tap rounded-2xl bg-plum px-4 py-2 font-semibold text-white">
              {pendingAppointments.length ? "查看全部預約" : "建立第一筆預約"}
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {pendingAppointments.slice(0, 5).map((appointment) => {
              const customer = data.customers.find((item) => item.id === appointment.customerId);
              const technician = data.staff.find((item) => item.id === appointment.technicianId);
              return (
                <article key={appointment.id} className="rounded-3xl bg-blush p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-plum">
                      {formatDate(appointment.startAt)} {formatTime(appointment.startAt)}
                    </strong>
                    <StatusPill>{statusLabel(appointment.status)}</StatusPill>
                  </div>
                  <p className="mt-1 text-sm text-ink/65">
                    {customer?.name ?? "未命名客戶"}｜技師 {technician?.name ?? "未指派"}
                  </p>
                </article>
              );
            })}
            {!pendingAppointments.length ? (
              <ActionCard
                title="目前沒有待處理預約"
                action="先到預約系統建立第一筆預約，這裡就會自動整理今天需要跟進的客人。"
                links={[
                  { href: "/appointments", label: "建立預約" },
                  { href: "/customers", label: "查看客戶" },
                ]}
              />
            ) : null}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-plum">收款風險</h2>
            <Link href="/checkout" className="mobile-tap rounded-2xl bg-plum px-4 py-2 font-semibold text-white">
              前往結帳
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {unpaidOrders.slice(0, 5).map((order) => {
              const customer = data.customers.find((item) => item.id === order.customerId);
              const total = orderTotal(order);
              const outstanding = outstandingAmount(order);
              return (
                <article key={order.id} className="rounded-3xl bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{customer?.name ?? "未命名客戶"}</strong>
                    <StatusPill tone="amber">未收 {currency.format(outstanding)}</StatusPill>
                  </div>
                  <p className="mt-1 text-sm text-ink/60">
                    訂單總額 {currency.format(total)}｜狀態 {order.status}
                  </p>
                </article>
              );
            })}
            {!unpaidOrders.length ? (
              <ActionCard
                title="目前沒有待收款訂單"
                action="若要先確認今日收款狀況，可以直接到結帳頁建立或檢查訂單。"
                links={[{ href: "/checkout", label: "前往結帳" }]}
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-plum">庫存警示</h2>
            <Link href="/inventory" className="mobile-tap rounded-2xl bg-plum px-4 py-2 font-semibold text-white">
              管理庫存
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {lowStockItems.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white p-4">
                <span>
                  {item.name}
                  <small className="ml-2 text-ink/45">{item.brand || item.category}</small>
                </span>
                <StatusPill tone="amber">剩 {item.quantity} / {item.lowStockThreshold}</StatusPill>
              </div>
            ))}
            {!lowStockItems.length ? (
              <ActionCard
                title="目前沒有低庫存品項"
                action="先把常用品項的安全庫存補齊，低於門檻時會自動跳到這裡。"
                links={[{ href: "/inventory", label: "查看庫存" }]}
              />
            ) : null}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-plum">回訪提醒</h2>
            <Link href="/customers" className="mobile-tap rounded-2xl bg-plum px-4 py-2 font-semibold text-white">
              查看客戶
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {reminderCustomers.slice(0, 6).map((customer) => (
              <div key={customer.id} className="flex items-center justify-between rounded-2xl bg-white p-4">
                <span>
                  {customer.name}
                  <small className="ml-2 text-ink/45">{customer.phone}</small>
                </span>
                <StatusPill tone="sage">
                  {customer.nextReminder ? formatDate(customer.nextReminder) : "-"}
                </StatusPill>
              </div>
            ))}
            {!reminderCustomers.length ? (
              <ActionCard
                title="目前沒有到期回訪提醒"
                action="到客戶頁設定下次提醒後，今天到期或逾期的名單就會顯示在這裡。"
                links={[{ href: "/customers", label: "查看客戶" }]}
              />
            ) : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
