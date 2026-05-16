import Link from "next/link";
import { loginAction } from "@/app/login/actions";

interface LoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function readValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const error = readValue(params?.error);
  const message = readValue(params?.message);
  const next = readValue(params?.next) ?? "/";

  return (
    <main className="grid min-h-screen place-items-center bg-blush p-4">
      <section className="card w-full max-w-md p-6">
        <p className="text-sm font-semibold text-rose">Beauty OS</p>
        <h1 className="mt-2 text-3xl font-bold text-plum">登入店鋪後台</h1>
        <p className="mt-2 text-sm text-ink/60">
          使用 Supabase Auth 驗證 email 與密碼。未登入使用者不可直接進入 Dashboard。
        </p>

        {message ? (
          <div className="mt-4 rounded-2xl bg-sage/15 p-4 text-sm font-semibold text-plum">
            {message === "check_email" ? "帳號已建立，請完成 email 驗證後登入。" : "已安全登出。"}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl bg-rose/10 p-4 text-sm font-semibold text-rose">
            {decodeURIComponent(error)}
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
          <button className="mobile-tap w-full rounded-2xl bg-plum text-center font-semibold text-white" type="submit">
            登入 Workspace
          </button>
        </form>

        <Link className="mt-4 block text-center text-sm font-semibold text-rose" href="/register">
          建立新店鋪 workspace
        </Link>
      </section>
    </main>
  );
}
