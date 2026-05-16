import { createAccountAction } from "@/app/account/actions";
import { FormNotice } from "@/components/FormNotice";

type RegisterPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const error = firstValue(params?.error);
  const message = firstValue(params?.message);

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle,#fff,#fff7f8,#f7e7d7)] p-4">
      <section className="card w-full max-w-xl p-6">
        <p className="text-sm font-semibold text-rose">建立 workspace</p>
        <h1 className="mt-2 text-3xl font-bold text-plum">註冊美甲美容營運 OS</h1>
        <p className="mt-2 text-sm text-ink/60">新用戶註冊後會建立獨立 workspace，資料以 workspace_id + RLS 隔離。</p>

        {error ? <FormNotice kind="error">{decodeURIComponent(error)}</FormNotice> : null}
        {message ? <FormNotice kind="success">{decodeURIComponent(message)}</FormNotice> : null}

        <form action={createAccountAction} className="mt-6 grid gap-3 md:grid-cols-2">
          <input className="mobile-tap rounded-2xl border border-champagne" name="workspaceName" placeholder="店鋪名稱" required />
          <input className="mobile-tap rounded-2xl border border-champagne" name="phone" placeholder="聯絡電話" />
          <input className="mobile-tap rounded-2xl border border-champagne md:col-span-2" name="displayName" placeholder="負責人名稱" />
          <input className="mobile-tap rounded-2xl border border-champagne md:col-span-2" name="email" placeholder="Email" type="email" required />
          <input className="mobile-tap rounded-2xl border border-champagne md:col-span-2" name="password" placeholder="密碼" type="password" required minLength={8} />
          <button className="mobile-tap rounded-2xl bg-plum text-center font-semibold text-white md:col-span-2" type="submit">建立店鋪 workspace</button>
        </form>
      </section>
    </main>
  );
}
