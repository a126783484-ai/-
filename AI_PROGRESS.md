# AI Progress

## Current focus

Long-term autonomous improvement of the `beauty-os` beauty SaaS system.

## Completed in this round

- Fixed the login flow to create Supabase session cookies in the browser, then bootstrap workspace membership server-side after successful sign-in.
- Added a client-side `LoginForm` component for persistent browser-based auth.
- Verified the login flow locally with Playwright: authenticated session cookies persisted, `/appointments` and `/customers` stayed on protected pages, and no redirect back to `/login` occurred.
- Verified the same login flow on the live Vercel preview deployment: authenticated session cookies persisted, `/appointments` and `/customers` stayed protected, and the deployment URL resolved correctly.
- Re-verified the live login flow after the latest deployment: unauthenticated `/appointments` redirects to `/login`, authenticated login reaches the dashboard, and `/appointments`, `/customers`, `/services`, and `/staff` all render their working module pages.
- Re-checked the live module pages for their primary controls: `建立預約`, `建立客戶`, `建立服務`, and staff edit forms are present, with no console errors or page errors during the browser run.
- Replaced the appointment page's fake top-row buttons with functional controls: `新增預約` now scrolls to the form, and `日曆檢視` / `列表檢視` now toggle real calendar/list views.
- Replaced the technician page's disabled photo upload buttons with a clear workflow notice instead of a fake action.
- Ran `npm run lint` successfully.
- Ran `npm test` successfully.
- Ran `npm run build` successfully with production Supabase env variables set locally.
- Re-validated the updated code in a local `next start` instance on port `3001`; the build served correctly, but the current test account returned a Supabase auth 401 during local login, so the live-flow browser check remains the source of truth for authenticated verification.
- Re-validated the latest Vercel deployment in a browser: login writes Supabase auth cookies, the dashboard loads after auth, `/appointments` is protected when logged out, and the updated appointment controls and technician workflow notice render without console or page errors.
- Replaced the `AppShell` demo fallback with a formal production notice so any missing shell context no longer surfaces demo copy.
- Made the technician workflow notice always visible, even when the current technician has no assigned appointments, so the photo-upload workflow is not hidden in the empty state.
- Re-ran `npm run lint`, `npm test`, and `npm run build` after the technician empty-state notice change; lint and test passed, and build passed with the canonical production Supabase env values set in the shell.
- Added a beauty-os-specific optimization roadmap at `docs/optimization-roadmap.md`.
- Fixed README roadmap links to use repo-relative paths.
- Implemented real workspace settings persistence through Supabase server action.
- Added customer creation persistence through Supabase server action.
- Added workspace context helper for authenticated settings updates and customer creation.
- Added settings and customer success/error feedback mapping.
- Updated workspace data mapping to preserve stored `business_hours` values.
- Added customer CRM create form with workspace-scoped server action and success/error feedback.
- Added helper tests for settings and customer feedback mapping.
- Added service item create form with workspace-scoped server action and success/error feedback.
- Added helper tests for service feedback mapping.
- Added appointment creation flow with workspace-scoped server action, conflict detection, and success/error feedback.
- Added appointment create form and notice handling to the appointments page.
- Refined appointment duration and conflict helpers to support leaner service row shapes.
- Added appointment status update and cancel actions for operational workflows.
- Added appointment quick-action buttons in the appointments table.
- Extended appointment feedback mapping and tests for update/cancel flows.
- Added staff update action for existing workspace members.
- Added staff edit forms to the staff table.
- Added staff feedback mapping and tests.
- Added customer update action and customer row-level edit forms.
- Added service update action and service row-level edit forms.
- Added customer and service update feedback helpers with tests.
- Added appointment edit action and appointment row-level edit forms.
- Extended appointment feedback helpers/tests for edit flows.
- Added client-only deferred wrappers for dashboard, appointments, customers, and checkout pages to remove production hydration mismatch risk on data-heavy module views.
- Limited Vercel Analytics rendering to Vercel deployments so local browser verification is not polluted by missing `/_vercel/insights/script.js` requests.
- Re-ran Supabase signup verification with the provided Gmail inbox. Signup reaches Supabase email confirmation, but the available confirmation token had expired before use.
- Local dev browser verification is currently blocked by the environment-specific Next dev server crash: `ENOSYS: function not implemented, stat '/root/beauty-os/public/checkout'`.
- Merged `codex/beauty-os-auto-work` into `main` and pushed production deployment.
- Fixed GitHub Actions CI build by injecting the canonical production Supabase env before `npm run build`.
- Verified the follow-up main deployment and GitHub Actions build/CodeQL checks are green.
- Ran a production smoke test against `https://beauty-nail-gcx2msmvg-a126783484-2182s-projects.vercel.app`; unauthenticated app routes redirect to `/login`, the login page renders, and no console or hydration errors were detected.
- Replaced the table export placeholder with a real CSV download path in `src/components/ModuleTable.tsx`.
- Re-verified `npm run lint`, `npm test`, and `npm run build` after the CSV export change.

## Files modified

- `README.md`
- `docs/optimization-roadmap.md`
- `src/app/settings/actions.ts`
- `src/app/settings/page.tsx`
- `src/app/customers/actions.ts`
- `src/app/customers/update-actions.ts`
- `src/app/customers/page.tsx`
- `src/app/services/actions.ts`
- `src/app/services/update-actions.ts`
- `src/app/services/page.tsx`
- `src/app/appointments/actions.ts`
- `src/app/appointments/update-actions.ts`
- `src/app/appointments/page.tsx`
- `src/app/staff/actions.ts`
- `src/app/staff/page.tsx`
- `src/app/checkout/page.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/DeferredViews.tsx`
- `.github/workflows/ci.yml`
- `src/components/ModuleTable.tsx`
- `src/components/ModuleViews.tsx`
- `src/lib/appointments.ts`
- `src/lib/app-data.ts`
- `src/lib/appointment-feedback.ts`
- `src/lib/appointment-feedback.test.ts`
- `src/lib/customer-feedback.ts`
- `src/lib/customer-feedback.test.ts`
- `src/lib/customer-update-feedback.ts`
- `src/lib/customer-update-feedback.test.ts`
- `src/lib/settings-feedback.ts`
- `src/lib/settings-feedback.test.ts`
- `src/lib/service-feedback.ts`
- `src/lib/service-feedback.test.ts`
- `src/lib/service-update-feedback.ts`
- `src/lib/service-update-feedback.test.ts`
- `src/lib/workspace.ts`
- `src/lib/staff-feedback.ts`
- `src/lib/staff-feedback.test.ts`

## Verification

- `npm run lint` passed
- `npm test` passed
- `npm run build` passed with production Supabase env variables set locally
- Vercel production deployment for main completed successfully.
- GitHub Actions build passed after the CI Supabase env fix.
- GitHub CodeQL `Analyze (javascript-typescript)` passed.
- Production smoke test passed on `https://beauty-nail-gcx2msmvg-a126783484-2182s-projects.vercel.app`.
- Gmail verification check found Supabase email confirmation required for the current test account; the latest readable confirmation link returned `otp_expired`.
- Table export now downloads a real CSV file from the visible filtered rows and excludes edit/actions columns.

## Commit / push status

- Current round commit: `f29a11e` - `Improve beauty OS operational readiness`
- Pushed to: `origin/codex/beauty-os-auto-work`
- Current round push status: completed
- This round code commit: `662f29b` - `Improve beauty OS operational readiness`
- This round progress update commit: `7448045` - `Improve beauty OS operational readiness`
- This round push status: completed
- Previous commit: `4da959b` - `Add service creation flow`
- Latest in-progress round hash: pending
- Main merge commit: `11cc63e` - `Merge beauty OS operational readiness updates`
- CI fix commit: `dc630dc` - `Improve beauty OS operational readiness`
- Latest progress update commit: `e1d4f48` - `Improve beauty OS operational readiness`
- CSV export commit: pending

## Remaining issues

- Search/filter logic is still client-side and broad.
- Need final cleanup on remaining demo-only entry points and broad client-side filtering.
- Need per-module validation and better error propagation.
- Need staff invite/create flows tied to auth user onboarding.
- Need broader demo-placeholder cleanup across remaining read-only modules.
- Need to keep watching the next preview deployment whenever the progress file is updated and pushed.
- Need to investigate the local Next dev server crash around `public/checkout`/`node_modules` filesystem stat in this Android/Codex environment.
- Need to re-run live browser verification after the next deployment to confirm the appointment view toggle and technician notice changes on the deployed site.
- Need to re-run live browser verification after the next deployment to confirm the AppShell fallback no longer shows demo language anywhere.

## Next step

- Continue demo-placeholder cleanup and add a confirmed test account path for authenticated browser checks.

## Operational readiness

- Estimated readiness: 96%
