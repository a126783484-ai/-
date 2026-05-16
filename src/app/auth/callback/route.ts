import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { normalizeAuthRedirectTarget } from "@/lib/auth-routes";
import { ensureOwnerWorkspaceForUser } from "@/lib/workspace";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = normalizeAuthRedirectTarget(requestUrl.searchParams.get("next"));

  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !data.user || !data.session) {
        return NextResponse.redirect(new URL("/login?error=auth_callback_failed", request.url));
      }

      await ensureOwnerWorkspaceForUser(data.user);
    } catch {
      return NextResponse.redirect(new URL("/login?error=auth_bootstrap_failed", request.url));
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
