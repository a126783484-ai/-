-- Beauty / Nail Salon Operating System initial schema
-- Demo seed data lives in src/lib/seed.ts and is clearly marked as Demo Data.
create extension if not exists "pgcrypto";

create type public.workspace_role as enum ('owner', 'admin', 'technician', 'front_desk', 'staff');
create type public.appointment_status as enum ('pending', 'confirmed', 'in_service', 'completed', 'cancelled', 'no_show');
create type public.order_status as enum ('unpaid', 'partial', 'paid', 'refunded');
create type public.payment_method as enum ('cash', 'card', 'transfer', 'line_pay', 'other');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  brand_color text default '#C87486',
  business_hours jsonb default '{}'::jsonb,
  booking_rules jsonb default '{}'::jsonb,
  receipt_settings jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'staff',
  display_name text not null,
  phone text,
  active boolean not null default true,
  commission_rate numeric(5,4) not null default 0,
  specialties text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  unique (workspace_id, name)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid references public.service_categories(id) on delete set null,
  name text not null,
  price integer not null check (price >= 0),
  duration_min integer not null check (duration_min > 0),
  description text,
  enabled boolean not null default true,
  is_add_on boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  phone text not null,
  birthday date,
  line_id text,
  note text,
  preferences text[] not null default '{}',
  cautions text[] not null default '{}',
  tier text not null default '一般',
  tags text[] not null default '{}',
  last_visit date,
  next_reminder date,
  created_at timestamptz not null default now(),
  unique (workspace_id, phone)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  technician_id uuid not null references public.workspace_members(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  source text not null default '現場',
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

create table public.appointment_services (
  appointment_id uuid references public.appointments(id) on delete cascade,
  service_id uuid references public.services(id) on delete restrict,
  primary key (appointment_id, service_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  technician_id uuid not null references public.workspace_members(id) on delete restrict,
  discount integer not null default 0,
  tip integer not null default 0,
  paid_amount integer not null default 0,
  payment_method public.payment_method not null default 'cash',
  status public.order_status not null default 'unpaid',
  created_at timestamptz not null default now()
);

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price integer not null check (unit_price >= 0)
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand text,
  category text not null,
  name text not null,
  cost integer not null default 0,
  retail_price integer not null default 0,
  quantity numeric(12,2) not null default 0,
  low_stock_threshold numeric(12,2) not null default 0
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  movement_type text not null check (movement_type in ('purchase', 'consume', 'adjust')),
  quantity numeric(12,2) not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  staff_id uuid not null references public.workspace_members(id) on delete cascade,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  leave boolean not null default false,
  unique (workspace_id, staff_id, shift_date)
);

create index appointments_workspace_start_idx on public.appointments(workspace_id, start_at);
create index orders_workspace_created_idx on public.orders(workspace_id, created_at);
create index customers_workspace_phone_idx on public.customers(workspace_id, phone);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.shifts enable row level security;

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace and wm.user_id = auth.uid() and wm.active
  );
$$;

create or replace function public.current_workspace_role(target_workspace uuid)
returns public.workspace_role language sql stable security definer set search_path = public as $$
  select wm.role from public.workspace_members wm
  where wm.workspace_id = target_workspace and wm.user_id = auth.uid() and wm.active
  limit 1;
$$;

create policy "members read workspace" on public.workspaces for select using (public.is_workspace_member(id));
create policy "owners update workspace" on public.workspaces for update using (public.current_workspace_role(id) in ('owner','admin'));
create policy "authenticated creates workspace" on public.workspaces for insert with check (auth.uid() is not null);

create policy "workspace member isolation" on public.workspace_members for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "workspace data isolation categories" on public.service_categories for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "workspace data isolation services" on public.services for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "workspace data isolation customers" on public.customers for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "workspace data isolation appointments" on public.appointments for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "workspace data isolation orders" on public.orders for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "workspace data isolation inventory" on public.inventory_items for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "workspace data isolation movements" on public.inventory_movements for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "workspace data isolation shifts" on public.shifts for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy "appointment service visible via appointment" on public.appointment_services for all using (
  exists (select 1 from public.appointments a where a.id = appointment_id and public.is_workspace_member(a.workspace_id))
) with check (
  exists (select 1 from public.appointments a where a.id = appointment_id and public.is_workspace_member(a.workspace_id))
);

create policy "order line visible via order" on public.order_lines for all using (
  exists (select 1 from public.orders o where o.id = order_id and public.is_workspace_member(o.workspace_id))
) with check (
  exists (select 1 from public.orders o where o.id = order_id and public.is_workspace_member(o.workspace_id))
);
