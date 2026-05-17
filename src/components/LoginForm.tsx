"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { bootstrapLoggedInWorkspaceAction } from "@/app/login/actions";
import { SupabaseConfigError, getSupabaseBrowserClient } from "@/lib/supabase";
import { getAuthError } from "@/lib/auth-feedback";

interface LoginFormProps {
  next: string;
  initialError?: string;
  initialMessage?: string;
}

export function LoginForm({ next, initialError, initialMessage }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState(initialError);
  const [message] = useState(initialMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRouting, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isRouting) {
      return;
    }

    setError(undefined);
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "").trim();

      let supabase;

      try {
        supabase = getSupabaseBrowserClient();
      } catch (loginError) {
        if (loginError instanceof SupabaseConfigError) {
          setError(getAuthError("auth_config_missing"));
          return;
        }

        throw loginError;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError || !data.user || !data.session) {
        setError(getAuthError("invalid_login"));
        return;
      }

      const bootstrapResult = await bootstrapLoggedInWorkspaceAction();

      if (!bootstrapResult.ok) {
        setError(getAuthError(bootstrapResult.error));
        return;
      }

      startTransition(() => {
        router.replace(next);
        router.refresh();
      });
    } catch {
      setError(getAuthError("invalid_login"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isBusy = isSubmitting || isRouting;

  return (
    <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
      {message ? (
        <div className="rounded-2xl bg-sage/15 p-4 text-sm font-semibold text-plum" role="status">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl bg-rose/10 p-4 text-sm font-semibold text-rose" role="alert">
          {error}
        </div>
      ) : null}

      <input
        className="mobile-tap w-full rounded-2xl border border-champagne"
        name="email"
        placeholder="Email"
        type="email"
        autoComplete="email"
        required
        disabled={isBusy}
      />
      <input
        className="mobile-tap w-full rounded-2xl border border-champagne"
        name="password"
        placeholder="密碼"
        type="password"
        autoComplete="current-password"
        required
        minLength={8}
        disabled={isBusy}
      />
      <button
        className="mobile-tap w-full rounded-2xl bg-plum px-4 py-3 text-center font-semibold text-white disabled:cursor-wait disabled:opacity-70"
        disabled={isBusy}
        type="submit"
      >
        {isBusy ? "正在登入並建立工作階段…" : "登入 Workspace"}
      </button>
    </form>
  );
}
