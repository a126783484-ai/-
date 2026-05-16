"use client";
import { AppShell } from "@/components/AppShell";
import { ModuleTable } from "@/components/ModuleTable";
import { StatusPill } from "@/components/ui";
import { customers } from "@/lib/seed";

export default function CustomersPage() {
  return <AppShell title="客戶 CRM" subtitle="電話、生日、LINE、偏好、過敏禁忌、會員等級與回訪提醒。"><ModuleTable rows={customers} searchPlaceholder="搜尋姓名、電話、LINE、標籤" filterOptions={["VIP", "VVIP", "新客", "高價值客戶"]} emptyTitle="尚無客戶資料" columns={[{ key: "name", label: "客戶", sortValue: (row) => row.name, render: (row) => <><strong>{row.name}</strong><p className="text-ink/60">{row.phone}｜LINE {row.lineId ?? "-"}</p></> }, { key: "tier", label: "會員", render: (row) => <StatusPill tone="plum">{row.tier}</StatusPill> }, { key: "prefs", label: "偏好紀錄", render: (row) => row.preferences.join("、") }, { key: "cautions", label: "注意事項", render: (row) => row.cautions.length ? <span className="text-rose">{row.cautions.join("、")}</span> : "無" }, { key: "reminder", label: "回訪提醒", render: (row) => row.nextReminder ?? "-" }, { key: "tags", label: "標記", render: (row) => row.tags.map((tag) => <StatusPill key={tag} tone="sage">{tag}</StatusPill>) }]} /></AppShell>;
}
