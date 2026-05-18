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

  it("falls back to the canonical production project when env URLs point elsewhere", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://otherprod.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "wrong-public-anon";
    process.env.SUPABASE_URL = "https://otherprod.supabase.co";
    process.env.SUPABASE_ANON_KEY = "wrong-server-anon";

    expect(getSupabaseConfig()).toMatchObject({
      url: "https://odzxyhaoehvhfximnwjh.supabase.co",
      anonKey: expect.any(String)
    });
  });

  it("uses public production Supabase env when it already points at the canonical project", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://odzxyhaoehvhfximnwjh.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon";

    expect(getSupabaseConfig()).toMatchObject({
      url: "https://odzxyhaoehvhfximnwjh.supabase.co",
      anonKey: "public-anon"
    });
  });

  it("fails fast when the resolved config is not the canonical Supabase project", () => {
    expect(() => assertSupabaseProductionConfig({
      url: "https://beautyprod.supabase.co",
      anonKey: "anon",
      demoMode: false
    })).toThrow("Supabase project mismatch");
  });

  it("fails fast when Supabase environment variables are missing", () => {
    expect(() => assertSupabaseProductionConfig({
      url: undefined,
      anonKey: undefined,
      demoMode: false
    })).toThrow(SupabaseConfigError);
  });
});
