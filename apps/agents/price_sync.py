"""
price_sync.py — Sincronización liviana de precios y stock.

Usa httpx (sin Playwright) para fetchear el precio visible y el stock actual
de cada producto desde la tienda original. Rápido: ~15 requests concurrentes.

Uso local:
  python price_sync.py --merchant gangahome
  python price_sync.py --all              # todos los merchants activos

El endpoint POST /admin/sync-prices hace lo mismo desde la API.
Configurar un cron externo (ej. cron-job.org) que llame:
  POST https://stockfish-agents.onrender.com/admin/sync-prices
  Body: {"merchant_slug": "gangahome"}   (o "all" para todos)
  Cada 12–24 horas.
"""
import sys
import asyncio
import httpx
import re
import json
import argparse
import os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv
load_dotenv()

from scraper import parse_price_ars

SUPABASE_URL = os.getenv("SUPABASE_REST_URL") or os.getenv("SUPABASE_URL") or os.getenv("SUPABASE_PROJECT_URL", "")
KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}
FETCH_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; Stockfish-PriceSync/1.0)"}

# Umbral mínimo de cambio para actualizar precio (evita ruido por centavos)
PRICE_CHANGE_THRESHOLD = 50  # ARS


async def fetch_live_price_stock(url: str, timeout: float = 8.0) -> dict | None:
    """
    Fetcha precio actual y stock de una página de producto Tienda Nube.
    Usa solo httpx (sin Playwright) — ~200-500ms por request.

    Retorna:
        {"price": float | None, "in_stock": bool}
        None si hay un error de red irrecuperable.
    """
    try:
        async with httpx.AsyncClient(
            timeout=timeout, follow_redirects=True, headers=FETCH_HEADERS
        ) as c:
            r = await c.get(url)

            # Producto eliminado de la tienda
            if r.status_code == 404:
                return {"price": None, "in_stock": False}

            if r.status_code != 200:
                return None

            html = r.text

            # ── Precio: texto visible (siempre en pesos, formato ARS) ──
            price = None
            m = re.search(
                r'id=["\']price_display["\'][^>]*>([\s\$\d.,\s]{2,30}?)</[a-z]',
                html, re.DOTALL
            )
            if m:
                price = parse_price_ars(m.group(1).strip())

            # Fallback: precio de clase js-price-display
            if not price:
                m2 = re.search(
                    r'class=["\'][^"\']*js-price-display[^"\']*["\'][^>]*>([\$\s\d.,]{2,25}?)</',
                    html
                )
                if m2:
                    price = parse_price_ars(m2.group(1).strip())

            # ── Stock: JSON-LD es la fuente más confiable ──
            in_stock = True
            for script_match in re.finditer(
                r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL
            ):
                try:
                    data = json.loads(script_match.group(1).strip())
                    if data.get("@type") == "Product":
                        availability = str(
                            data.get("offers", {}).get("availability", "")
                        )
                        in_stock = "InStock" in availability
                        break
                except Exception:
                    continue

            # Si el precio desapareció completamente, asumimos sin stock
            if price == 0 or price is None:
                # No marcamos sin stock solo por no encontrar precio (puede ser un
                # problema de parsing), pero sí si la página no tiene ningún dato
                pass

            return {"price": price, "in_stock": in_stock}

    except (httpx.TimeoutException, httpx.ConnectError):
        return None
    except Exception as e:
        print(f"  [price_sync] Error fetching {url}: {e}")
        return None


async def sync_merchant(merchant_slug: str, concurrency: int = 15) -> dict:
    """
    Sincroniza precios y stock de todos los productos de un merchant.
    Solo actualiza Supabase cuando hay un cambio real (precio o stock).

    Returns: stats dict
    """
    # Get merchant
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(
            f"{SUPABASE_URL}/rest/v1/merchants",
            headers=HEADERS,
            params={"slug": f"eq.{merchant_slug}"}
        )
        merchants = r.json()
    if not merchants:
        print(f"[price_sync] Merchant '{merchant_slug}' no encontrado.")
        return {}

    merchant_id = merchants[0]["id"]
    print(f"[price_sync] Sincronizando: {merchants[0]['name']}")

    # Fetch all products (paginated)
    products = []
    offset = 0
    page_size = 1000
    async with httpx.AsyncClient(timeout=30) as c:
        while True:
            r = await c.get(
                f"{SUPABASE_URL}/rest/v1/products",
                headers=HEADERS,
                params={
                    "merchant_id": f"eq.{merchant_id}",
                    "select": "id,url,price,in_stock",
                    "limit": str(page_size),
                    "offset": str(offset),
                }
            )
            batch = r.json()
            if not batch:
                break
            products.extend(batch)
            if len(batch) < page_size:
                break
            offset += page_size

    print(f"[price_sync] {len(products)} productos a verificar")

    stats = {"total": len(products), "price_updated": 0, "stock_updated": 0, "errors": 0, "unchanged": 0}
    semaphore = asyncio.Semaphore(concurrency)

    async def sync_one(product: dict):
        async with semaphore:
            result = await fetch_live_price_stock(product["url"])
            if result is None:
                stats["errors"] += 1
                return

            patch = {}
            current_price = float(product.get("price") or 0)
            current_stock = bool(product.get("in_stock", True))

            # Precio: solo actualizar si el cambio supera el umbral
            if result["price"] and result["price"] > 0:
                if abs(result["price"] - current_price) >= PRICE_CHANGE_THRESHOLD:
                    patch["price"] = result["price"]
                    stats["price_updated"] += 1

            # Stock
            if result["in_stock"] != current_stock:
                patch["in_stock"] = result["in_stock"]
                stats["stock_updated"] += 1
                status = "en stock" if result["in_stock"] else "SIN STOCK"
                print(f"  [stock] {product['url'].split('/')[-2]}: {status}")

            if patch:
                async with httpx.AsyncClient(timeout=10) as c:
                    await c.patch(
                        f"{SUPABASE_URL}/rest/v1/products",
                        headers=HEADERS,
                        params={"id": f"eq.{product['id']}"},
                        json=patch
                    )
            else:
                stats["unchanged"] += 1

    await asyncio.gather(*[sync_one(p) for p in products])

    print(
        f"[price_sync] Listo: {stats['price_updated']} precios | "
        f"{stats['stock_updated']} stock | {stats['errors']} errores | "
        f"{stats['unchanged']} sin cambios"
    )
    return stats


async def sync_all_merchants(concurrency: int = 15) -> list[dict]:
    """Sincroniza todos los merchants activos."""
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(
            f"{SUPABASE_URL}/rest/v1/merchants",
            headers=HEADERS,
            params={"active": "eq.true"}
        )
        merchants = r.json()

    results = []
    for m in merchants:
        stats = await sync_merchant(m["slug"], concurrency)
        results.append({"merchant": m["slug"], **stats})
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sincroniza precios y stock de productos")
    parser.add_argument("--merchant", help="Slug del merchant a sincronizar")
    parser.add_argument("--all", action="store_true", help="Sincronizar todos los merchants activos")
    parser.add_argument("--concurrency", type=int, default=15, help="Requests concurrentes (default: 15)")
    args = parser.parse_args()

    if args.all:
        asyncio.run(sync_all_merchants(args.concurrency))
    elif args.merchant:
        asyncio.run(sync_merchant(args.merchant, args.concurrency))
    else:
        parser.error("Especificá --merchant SLUG o --all")
