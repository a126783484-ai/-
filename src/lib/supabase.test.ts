import { afterEach, describe, expect, it } from "vitest";
import { assertSupabaseProductionConfig, getSupabaseConfig, getSupabaseProjectRef, SupabaseConfigError } from "@/lib/supabase";

const originalEnv = { ...process.env };

function resetEnv() {
  process.env = { ...originalEnv };
}

afterEach(resetEnv);

describe("Supabase production config", () => {
  it("extracts the project ref from a Supabase URL", () => {
    expect(getSupabaseProjectRef("https://beautyprod.supabase.co")).toBe("beautyprod");
    expect(getSupabaseProjectRef("https://example.com")).toBeNull();
    expect(getSupabaseProjectRef("not a url")).toBeNull();
  });

  it("uses public production Supabase env as the canonical app config", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://beautyprod.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon";

    expect(getSupabaseConfig()).toMatchObject({
      url: "https://beautyprod.supabase.co",
      anonKey: "public-anon"
    });
  });

  it("fails fast when public and server Supabase URLs point to different projects", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://beautyprod.supabase.co";
    process.env.SUPABASE_URL = "https://otherprod.supabase.co";

    expect(() => assertSupabaseProductionConfig({
      url: "https://beautyprod.supabase.co",
      anonKey: "anon",
      demoMode: false
    })).toThrow(SupabaseConfigError);
  });

  it("fails fast when the configured project ref does not match the URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://beautyprod.supabase.co";
    process.env.SUPABASE_PROJECT_REF = "otherprod";

    expect(() => assertSupabaseProductionConfig({
      url: "https://beautyprod.supabase.co",
      anonKey: "anon",
      demoMode: false
    })).toThrow("configured project ref");
  });
});
