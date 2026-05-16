const publicRoutes = new Set(["/login", "/register", "/auth/callback"]);

export function normalizeAuthRedirectTarget(value: FormDataEntryValue | string | null | undefined): string {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim();

  if (!trimmed.startsWith("/")) return "/";
  if (trimmed.startsWith("//")) return "/";
  if (trimmed.startsWith("/login") || trimmed.startsWith("/register") || trimmed.startsWith("/auth/callback")) {
    return "/";
  }

  return trimmed;
}

export function isPublicAuthRoute(pathname: string): boolean {
  return publicRoutes.has(pathname);
}

export function isProtectedAppRoute(pathname: string): boolean {
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname === "/favicon.ico") {
    return false;
  }

  return !isPublicAuthRoute(pathname);
}
