-- =============================================================================
-- Migration 02: Customers & Pet Profiles (Composite Tenant Foreign Keys)
-- =============================================================================

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  full_name text not null check (char_length(trim(full_name)) >= 1),
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  notes text not null default '',
  loyalty_points integer not null default 0 check (loyalty_points >= 0),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, code)
);

create index idx_customers_org on public.customers(organization_id);

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null,
  code text not null,
  name text not null check (char_length(trim(name)) >= 1),
  species text not null check (species in ('cat', 'dog', 'rabbit', 'bird', 'hamster', 'other')),
  breed text not null default 'Domestik',
  gender text not null check (gender in ('male', 'female')),
  birth_date date,
  weight_kg numeric(5,2) not null default 1.0 check (weight_kg > 0),
  is_sterilized boolean not null default false,
  vaccine_name text not null default '',
  vaccine_expires_on date,
  allergies_or_notes text not null default '',
  temperament text not null default 'friendly' check (temperament in ('friendly', 'shy', 'anxious', 'aggressive')),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, code),
  foreign key (customer_id, organization_id) references public.customers(id, organization_id) on delete cascade
);

create index idx_pets_org_customer on public.pets(organization_id, customer_id);
