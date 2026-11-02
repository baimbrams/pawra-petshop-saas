-- =============================================================================
-- Migration 04: Kennels, Pet Hotel Boarding (GiST Anti-Overlap) & Grooming
-- =============================================================================

create table public.kennels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  species_allowed text[] not null default array['cat'],
  size text not null check (size in ('small', 'medium', 'large', 'vip')),
  daily_rate_minor bigint not null check (daily_rate_minor >= 0),
  currency char(3) not null default 'IDR',
  operational_status text not null default 'active' check (operational_status in ('active', 'maintenance', 'inactive')),
  features text not null default '',
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, code)
);

create table public.boarding_stays (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_code text not null,
  kennel_id uuid not null,
  customer_id uuid not null,
  pet_id uuid not null,
  check_in_date date not null,
  check_out_date date not null,
  nights integer generated always as (check_out_date - check_in_date) stored,
  daily_rate_minor bigint not null check (daily_rate_minor >= 0),
  addons_minor bigint not null default 0 check (addons_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  deposit_paid_minor bigint not null default 0 check (deposit_paid_minor >= 0),
  total_paid_minor bigint not null default 0 check (total_paid_minor >= 0),
  currency char(3) not null default 'IDR',
  status text not null default 'reserved' check (status in ('reserved', 'checked_in', 'checked_out', 'cancelled')),
  feeding_instructions text not null default '',
  medical_notes text not null default '',
  created_at timestamptz not null default now(),
  check (check_out_date > check_in_date),
  unique (id, organization_id),
  unique (organization_id, contract_code),
  foreign key (kennel_id, organization_id) references public.kennels(id, organization_id) on delete restrict,
  foreign key (customer_id, organization_id) references public.customers(id, organization_id) on delete restrict,
  foreign key (pet_id, organization_id) references public.pets(id, organization_id) on delete restrict,
  -- Authoritative GiST exclusion constraint: a kennel cannot be double-booked across overlapping dates!
  constraint boarding_no_kennel_overlap exclude using gist (
    kennel_id with =,
    daterange(check_in_date, check_out_date, '[)') with &&
  ) where (status in ('reserved', 'checked_in'))
);

create table public.boarding_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stay_id uuid not null,
  staff_name text not null,
  appetite text not null check (appetite in ('lahap', 'normal', 'kurang')),
  mood text not null check (mood in ('ceria', 'tenang', 'gelisah')),
  note text not null default '',
  logged_at timestamptz not null default now(),
  foreign key (stay_id, organization_id) references public.boarding_stays(id, organization_id) on delete cascade
);

create table public.grooming_appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  booking_code text not null,
  customer_id uuid not null,
  pet_id uuid not null,
  service_package text not null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  groomer_name text not null default '',
  status text not null default 'scheduled' check (status in ('scheduled', 'checked_in', 'in_progress', 'ready_pickup', 'completed', 'cancelled')),
  price_minor bigint not null check (price_minor >= 0),
  paid_minor bigint not null default 0 check (paid_minor >= 0),
  currency char(3) not null default 'IDR',
  payment_method text check (payment_method in ('qris', 'cash', 'bank_transfer', 'card')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (organization_id, booking_code),
  foreign key (customer_id, organization_id) references public.customers(id, organization_id) on delete restrict,
  foreign key (pet_id, organization_id) references public.pets(id, organization_id) on delete restrict
);
