"use client";
import { AppShell } from "@/components/AppShell";
import { ModuleTable } from "@/components/ModuleTable";
import { StatusPill } from "@/components/ui";
import { customers, orders, staff } from "@/lib/seed";
import { orderTotal, outstandingAmount } from "@/lib/orders";
import { currency } from "@/lib/utils";

export default function CheckoutPage() {
  return <AppShell title="訂單 / 結帳 / 收款" subtitle="從預約轉訂單，支援折扣、小費、多付款方式、收據明細與每日結帳。"><ModuleTable rows={orders} searchPlaceholder="搜尋訂單、客戶、付款方式" filterOptions={["paid", "partial", "unpaid", "card", "line_pay"]} emptyTitle="尚無訂單" columns={[{ key: "id", label: "訂單", render: (row) => <><strong>{row.id}</strong><p className="text-ink/60">{new Date(row.createdAt).toLocaleString("zh-TW")}</p></> }, { key: "customer", label: "客戶 / 技師", render: (row) => `${customers.find((item) => item.id === row.customerId)?.name}｜${staff.find((item) => item.id === row.technicianId)?.name}` }, { key: "lines", label: "明細", render: (row) => row.lines.map((line) => `${line.name} x${line.quantity}`).join("、") }, { key: "total", label: "總額", sortValue: (row) => orderTotal(row), render: (row) => currency.format(orderTotal(row)) }, { key: "paid", label: "待收", render: (row) => currency.format(outstandingAmount(row)) }, { key: "status", label: "狀態", render: (row) => <StatusPill tone={row.status === "paid" ? "sage" : "amber"}>{row.status}</StatusPill> }]} /></AppShell>;
}
