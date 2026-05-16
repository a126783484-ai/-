-- Allow the first authenticated owner membership to be created during workspace onboarding.
-- Existing workspace data remains protected by the broader workspace member isolation policy.
create policy "authenticated owner bootstrap member"
on public.workspace_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'owner'
);
