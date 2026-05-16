-- The idempotent bootstrap RPC owns first-workspace creation.
-- Drop the broad owner insert policy so authenticated users cannot grant
-- themselves owner membership on an arbitrary existing workspace_id.
drop policy if exists "authenticated owner bootstrap member" on public.workspace_members;
