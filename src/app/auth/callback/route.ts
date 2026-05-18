import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { normalizeAuthRedirectTarget } from "@/lib/auth-routes";
import { ensureOwnerWorkspaceForUser } from "@/lib/workspace";
import { hasPendingStaffInviteForEmail, isMissingStaffInviteTableError } from "@/lib/staff-invites";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = normalizeAuthRedirectTarget(requestUrl.searchParams.get("next"));
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> | null = null;

  if (code) {
    try {
      supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !data.user || !data.session) {
        return NextResponse.redirect(new URL("/login?error=auth_callback_failed", request.url));
      }

      try {
        if (await hasPendingStaffInviteForEmail(supabase, data.user.email ?? "")) {
          return NextResponse.redirect(new URL(next, request.url));
        }
      } catch (inviteError) {
        if (!isMissingStaffInviteTableError(inviteError as { code?: string; message?: string } | null | undefined)) {
          console.error("pending invite lookup failed", inviteError);
        }
      }

      await ensureOwnerWorkspaceForUser(data.user, supabase);
    } catch {
      await supabase?.auth.signOut().catch(() => undefined);
      return NextResponse.redirect(new URL("/login?error=auth_bootstrap_failed", request.url));
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
