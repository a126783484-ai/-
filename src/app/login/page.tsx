import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-blush p-4">
      <section className="card w-full max-w-md p-6">
        <p className="text-sm font-semibold text-rose">Beauty OS</p>
        <h1 className="mt-2 text-3xl font-bold text-plum">店鋪入口</h1>
        <p className="mt-2 text-sm text-ink/60">此入口尚未開放直通後台。完成正式權限流程前，不提供繞過入口。</p>
        <div className="mt-6 rounded-2xl bg-plum/10 p-4 text-sm font-semibold text-plum">權限流程建置中</div>
        <Link className="mt-4 block text-center text-sm font-semibold text-rose" href="/register">建立新店鋪 workspace</Link>
      </section>
    </main>
  );
}
