-- ============================================================
-- STOCKFISH — Schema Supabase
-- Arte & Decoración | Plataforma de e-commerce agentiva
-- ============================================================

-- Extensión para búsqueda vectorial semántica
create extension if not exists vector;

-- ============================================================
-- MERCHANTS
-- ============================================================
create table merchants (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  name             text not null,
  base_url         text not null,
  platform         text not null default 'tiendanube',
  active           boolean not null default true,
  -- Tienda Nube OAuth credentials (set after merchant installs the TN app)
  tn_store_id      text,          -- TN numeric user_id (e.g. "12345")
  tn_access_token  text,          -- OAuth bearer token
  tn_scope         text,          -- granted scopes
  tn_token_at      timestamptz,   -- when the token was last issued
  created_at       timestamptz not null default now()
);

-- Seed: los 4 merchants target del MVP
insert into merchants (slug, name, base_url) values
  ('diderot',   'Diderot',   'https://diderot.com.ar'),
  ('garbo',     'Garbo',     'https://garbo.com.ar'),
  ('holyhaus',  'Holy Haus', 'https://holyhaus.com.ar'),
  ('pacify',    'Pacify',    'https://pacify.com.ar');

-- Batch 2: expansión a 20+ tiendas Tienda Nube argentinas (STO-2)
-- Verificadas con check_platform.py antes de activar
insert into merchants (slug, name, base_url) values
  ('altorancho',   'Alto Rancho',        'https://altorancho.com'),
  ('solpalou',     'Sol Palou Deco',     'https://www.solpaloudeco.com.ar'),
  ('lufe',         'Lufe',               'https://lufe.com.ar'),
  ('nordika',      'Nordika',            'https://nordika.com.ar'),
  ('boden',        'Boden',              'https://boden.com.ar'),
  ('blest',        'Blest',              'https://blest.com.ar'),
  ('cosasminimas', 'Cosas Mínimas',      'https://cosasminimas.com.ar'),
  ('folia',        'Folia',              'https://folia.com.ar'),
  ('mink',         'Mink',              'https://mink.com.ar'),
  ('ruda',         'Ruda',               'https://ruda.com.ar'),
  ('sienna',       'Sienna',             'https://siennaarg.com.ar'),
  ('petite',       'Petite',             'https://petite.com.ar'),
  ('bazarokidoki', 'Bazar Okidoki',      'https://bazarokidoki.com.ar'),
  ('tukee',        'Tukee',              'https://tukee.com.ar'),
  ('laforma',      'La Forma',           'https://laforma.com.ar'),
  ('plataforma5',  'Plataforma 5',       'https://plataforma5.com.ar'),
  ('decolovers',   'Deco Lovers',        'https://decolovers.com.ar'),
  ('almacenlobos', 'Almacén de Lobos',   'https://almacendelobos.com.ar')
on conflict (slug) do nothing;

-- ============================================================
-- PRODUCTS
-- ============================================================
create table products (
  id              uuid primary key default gen_random_uuid(),
  merchant_id     uuid not null references merchants(id),
  external_id     text,                          -- ID en la tienda origen
  name            text not null,
  description     text,
  price           numeric(10,2) not null,
  currency        text not null default 'ARS',
  primary_image   text not null,                 -- URL imagen principal
  images          jsonb not null default '[]',   -- Array de URLs adicionales
  url             text not null,                 -- URL del producto en la tienda
  category        text not null,                 -- 'cuadro', 'escultura', 'lampara', etc.
  subcategory     text,
  attributes      jsonb not null default '{}',   -- color, material, estilo, etc.
  dimensions      jsonb,                         -- { width_cm, height_cm, depth_cm, weight_kg }
  in_stock        boolean not null default true,
  embedding       vector(512),                   -- Voyage AI voyage-3-lite (512 dims)
  scraped_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique(merchant_id, external_id)
);

-- Índice para búsqueda vectorial eficiente
create index products_embedding_idx on products
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Índices de filtrado frecuente
create index products_category_idx on products(category);
create index products_merchant_idx on products(merchant_id);
create index products_in_stock_idx on products(in_stock);

-- ============================================================
-- DESIGN SESSIONS
-- ============================================================
create table design_sessions (
  id              uuid primary key default gen_random_uuid(),
  status          text not null default 'intake'
                  check (status in ('intake','analyzing','generating','interactive','checkout','completed','archived')),
  space_context   jsonb,                         -- SpaceContext: perspectiva, colores, zonas vacías
  style_intent    jsonb,                         -- StyleIntent: keywords, paleta, budget
  current_render  jsonb,                         -- RenderResult actual
  render_history  jsonb not null default '[]',   -- Historial de renders (max 10)
  agent_trace     jsonb not null default '[]',   -- Log de pasos del agente
  share_token     text unique default gen_random_uuid()::text, -- Para compartir el diseño
  created_at      timestamptz not null default now(),
  last_activity   timestamptz not null default now()
  -- Sin TTL fijo: la sesión persiste indefinidamente hasta que el usuario archive
);

create index design_sessions_status_idx on design_sessions(status);
create index design_sessions_share_token_idx on design_sessions(share_token);

-- ============================================================
-- PRODUCT SLOTS
-- Cada "posición" de producto dentro de una sesión de diseño
-- ============================================================
create table product_slots (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references design_sessions(id) on delete cascade,
  category            text not null,             -- 'cuadro', 'escultura', etc.
  bounding_box        jsonb not null,            -- { x, y, width, height } en píxeles
  scale_meters        numeric(5,2),              -- Tamaño estimado en metros
  perspective_data    jsonb,                     -- Matriz de homografía para composición
  candidates          jsonb not null default '[]', -- Top-5 productos rankeados
  selected_product_id uuid references products(id),
  user_confirmed      boolean not null default false,
  locked              boolean not null default false, -- "me gusta esto, no cambiar"
  created_at          timestamptz not null default now()
);

create index product_slots_session_idx on product_slots(session_id);

-- ============================================================
-- SCRAPING JOBS
-- Log de trabajos de scraping para monitoreo
-- ============================================================
create table scraping_jobs (
  id              uuid primary key default gen_random_uuid(),
  merchant_id     uuid not null references merchants(id),
  status          text not null default 'pending'
                  check (status in ('pending','running','completed','failed')),
  products_found  integer default 0,
  products_added  integer default 0,
  error_message   text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- FUNCIÓN: Búsqueda semántica de productos
-- Llamada desde StyleRAGAgent
-- ============================================================
create or replace function search_products(
  query_embedding   vector(512),
  category_filter   text    default null,
  merchant_filter   uuid[]  default null,
  min_price         numeric default null,
  max_price         numeric default null,
  limit_n           integer default 10
)
returns table (
  id              uuid,
  name            text,
  price           numeric,
  primary_image   text,
  url             text,
  category        text,
  merchant_slug   text,
  attributes      jsonb,
  dimensions      jsonb,
  similarity      float
)
language plpgsql
as $$
begin
  return query
  select
    p.id,
    p.name,
    p.price,
    p.primary_image,
    p.url,
    p.category,
    m.slug        as merchant_slug,
    p.attributes,
    p.dimensions,
    1 - (p.embedding <=> query_embedding) as similarity
  from products p
  join merchants m on m.id = p.merchant_id
  where
    p.in_stock = true
    and p.embedding is not null
    and (category_filter is null or p.category = category_filter)
    and (merchant_filter is null or m.id = any(merchant_filter))
    and (min_price is null or p.price >= min_price)
    and (max_price is null or p.price <= max_price)
  order by p.embedding <=> query_embedding
  limit limit_n;
end;
$$;

-- ============================================================
-- WAITLIST — Captura de emails de la campaña de lanzamiento
-- ============================================================
create table if not exists waitlist (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  referral_code text,
  created_at    timestamptz not null default now()
);

create index if not exists waitlist_utm_campaign_idx on waitlist(utm_campaign);
create index if not exists waitlist_created_at_idx on waitlist(created_at);

-- Sin RLS por ahora: solo se escribe desde el server-side API route
-- (usa service role key, no expuesto al cliente)

-- ============================================================
-- MIGRATION: STO-14 — Tienda Nube OAuth credentials
-- Run this on existing databases (schema above already includes these columns
-- for fresh installs via CREATE TABLE).
-- ============================================================
alter table merchants add column if not exists tn_store_id      text;
alter table merchants add column if not exists tn_access_token  text;
alter table merchants add column if not exists tn_scope         text;
alter table merchants add column if not exists tn_token_at      timestamptz;

-- ============================================================
-- MIGRATION: STO-14 — Fix embedding dimension (1536 → 512)
-- voyage-3-lite returns 512-dim vectors, not 1536.
-- pgvector cannot change vector dimensions in-place; must drop + recreate.
-- WARNING: this nullifies all existing embeddings — re-run embeddings.py after.
-- ============================================================
drop index if exists products_embedding_idx;
alter table products drop column if exists embedding;
alter table products add column embedding vector(512);
create index products_embedding_idx on products
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Also update the search function signature to match the new dimension
create or replace function search_products(
  query_embedding   vector(512),
  category_filter   text    default null,
  merchant_filter   uuid[]  default null,
  min_price         numeric default null,
  max_price         numeric default null,
  limit_n           integer default 10
)
returns table (
  id              uuid,
  name            text,
  price           numeric,
  primary_image   text,
  url             text,
  category        text,
  merchant_slug   text,
  attributes      jsonb,
  dimensions      jsonb,
  similarity      float
)
language plpgsql
as $$
begin
  return query
  select
    p.id,
    p.name,
    p.price,
    p.primary_image,
    p.url,
    p.category,
    m.slug        as merchant_slug,
    p.attributes,
    p.dimensions,
    1 - (p.embedding <=> query_embedding) as similarity
  from products p
  join merchants m on m.id = p.merchant_id
  where
    p.in_stock = true
    and p.embedding is not null
    and (category_filter is null or p.category = category_filter)
    and (merchant_filter is null or m.id = any(merchant_filter))
    and (min_price is null or p.price >= min_price)
    and (max_price is null or p.price <= max_price)
  order by p.embedding <=> query_embedding
  limit limit_n;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (preparado para auth futura)
-- ============================================================
alter table design_sessions enable row level security;
alter table product_slots enable row level security;

-- Políticas permisivas para el MVP (sin auth todavía)
create policy "allow_all_sessions" on design_sessions for all using (true);
create policy "allow_all_slots" on product_slots for all using (true);
