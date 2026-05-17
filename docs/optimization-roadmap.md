# Beauty OS Optimization Roadmap

This roadmap is specific to the current `beauty-os` repository.

The goal is to move the app from a polished demo into a production-ready beauty salon operating system with:

- real Supabase-backed CRUD
- tenant-safe workspace isolation
- mobile-first operations
- actionable error states
- scalable data loading

## Current baseline

The repository already has:

- Supabase auth and workspace bootstrap
- RLS-backed data model and migrations
- mobile-friendly app shell
- dashboard, appointments, customers, services, checkout, inventory, staff, reports, and settings screens

The main remaining gaps are operational:

- many actions are still UI-only
- table interactions are still demo-style
- write flows are not yet wired through the app
- list loading is still broad and not paginated
- upload / persistence flows are incomplete

## Priority 0

### 1. Replace demo-only actions with real CRUD

**Where**

- `src/components/ModuleViews.tsx`
- `src/components/ModuleTable.tsx`

**Current gap**

- several buttons are disabled or informational only
- actions like create, update, export, photo upload, and settings save do not persist to Supabase

**Target**

- create, update, and delete flows should write to Supabase
- each major module should have a concrete save path and a visible error state
- table actions should mutate real data instead of only showing placeholders

**Acceptance**

- appointments can be created and updated
- customers can be created and edited
- services, staff, inventory, and settings can be saved
- the UI shows success and failure states without blocking alerts

### 2. Add server-backed form actions for each module

**Where**

- `src/app/login/actions.ts`
- `src/app/account/actions.ts`
- new server actions for module forms

**Current gap**

- auth flows exist
- module-level write flows do not

**Target**

- use server actions or API routes for all writes
- validate inputs with a shared schema layer before calling Supabase
- keep workspace scoping enforced on the server

**Acceptance**

- every write path is server-validated
- no client-only mutation is treated as final

### 3. Harden workspace isolation on every read and write

**Where**

- `src/lib/app-data.ts`
- `src/lib/workspace.ts`
- `src/lib/supabase-server.ts`
- `supabase/migrations/0001_initial_beauty_nail_os.sql`
- `supabase/migrations/0002_workspace_owner_bootstrap.sql`
- `supabase/migrations/0003_owner_workspace_bootstrap.sql`
- `supabase/migrations/0004_drop_insecure_owner_insert_policy.sql`
- `supabase/migrations/0005_harden_workspace_bootstrap.sql`

**Current gap**

- read paths are centralized, but write paths still need stronger coverage and review

**Target**

- every query must remain scoped to the authenticated workspace
- every mutation must reject cross-workspace writes
- bootstrap should not create ambiguous ownership rows

**Acceptance**

- authenticated users only see their own workspace
- no write can target a foreign workspace ID

### 4. Make the mobile shell fully operational

**Where**

- `src/components/AppShell.tsx`

**Current gap**

- the mobile shell now exposes all modules, but the flows behind many items still need real actions

**Target**

- keep every primary module reachable on small screens
- ensure primary workflows can be completed with one hand and no desktop-only assumptions

**Acceptance**

- all major modules are reachable on mobile
- no critical flow depends on hover, modal-only affordances, or blocking browser dialogs

## Priority 1

### 5. Reduce broad in-memory table filtering

**Where**

- `src/components/ModuleTable.tsx`
- `src/lib/app-data.ts`

**Current gap**

- module tables currently filter by serializing row objects in the client
- this is fine for demo-sized datasets, but not for real businesses

**Target**

- move search and filter to explicit searchable fields
- add server-side pagination or cursor loading for larger datasets

**Acceptance**

- list views stay responsive with real-world record counts
- filters do not rely on full object stringification

### 6. Add real pagination for list-heavy modules

**Where**

- `src/components/ModuleViews.tsx`
- `src/lib/app-data.ts`

**Current gap**

- dashboard-style pages currently expect whole-workspace loads

**Target**

- load customers, appointments, orders, and inventory in pages
- keep dashboard summaries separate from record lists

**Acceptance**

- large datasets do not stall the app
- pages can load incrementally

### 7. Improve validation and feedback consistency

**Where**

- `src/lib/auth-feedback.ts`
- `src/components/FormNotice.tsx`
- `src/components/ui.tsx`
- new shared form schema files

**Current gap**

- error handling is already better than the initial version, but write flows will need standardized validation feedback

**Target**

- use one consistent error format
- show actionable messages for validation, auth, and Supabase failures

**Acceptance**

- users can tell whether a failure is validation, auth, permissions, or transport

### 8. Keep dashboard calculations cheap and predictable

**Where**

- `src/lib/analytics.ts`
- `src/lib/orders.ts`
- `src/lib/appointments.ts`

**Current gap**

- dashboard metrics are computed in memory from already-loaded data

**Target**

- preserve this for small datasets
- move expensive summaries to server-side aggregates when the data volume grows

**Acceptance**

- dashboard remains fast on live data
- summary calculations remain accurate and testable

## Priority 2

### 9. Add file upload persistence for technician notes and photos

**Where**

- `src/components/ModuleViews.tsx`
- new storage integration code

**Current gap**

- technician notes and photo upload buttons are placeholders

**Target**

- use Supabase Storage or another managed storage layer
- persist service notes, before/after photos, and audit metadata

**Acceptance**

- technicians can attach actual media to appointments
- uploads are associated with the correct workspace and record

### 10. Add audit trails for operational mutations

**Where**

- `src/lib/*`
- database migrations

**Current gap**

- there is no visible operational audit layer in the app

**Target**

- record important changes for appointments, payments, inventory, and customer records

**Acceptance**

- operators can inspect who changed what and when

### 11. Tighten production deployment readiness

**Where**

- `docs/deployment-readiness.md`
- `scripts/verify-production-env.mjs`
- `vercel.json`

**Current gap**

- production env checks exist, but every release still needs disciplined verification

**Target**

- keep the production Supabase project normalized
- avoid regressions in login, workspace bootstrap, and protected routes

**Acceptance**

- build, test, and deploy remain reproducible across environments

## Recommended execution order

1. Real CRUD for the core modules
2. Server-backed validation for every write path
3. Workspace isolation review on all mutations
4. Pagination and search optimization
5. Photo / upload persistence
6. Audit trails and long-term analytics

## Non-goals

- Do not add a second UI framework.
- Do not introduce a separate backend unless Supabase can no longer support the required workflows.
- Do not keep demo-only browser dialogs in production paths.

