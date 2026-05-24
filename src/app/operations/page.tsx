import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EmptyState, MetricCard, StatusPill } from "@/components/ui";
import { buildDailyCloseoutSummary, getWorkspaceSetupGuide, isWorkspaceEmpty, loadAppData } from "@/lib/app-data";
import { appointmentCloseoutLabel, reminderDisplay, statusLabel } from "@/lib/appointments";
import {
  orderCloseoutLabel,
  orderStatusLabel,
  orderStatusTone,
  orderTotal,
} from "@/lib/orders";
import type { Customer } from "@/lib/types";
import { currency, formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
const handoffKindLabels = {
  appointment: "預約",
  order: "收款",
  reminder: "回訪",
  inventory: "庫存",
} as const;

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
    <div className="card p-5 print:hidden">
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

function QuickActionLink({
  href,
  label,
  detail,
}: {
  href: string;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="mobile-tap rounded-3xl border border-champagne bg-white p-4 text-left transition hover:border-plum/20 hover:bg-blush/40"
    >
      <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
        {label}
      </span>
      <span className="mt-1 block font-bold text-plum">{detail}</span>
    </Link>
  );
}

type ReminderCustomer = {
  customer: Customer;
  reminder: NonNullable<ReturnType<typeof reminderDisplay>>;
};

export default async function OperationsCommandCenterPage() {
  const data = await loadAppData();
  const now = new Date();
  const closeout = buildDailyCloseoutSummary(data, now);

  const reminderCustomers = data.customers
    .map((customer) => {
      const reminder = reminderDisplay(customer.nextReminder, now);
      return reminder?.due ? ({ customer, reminder } satisfies ReminderCustomer) : null;
    })
    .filter((customer): customer is ReminderCustomer => customer !== null)
    .sort(
      (left, right) =>
        (left.customer.nextReminder ?? "").localeCompare(right.customer.nextReminder ?? "") ||
        left.customer.name.localeCompare(right.customer.name),
    );

  const shellProps = {
    workspace: data.workspace,
    role: data.currentMember?.role ?? "owner",
    notice: data.needsWorkspace
      ? "尚未完成 workspace 初始化，請重新登入或聯絡管理員。"
      : data.demoMode
        ? "預覽資料模式：目前顯示的是範例 seed 資料，Supabase 實際資料仍會優先顯示。"
        : "營運指揮中心：先清今天未完成事項，再看明天預備。",
  } as const;
  const workspaceEmpty = isWorkspaceEmpty(data);
  const setupGuide = !data.needsWorkspace ? getWorkspaceSetupGuide(data) : null;

  return (
    <AppShell
      title="營運指揮中心"
      subtitle="把今天要交接的人、事、帳集中在一頁，方便晚班或店長接手。"
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
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickActionLink href="/appointments" label="預約" detail="開啟預約頁" />
          <QuickActionLink href="/checkout" label="收款" detail="開啟結帳頁" />
          <QuickActionLink href="/inventory" label="庫存" detail="開啟庫存頁" />
          <QuickActionLink href="/customers" label="客戶" detail="開啟客戶頁" />
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="未完成預約" value={closeout.unfinishedAppointments.length} hint="今天還沒結束的預約" />
        <MetricCard label="待收訂單" value={closeout.unpaidOrders.length} hint={`待收 ${currency.format(closeout.totalOutstanding)}`} />
        <MetricCard label="低庫存" value={closeout.lowStockItems.length} hint="低於安全庫存門檻" />
        <MetricCard
          label="明日預備"
          value={`${closeout.tomorrowAppointments.length} / ${closeout.tomorrowShifts.length}`}
          hint={`預約 ${closeout.tomorrowAppointments.length} · 班表 ${closeout.tomorrowShifts.length}`}
        />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-plum">今日交接清單</h2>
              <p className="mt-1 text-sm text-ink/60">
                這些項目最適合直接交給下一班、店長或櫃台先接手處理。
              </p>
            </div>
            <StatusPill tone="amber">{closeout.handoffItems.length} 項</StatusPill>
          </div>
          {closeout.handoffItems.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {closeout.handoffItems.slice(0, 6).map((item) => (
                <article key={`${item.kind}-${item.title}-${item.href}`} className="rounded-3xl border border-champagne bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
                        {handoffKindLabels[item.kind]}
                      </p>
                      <strong className="mt-1 block text-plum">{item.title}</strong>
                    </div>
                    <StatusPill tone={item.tone}>{handoffKindLabels[item.kind]}</StatusPill>
                  </div>
                  <p className="mt-2 text-sm text-ink/60">{item.detail}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={item.href}
                      className="mobile-tap rounded-2xl bg-plum px-4 py-2 text-sm font-semibold text-white"
                    >
                      打開{handoffKindLabels[item.kind]}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <ActionCard
              title="目前沒有待交接項目"
              action="當有未完成預約、待收訂單、回訪提醒或低庫存時，這裡會自動整理成交接清單。"
              links={[
                { href: "/appointments", label: "查看預約" },
                { href: "/checkout", label: "查看收款" },
              ]}
            />
          )}
        </div>
        <div className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-plum">交接摘要</h2>
              <p className="mt-1 text-sm text-ink/60">
                可以直接複製給店長、主管或晚班同事。
              </p>
            </div>
          </div>
          <pre className="mt-4 whitespace-pre-wrap rounded-3xl border border-champagne bg-white p-4 text-sm leading-6 text-ink/80 shadow-sm">
            {closeout.auditLines.join("\n")}
          </pre>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-plum">今日待完成預約</h2>
              <p className="mt-1 text-sm text-ink/60">
                只列出今天尚未完成的預約，按時間排序。共 {closeout.unfinishedAppointments.length} 筆，僅顯示前 5 筆。
              </p>
            </div>
            <Link href="/appointments" className="mobile-tap rounded-2xl bg-plum px-4 py-2 font-semibold text-white">
              {closeout.unfinishedAppointments.length ? "查看預約" : "建立預約"}
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {closeout.unfinishedAppointments.slice(0, 5).map((appointment) => {
              const customer = data.customers.find((item) => item.id === appointment.customerId);
              const technician = data.staff.find((item) => item.id === appointment.technicianId);
              return (
                <article key={appointment.id} className="rounded-3xl border border-champagne bg-blush/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block text-plum">
                        {formatTime(appointment.startAt)} · {customer?.name ?? "未命名客戶"}
                      </strong>
                      <p className="mt-1 text-sm text-ink/60">
                        {appointmentCloseoutLabel(appointment, now)} · 技師 {technician?.name ?? "未指派"}
                      </p>
                    </div>
                    <StatusPill>{statusLabel(appointment.status)}</StatusPill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href="/appointments"
                      className="mobile-tap rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-plum"
                    >
                      開啟預約
                    </Link>
                  </div>
                </article>
              );
            })}
            {!closeout.unfinishedAppointments.length ? (
              <ActionCard
                title="今天沒有待處理預約"
                action="建立第一筆今天的預約後，這裡會自動列出客戶、時間和技師。"
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
            <div>
              <h2 className="text-lg font-bold text-plum">待收款</h2>
              <p className="mt-1 text-sm text-ink/60">
                只列出還有欠款的訂單，優先處理金額高、時間久的項目。
              </p>
            </div>
            <Link href="/checkout" className="mobile-tap rounded-2xl bg-plum px-4 py-2 font-semibold text-white">
              前往結帳
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {closeout.unpaidOrders.slice(0, 5).map(({ order, outstanding, paymentState }) => {
              const customer = data.customers.find((item) => item.id === order.customerId);
              return (
                <article key={order.id} className="rounded-3xl border border-champagne bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block text-plum">{customer?.name ?? "未命名客戶"}</strong>
                      <p className="mt-1 text-sm text-ink/60">
                        訂單 {order.id.slice(0, 8)} · {orderCloseoutLabel(order, now)}
                      </p>
                    </div>
                    <StatusPill tone={orderStatusTone(paymentState)}>{orderStatusLabel(paymentState)}</StatusPill>
                  </div>
                  <p className="mt-2 text-sm text-ink/60">
                    訂單總額 {currency.format(orderTotal(order))} · 待收 {currency.format(outstanding)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href="/checkout"
                      className="mobile-tap rounded-2xl bg-plum px-4 py-2 text-sm font-semibold text-white"
                    >
                      開啟結帳
                    </Link>
                  </div>
                </article>
              );
            })}
            {!closeout.unpaidOrders.length ? (
              <ActionCard
                title="目前沒有待收款訂單"
                action="若要建立新訂單或檢查收款，直接到結帳頁即可。"
                links={[{ href: "/checkout", label: "前往結帳" }]}
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-plum">低庫存</h2>
              <p className="mt-1 text-sm text-ink/60">
                先補常用品項，避免明天出現缺料。
              </p>
            </div>
            <Link href="/inventory" className="mobile-tap rounded-2xl bg-plum px-4 py-2 font-semibold text-white">
              管理庫存
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {closeout.lowStockItems.slice(0, 6).map((item) => (
              <article key={item.id} className="rounded-3xl border border-champagne bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block text-plum">{item.name}</strong>
                    <p className="mt-1 text-sm text-ink/60">{item.brand || item.category || "未分類"}</p>
                  </div>
                  <StatusPill tone="amber">
                    剩 {item.quantity} / {item.lowStockThreshold}
                  </StatusPill>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/inventory"
                    className="mobile-tap rounded-2xl bg-blush px-4 py-2 text-sm font-semibold text-plum"
                  >
                    開啟庫存
                  </Link>
                </div>
              </article>
            ))}
            {!closeout.lowStockItems.length ? (
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
            <div>
              <h2 className="text-lg font-bold text-plum">明日預備</h2>
              <p className="mt-1 text-sm text-ink/60">
                先確認明天的預約與班表，避免收工後才發現人力或時段沒接上。
              </p>
            </div>
            <Link href="/appointments" className="mobile-tap rounded-2xl bg-plum px-4 py-2 font-semibold text-white">
              查看預約
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {closeout.tomorrowAppointments.slice(0, 5).map((appointment) => {
              const customer = data.customers.find((item) => item.id === appointment.customerId);
              const technician = data.staff.find((item) => item.id === appointment.technicianId);
              return (
                <article key={appointment.id} className="rounded-3xl border border-champagne bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block text-plum">{customer?.name ?? "未命名客戶"}</strong>
                      <p className="mt-1 text-sm text-ink/60">
                        {appointmentCloseoutLabel(appointment, now)} · 技師 {technician?.name ?? "未指派"}
                      </p>
                    </div>
                    <StatusPill tone="sage">{appointment.source}</StatusPill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href="/appointments"
                      className="mobile-tap rounded-2xl bg-plum px-4 py-2 text-sm font-semibold text-white"
                    >
                      打開預約
                    </Link>
                  </div>
                </article>
              );
            })}
            {closeout.tomorrowShifts.length ? (
              <div className="rounded-3xl border border-champagne bg-blush/40 p-4">
                <p className="text-sm font-semibold text-plum">明日班表 {closeout.tomorrowShifts.length} 筆</p>
                <div className="mt-3 space-y-2">
                  {closeout.tomorrowShifts.slice(0, 4).map((shift) => {
                    const member = data.staff.find((item) => item.id === shift.staffId);
                    return (
                      <div key={shift.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-plum">
                          {member?.name ?? "未命名員工"} · {shift.leave ? "休假 / 休息" : `${shift.startTime}–${shift.endTime}`}
                        </span>
                        <StatusPill tone={shift.leave ? "amber" : "sage"}>{shift.leave ? "休息" : "排班"}</StatusPill>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {!closeout.tomorrowAppointments.length && !closeout.tomorrowShifts.length ? (
              <ActionCard
                title="明天沒有待準備項目"
                action="當明天有預約或班表時，這裡會直接列出需要先確認的內容。"
                links={[
                  { href: "/appointments", label: "查看預約" },
                  { href: "/staff", label: "查看班表" },
                ]}
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-plum">回訪提醒</h2>
              <p className="mt-1 text-sm text-ink/60">
                今天到期或已逾期的客戶，先聯絡再回來處理其他事。
              </p>
            </div>
            <Link href="/customers" className="mobile-tap rounded-2xl bg-plum px-4 py-2 font-semibold text-white">
              查看客戶
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {reminderCustomers.slice(0, 6).map(({ customer, reminder }) => (
              <article key={customer.id} className="rounded-3xl border border-champagne bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block text-plum">{customer.name}</strong>
                    <p className="mt-1 text-sm text-ink/60">
                      {customer.phone || "沒有電話"}
                      {customer.lastVisit ? ` · 最後到店 ${formatDate(customer.lastVisit)}` : ""}
                    </p>
                  </div>
                  <StatusPill tone={reminder.tone}>{reminder.label}</StatusPill>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/customers"
                    className="mobile-tap rounded-2xl bg-plum px-4 py-2 text-sm font-semibold text-white"
                  >
                    開啟客戶
                  </Link>
                </div>
              </article>
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
