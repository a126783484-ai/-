import Link from "next/link";
import { createAccountAction } from "@/app/account/actions";
import { AuthSubmitButton } from "@/components/AuthSubmitButton";
import { getAuthError, readAuthParam } from "@/lib/auth-feedback";

interface RegisterPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const error = getAuthError(readAuthParam(params?.error));

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle,#fff,#fff7f8,#f7e7d7)] p-4">
      <section className="card w-full max-w-xl p-5 sm:p-6">
        <p className="text-sm font-semibold text-rose">建立 workspace</p>
        <h1 className="mt-2 text-3xl font-bold text-plum">註冊美甲美容營運 OS</h1>
        <p className="mt-2 text-sm text-ink/60">
          新用戶註冊後會建立獨立 workspace。若系統要求 email 驗證，請先到信箱完成驗證，再回到登入頁進入 Dashboard。
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl bg-rose/10 p-4 text-sm font-semibold text-rose" role="alert">
            {error}
          </div>
        ) : null}

        <form action={createAccountAction} className="mt-6 grid gap-3 md:grid-cols-2">
          <input className="mobile-tap rounded-2xl border border-champagne" name="workspaceName" placeholder="店鋪名稱" autoComplete="organization" required />
          <input className="mobile-tap rounded-2xl border border-champagne" name="phone" placeholder="聯絡電話" autoComplete="tel" />
          <input className="mobile-tap rounded-2xl border border-champagne md:col-span-2" name="displayName" placeholder="負責人名稱" autoComplete="name" />
          <input className="mobile-tap rounded-2xl border border-champagne md:col-span-2" name="email" placeholder="Email" type="email" autoComplete="email" required />
          <input className="mobile-tap rounded-2xl border border-champagne md:col-span-2" name="password" placeholder="密碼" type="password" autoComplete="new-password" required minLength={8} />
          <AuthSubmitButton
            className="mobile-tap rounded-2xl bg-plum text-center font-semibold text-white disabled:cursor-wait disabled:opacity-70 md:col-span-2"
            idleText="建立店鋪 workspace"
            pendingText="正在建立帳號與 workspace…"
          />
        </form>

        <div className="mt-4 rounded-2xl bg-white/70 p-4 text-xs leading-6 text-ink/60">
          <strong className="text-plum">註冊後沒有直接進入後台？</strong> 代表 Supabase 目前啟用 email confirmation；完成驗證並登入後，系統會補齊 workspace、owner profile 與 owner membership。
        </div>

        <Link className="mt-4 block text-center text-sm font-semibold text-rose" href="/login">
          已有帳號，前往登入
        </Link>
      </section>
    </main>
  );
}
