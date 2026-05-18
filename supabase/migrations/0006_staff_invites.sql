create table public.workspace_member_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null check (email = lower(email)),
  display_name text not null,
  phone text,
  role public.workspace_role not null default 'staff',
  commission_rate numeric(5,4) not null default 0,
  specialties text[] not null default '{}',
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index workspace_member_invites_workspace_email_idx
  on public.workspace_member_invites (workspace_id, email, status);

alter table public.workspace_member_invites enable row level security;

create policy "workspace members manage invites"
  on public.workspace_member_invites
  for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "invitee can read own invite"
  on public.workspace_member_invites
  for select
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "invitee can accept own invite"
  on public.workspace_member_invites
  for update
  using (
    email = lower(coalesce(auth.jwt() ->> 'email', ''))
    and status = 'pending'
  )
  with check (
    email = lower(coalesce(auth.jwt() ->> 'email', ''))
    and status = 'accepted'
  );

create policy "invitees can join workspace"
  on public.workspace_members
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.workspace_member_invites invites
      where invites.workspace_id = workspace_id
        and invites.email = lower(coalesce(auth.jwt() ->> 'email', ''))
        and invites.status = 'pending'
    )
  );
