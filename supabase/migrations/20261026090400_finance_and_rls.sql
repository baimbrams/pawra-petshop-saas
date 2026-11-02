-- =============================================================================
-- Migration 05: Expenses Ledger & Strict Multi-Tenant Row Level Security (RLS)
-- =============================================================================

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference_code text not null,
  expense_date date not null default current_date,
  category text not null check (category in (
    'inventory_restock',
    'staff_payroll',
    'utilities',
    'rent',
    'hygiene_supplies',
    'equipment_maintenance',
    'marketing_other'
  )),
  vendor_name text not null default '',
  description text not null default '',
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'IDR',
  is_voided boolean not null default false,
  recorded_by text not null default '',
  created_at timestamptz not null default now(),
  unique (organization_id, reference_code)
);

-- Strip all anonymous privileges on tenant tables
revoke all on all tables in schema public from anon;

-- Enable RLS across all tables
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.customers enable row level security;
alter table public.pets enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.pos_orders enable row level security;
alter table public.pos_order_items enable row level security;
alter table public.kennels enable row level security;
alter table public.boarding_stays enable row level security;
alter table public.boarding_logs enable row level security;
alter table public.grooming_appointments enable row level security;
alter table public.expenses enable row level security;

-- Organization & Membership Policies
create policy org_select on public.organizations
  for select to authenticated
  using (app.is_org_member(id));

create policy org_update on public.organizations
  for update to authenticated
  using (app.has_min_role(id, 'admin'))
  with check (app.has_min_role(id, 'admin'));

create policy members_select on public.organization_members
  for select to authenticated
  using (app.is_org_member(organization_id));

-- Tenant Operational Tables Policies (Mirrors src/lib/authz/permissions.ts)
create policy customers_member_all on public.customers
  for all to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

create policy pets_member_all on public.pets
  for all to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

create policy products_select on public.products
  for select to authenticated
  using (app.is_org_member(organization_id));

create policy products_manage on public.products
  for all to authenticated
  using (app.has_min_role(organization_id, 'manager'))
  with check (app.has_min_role(organization_id, 'manager'));

create policy pos_orders_staff on public.pos_orders
  for all to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

create policy pos_items_staff on public.pos_order_items
  for all to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

create policy kennels_select on public.kennels
  for select to authenticated
  using (app.is_org_member(organization_id));

create policy kennels_manage on public.kennels
  for all to authenticated
  using (app.has_min_role(organization_id, 'manager'))
  with check (app.has_min_role(organization_id, 'manager'));

create policy boarding_staff on public.boarding_stays
  for all to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

create policy boarding_logs_staff on public.boarding_logs
  for all to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

create policy grooming_staff on public.grooming_appointments
  for all to authenticated
  using (app.is_org_member(organization_id))
  with check (app.is_org_member(organization_id));

create policy expenses_select on public.expenses
  for select to authenticated
  using (app.is_org_member(organization_id));

create policy expenses_manage on public.expenses
  for all to authenticated
  using (app.has_min_role(organization_id, 'manager'))
  with check (app.has_min_role(organization_id, 'manager'));
