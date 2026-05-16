"use client";
import { AppShell } from "@/components/AppShell";
import { ModuleTable } from "@/components/ModuleTable";
import { StatusPill } from "@/components/ui";
import { inventory } from "@/lib/seed";
import { currency } from "@/lib/utils";

export default function InventoryPage() { return <AppShell title="庫存管理" subtitle="材料、品牌、成本售價、低庫存提醒、進貨 / 消耗紀錄與訂單扣庫存基礎。"><ModuleTable rows={inventory} searchPlaceholder="搜尋品牌、品名、分類" filterOptions={["美甲膠", "睫毛材料", "保養品"]} emptyTitle="尚無庫存品項" columns={[{ key: "name", label: "品項", render: (row) => <><strong>{row.name}</strong><p className="text-ink/60">{row.brand}</p></> }, { key: "category", label: "分類", render: (row) => row.category }, { key: "cost", label: "成本 / 售價", render: (row) => `${currency.format(row.cost)} / ${currency.format(row.retailPrice)}` }, { key: "qty", label: "庫存", sortValue: (row) => row.quantity, render: (row) => <StatusPill tone={row.quantity <= row.lowStockThreshold ? "amber" : "sage"}>{row.quantity}</StatusPill> }, { key: "alert", label: "提醒", render: (row) => row.quantity <= row.lowStockThreshold ? "低庫存，請補貨" : "安全庫存" }]} /></AppShell>; }
