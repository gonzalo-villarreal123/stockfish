#!/usr/bin/env bash
# scrape_all.sh — Scrapea todos los merchants registrados en Stockfish
# Uso:
#   ./scrape_all.sh              # scrapea todo
#   ./scrape_all.sh --limit 50   # max 50 productos por tienda (útil para pruebas)
#
# Requiere: SUPABASE_REST_URL y SUPABASE_SERVICE_ROLE_KEY en .env

set -euo pipefail

LIMIT_ARG="${1:-}"   # ej: "--limit 50"

MERCHANTS=(
  # Batch 1 (MVP)
  diderot garbo holyhaus pacify
  # Batch 2 (STO-2)
  altorancho solpalou lufe nordika
  boden blest cosasminimas folia mink
  ruda sienna petite bazarokidoki tukee
  laforma plataforma5 decolovers almacenlobos
)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Stockfish — Scraping batch (${#MERCHANTS[@]} tiendas)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for slug in "${MERCHANTS[@]}"; do
  echo ""
  echo "▶ $slug"
  # shellcheck disable=SC2086
  python scraper.py --merchant "$slug" $LIMIT_ARG || echo "  ⚠ Error en $slug (continuando)"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Batch completo"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
