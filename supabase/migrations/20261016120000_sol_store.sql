-- S.O.L (Soul of Lifestyle) store schema.
-- Additive and safe to re-run: every object is created only if missing, and
-- seed data is inserted only into empty tables. Nothing existing is dropped
-- except policies this file itself (re)defines.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('owner', 'staff', 'customer');
exception when duplicate_object then null; end $$;

create sequence if not exists public.order_number_seq start 1001;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  parent_id uuid references public.categories (id) on delete set null,
  sort_order integer not null default 0,
  show_in_nav boolean not null default true,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 4000),
  category_id uuid references public.categories (id) on delete set null,
  price numeric(10, 2) not null check (price > 0),
  compare_at_price numeric(10, 2) check (compare_at_price is null or compare_at_price > price),
  fit text,
  fabric text,
  color text,
  badges text[] not null default '{}'
    check (badges <@ array['new', 'bestseller', 'low-stock', 'sale']::text[]),
  is_published boolean not null default false,
  is_bestseller boolean not null default false,
  created_at timestamptz not null default now()
);
-- Extra columns used by the product page, catalog filters and popularity sort.
alter table public.products add column if not exists care text;
alter table public.products add column if not exists model_height text;
alter table public.products add column if not exists model_size text;
alter table public.products add column if not exists tags text[] not null default '{}';
alter table public.products add column if not exists sales_count integer not null default 0;
alter table public.products add column if not exists updated_at timestamptz not null default now();
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_published_idx on public.products (is_published, created_at desc);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text not null default '',
  sort_order integer not null default 0
);
alter table public.product_images add column if not exists storage_path text;
create index if not exists product_images_product_idx on public.product_images (product_id, sort_order);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null check (char_length(size) between 1 and 12),
  stock integer not null default 0 check (stock >= 0),
  unique (product_id, size)
);

create table if not exists public.bundles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  price numeric(10, 2) not null check (price > 0),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.bundle_items (
  bundle_id uuid not null references public.bundles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  primary key (bundle_id, product_id)
);
alter table public.bundle_items add column if not exists sort_order integer not null default 0;

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  image_url text,
  cta_label text not null default 'Shop now',
  cta_link text not null default '/shop/all',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.banner_hotspots (
  id uuid primary key default gen_random_uuid(),
  banner_id uuid not null references public.banners (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  number integer not null check (number between 1 and 20),
  x_percent numeric(5, 2) not null check (x_percent between 0 and 100),
  y_percent numeric(5, 2) not null check (y_percent between 0 and 100),
  unique (banner_id, number)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 80),
  phone text check (phone is null or phone ~ '^[6-9][0-9]{9}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  line text not null check (char_length(line) between 5 and 200),
  city text not null check (char_length(city) between 2 and 60),
  state text not null check (char_length(state) between 2 and 60),
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  created_at timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses (user_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_method text not null check (payment_method in ('upi', 'card', 'cod')),
  payment_status text not null default 'demo'
    check (payment_status in ('demo', 'pending', 'paid', 'failed', 'refunded')),
  subtotal numeric(10, 2) not null default 0,
  shipping numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  name text not null,
  phone text not null,
  address text not null,
  pincode text not null,
  created_at timestamptz not null default now()
);
alter table public.orders add column if not exists city text;
alter table public.orders add column if not exists state text;
alter table public.orders add column if not exists client_token uuid;
alter table public.orders add column if not exists updated_at timestamptz not null default now();
create unique index if not exists orders_client_token_idx on public.orders (user_id, client_token);
create index if not exists orders_created_idx on public.orders (created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  size text not null,
  qty integer not null check (qty > 0),
  unit_price numeric(10, 2) not null
);
alter table public.order_items add column if not exists bundle_id uuid references public.bundles (id) on delete set null;
alter table public.order_items add column if not exists bundle_name text;
create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.wishlist_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- Saved cart, so a signed-in customer's cart follows them across devices.
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null,
  qty integer not null check (qty between 1 and 10),
  bundle_id uuid references public.bundles (id) on delete cascade,
  group_key text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, size, group_key)
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  email text not null check (char_length(email) <= 255 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id boolean primary key default true check (id),
  shop_name text not null default 'S.O.L Store',
  address text not null default '',
  phone text not null default '',
  opening_hours text not null default '',
  whatsapp text not null default '',
  instagram text not null default '',
  free_shipping_min numeric(10, 2) not null default 999 check (free_shipping_min >= 0),
  shipping_fee numeric(10, 2) not null default 79 check (shipping_fee >= 0),
  return_days integer not null default 7 check (return_days between 0 and 90),
  announcement_text text not null default '',
  hero_headline text not null default 'Dress to be noticed.',
  cod_enabled boolean not null default true
);
alter table public.store_settings add column if not exists hero_subtext text not null default '';
alter table public.store_settings add column if not exists hero_image_url text;
alter table public.store_settings add column if not exists pincode text;
alter table public.store_settings add column if not exists updated_at timestamptz not null default now();

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Pending staff access by email. A matching account gets the staff role once
-- its email is confirmed.
create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so RLS policies can call them without recursion)
-- ---------------------------------------------------------------------------
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role in ('owner', 'staff')
  )
$$;

-- Grants owner/staff roles that an account is entitled to by its confirmed email.
create or replace function public.apply_role_grants(_user_id uuid, _email text, _confirmed_at timestamptz)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role) values (_user_id, 'customer')
  on conflict do nothing;
  if _confirmed_at is null or _email is null then
    return;
  end if;
  if lower(_email) = 'pranjalishandilya15@gmail.com' then
    insert into public.user_roles (user_id, role) values (_user_id, 'owner') on conflict do nothing;
  end if;
  if exists (select 1 from public.staff_invites where email = lower(_email)) then
    insert into public.user_roles (user_id, role) values (_user_id, 'staff') on conflict do nothing;
  end if;
end;
$$;
revoke execute on function public.apply_role_grants(uuid, text, timestamptz) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(new.raw_user_meta_data ->> 'full_name', 80))
  on conflict (id) do nothing;
  perform public.apply_role_grants(new.id, new.email, new.email_confirmed_at);
  return new;
end;
$$;

create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.email_confirmed_at is not null
     and (old.email_confirmed_at is null or old.email is distinct from new.email) then
    perform public.apply_role_grants(new.id, new.email, new.email_confirmed_at);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at, email on auth.users
  for each row execute function public.handle_user_confirmed();

-- Backfill accounts that existed before this migration.
insert into public.profiles (id, full_name)
select u.id, left(u.raw_user_meta_data ->> 'full_name', 80) from auth.users u
on conflict (id) do nothing;
select public.apply_role_grants(u.id, u.email, u.email_confirmed_at) from auth.users u;

-- Owner-only staff management.
create or replace function public.list_staff()
returns table (user_id uuid, email text, role public.app_role, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.has_role(auth.uid(), 'owner') then
    raise exception 'Only the owner can view staff' using errcode = '42501';
  end if;
  return query
    select r.user_id, u.email::text, r.role, r.created_at
    from public.user_roles r join auth.users u on u.id = r.user_id
    where r.role in ('owner', 'staff')
    order by r.role, r.created_at;
end;
$$;

create or replace function public.grant_staff_by_email(_email text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_email text := lower(btrim(_email));
  v_user auth.users;
begin
  if not public.has_role(auth.uid(), 'owner') then
    raise exception 'Only the owner can add staff' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 255 then
    raise exception 'Enter a valid email address';
  end if;
  insert into public.staff_invites (email, invited_by) values (v_email, auth.uid())
  on conflict (email) do nothing;
  select * into v_user from auth.users where lower(email) = v_email and email_confirmed_at is not null;
  if found then
    insert into public.user_roles (user_id, role) values (v_user.id, 'staff') on conflict do nothing;
    return 'granted';
  end if;
  return 'invited';
end;
$$;

create or replace function public.revoke_staff(_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'owner') then
    raise exception 'Only the owner can remove staff' using errcode = '42501';
  end if;
  delete from public.user_roles where user_id = _user_id and role = 'staff';
  delete from public.staff_invites
  where email = (select lower(email) from auth.users where id = _user_id);
end;
$$;

revoke execute on function public.list_staff() from public, anon;
revoke execute on function public.grant_staff_by_email(text) from public, anon;
revoke execute on function public.revoke_staff(uuid) from public, anon;
grant execute on function public.list_staff() to authenticated;
grant execute on function public.grant_staff_by_email(text) to authenticated;
grant execute on function public.revoke_staff(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists store_settings_touch on public.store_settings;
create trigger store_settings_touch before update on public.store_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Order placement: totals, bundle pricing and stock are all computed here from
-- database prices. The browser only sends product ids, sizes and quantities.
-- ---------------------------------------------------------------------------
create or replace function public.place_order(
  p_items jsonb,
  p_name text,
  p_phone text,
  p_line text,
  p_city text,
  p_state text,
  p_pincode text,
  p_payment_method text,
  p_save_address boolean default false,
  p_client_token uuid default null
)
returns table (order_id uuid, order_number text)
language plpgsql security definer set search_path = public
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_free_min numeric(10, 2) := 999;
  v_fee numeric(10, 2) := 79;
  v_cod boolean := true;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(10, 2) := 0;
  v_shipping numeric(10, 2);
  v_line record;
  v_group record;
  v_product public.products;
  v_variant public.product_variants;
  v_bundles jsonb := '{}'::jsonb;
  v_key text;
  v_unit numeric(10, 2);
  v_running numeric(10, 2) := 0;
  v_prev_key text := null;
  v_full numeric(10, 2);
  v_bundle_price numeric(10, 2);
  v_expected uuid[];
begin
  if v_uid is null then
    raise exception 'Please sign in to place your order' using errcode = '28000';
  end if;

  if p_client_token is not null then
    select o.id, o.order_number into v_order_id, v_order_number
    from public.orders o where o.user_id = v_uid and o.client_token = p_client_token;
    if found then
      return query select v_order_id, v_order_number;
      return;
    end if;
  end if;

  p_name := btrim(coalesce(p_name, ''));
  p_phone := btrim(coalesce(p_phone, ''));
  p_line := btrim(coalesce(p_line, ''));
  p_city := btrim(coalesce(p_city, ''));
  p_state := btrim(coalesce(p_state, ''));
  p_pincode := btrim(coalesce(p_pincode, ''));

  if char_length(p_name) not between 2 and 80 then raise exception 'Enter your full name'; end if;
  if p_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a valid 10-digit mobile number'; end if;
  if p_pincode !~ '^[1-9][0-9]{5}$' then raise exception 'Enter a valid 6-digit pincode'; end if;
  if char_length(p_line) not between 5 and 200 then raise exception 'Enter your full address'; end if;
  if char_length(p_city) not between 2 and 60 then raise exception 'Enter your city'; end if;
  if char_length(p_state) not between 2 and 60 then raise exception 'Enter your state'; end if;
  if p_payment_method is null or p_payment_method not in ('upi', 'card', 'cod') then
    raise exception 'Choose a payment method';
  end if;

  select s.free_shipping_min, s.shipping_fee, s.cod_enabled into v_free_min, v_fee, v_cod
  from public.store_settings s where s.id;
  if not found then
    v_free_min := 999; v_fee := 79; v_cod := true;
  end if;
  if p_payment_method = 'cod' and not v_cod then
    raise exception 'Cash on delivery is not available right now';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Your cart is empty';
  end if;

  -- Validate Party Pack groups: every pack line must carry the full set of pack
  -- products at one shared quantity.
  for v_group in
    select coalesce(x.group_key, '') as group_key, x.bundle_id,
           min(x.qty) as min_qty, max(x.qty) as max_qty,
           array_agg(x.product_id order by x.product_id) as product_ids
    from jsonb_to_recordset(p_items) as x (product_id uuid, size text, qty integer, bundle_id uuid, group_key text)
    where x.bundle_id is not null
    group by coalesce(x.group_key, ''), x.bundle_id
  loop
    select b.price into v_bundle_price from public.bundles b
    where b.id = v_group.bundle_id and b.is_published;
    if not found then
      raise exception 'A Party Pack in your cart is no longer available';
    end if;
    select array_agg(bi.product_id order by bi.product_id), sum(p.price)
      into v_expected, v_full
    from public.bundle_items bi join public.products p on p.id = bi.product_id
    where bi.bundle_id = v_group.bundle_id;
    if v_group.min_qty <> v_group.max_qty or v_expected is distinct from v_group.product_ids then
      raise exception 'A Party Pack in your cart changed. Remove it and add it again.';
    end if;
    v_bundles := v_bundles || jsonb_build_object(
      v_group.group_key || '|' || v_group.bundle_id::text,
      jsonb_build_object('price', v_bundle_price, 'full', v_full)
    );
  end loop;

  v_order_number := 'SOL-' || nextval('public.order_number_seq');
  insert into public.orders (
    order_number, user_id, status, payment_method, payment_status,
    name, phone, address, city, state, pincode, client_token
  ) values (
    v_order_number, v_uid, 'pending', p_payment_method, 'demo',
    p_name, p_phone, p_line || ', ' || p_city || ', ' || p_state, p_city, p_state, p_pincode, p_client_token
  ) returning id into v_order_id;

  for v_line in
    select x.product_id, btrim(x.size) as size, x.qty, x.bundle_id,
           coalesce(x.group_key, '') as group_key,
           row_number() over (partition by coalesce(x.group_key, ''), x.bundle_id order by x.product_id) as rn,
           count(*) over (partition by coalesce(x.group_key, ''), x.bundle_id) as cnt
    from jsonb_to_recordset(p_items) as x (product_id uuid, size text, qty integer, bundle_id uuid, group_key text)
    order by coalesce(x.group_key, ''), x.bundle_id nulls first, x.product_id
  loop
    if v_line.product_id is null or v_line.size is null then
      raise exception 'Your cart has an invalid item';
    end if;
    if v_line.qty is null or v_line.qty not between 1 and 10 then
      raise exception 'Quantity must be between 1 and 10';
    end if;

    select * into v_product from public.products p where p.id = v_line.product_id and p.is_published;
    if not found then
      raise exception 'An item in your cart is no longer available';
    end if;

    select * into v_variant from public.product_variants v
    where v.product_id = v_line.product_id and v.size = v_line.size
    for update;
    if not found or v_variant.stock < v_line.qty then
      raise exception '% in size % is out of stock', v_product.name, v_line.size;
    end if;

    if v_line.bundle_id is null then
      v_unit := v_product.price;
    else
      v_key := v_line.group_key || '|' || v_line.bundle_id::text;
      if v_prev_key is distinct from v_key then
        v_running := 0;
        v_prev_key := v_key;
      end if;
      v_bundle_price := (v_bundles -> v_key ->> 'price')::numeric;
      v_full := (v_bundles -> v_key ->> 'full')::numeric;
      if v_line.rn = v_line.cnt then
        -- Last line absorbs rounding so the pack sums exactly to its price.
        v_unit := v_bundle_price - v_running;
      else
        v_unit := round(v_product.price * v_bundle_price / v_full, 2);
        v_running := v_running + v_unit;
      end if;
    end if;

    update public.product_variants set stock = stock - v_line.qty where id = v_variant.id;
    update public.products set sales_count = sales_count + v_line.qty where id = v_product.id;

    insert into public.order_items (order_id, product_id, name, size, qty, unit_price, bundle_id, bundle_name)
    values (
      v_order_id, v_product.id, v_product.name, v_line.size, v_line.qty, v_unit, v_line.bundle_id,
      (select b.name from public.bundles b where b.id = v_line.bundle_id)
    );
    v_subtotal := v_subtotal + v_unit * v_line.qty;
  end loop;

  v_shipping := case when v_subtotal >= v_free_min then 0 else v_fee end;
  update public.orders
  set subtotal = v_subtotal, shipping = v_shipping, total = v_subtotal + v_shipping
  where id = v_order_id;

  if p_save_address and not exists (
    select 1 from public.addresses a
    where a.user_id = v_uid and a.line = p_line and a.pincode = p_pincode and a.phone = p_phone
  ) then
    insert into public.addresses (user_id, name, phone, line, city, state, pincode)
    values (v_uid, p_name, p_phone, p_line, p_city, p_state, p_pincode);
  end if;

  update public.profiles
  set full_name = coalesce(nullif(full_name, ''), p_name), phone = coalesce(phone, p_phone)
  where id = v_uid;

  delete from public.cart_items where user_id = v_uid;

  return query select v_order_id, v_order_number;
end;
$$;
revoke execute on function public.place_order(jsonb, text, text, text, text, text, text, text, boolean, uuid) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, text, text, text, text, boolean, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants (RLS below is the real boundary)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.product_images, public.product_variants,
  public.bundles, public.bundle_items, public.banners, public.banner_hotspots, public.store_settings
  to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_images,
  public.product_variants, public.bundles, public.bundle_items, public.banners,
  public.banner_hotspots, public.store_settings to authenticated;
grant select, insert, update, delete on public.profiles, public.addresses, public.wishlist_items,
  public.cart_items, public.user_roles, public.staff_invites to authenticated;
grant select on public.orders, public.order_items to authenticated;
-- Staff may change only an order's status fields; totals stay server-computed.
revoke update on public.orders from authenticated;
grant update (status, payment_status) on public.orders to authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant select, delete on public.contact_messages to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.bundles enable row level security;
alter table public.bundle_items enable row level security;
alter table public.banners enable row level security;
alter table public.banner_hotspots enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.cart_items enable row level security;
alter table public.contact_messages enable row level security;
alter table public.store_settings enable row level security;
alter table public.user_roles enable row level security;
alter table public.staff_invites enable row level security;

-- Catalog: public read of published data, staff write.
drop policy if exists "Public reads categories" on public.categories;
create policy "Public reads categories" on public.categories for select using (true);
drop policy if exists "Staff manage categories" on public.categories;
create policy "Staff manage categories" on public.categories for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Public reads published products" on public.products;
create policy "Public reads published products" on public.products for select
  using (is_published or public.is_staff(auth.uid()));
drop policy if exists "Staff manage products" on public.products;
create policy "Staff manage products" on public.products for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Public reads product images" on public.product_images;
create policy "Public reads product images" on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_id and p.is_published)
         or public.is_staff(auth.uid()));
drop policy if exists "Staff manage product images" on public.product_images;
create policy "Staff manage product images" on public.product_images for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Public reads product variants" on public.product_variants;
create policy "Public reads product variants" on public.product_variants for select
  using (exists (select 1 from public.products p where p.id = product_id and p.is_published)
         or public.is_staff(auth.uid()));
drop policy if exists "Staff manage product variants" on public.product_variants;
create policy "Staff manage product variants" on public.product_variants for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Public reads published bundles" on public.bundles;
create policy "Public reads published bundles" on public.bundles for select
  using (is_published or public.is_staff(auth.uid()));
drop policy if exists "Staff manage bundles" on public.bundles;
create policy "Staff manage bundles" on public.bundles for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Public reads bundle items" on public.bundle_items;
create policy "Public reads bundle items" on public.bundle_items for select
  using (exists (select 1 from public.bundles b where b.id = bundle_id and b.is_published)
         or public.is_staff(auth.uid()));
drop policy if exists "Staff manage bundle items" on public.bundle_items;
create policy "Staff manage bundle items" on public.bundle_items for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Public reads active banners" on public.banners;
create policy "Public reads active banners" on public.banners for select
  using (is_active or public.is_staff(auth.uid()));
drop policy if exists "Staff manage banners" on public.banners;
create policy "Staff manage banners" on public.banners for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Public reads banner hotspots" on public.banner_hotspots;
create policy "Public reads banner hotspots" on public.banner_hotspots for select
  using (exists (select 1 from public.banners b where b.id = banner_id and b.is_active)
         or public.is_staff(auth.uid()));
drop policy if exists "Staff manage banner hotspots" on public.banner_hotspots;
create policy "Staff manage banner hotspots" on public.banner_hotspots for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Customer-owned data.
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Users manage own addresses" on public.addresses;
create policy "Users manage own addresses" on public.addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users manage own wishlist" on public.wishlist_items;
create policy "Users manage own wishlist" on public.wishlist_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users manage own cart" on public.cart_items;
create policy "Users manage own cart" on public.cart_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Orders: created only through place_order(); customers read their own, staff read and update all.
drop policy if exists "Customers read own orders" on public.orders;
create policy "Customers read own orders" on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));
drop policy if exists "Staff update orders" on public.orders;
create policy "Staff update orders" on public.orders for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Customers read own order items" on public.order_items;
create policy "Customers read own order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.user_id = auth.uid() or public.is_staff(auth.uid()))));

-- Contact form: anyone may send, staff read.
drop policy if exists "Anyone sends contact messages" on public.contact_messages;
create policy "Anyone sends contact messages" on public.contact_messages for insert
  to anon, authenticated with check (true);
drop policy if exists "Staff read contact messages" on public.contact_messages;
create policy "Staff read contact messages" on public.contact_messages for select to authenticated
  using (public.is_staff(auth.uid()));
drop policy if exists "Staff delete contact messages" on public.contact_messages;
create policy "Staff delete contact messages" on public.contact_messages for delete to authenticated
  using (public.is_staff(auth.uid()));

-- Settings and roles: owner only.
drop policy if exists "Public reads store settings" on public.store_settings;
create policy "Public reads store settings" on public.store_settings for select using (true);
drop policy if exists "Owner manages store settings" on public.store_settings;
create policy "Owner manages store settings" on public.store_settings for all to authenticated
  using (public.has_role(auth.uid(), 'owner')) with check (public.has_role(auth.uid(), 'owner'));
drop policy if exists "Users read own roles" on public.user_roles;
create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'owner'));
drop policy if exists "Owner manages roles" on public.user_roles;
create policy "Owner manages roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'owner')) with check (public.has_role(auth.uid(), 'owner'));

drop policy if exists "Owner manages staff invites" on public.staff_invites;
create policy "Owner manages staff invites" on public.staff_invites for all to authenticated
  using (public.has_role(auth.uid(), 'owner')) with check (public.has_role(auth.uid(), 'owner'));

-- ---------------------------------------------------------------------------
-- Storage: product-images bucket, public read, owner/staff write
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

drop policy if exists "Public reads product-images" on storage.objects;
create policy "Public reads product-images" on storage.objects for select
  using (bucket_id = 'product-images');
drop policy if exists "Staff upload product-images" on storage.objects;
create policy "Staff upload product-images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_staff(auth.uid()));
drop policy if exists "Staff update product-images" on storage.objects;
create policy "Staff update product-images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_staff(auth.uid()));
drop policy if exists "Staff delete product-images" on storage.objects;
create policy "Staff delete product-images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- Seed data (only into empty tables)
-- ---------------------------------------------------------------------------
insert into public.store_settings (
  id, shop_name, address, phone, opening_hours, whatsapp, instagram, pincode,
  free_shipping_min, shipping_fee, return_days, announcement_text, hero_headline, hero_subtext, cod_enabled
)
values (
  true,
  'S.O.L Flagship (placeholder)',
  'PLACEHOLDER: Shop 12, Linking Road, Bandra West, Mumbai, Maharashtra 400050',
  'PLACEHOLDER +91 90000 00000',
  'PLACEHOLDER: Mon to Sun, 11 AM to 9:30 PM',
  '919000000000',
  'https://instagram.com/',
  '400050',
  999, 79, 7,
  'Free shipping above ₹999 · Festive sale is live',
  'Dress to be noticed.',
  'Fresh fits for the main character. New drop every Friday.',
  true
)
on conflict (id) do nothing;

do $$
declare
  v_ethnic uuid;
begin
  if exists (select 1 from public.categories) then
    return;
  end if;

  insert into public.categories (name, slug, sort_order, show_in_nav) values
    ('Shirts', 'shirts', 10, true),
    ('T-Shirts', 't-shirts', 20, true),
    ('Jeans', 'jeans', 30, true),
    ('Trousers & Cargos', 'trousers-cargos', 40, true),
    ('Ethnic', 'ethnic', 50, true),
    ('Party Wear', 'party-wear', 60, true),
    ('Hoodies & Jackets', 'hoodies-jackets', 70, true),
    ('Footwear', 'footwear', 80, true),
    ('Accessories', 'accessories', 90, true);

  select id into v_ethnic from public.categories where slug = 'ethnic';
  insert into public.categories (name, slug, parent_id, sort_order, show_in_nav) values
    ('Short kurtas', 'short-kurtas', v_ethnic, 51, false),
    ('Nehru jackets', 'nehru-jackets', v_ethnic, 52, false),
    ('Kurta sets', 'kurta-sets', v_ethnic, 53, false);

  insert into public.products (
    name, slug, description, category_id, price, compare_at_price, fit, fabric, color,
    badges, is_published, is_bestseller, tags, care, model_height, model_size
  )
  select s.name, s.slug, s.description, c.id, s.price, s.compare_at_price, s.fit, s.fabric, s.color,
         s.badges, true, s.is_bestseller, s.tags, s.care, '6''0"', s.model_size
  from (values
    ('Cuban Collar Linen Shirt', 'cuban-collar-linen-shirt', 'shirts',
     'Breezy linen with a relaxed camp collar. Wear it open over a tee or buttoned for the function.',
     1499, 1999, 'regular', 'linen', 'white', array['new','sale'], true, array['party'], 'Machine wash cold. Line dry.', 'M'),
    ('Oxford Office Shirt', 'oxford-office-shirt', 'shirts',
     'Crisp oxford weave cut slim through the body. Monday-proof, after-hours ready.',
     1299, null, 'slim', 'cotton', 'light-blue', array[]::text[], false, array['office-casual'], 'Machine wash cold. Warm iron.', 'M'),
    ('Oversized Check Shirt', 'oversized-check-shirt', 'shirts',
     'Brushed flannel checks with a dropped shoulder. Layer it, tie it, live in it.',
     1399, 1799, 'oversized', 'cotton', 'red', array['sale'], true, array['college'], 'Machine wash cold. Do not bleach.', 'L'),
    ('Corduroy Overshirt', 'corduroy-overshirt', 'shirts',
     'Soft baby cord with chest pockets. The jacket that thinks it is a shirt.',
     1799, null, 'oversized', 'corduroy', 'brown', array['new'], false, array['college'], 'Machine wash cold inside out.', 'M'),
    ('Heavyweight Boxy Tee', 'heavyweight-boxy-tee', 't-shirts',
     '240 GSM cotton that holds its shape. Boxy cut, cropped just right.',
     799, null, 'oversized', 'cotton', 'black', array['bestseller'], true, array['college'], 'Machine wash cold. Tumble dry low.', 'L'),
    ('Soul Graphic Tee', 'soul-graphic-tee', 't-shirts',
     'Back print, front logo, zero apologies. Puff ink that lasts.',
     699, 999, 'oversized', 'cotton', 'white', array['sale'], false, array['college'], 'Wash inside out. Do not iron print.', 'M'),
    ('Ribbed Slim Tee', 'ribbed-slim-tee', 't-shirts',
     'Fine rib that sits close. Built to layer under shirts and jackets.',
     599, null, 'slim', 'cotton', 'grey', array[]::text[], false, array[]::text[], 'Machine wash cold.', 'M'),
    ('Washed Polo', 'washed-polo', 't-shirts',
     'Pique polo with a lived-in wash. Collar up or down, your call.',
     999, null, 'regular', 'cotton', 'navy', array['new'], true, array['office-casual'], 'Machine wash cold. Dry flat.', 'M'),
    ('Baggy Black Jeans', 'baggy-black-jeans', 'jeans',
     'Deep black denim with a wide leg and a clean break. The pair everyone asks about.',
     1999, 2499, 'baggy', 'denim', 'black', array['bestseller'], true, array['party'], 'Wash inside out, cold. Line dry.', '32'),
    ('Light Wash Baggy Jeans', 'light-wash-baggy-jeans', 'jeans',
     'Sun-faded light blue, loose from hip to hem. Baggy is back and it never left.',
     1899, null, 'baggy', 'denim', 'light-blue', array['new'], false, array['college'], 'Wash inside out, cold. Line dry.', '32'),
    ('Slim Grey Jeans', 'slim-grey-jeans', 'jeans',
     'Stretch denim in a smoky grey. Slim without the squeeze.',
     1699, null, 'slim', 'denim', 'grey', array[]::text[], false, array['office-casual'], 'Wash inside out, cold.', '32'),
    ('Straight Indigo Jeans', 'straight-indigo-jeans', 'jeans',
     'Rigid indigo cut straight. Breaks in to fit only you.',
     1799, 2199, 'straight', 'denim', 'blue', array['sale'], false, array[]::text[], 'Wash rarely, cold, inside out.', '32'),
    ('Ripped Light Blue Jeans', 'ripped-light-blue-jeans', 'jeans',
     'Knee rips and frayed hems on a relaxed leg. Distressed, not stressed.',
     1899, null, 'ripped', 'denim', 'light-blue', array[]::text[], true, array['college'], 'Hand wash cold to keep the rips clean.', '32'),
    ('Ivory Chikan Short Kurta', 'ivory-chikan-short-kurta', 'short-kurtas',
     'Hand-finished chikankari on a hip-length kurta. Pair with jeans for the sangeet.',
     1599, 1999, 'regular', 'cotton', 'white', array['new'], true, array['festive','sangeet'], 'Gentle hand wash. Dry in shade.', 'M'),
    ('Mustard Linen Short Kurta', 'mustard-linen-short-kurta', 'short-kurtas',
     'Sunny mustard linen with a mandarin collar. Haldi-approved.',
     1399, null, 'regular', 'linen', 'yellow', array[]::text[], false, array['festive'], 'Gentle hand wash. Dry in shade.', 'M'),
    ('Navy Brocade Nehru Jacket', 'navy-brocade-nehru-jacket', 'nehru-jackets',
     'Woven brocade in deep navy. Throw it over any kurta and you are the best dressed.',
     2499, 2999, 'slim', 'silk', 'navy', array['bestseller'], true, array['wedding','sangeet'], 'Dry clean only.', 'M'),
    ('Sage Kurta Set', 'sage-kurta-set', 'kurta-sets',
     'Sage green kurta with matching straight pants. Easy, cool, photo-ready.',
     2999, null, 'regular', 'cotton', 'green', array['new'], false, array['wedding','festive'], 'Gentle hand wash. Dry in shade.', 'M'),
    ('Maroon Silk Kurta Set', 'maroon-silk-kurta-set', 'kurta-sets',
     'Rich maroon silk blend with a subtle sheen. Built for the wedding night.',
     3499, 3999, 'regular', 'silk', 'maroon', array[]::text[], false, array['wedding'], 'Dry clean only.', 'M'),
    ('Black Satin Party Shirt', 'black-satin-party-shirt', 'party-wear',
     'Liquid satin that catches every light. Tuck it, untuck it, own the floor.',
     1699, null, 'slim', 'satin', 'black', array['new'], true, array['party'], 'Hand wash cold. Cool iron inside out.', 'M'),
    ('Sequin Bomber Jacket', 'sequin-bomber-jacket', 'party-wear',
     'Tonal sequins on a classic bomber. Main character energy, guaranteed.',
     2999, 3499, 'regular', 'polyester', 'grey', array['sale'], false, array['party'], 'Dry clean only.', 'L'),
    ('Pleated Party Trousers', 'pleated-party-trousers', 'party-wear',
     'Front pleats and a relaxed taper in fluid viscose. Sharp but easy.',
     1599, null, 'regular', 'viscose', 'black', array[]::text[], false, array['party'], 'Hand wash cold. Hang dry.', '32'),
    ('Heavy Fleece Hoodie', 'heavy-fleece-hoodie', 'hoodies-jackets',
     'Brushed-back fleece, double-lined hood, kangaroo pocket. Peak comfort.',
     1799, 2299, 'oversized', 'fleece', 'grey', array['bestseller'], true, array['college'], 'Machine wash cold. Tumble dry low.', 'L'),
    ('Denim Trucker Jacket', 'denim-trucker-jacket', 'hoodies-jackets',
     'The classic trucker in mid-blue denim. Goes over everything you own.',
     2299, null, 'regular', 'denim', 'blue', array[]::text[], false, array[]::text[], 'Wash inside out, cold.', 'M'),
    ('Zip Track Jacket', 'zip-track-jacket', 'hoodies-jackets',
     'Retro tricot with side stripes. Campus to cafe in one zip.',
     1499, null, 'regular', 'polyester', 'navy', array['new'], false, array['college'], 'Machine wash cold.', 'M')
  ) as s (name, slug, category_slug, description, price, compare_at_price, fit, fabric, color,
          badges, is_bestseller, tags, care, model_size)
  join public.categories c on c.slug = s.category_slug;

  -- Sizes and stock. Stock is varied on purpose so low-stock and sold-out states show up.
  insert into public.product_variants (product_id, size, stock)
  select p.id, sz.size, (abs(hashtext(p.slug || sz.size)) % 16)
  from public.products p
  join public.categories c on c.id = p.category_id
  cross join lateral unnest(
    case
      when c.slug = 'jeans' or p.slug = 'pleated-party-trousers'
        then array['28', '30', '32', '34', '36', '38']
      else array['S', 'M', 'L', 'XL', 'XXL']
    end
  ) as sz (size);

  -- Party Packs
  insert into public.bundles (name, description, price, is_published, sort_order) values
    ('Sangeet Starter', 'Chikan short kurta, brocade Nehru jacket and straight indigo denim.', 4999, true, 1),
    ('Club Night', 'Satin shirt, baggy black jeans and the sequin bomber. Lights on you.', 5499, true, 2),
    ('Campus Fit', 'Boxy tee, light wash baggy jeans and the fleece hoodie. Lecture to late night.', 3699, true, 3);

  insert into public.bundle_items (bundle_id, product_id, sort_order)
  select b.id, p.id, x.ord
  from (values
    ('Sangeet Starter', 'ivory-chikan-short-kurta', 1),
    ('Sangeet Starter', 'navy-brocade-nehru-jacket', 2),
    ('Sangeet Starter', 'straight-indigo-jeans', 3),
    ('Club Night', 'black-satin-party-shirt', 1),
    ('Club Night', 'baggy-black-jeans', 2),
    ('Club Night', 'sequin-bomber-jacket', 3),
    ('Campus Fit', 'heavyweight-boxy-tee', 1),
    ('Campus Fit', 'light-wash-baggy-jeans', 2),
    ('Campus Fit', 'heavy-fleece-hoodie', 3)
  ) as x (bundle_name, product_slug, ord)
  join public.bundles b on b.name = x.bundle_name
  join public.products p on p.slug = x.product_slug;

  -- Festive banner with four pins
  insert into public.banners (title, image_url, cta_label, cta_link, is_active)
  values ('The Festive Edit', null, 'Shop ethnic edit', '/shop/ethnic', true);

  insert into public.banner_hotspots (banner_id, product_id, number, x_percent, y_percent)
  select b.id, p.id, x.num, x.x, x.y
  from (values
    (1, 'sage-kurta-set', 18.0, 42.0),
    (2, 'navy-brocade-nehru-jacket', 40.0, 30.0),
    (3, 'ivory-chikan-short-kurta', 62.0, 48.0),
    (4, 'maroon-silk-kurta-set', 82.0, 36.0)
  ) as x (num, product_slug, x, y)
  join public.products p on p.slug = x.product_slug
  cross join (select id from public.banners where title = 'The Festive Edit' limit 1) b;
end $$;
