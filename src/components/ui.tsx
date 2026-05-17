import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return <div className="card p-5"><p className="text-sm text-ink/55">{label}</p><p className="mt-2 text-2xl font-bold text-plum">{value}</p><p className="mt-2 text-xs text-ink/50">{hint}</p></div>;
}

export function EmptyState({ title, action }: { title: string; action: string }) {
  return <div className="card grid place-items-center p-8 text-center"><div className="grid size-14 place-items-center rounded-full bg-champagne text-rose"><AlertTriangle /></div><h3 className="mt-4 font-bold text-plum">{title}</h3><p className="mt-2 text-sm text-ink/60">{action}</p></div>;
}

export function LoadingState() { return <div className="card flex items-center gap-3 p-5 text-sm text-ink/60"><Loader2 className="animate-spin" size={18}/> 載入資料中…</div>; }
export function ErrorBanner({ message }: { message: string }) { return <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</div>; }
export function NoticeBanner({ message }: { message: string }) { return <div className="rounded-3xl border border-plum/15 bg-plum/5 p-4 text-sm text-plum">{message}</div>; }

export function StatusPill({ children, tone = "rose" }: { children: React.ReactNode; tone?: "rose" | "sage" | "plum" | "amber" }) {
  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", tone === "rose" && "bg-rose/10 text-rose", tone === "sage" && "bg-sage/10 text-sage", tone === "plum" && "bg-plum/10 text-plum", tone === "amber" && "bg-amber-100 text-amber-700")}>{children}</span>;
}
