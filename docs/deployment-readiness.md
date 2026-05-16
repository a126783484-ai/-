# Beauty OS Deployment Readiness

## Current production rule

This repository must be deployed as its own Beauty OS project. Existing restaurant-os Vercel projects must not be used as proof that Beauty OS is demo-ready or production-ready.

## Required before demo-ready

- A dedicated Vercel project for this repository.
- Vercel environment variables configured for the Beauty OS Supabase project.
- A preview or production URL that loads this repository, not restaurant-os.
- CI passing on the same commit that is deployed.
- No fake login bypass.
- No direct dashboard access without a server session guard.

## Required before production-ready

- Real login flow is implemented and tested.
- Register flow creates a Supabase user and owner workspace membership.
- Unauthenticated dashboard access redirects to the entry page.
- Authenticated users can reach the dashboard.
- Error states do not hide failed API operations.
- Timeout failures are visible and actionable.
- Vercel function error rate is reviewed before release.

## Restaurant OS failure lessons

- A mobile screen with buttons is not proof of operability.
- API timeout after 20000 ms is a release blocker.
- Data warnings such as active orders referencing unavailable tables are release blockers.
- High Vercel function error rate is a release blocker.
- Demo data must never mask broken live data flows.

## Production Supabase normalization checklist

Use exactly one Beauty OS Supabase project for production. The public browser URL, optional server URL alias, anon keys, and optional project-ref guard must all point to the same Supabase project before redeploying Vercel production.

1. Pull the Vercel production environment locally, then run `npm run verify:production-env` against that environment.
2. Keep `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as the canonical production values used by both browser and server clients.
3. If `SUPABASE_URL` or `SUPABASE_ANON_KEY` are also present for server-side compatibility, they must duplicate the same project as the `NEXT_PUBLIC_` values.
4. Set `SUPABASE_PROJECT_REF` or `NEXT_PUBLIC_SUPABASE_PROJECT_REF` to the intended Beauty OS Supabase project ref when possible; the app will fail fast if the URL points elsewhere.
5. Apply all migrations through `supabase/migrations/0005_harden_workspace_bootstrap.sql` to the intended production Supabase project before redeploying.
6. Redeploy Vercel production after environment normalization so serverless functions read the repaired Supabase configuration.

After redeploy, verify both a fresh registration and an existing authenticated user with no active `workspace_members` row reach the dashboard with a real workspace and no workspace initialization warning.
