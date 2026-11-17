-- Jalankan seluruh isi file ini di Supabase > SQL Editor (proyek katalog baru).

create extension if not exists pgcrypto;

-- Daftar admin: user yang ada di tabel ini boleh mengubah konten.
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Produk katalog. Satu aplikasi dengan dua jenis akun = dua baris dengan nama sama.
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_type text not null check (account_type in ('Sharing', 'Private')),
  category text not null default 'Lainnya' check (category in ('Streaming', 'Editing', 'Education', 'Lainnya')),
  price bigint not null check (price >= 0),
  description text,
  image_url text,
  available boolean not null default true,
  stock int not null default 0 check (stock >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  number int not null default 0,
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists order_proofs (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  number int not null default 0,
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Pengaturan toko (satu baris saja).
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'Toko Hazze',
  welcome_text text,
  store_description text,
  footer_text text,
  profile_image_url text,
  whatsapp_number text not null default '6280000000000',
  wa_intro text not null default 'Halo, Toko Hazze! Saya ingin melakukan pemesanan.',
  wa_template text,
  wa_item_template text
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- ===== Row Level Security =====
alter table admins enable row level security;
alter table products enable row level security;
alter table testimonials enable row level security;
alter table order_proofs enable row level security;
alter table settings enable row level security;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- Publik hanya bisa membaca.
create policy "public read products" on products for select using (true);
create policy "public read published testimonials" on testimonials for select using (published or is_admin());
create policy "public read published proofs" on order_proofs for select using (published or is_admin());
create policy "public read settings" on settings for select using (true);

-- Hanya admin yang bisa menulis.
create policy "admin write products" on products for all using (is_admin()) with check (is_admin());
create policy "admin write testimonials" on testimonials for all using (is_admin()) with check (is_admin());
create policy "admin write proofs" on order_proofs for all using (is_admin()) with check (is_admin());
create policy "admin write settings" on settings for all using (is_admin()) with check (is_admin());
create policy "admin read admins" on admins for select using (is_admin());

-- ===== Storage untuk gambar =====
insert into storage.buckets (id, name, public) values ('assets', 'assets', true)
on conflict (id) do nothing;

create policy "public read assets" on storage.objects for select using (bucket_id = 'assets');
create policy "admin upload assets" on storage.objects for insert with check (bucket_id = 'assets' and is_admin());
create policy "admin update assets" on storage.objects for update using (bucket_id = 'assets' and is_admin());
create policy "admin delete assets" on storage.objects for delete using (bucket_id = 'assets' and is_admin());
