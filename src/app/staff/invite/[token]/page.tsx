import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptStaffInviteAction } from "./actions";
import type { Database } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildStaffInvitePath, isMissingStaffInviteTableError } from "@/lib/staff-invites";

interface StaffInvitePageProps {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function readSearchParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function buildSearchParams(input: Record<string, string>) {
  return new URLSearchParams(input).toString();
}

type StaffInviteRow = Database["public"]["Tables"]["workspace_member_invites"]["Row"];

export default async function StaffInvitePage({ params, searchParams }: StaffInvitePageProps) {
  const { token } = await params;
  const query = searchParams ? await searchParams : undefined;
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect(`/login?${buildSearchParams({ next: buildStaffInvitePath(token) })}`);
  }

  let invite: StaffInviteRow | null = null;
  let inviteError: { code?: string; message?: string } | null = null;

  try {
    const result = await supabase
      .from("workspace_member_invites")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    invite = result.data;
    inviteError = result.error;
  } catch (error) {
    inviteError = error as { code?: string; message?: string };
  }

  const error = readSearchParam(query?.error);
  const status = readSearchParam(query?.message);

  if (isMissingStaffInviteTableError(inviteError)) {
    return (
      <main className="grid min-h-screen place-items-center bg-blush p-4">
        <section className="card w-full max-w-lg p-6 text-center">
          <p className="text-sm font-semibold text-rose">Beauty OS</p>
          <h1 className="mt-3 text-2xl font-bold text-plum">邀請功能尚未啟用</h1>
          <p className="mt-2 text-sm text-ink/60">目前資料庫尚未建立邀請表，請先由管理員完成 schema 更新。</p>
          <Link href="/staff" className="mt-5 inline-flex rounded-2xl bg-plum px-4 py-3 font-semibold text-white">
            返回員工頁
          </Link>
        </section>
      </main>
    );
  }

  if (!invite) {
    return (
      <main className="grid min-h-screen place-items-center bg-blush p-4">
        <section className="card w-full max-w-lg p-6 text-center">
          <p className="text-sm font-semibold text-rose">Beauty OS</p>
          <h1 className="mt-3 text-2xl font-bold text-plum">邀請連結無效或已失效</h1>
          <p className="mt-2 text-sm text-ink/60">請向店家重新索取加入連結，或回到登入頁重新登入。</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login" className="mobile-tap rounded-2xl bg-plum px-4 py-3 font-semibold text-white">
              返回登入
            </Link>
            <Link href="/" className="mobile-tap rounded-2xl border border-champagne px-4 py-3 font-semibold text-plum">
              回到首頁
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const isAccepted = invite.status === "accepted";
  const inviteEmail = invite.email.toLowerCase();
  const currentEmail = authData.user.email?.toLowerCase() ?? "";

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-blush via-white to-champagne/40 p-4">
      <section className="card w-full max-w-xl p-6 sm:p-8">
        <p className="text-sm font-semibold text-rose">Beauty OS</p>
        <h1 className="mt-3 text-3xl font-bold text-plum">員工邀請</h1>
        <p className="mt-2 text-sm text-ink/60">
          你將加入這家店鋪的工作區。登入中的帳號 email 必須與邀請信箱一致。
        </p>

        {error ? (
          <div className="mt-5 rounded-2xl bg-rose/10 p-4 text-sm font-semibold text-rose">
            {error}
          </div>
        ) : null}

        {status === "staff_invite_accepted" ? (
          <div className="mt-5 rounded-2xl bg-sage/15 p-4 text-sm font-semibold text-plum">
            你已成功加入店鋪。
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 rounded-3xl bg-white/85 p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink/60">邀請狀態</span>
            <strong className="rounded-full bg-sage/15 px-3 py-1 text-sm text-sage">
              {isAccepted ? "已加入" : "待接受"}
            </strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink/60">邀請信箱</span>
            <strong className="break-all text-right text-sm text-plum">{inviteEmail}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink/60">顯示名稱</span>
            <strong className="text-right text-sm text-plum">{invite.display_name}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink/60">角色</span>
            <strong className="text-right text-sm text-plum">{invite.role}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink/60">專長</span>
            <strong className="text-right text-sm text-plum">{invite.specialties.join("、") || "無"}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink/60">目前登入</span>
            <strong className="break-all text-right text-sm text-plum">{currentEmail || "未登入"}</strong>
          </div>
        </div>

        {!isAccepted ? (
          <form action={acceptStaffInviteAction} className="mt-6">
            <input type="hidden" name="token" value={invite.token} />
            <button type="submit" className="mobile-tap w-full rounded-2xl bg-plum px-4 py-3 font-semibold text-white">
              接受邀請並加入店鋪
            </button>
          </form>
        ) : (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/staff" className="mobile-tap rounded-2xl bg-plum px-4 py-3 text-center font-semibold text-white">
              前往員工管理
            </Link>
            <Link href="/" className="mobile-tap rounded-2xl border border-champagne px-4 py-3 text-center font-semibold text-plum">
              回到首頁
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
