-- Idempotent authenticated onboarding bootstrap.
-- This lets a newly verified/logged-in owner create the first workspace member
-- without requiring a service-role key in the application runtime.
create or replace function public.bootstrap_owner_workspace(
  workspace_name text,
  owner_display_name text default null,
  owner_phone text default null
)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text := auth.jwt() ->> 'email';
  existing_workspace public.workspaces%rowtype;
  created_workspace public.workspaces%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to bootstrap a workspace.' using errcode = '28000';
  end if;

  select w.* into existing_workspace
  from public.workspaces w
  join public.workspace_members wm on wm.workspace_id = w.id
  where wm.user_id = current_user_id
    and wm.active = true
  order by w.created_at asc
  limit 1;

  if found then
    return existing_workspace;
  end if;

  insert into public.workspaces (name, phone)
  values (nullif(trim(workspace_name), ''), nullif(trim(owner_phone), ''))
  returning * into created_workspace;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    display_name,
    phone
  ) values (
    created_workspace.id,
    current_user_id,
    'owner',
    coalesce(nullif(trim(owner_display_name), ''), current_user_email, 'Owner'),
    nullif(trim(owner_phone), '')
  );

  return created_workspace;
end;
$$;

revoke execute on function public.bootstrap_owner_workspace(text, text, text) from public;
revoke execute on function public.bootstrap_owner_workspace(text, text, text) from anon;
grant execute on function public.bootstrap_owner_workspace(text, text, text) to authenticated;
