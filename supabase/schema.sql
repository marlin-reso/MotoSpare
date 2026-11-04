-- MotoSpare initial Supabase schema
-- Run in Supabase Dashboard > SQL Editor. Admin roles must be assigned manually by a trusted operator.

create extension if not exists pgcrypto;

create type public.user_role as enum ('buyer', 'seller', 'admin');
create type public.account_status as enum ('active', 'suspended');
create type public.product_status as enum ('draft', 'pending_approval', 'active', 'rejected', 'out_of_stock');
create type public.product_condition as enum ('new_oem', 'new_aftermarket', 'used', 'refurbished');
create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text not null default '',
  role public.user_role not null default 'buyer',
  status public.account_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.seller_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  store_name text not null,
  description text not null default '',
  is_verified boolean not null default false,
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  brand text not null,
  category text not null,
  oem_number text,
  description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  mrp numeric(12,2) not null check (mrp >= price),
  stock integer not null default 0 check (stock >= 0),
  condition public.product_condition not null,
  compatible_bikes text[] not null default '{}',
  image_url text,
  status public.product_status not null default 'pending_approval',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  shipping_name text not null,
  shipping_phone text not null,
  shipping_address text not null,
  shipping_city text not null,
  shipping_state text not null,
  shipping_pin text not null check (shipping_pin ~ '^[0-9]{6}$'),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

-- Create profile on signup. Public signup can select buyer or seller only; admin is never self-assigned.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'buyer');
  if requested_role not in ('buyer', 'seller') then requested_role := 'buyer'; end if;
  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    requested_role::public.user_role
  );
  if requested_role = 'seller' then
    insert into public.seller_profiles (user_id, store_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'store_name', new.raw_user_meta_data ->> 'name', 'New Store'));
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = (select auth.uid()) $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_user_role() = 'admin'::public.user_role, false) $$;

alter table public.profiles enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "profiles read own or admin" on public.profiles for select
using (id = (select auth.uid()) or public.is_admin());
create policy "profiles update own nonprivileged fields" on public.profiles for update
using (id = (select auth.uid()) or public.is_admin())
with check ((id = (select auth.uid()) and role = public.current_user_role()) or public.is_admin());

create policy "seller profile visible to public" on public.seller_profiles for select
using (approval_status = 'approved' or user_id = (select auth.uid()) or public.is_admin());
create policy "seller creates own profile" on public.seller_profiles for insert
with check (user_id = (select auth.uid()) and public.current_user_role() = 'seller');
create policy "seller updates own store or admin" on public.seller_profiles for update
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()) or public.is_admin());

create policy "active products public read; owner/admin read own" on public.products for select
using (status = 'active' or seller_id = (select auth.uid()) or public.is_admin());
create policy "approved seller creates pending listing" on public.products for insert
with check (seller_id = (select auth.uid()) and public.current_user_role() = 'seller'
  and exists (select 1 from public.seller_profiles s where s.user_id = (select auth.uid()) and s.approval_status = 'approved')
  and status = 'pending_approval');
create policy "seller edits own nonactive listing or admin" on public.products for update
using (seller_id = (select auth.uid()) or public.is_admin())
with check (seller_id = (select auth.uid()) or public.is_admin());
create policy "seller deletes own draft or admin" on public.products for delete
using ((seller_id = (select auth.uid()) and status in ('draft','pending_approval','rejected')) or public.is_admin());

create policy "buyer sees own orders; seller sees orders containing own items; admin sees all" on public.orders for select
using (buyer_id = (select auth.uid()) or public.is_admin() or exists (
  select 1 from public.order_items oi where oi.order_id = id and oi.seller_id = (select auth.uid())
));
create policy "buyer creates own pending order" on public.orders for insert
with check (buyer_id = (select auth.uid()) and status = 'pending');

create policy "buyer or seller reads related order items; admin all" on public.order_items for select
using (public.is_admin() or seller_id = (select auth.uid()) or exists (
  select 1 from public.orders o where o.id = order_id and o.buyer_id = (select auth.uid())
));
create policy "buyer adds items to own pending order" on public.order_items for insert
with check (exists (select 1 from public.orders o where o.id = order_id
  and o.buyer_id = (select auth.uid()) and o.status = 'pending'));

-- Admin role grant example (execute only for trusted account after verifying its UUID):
-- update public.profiles set role = 'admin' where id = 'AUTH_USER_UUID_HERE';
