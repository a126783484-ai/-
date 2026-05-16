"use client";
import { AppShell } from "@/components/AppShell";
import { StatusPill } from "@/components/ui";
import { appointments, customers, services } from "@/lib/seed";
import { formatTime } from "@/lib/utils";
import { statusLabel } from "@/lib/appointments";

export default function TechnicianPage() {
  const mine = appointments.filter((item) => item.technicianId === "st_ava");
  return <AppShell title="技師工作台" subtitle="技師只看自己的今日預約、客戶注意事項、服務紀錄與服務前後照片欄位。"><div className="grid gap-4">{mine.map((appointment) => { const customer = customers.find((item) => item.id === appointment.customerId); return <article key={appointment.id} className="card p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-bold text-plum">{formatTime(appointment.startAt)}–{formatTime(appointment.endAt)}｜{customer?.name}</p><p className="mt-1 text-sm text-ink/60">{appointment.serviceIds.map((id) => services.find((service) => service.id === id)?.name).join("、")}</p></div><StatusPill>{statusLabel(appointment.status)}</StatusPill></div><div className="mt-4 rounded-3xl bg-blush p-4 text-sm"><strong>注意事項：</strong>{customer?.cautions.join("、") || "無"}<br/><strong>偏好：</strong>{customer?.preferences.join("、") || "無"}</div><textarea className="mt-4 min-h-28 w-full rounded-3xl border border-champagne p-4" placeholder="填寫服務紀錄、使用色號、補充說明…"/><div className="mt-3 grid gap-3 sm:grid-cols-2"><button className="mobile-tap rounded-2xl bg-white font-semibold text-plum">上傳服務前照片</button><button className="mobile-tap rounded-2xl bg-white font-semibold text-plum">上傳服務後照片</button></div></article>; })}</div></AppShell>;
}
