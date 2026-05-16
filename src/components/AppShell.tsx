import Link from "next/link";
import { CalendarDays, ChartNoAxesCombined, CreditCard, Gauge, Package, Scissors, Settings, Sparkles, UsersRound, UserRoundCog } from "lucide-react";
import type { Role, Workspace } from "@/lib/types";
import { demoNotice, workspace as demoWorkspace } from "@/lib/seed";
import { roleLabel } from "@/lib/permissions";

const nav = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/appointments", label: "預約", icon: CalendarDays },
  { href: "/customers", label: "客戶", icon: UsersRound },
  { href: "/services", label: "服務", icon: Sparkles },
  { href: "/checkout", label: "結帳", icon: CreditCard },
  { href: "/technician", label: "技師", icon: Scissors },
  { href: "/inventory", label: "庫存", icon: Package },
  { href: "/staff", label: "員工", icon: UserRoundCog },
  { href: "/reports", label: "報表", icon: ChartNoAxesCombined },
  { href: "/settings", label: "設定", icon: Settings }
];

export function AppShell({
  title,
  subtitle,
  children,
  workspace = demoWorkspace,
  role = "owner",
  notice = demoNotice
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  workspace?: Pick<Workspace, "name">;
  role?: Role;
  notice?: string;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff_0,#fff7f8_38%,#f7e7d7_100%)] pb-24 lg:pb-10">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-4 lg:px-8">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 flex-col rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-soft backdrop-blur lg:flex">
          <Link href="/" className="mb-7 flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-plum text-xl text-white">L</span>
            <span><strong className="block text-lg">{workspace.name}</strong><small className="text-ink/55">Beauty / Nail Salon OS</small></span>
          </Link>
          <nav className="space-y-1">
            {nav.map((item) => <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-ink/70 hover:bg-champagne/70 hover:text-plum"><item.icon size={18} />{item.label}</Link>)}
          </nav>
          <div className="mt-auto rounded-3xl bg-plum p-4 text-white">
            <p className="text-sm opacity-80">目前角色</p><p className="font-semibold">{roleLabel(role)}</p>
            <p className="mt-3 text-xs leading-5 opacity-75">{notice}</p>
          </div>
        </aside>
        <section className="min-w-0 flex-1">
          <header className="mb-5 flex flex-col gap-4 rounded-[2rem] bg-white/70 p-4 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-semibold text-rose">{workspace.name}</p><h1 className="text-2xl font-bold text-plum sm:text-3xl">{title}</h1><p className="mt-1 text-sm text-ink/60">{subtitle}</p></div>
            <div className="flex gap-2 overflow-x-auto pb-1"><span className="rounded-full bg-sage/10 px-3 py-2 text-xs font-semibold text-sage">RLS enabled</span><span className="rounded-full bg-plum/10 px-3 py-2 text-xs font-semibold text-plum">Mobile first</span></div>
          </header>
          {children}
        </section>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-20 grid grid-cols-5 rounded-[1.5rem] bg-white/90 p-2 shadow-soft backdrop-blur lg:hidden">
        {nav.slice(0, 5).map((item) => <Link key={item.href} href={item.href} className="grid place-items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold text-ink/60"><item.icon size={18}/>{item.label}</Link>)}
      </nav>
    </main>
  );
}
