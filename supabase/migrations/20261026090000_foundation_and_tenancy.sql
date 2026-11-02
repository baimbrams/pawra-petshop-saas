-- =============================================================================
-- Migration 01: Foundation, Roles, Multi-Tenant Organizations & Auth Helpers
-- Mirrors the three-layer isolation architecture of Atlas SaaS.
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create schema if not exists app;

create type public.org_role as enum ('owner', 'admin', 'manager', 'staff');

create or replace function app.role_rank(p_role public.org_role)
returns integer
language sql
immutable
as $$
  select case p_role
    when 'owner'   then 40
    when 'admin'   then 30
    when 'manager' then 20
    when 'staff'   then 10
  end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  slug text not null unique,
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  city text not null default 'Jakarta',
  default_currency char(3) not null default 'IDR',
  locale text not null default 'id-ID',
  time_zone text not null default 'Asia/Jakarta',
  tax_rate_bps integer not null default 0 check (tax_rate_bps between 0 and 5000),
  receipt_footer text not null default 'Terima kasih telah mempercayakan hewan kesayangan Anda!',
  plan_tier text not null default 'free' check (plan_tier in ('free', 'pro', 'multi_branch')),
  created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.org_role not null default 'staff',
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index idx_org_members_user on public.organization_members(user_id);

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.org_role not null check (role <> 'owner'),
  token_sha256 bytea not null unique,
  invited_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create or replace function app.current_role_in(p_org_id uuid)
returns public.org_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.organization_members m
  where m.organization_id = p_org_id
    and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function app.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function app.has_min_role(p_org_id uuid, p_min_role public.org_role)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select coalesce(app.role_rank(app.current_role_in(p_org_id)) >= app.role_rank(p_min_role), false);
$$;

-- Provisioning RPC: creates a new Pet Shop tenant and assigns caller as Owner atomically
create or replace function public.create_organization_with_owner(
  p_name text,
  p_city text default 'Jakarta',
  p_phone text default '',
  p_address text default '',
  p_currency char(3) default 'IDR',
  p_time_zone text default 'Asia/Jakarta'
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_slug text;
  v_org public.organizations;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  insert into public.profiles (id, email, full_name)
  select u.id, coalesce(u.email, ''), coalesce(u.raw_user_meta_data->>'full_name', u.email, 'Owner')
  from auth.users u
  where u.id = v_uid
  on conflict (id) do nothing;

  v_slug := regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g') || '-' || substr(encode(gen_random_bytes(3), 'hex'), 1, 5);

  insert into public.organizations (name, slug, city, phone, address, default_currency, time_zone)
  values (trim(p_name), v_slug, trim(p_city), trim(p_phone), trim(p_address), p_currency, p_time_zone)
  returning * into v_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org.id, v_uid, 'owner');

  return v_org;
end;
$$;
