-- ============================================================
-- Stockfish: tabla categories
-- Fuente única de verdad para metadatos de categorías.
-- Corre este script en el SQL Editor de Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  slug          TEXT PRIMARY KEY,
  label         TEXT    NOT NULL,
  emoji         TEXT    NOT NULL DEFAULT '📦',
  group_id      TEXT    NOT NULL DEFAULT 'otro',
  context       TEXT,                        -- contexto semántico para vector search
  budget_weight FLOAT   DEFAULT 0.1,         -- peso para distribución de presupuesto
  sort_order    INTEGER DEFAULT 99,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Lectura pública (el widget la necesita via /categories)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON categories
  FOR SELECT USING (true);

-- ── Seed inicial ─────────────────────────────────────────────
INSERT INTO categories (slug, label, emoji, group_id, context, budget_weight, sort_order) VALUES
  ('mueble',    'Muebles',       '🛋️',  'muebles',     'mueble sofá sillón mesa silla living comedor dormitorio escritorio rack estante biblioteca', 0.40, 1),
  ('textil',    'Textil Hogar',  '🛏️',  'textiles',    'textil almohadón alfombra manta cortina cubrecama funda cojín sábana acolchado mantel camino de mesa', 0.15, 2),
  ('lampara',   'Iluminación',   '💡',  'iluminacion', 'velador lámpara de mesa lámpara de pie iluminación ambiente aplique decorativa living', 0.20, 3),
  ('cuadro',    'Arte',          '🖼️',  'arte',        'cuadro arte pintura ilustración lámina fotografía poster decoración pared', 0.12, 4),
  ('florero',   'Decoración',    '🌿',  'decoracion',  'florero jarrón vaso decorativo centro de mesa vela candelabro bandeja cesto portaretrato', 0.08, 5),
  ('escultura', 'Esculturas',    '🗿',  'decoracion',  'escultura figura objeto decorativo estatua pieza decorativa accesorio', 0.10, 6),
  ('espejo',    'Espejos',       '🪞',  'decoracion',  'espejo decorativo redondo ovalado rectangular pared living hall entrada', 0.15, 7),
  ('planta',    'Plantas',       '🌱',  'decoracion',  'planta natural artificial maceta suculenta verde decoración interior', 0.05, 8),
  ('bazar',     'Bazar & Mesa',  '🍽️',  'bazar',       'copa vaso jarra vajilla plato cubierto utensilio cocina mesa ensaladera tupper contenedor botella', 0.10, 9),
  ('baño',      'Baño',          '🚿',  'bano',        'baño dispenser jabonera porta toalla accesorios baño set de baño', 0.08, 10)
ON CONFLICT (slug) DO UPDATE SET
  label         = EXCLUDED.label,
  emoji         = EXCLUDED.emoji,
  group_id      = EXCLUDED.group_id,
  context       = EXCLUDED.context,
  budget_weight = EXCLUDED.budget_weight,
  sort_order    = EXCLUDED.sort_order;
