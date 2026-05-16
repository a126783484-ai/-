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
