import { describe, expect, it } from "vitest";
import { isProtectedAppRoute, isPublicAuthRoute, normalizeAuthRedirectTarget } from "./auth-routes";

describe("auth route helpers", () => {
  it("keeps safe internal redirect targets", () => {
    expect(normalizeAuthRedirectTarget("/appointments?status=pending")).toBe("/appointments?status=pending");
  });

  it("blocks external and protocol-relative redirect targets", () => {
    expect(normalizeAuthRedirectTarget("https://evil.example")).toBe("/");
    expect(normalizeAuthRedirectTarget("//evil.example")).toBe("/");
  });

  it("does not redirect auth pages back to themselves", () => {
    expect(normalizeAuthRedirectTarget("/login")).toBe("/");
    expect(normalizeAuthRedirectTarget("/register")).toBe("/");
    expect(normalizeAuthRedirectTarget("/auth/callback?next=/reports")).toBe("/");
  });

  it("recognizes public and protected routes", () => {
    expect(isPublicAuthRoute("/login")).toBe(true);
    expect(isProtectedAppRoute("/login")).toBe(false);
    expect(isProtectedAppRoute("/")).toBe(true);
    expect(isProtectedAppRoute("/appointments")).toBe(true);
    expect(isProtectedAppRoute("/_next/static/app.js")).toBe(false);
  });
});
