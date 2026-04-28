"""
Corrige precios y categorías de un merchant ya scrapeado.

Uso:
  python fix_merchant_data.py --merchant gangahome --fix-prices --fix-categories

--fix-prices:      divide todos los precios por 100 (fix del bug de centavos TN)
--fix-categories:  re-corre detect_category() con las keywords actuales
--dry-run:         muestra qué cambiaría sin tocar Supabase
"""
import sys, asyncio, argparse
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv
load_dotenv()

import httpx, os
from scraper import classify_product

SUPABASE_URL = os.getenv("SUPABASE_REST_URL") or os.getenv("SUPABASE_URL") or os.getenv("SUPABASE_PROJECT_URL", "")
KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
H = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


async def get_all_products(merchant_id: str) -> list[dict]:
    products = []
    page = 0
    page_size = 1000
    async with httpx.AsyncClient(timeout=30) as c:
        while True:
            r = await c.get(
                f"{SUPABASE_URL}/rest/v1/products",
                headers=H,
                params={
                    "merchant_id": f"eq.{merchant_id}",
                    "select": "id,name,description,price,category",
                    "limit": str(page_size),
                    "offset": str(page * page_size),
                },
            )
            r.raise_for_status()
            batch = r.json()
            if not batch:
                break
            products.extend(batch)
            if len(batch) < page_size:
                break
            page += 1
    return products


async def patch_product(product_id: str, payload: dict):
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.patch(
            f"{SUPABASE_URL}/rest/v1/products",
            headers=H,
            params={"id": f"eq.{product_id}"},
            json=payload,
        )
        r.raise_for_status()


async def run(merchant_slug: str, fix_prices: bool, fix_categories: bool, dry_run: bool):
    # Get merchant
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{SUPABASE_URL}/rest/v1/merchants", headers=H, params={"slug": f"eq.{merchant_slug}"})
        merchants = r.json()
    if not merchants:
        print(f"[!] Merchant '{merchant_slug}' no encontrado.")
        return
    merchant = merchants[0]
    mid = merchant["id"]
    print(f"Merchant: {merchant['name']} ({mid})")

    products = await get_all_products(mid)
    print(f"Total productos: {len(products)}")

    price_fixes = 0
    cat_fixes = 0

    for p in products:
        patch = {}

        # ── Fix precios ──────────────────────────────────────
        if fix_prices:
            price = float(p["price"])
            # Si el precio es > 100.000 ARS para un producto de hogar/deco/bazar
            # probablemente está en centavos (factor 100x). Umbral: > $200.000 ARS
            # es sospechoso para la mayoría de productos Ganga Home.
            # Excepción: muebles caros podrían superar eso.
            if price > 200_000 and p.get("category") not in ("mueble",):
                corrected = price / 100
                if dry_run:
                    print(f"  PRECIO  {p['name'][:45]} | ${price:,.0f} -> ${corrected:,.0f}")
                else:
                    patch["price"] = corrected
                    price_fixes += 1
            elif price > 500_000:
                # Muebles también: $500k+ sigue siendo sospechoso
                corrected = price / 100
                if dry_run:
                    print(f"  PRECIO  {p['name'][:45]} | ${price:,.0f} -> ${corrected:,.0f}")
                else:
                    patch["price"] = corrected
                    price_fixes += 1

        # ── Fix categorías (con Claude para verificar matches de descripción) ──
        if fix_categories:
            name = p.get("name", "")
            desc = p.get("description", "") or ""
            new_cat = await classify_product(name, desc)
            if new_cat != p.get("category"):
                if dry_run:
                    print(f"  CAT     {p['name'][:45]} | {p['category']} -> {new_cat}")
                else:
                    patch["category"] = new_cat
                    cat_fixes += 1

        if patch and not dry_run:
            await patch_product(p["id"], patch)

    if dry_run:
        print("\n[DRY RUN] No se modificó nada.")
    else:
        print(f"\n[OK] Precios corregidos: {price_fixes}")
        print(f"[OK] Categorias actualizadas: {cat_fixes}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--merchant", required=True)
    parser.add_argument("--fix-prices", action="store_true")
    parser.add_argument("--fix-categories", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.fix_prices and not args.fix_categories:
        parser.error("Especificá al menos --fix-prices o --fix-categories")

    asyncio.run(run(args.merchant, args.fix_prices, args.fix_categories, args.dry_run))
