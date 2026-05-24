#!/usr/bin/env node
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
];

const expectedProductionProjectRef = "odzxyhaoehvhfximnwjh";
const expectedProductionSupabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kenh5aGFvZWh2aGZ4aW1ud2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTEzMzcsImV4cCI6MjA5NDA4NzMzN30.MoUPUR1Fsjh3LqScqHqtGs008fH26orpekYQji5D--o";
const shouldEnforceProjectRef = process.env.ENFORCE_SUPABASE_PROJECT_REF === "true";

function firstDefined(...values) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

function projectRefFromUrl(url) {
  if (!url) return null;

  try {
    const hostname = new URL(url).hostname;
    const [projectRef, ...rest] = hostname.split(".");
    return rest.join(".") === "supabase.co" && projectRef ? projectRef : null;
  } catch {
    return null;
  }
}

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.warn("Missing production Supabase env: " + missing.join(", ") + ". Falling back to embedded canonical values.");
}

const effectivePublicUrl = firstDefined(process.env.NEXT_PUBLIC_SUPABASE_URL, "https://" + expectedProductionProjectRef + ".supabase.co");
const effectiveServerUrl = firstDefined(process.env.SUPABASE_URL, effectivePublicUrl);
const effectiveAnonKey = firstDefined(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, expectedProductionSupabaseAnonKey);

const publicRef = projectRefFromUrl(effectivePublicUrl);
const serverRef = projectRefFromUrl(effectiveServerUrl);
const expectedRef = firstDefined(
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF,
  process.env.SUPABASE_PROJECT_REF,
  expectedProductionProjectRef
);

if (!publicRef) {
  console.error("NEXT_PUBLIC_SUPABASE_URL must be a https://<project-ref>.supabase.co URL.");
  process.exit(1);
}

if (!effectiveAnonKey) {
  console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY could not be resolved.");
  process.exit(1);
}

if (serverRef && serverRef !== publicRef) {
  console.error("SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL point to different Supabase projects.");
  process.exit(1);
}

if (shouldEnforceProjectRef && expectedRef && expectedRef !== publicRef) {
  console.error(`Supabase project mismatch: expected ${expectedRef}, got ${publicRef}.`);
  process.exit(1);
}

if (!shouldEnforceProjectRef && expectedRef && expectedRef !== publicRef) {
  console.warn(`Supabase project mismatch detected but not enforced during bootstrap sync: expected ${expectedRef}, got ${publicRef}.`);
}

console.log(`Production Supabase env points at project ${publicRef}.`);
