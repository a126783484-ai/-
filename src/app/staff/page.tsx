"use client";
import { AppShell } from "@/components/AppShell";
import { ModuleTable } from "@/components/ModuleTable";
import { StatusPill } from "@/components/ui";
import { shifts, staff } from "@/lib/seed";
import { roleLabel } from "@/lib/permissions";

export default function StaffPage() { return <AppShell title="員工 / 班表 / 業績" subtitle="員工資料、技師排班、請假休息日、服務數量、營收與抽成欄位。"><ModuleTable rows={staff} searchPlaceholder="搜尋員工、角色、專長" filterOptions={["technician", "front_desk", "owner"]} emptyTitle="尚無員工資料" columns={[{ key: "name", label: "員工", render: (row) => <><strong>{row.name}</strong><p className="text-ink/60">{row.phone}</p></> }, { key: "role", label: "角色", render: (row) => <StatusPill>{roleLabel(row.role)}</StatusPill> }, { key: "specialty", label: "專長", render: (row) => row.specialties.join("、") }, { key: "commission", label: "抽成", sortValue: (row) => row.commissionRate, render: (row) => `${Math.round(row.commissionRate * 100)}%` }, { key: "shift", label: "今日班表", render: (row) => { const shift = shifts.find((item) => item.staffId === row.id); return shift ? `${shift.startTime}–${shift.endTime}` : "休息"; } }, { key: "status", label: "狀態", render: (row) => row.active ? <StatusPill tone="sage">在職</StatusPill> : <StatusPill>停用</StatusPill> }]} /></AppShell>; }
