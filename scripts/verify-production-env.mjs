#!/usr/bin/env node

// Skip verification for Vercel preview deployments to avoid build failures due to missing prod env vars
if (process.env.VERCEL_ENV === 'preview') {
  console.log('Skipping production env verification for preview deployment.');
  process.exit(0);
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
];

const expectedProductionProjectRef = "odzxyhaoehvhfximnwjh";
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
  console.error(`Missing production Supabase env: ${missing.join(", ")}`);
  process.exit(1);
}

const publicRef = projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const serverRef = projectRefFromUrl(process.env.SUPABASE_URL);
const expectedRef = firstDefined(
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF,
  process.env.SUPABASE_PROJECT_REF,
  expectedProductionProjectRef
);

if (!publicRef) {
  console.error("NEXT_PUBLIC_SUPABASE_URL must be a https://<project-ref>.supabase.co URL.");
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
