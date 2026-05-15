"use client";
import { AppShell } from "@/components/AppShell";
import { ModuleTable } from "@/components/ModuleTable";
import { StatusPill } from "@/components/ui";
import { services } from "@/lib/seed";
import { currency } from "@/lib/utils";

export default function ServicesPage() {
  return <AppShell title="服務項目管理" subtitle="分類、價格、所需時間、說明、啟用狀態與加購項目管理。"><ModuleTable rows={services} searchPlaceholder="搜尋服務名稱、分類、說明" filterOptions={["美甲", "美睫", "美容", "SPA", "霧眉", "加購"]} emptyTitle="尚未建立服務項目" columns={[{ key: "name", label: "服務", render: (row) => <><strong>{row.name}</strong><p className="text-ink/60">{row.description}</p></> }, { key: "category", label: "分類", render: (row) => <StatusPill>{row.category}</StatusPill> }, { key: "price", label: "價格", sortValue: (row) => row.price, render: (row) => currency.format(row.price) }, { key: "duration", label: "時間", sortValue: (row) => row.durationMin, render: (row) => `${row.durationMin} 分鐘` }, { key: "addon", label: "加購", render: (row) => row.addOn ? <StatusPill tone="amber">加購</StatusPill> : "主服務" }, { key: "enabled", label: "狀態", render: (row) => row.enabled ? <StatusPill tone="sage">啟用</StatusPill> : <StatusPill>停用</StatusPill> }]} /></AppShell>;
}
