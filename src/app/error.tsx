"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-blush p-4">
      <section className="card w-full max-w-lg p-6 text-center">
        <p className="text-sm font-semibold text-rose">Beauty OS</p>
        <h1 className="mt-3 text-2xl font-bold text-plum">發生錯誤</h1>
        <p className="mt-2 text-sm text-ink/60">
          頁面載入時發生問題，請稍後再試。
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="mobile-tap rounded-2xl bg-plum px-4 py-3 font-semibold text-white"
          >
            重新嘗試
          </button>
          <Link
            href="/"
            className="mobile-tap rounded-2xl border border-champagne px-4 py-3 font-semibold text-plum"
          >
            回到首頁
          </Link>
        </div>
      </section>
    </main>
  );
}
