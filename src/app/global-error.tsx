"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled global application error", error);
  }, [error]);

  return (
    <html lang="zh-Hant-TW">
      <body>
        <main className="grid min-h-screen place-items-center bg-blush p-4">
          <section className="w-full max-w-lg rounded-3xl border border-champagne bg-white p-6 text-center shadow-soft">
            <p className="text-sm font-semibold text-rose">Beauty OS</p>
            <h1 className="mt-3 text-2xl font-bold text-plum">系統暫時無法載入</h1>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              已保留錯誤狀態，請先重新嘗試；若仍失敗，回到登入頁重新進入工作區。
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={reset}
                className="mobile-tap rounded-2xl bg-plum px-4 py-3 font-semibold text-white"
              >
                重新嘗試
              </button>
              <a
                href="/login"
                className="mobile-tap rounded-2xl border border-champagne px-4 py-3 font-semibold text-plum"
              >
                回到登入
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
