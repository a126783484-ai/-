"use client";

import { signInAction } from "@/app/account/actions";

interface LoginFormProps {
  next: string;
  initialError?: string;
  initialMessage?: string;
}

export function LoginForm({ next, initialError, initialMessage }: LoginFormProps) {
  return (
    <form className="mt-6 space-y-3" action={signInAction}>
      {initialMessage ? (
        <div className="rounded-2xl bg-sage/15 p-4 text-sm font-semibold text-plum" role="status">
          {initialMessage}
        </div>
      ) : null}

      {initialError ? (
        <div className="rounded-2xl bg-rose/10 p-4 text-sm font-semibold text-rose" role="alert">
          {initialError}
        </div>
      ) : null}

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
      <button className="mobile-tap w-full rounded-2xl bg-plum px-4 py-3 text-center font-semibold text-white" type="submit">
        登入 Workspace
      </button>
    </form>
  );
}
