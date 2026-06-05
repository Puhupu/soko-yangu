-- ============================================
-- SOKO YANGU — Supabase Schema
-- Run this entire file in: Supabase → SQL Editor → New query → Run
-- ============================================

-- 1. SELLER PROFILES (linked to Supabase Auth users)
create table if not exists seller_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null,
  email text not null,
  created_at timestamptz default now()
);

-- 2. PRODUCTS
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id) on delete cascade not null,
  seller_name text,
  title text not null,
  description text,
  price numeric not null check (price > 0),
  image_url text,
  created_at timestamptz default now()
);

-- 3. ORDERS
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  product_title text not null,
  product_price numeric not null,
  seller_id uuid references auth.users(id) on delete set null,
  buyer_name text not null,
  buyer_phone text not null,
  delivery_location text not null,
  status text not null default 'pending' check (status in ('pending','confirmed','delivered')),
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table seller_profiles enable row level security;
alter table products        enable row level security;
alter table orders          enable row level security;

-- SELLER PROFILES: public can read; owner manages own
drop policy if exists sp_read on seller_profiles;
drop policy if exists sp_insert on seller_profiles;
drop policy if exists sp_update on seller_profiles;
create policy sp_read   on seller_profiles for select using (true);
create policy sp_insert on seller_profiles for insert with check (auth.uid() = id);
create policy sp_update on seller_profiles for update using (auth.uid() = id);

-- PRODUCTS: public can read; sellers manage their own
drop policy if exists pr_read on products;
drop policy if exists pr_insert on products;
drop policy if exists pr_update on products;
drop policy if exists pr_delete on products;
create policy pr_read   on products for select using (true);
create policy pr_insert on products for insert with check (auth.uid() = seller_id);
create policy pr_update on products for update using (auth.uid() = seller_id);
create policy pr_delete on products for delete using (auth.uid() = seller_id);

-- ORDERS: anyone can place; authenticated (sellers + admin) can read & update
drop policy if exists or_insert on orders;
drop policy if exists or_read on orders;
drop policy if exists or_update on orders;
create policy or_insert on orders for insert with check (true);
create policy or_read   on orders for select using (true);
create policy or_update on orders for update using (auth.role() = 'authenticated');

-- ============================================
-- REALTIME (for admin live order notifications)
-- ============================================
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table products;

-- ============================================
-- STORAGE BUCKET for product images
-- ============================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public read images" on storage.objects;
drop policy if exists "auth upload images" on storage.objects;
create policy "public read images" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "auth upload images" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
