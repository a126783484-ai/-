import { NextResponse } from "next/server";
import { getSupabaseConfig, getSupabaseProjectRef } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getSupabaseConfig();
  const publicProjectRef = getSupabaseProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serverProjectRef = getSupabaseProjectRef(process.env.SUPABASE_URL);
  const resolvedProjectRef = getSupabaseProjectRef(config.url);

  return NextResponse.json({
    app: "beauty-os",
    ok: Boolean(config.url && config.anonKey),
    resolvedProjectRef,
    publicProjectRef,
    serverProjectRef,
    hasPublicUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasServerUrl: Boolean(process.env.SUPABASE_URL),
    hasPublicAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasServerAnonKey: Boolean(process.env.SUPABASE_ANON_KEY),
    hasProjectRefGuard: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF || process.env.SUPABASE_PROJECT_REF),
    nodeEnv: process.env.NODE_ENV ?? null
  });
}
