#!/usr/bin/env node
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
];

const expectedProductionProjectRef = "odzxyhaoehvhfximnwjh";

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

if (expectedRef && expectedRef !== publicRef) {
  console.error(`Supabase project mismatch: expected ${expectedRef}, got ${publicRef}.`);
  process.exit(1);
}

console.log(`Production Supabase env points consistently at project ${publicRef}.`);
