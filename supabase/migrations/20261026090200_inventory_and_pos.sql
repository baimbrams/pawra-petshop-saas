-- =============================================================================
-- Migration 03: Products, Stock Ledger & Point of Sale (POS) Minor-Unit Money
-- =============================================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sku text not null,
  barcode text not null default '',
  name text not null,
  brand text not null default '',
  category text not null check (category in ('cat_food', 'dog_food', 'vitamins_meds', 'litter_hygiene', 'accessories', 'treats')),
  unit text not null default 'pcs',
  cost_minor bigint not null default 0 check (cost_minor >= 0),
  price_minor bigint not null default 0 check (price_minor >= 0),
  currency char(3) not null default 'IDR',
  stock_qty integer not null default 0 check (stock_qty >= 0),
  min_stock_qty integer not null default 0 check (min_stock_qty >= 0),
  expires_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, sku)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null,
  delta_qty integer not null check (delta_qty <> 0),
  reason text not null check (reason in ('pos_sale', 'restock', 'damaged_or_expired', 'manual_adjustment')),
  note text not null default '',
  actor_name text not null default '',
  created_at timestamptz not null default now(),
  foreign key (product_id, organization_id) references public.products(id, organization_id) on delete cascade
);

create table public.pos_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_number text not null,
  customer_id uuid,
  customer_name text not null default 'Pelanggan Umum (Walk-in)',
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  paid_minor bigint not null check (paid_minor >= 0),
  change_minor bigint not null default 0 check (change_minor >= 0),
  currency char(3) not null default 'IDR',
  payment_method text not null check (payment_method in ('qris', 'cash', 'bank_transfer', 'card')),
  cashier_name text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, invoice_number),
  foreign key (customer_id, organization_id) references public.customers(id, organization_id) on delete restrict
);

create table public.pos_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null,
  product_id uuid not null,
  product_name text not null,
  sku text not null,
  qty integer not null check (qty > 0),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  foreign key (order_id, organization_id) references public.pos_orders(id, organization_id) on delete cascade,
  foreign key (product_id, organization_id) references public.products(id, organization_id) on delete restrict
);
