drop policy if exists "invitee can accept own invite" on public.workspace_member_invites;
drop policy if exists "invitees can join workspace" on public.workspace_members;

create or replace function public.accept_workspace_member_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  invite_row public.workspace_member_invites%rowtype;
  inserted_member_id uuid;
begin
  if current_user_id is null or current_email = '' then
    raise exception 'Authentication is required to accept staff invite.' using errcode = '28000';
  end if;

  select *
  into invite_row
  from public.workspace_member_invites
  where token = invite_token
    and email = current_email
    and status = 'pending'
  for update;

  if not found then
    raise exception '邀請連結無效或已失效。' using errcode = 'P0001';
  end if;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    display_name,
    phone,
    commission_rate,
    specialties,
    active
  )
  values (
    invite_row.workspace_id,
    current_user_id,
    invite_row.role,
    invite_row.display_name,
    invite_row.phone,
    invite_row.commission_rate,
    invite_row.specialties,
    true
  )
  on conflict (workspace_id, user_id)
  do update set
    role = excluded.role,
    display_name = excluded.display_name,
    phone = excluded.phone,
    commission_rate = excluded.commission_rate,
    specialties = excluded.specialties,
    active = true
  returning id into inserted_member_id;

  update public.workspace_member_invites
  set status = 'accepted',
      accepted_at = now()
  where id = invite_row.id;

  return inserted_member_id;
end;
$$;

revoke execute on function public.accept_workspace_member_invite(text) from public;
revoke execute on function public.accept_workspace_member_invite(text) from anon;
grant execute on function public.accept_workspace_member_invite(text) to authenticated;
