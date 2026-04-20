-- ============================================================
-- Migration: merchant_leads table
-- Run in Supabase SQL editor (once)
-- ============================================================

create table if not exists merchant_leads (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  email       text not null,
  url_tienda  text not null,
  plataforma  text not null default 'Tienda Nube',
  created_at  timestamptz not null default now()
);

-- Allow anonymous inserts (from the /vender contact form)
alter table merchant_leads enable row level security;

create policy "anyone can insert leads"
  on merchant_leads
  for insert
  to anon
  with check (true);

-- Only authenticated users (Gonzalo) can read leads
create policy "authenticated can read leads"
  on merchant_leads
  for select
  to authenticated
  using (true);
