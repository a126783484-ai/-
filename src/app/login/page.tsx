import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
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
          使用 Supabase Auth 驗證 email 與密碼。登入後由後端建立 session，再補齊 workspace。
        </p>

        <LoginForm initialError={error} initialMessage={message} next={next} />

        <Link className="mt-4 block text-center text-sm font-semibold text-rose" href="/register">
          建立新店鋪 workspace
        </Link>
      </section>
    </main>
  );
}
