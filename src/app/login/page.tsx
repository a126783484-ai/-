import Link from "next/link";
import { loginAction } from "@/app/login/actions";
import { AuthSubmitButton } from "@/components/AuthSubmitButton";
import { getAuthError, getAuthMessage, readAuthParam } from "@/lib/auth-feedback";

interface LoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const error = getAuthError(readAuthParam(params?.error));
  const message = getAuthMessage(readAuthParam(params?.message));
  const next = readAuthParam(params?.next) ?? "/";

  return (
    <main className="grid min-h-screen place-items-center bg-blush p-4">
      <section className="card w-full max-w-md p-5 sm:p-6">
        <p className="text-sm font-semibold text-rose">Beauty OS</p>
        <h1 className="mt-2 text-3xl font-bold text-plum">登入店鋪後台</h1>
        <p className="mt-2 text-sm text-ink/60">
          使用 Supabase Auth 驗證 email 與密碼。未登入使用者不可直接進入 Dashboard。
        </p>

        {message ? (
          <div className="mt-4 rounded-2xl bg-sage/15 p-4 text-sm font-semibold text-plum" role="status">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl bg-rose/10 p-4 text-sm font-semibold text-rose" role="alert">
            {error}
          </div>
        ) : null}

        <form action={loginAction} className="mt-6 space-y-3">
          <input type="hidden" name="next" value={next} />
          <input
            className="mobile-tap w-full rounded-2xl border border-champagne"
            name="email"
            placeholder="Email"
            type="email"
            autoComplete="email"
            required
          />
          <input
            className="mobile-tap w-full rounded-2xl border border-champagne"
            name="password"
            placeholder="密碼"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
          />
          <AuthSubmitButton
            className="mobile-tap w-full rounded-2xl bg-plum text-center font-semibold text-white disabled:cursor-wait disabled:opacity-70"
            idleText="登入 Workspace"
            pendingText="正在登入並檢查 workspace…"
          />
        </form>

        <Link className="mt-4 block text-center text-sm font-semibold text-rose" href="/register">
          建立新店鋪 workspace
        </Link>
      </section>
    </main>
  );
}
