"""
Scraper universal para tiendas en plataforma Tienda Nube.
Usa JSON-LD (schema.org) como fuente principal de datos.
"""
import asyncio
import json
import re
import argparse
from typing import Optional
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from models import ScrapedProduct, ProductDimensions
from db import get_merchant_by_slug, upsert_product, create_scraping_job, update_scraping_job
from datetime import datetime


# ── Merchants registrados (Tienda Nube AR) ─────────────────
ALL_MERCHANTS = [
    # Batch 1 (MVP)
    "diderot", "garbo", "holyhaus", "pacify",
    # Batch 2 (STO-2)
    "altorancho", "solpalou", "lufe", "nordika",
    "boden", "blest", "cosasminimas", "folia", "mink",
    "ruda", "sienna", "petite", "bazarokidoki", "tukee",
    "laforma", "plataforma5", "decolovers", "almacenlobos",
]


# ── Categorías de arte & decoración ───────────────────────
CATEGORY_KEYWORDS = {
    "cuadro":    ["cuadro", "print", "poster", "lámina", "litografía", "fotografía", "arte"],
    "escultura": ["escultura", "figura", "estatua", "objeto decorativo", "pieza"],
    "lampara":   ["lámpara", "luz", "iluminación", "velador", "aplique"],
    "espejo":    ["espejo", "mirror"],
    "florero":   ["florero", "jarrón", "vaso decorativo"],
    "textil":    ["almohadón", "cojín", "manta", "tapiz", "alfombra"],
    "planta":    ["planta", "maceta", "suculenta"],
    "mueble":    ["mesa", "silla", "sillón", "sofá", "estante", "repisa", "cómoda"],
}


def detect_category(name: str, description: str = "") -> str:
    text = f"{name} {description}".lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return category
    return "otro"


def extract_dimensions(text: str) -> Optional[ProductDimensions]:
    dims = {}
    patterns = [
        (r"(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*(?:x\s*(\d+(?:[.,]\d+)?))?\s*cm", "wxh"),
        (r"alto[:\s]+(\d+(?:[.,]\d+)?)\s*cm", "h"),
        (r"ancho[:\s]+(\d+(?:[.,]\d+)?)\s*cm", "w"),
        (r"profundidad[:\s]+(\d+(?:[.,]\d+)?)\s*cm", "d"),
        (r"diámetro[:\s]+(\d+(?:[.,]\d+)?)\s*cm", "w"),
    ]
    for pattern, dim_type in patterns:
        match = re.search(pattern, text.lower())
        if match:
            if dim_type == "wxh":
                dims["width_cm"] = float(match.group(1).replace(",", "."))
                dims["height_cm"] = float(match.group(2).replace(",", "."))
                if match.group(3):
                    dims["depth_cm"] = float(match.group(3).replace(",", "."))
            elif dim_type == "h":
                dims["height_cm"] = float(match.group(1).replace(",", "."))
            elif dim_type == "w":
                dims["width_cm"] = float(match.group(1).replace(",", "."))
            elif dim_type == "d":
                dims["depth_cm"] = float(match.group(1).replace(",", "."))
    return ProductDimensions(**dims) if dims else None


def parse_price_ars(price_str: str) -> float:
    """Convierte '64.900,00' o '64900' a float."""
    clean = re.sub(r"[^\d,.]", "", str(price_str))
    # Formato argentino: 64.900,00
    if "," in clean and "." in clean:
        clean = clean.replace(".", "").replace(",", ".")
    elif "," in clean:
        clean = clean.replace(",", ".")
    try:
        return float(clean)
    except ValueError:
        return 0.0


async def scrape_product_page(page, url: str) -> Optional[dict]:
    """Extrae datos de una página de producto de Tienda Nube."""
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(1500)
        content = await page.content()
        soup = BeautifulSoup(content, "html.parser")

        # ── 1. JSON-LD (fuente principal) ──────────────────
        jsonld_data = None
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
                # Puede ser un array o un objeto con @graph
                if isinstance(data, list):
                    for item in data:
                        if item.get("@type") == "Product":
                            jsonld_data = item
                            break
                elif data.get("@type") == "Product":
                    jsonld_data = data
                elif "mainEntity" in data and data["mainEntity"].get("@type") == "Product":
                    jsonld_data = data["mainEntity"]
                if jsonld_data:
                    break
            except Exception:
                continue

        # ── 2. Nombre ──────────────────────────────────────
        name = ""
        if jsonld_data:
            name = jsonld_data.get("name", "")
        if not name:
            el = soup.select_one("h1.js-product-name, h1.h2.js-product-name")
            if el:
                name = el.get_text(strip=True)
        if not name:
            return None

        # ── 3. Precio (precio actual con descuento si hay) ─
        price = 0.0
        price_el = soup.select_one("#price_display, .js-price-display")
        if price_el:
            raw = price_el.get("data-product-price")
            if raw:
                # data-product-price está en centavos
                price = int(raw) / 100
            else:
                price = parse_price_ars(price_el.get_text(strip=True))

        if price == 0 and jsonld_data:
            offers = jsonld_data.get("offers", {})
            price = parse_price_ars(str(offers.get("price", "0")))

        if price == 0:
            return None

        # ── 4. Stock ───────────────────────────────────────
        in_stock = True
        if jsonld_data:
            offers = jsonld_data.get("offers", {})
            availability = offers.get("availability", "")
            in_stock = "InStock" in availability or "InStock" in str(availability)
            inventory = offers.get("inventoryLevel", {}).get("value", 1)
            if int(inventory) == 0:
                in_stock = False

        # ── 5. Descripción ─────────────────────────────────
        description = ""
        if jsonld_data:
            description = jsonld_data.get("description", "")
        if not description:
            desc_el = soup.select_one("div.user-content")
            if desc_el:
                description = desc_el.get_text(separator=" ", strip=True)[:1000]

        # ── 6. Imágenes ────────────────────────────────────
        images = []
        img_els = soup.select("img.js-product-slide-img")
        for img in img_els:
            srcset = img.get("data-srcset", "")
            if srcset:
                # Tomar la URL más grande del srcset
                parts = [p.strip().split(" ")[0] for p in srcset.split(",") if p.strip()]
                if parts:
                    best = parts[-1]
                    if best.startswith("http") and best not in images:
                        images.append(best)
            else:
                src = img.get("src", "")
                if src.startswith("http") and src not in images:
                    images.append(src)

        # Fallback: og:image
        if not images:
            if jsonld_data and jsonld_data.get("image"):
                img_val = jsonld_data["image"]
                images = [img_val] if isinstance(img_val, str) else img_val
            else:
                og = soup.select_one('meta[property="og:image"]')
                if og:
                    images.append(og.get("content", ""))

        primary_image = images[0] if images else ""
        if not primary_image:
            return None

        # ── 7. SKU / External ID ───────────────────────────
        external_id = ""
        if jsonld_data:
            external_id = jsonld_data.get("sku", "")
        if not external_id:
            external_id = url.rstrip("/").split("/")[-1]

        # ── 8. Peso ────────────────────────────────────────
        weight_kg = None
        if jsonld_data and jsonld_data.get("weight"):
            try:
                weight_kg = float(jsonld_data["weight"].get("value", 0))
            except Exception:
                pass

        # ── 9. Categoría y dimensiones ─────────────────────
        category = detect_category(name, description)
        full_text = f"{name} {description}"
        dimensions = extract_dimensions(full_text)
        if dimensions and weight_kg:
            dimensions.weight_kg = weight_kg
        elif weight_kg:
            dimensions = ProductDimensions(weight_kg=weight_kg)

        return {
            "external_id": external_id,
            "name": name,
            "description": description[:1000] if description else None,
            "price": price,
            "primary_image": primary_image,
            "images": json.dumps(images[:10]),
            "url": url,
            "category": category,
            "in_stock": in_stock,
            "attributes": json.dumps({}),
            "dimensions": json.dumps(dimensions.model_dump()) if dimensions else None,
        }

    except Exception as e:
        print(f"  Error scraping {url}: {e}")
        return None


async def _collect_links_from_page(page, base_url: str, list_url: str, path_prefix: str) -> set[str]:
    """Carga una URL de listado y extrae los links de productos con el prefijo dado."""
    await page.goto(list_url, wait_until="domcontentloaded", timeout=15000)
    await page.wait_for_timeout(800)
    content = await page.content()
    soup = BeautifulSoup(content, "html.parser")

    found = set()
    selector = f"a[href*='{path_prefix}/']"
    for link in soup.select(selector):
        href = link.get("href", "")
        if f"{path_prefix}/" not in href:
            continue
        if href.endswith(path_prefix) or href.endswith(f"{path_prefix}/"):
            continue
        full_url = href if href.startswith("http") else f"{base_url}{href}"
        full_url = full_url.split("?")[0].rstrip("/")
        # Sólo URLs de producto (no categorías): exactamente un segmento tras el prefijo
        path = full_url.replace(base_url, "")
        if path.count("/") == 2:
            found.add(full_url)
    return found


async def get_product_urls(page, base_url: str, limit: Optional[int] = None) -> list[str]:
    """
    Enumera todos los productos de una tienda Tienda Nube.
    Intenta /productos primero (TN por defecto) y cae a /tienda si no encuentra nada,
    cubriendo tiendas que personalizan la ruta del catálogo.
    """
    # Detectar qué prefijo de catálogo usa la tienda
    PATH_PREFIXES = ["/productos", "/tienda"]
    active_prefix = None

    for prefix in PATH_PREFIXES:
        probe_url = f"{base_url}{prefix}?page=1"
        try:
            sample = await _collect_links_from_page(page, base_url, probe_url, prefix)
            if sample:
                active_prefix = prefix
                print(f"  Catálogo detectado en: {prefix}")
                break
        except Exception:
            continue

    if not active_prefix:
        print(f"  ⚠ No se encontró catálogo en {base_url} (probado: {PATH_PREFIXES})")
        return []

    urls = set()
    page_num = 1

    while True:
        list_url = f"{base_url}{active_prefix}?page={page_num}"
        try:
            new_urls = await _collect_links_from_page(page, base_url, list_url, active_prefix)

            if not new_urls or new_urls.issubset(urls):
                break

            urls.update(new_urls)
            print(f"  Página {page_num}: {len(new_urls)} URLs (total: {len(urls)})")

            if limit and len(urls) >= limit:
                break

            page_num += 1
            await asyncio.sleep(0.5)

        except Exception as e:
            print(f"  Error en página {page_num}: {e}")
            break

    result = list(urls)
    if limit:
        result = result[:limit]
    return result


async def scrape_merchant(merchant_slug: str, limit: Optional[int] = None):
    merchant = await get_merchant_by_slug(merchant_slug)
    if not merchant:
        print(f"Merchant '{merchant_slug}' no encontrado.")
        return

    merchant_id = merchant["id"]
    base_url = merchant["base_url"].rstrip("/")
    print(f"\n🛒 Scrapeando {merchant['name']} ({base_url})")

    job = await create_scraping_job(merchant_id)
    job_id = job.get("id")
    await update_scraping_job(job_id, {"status": "running", "started_at": datetime.now().isoformat()})

    products_found = 0
    products_added = 0

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
            page = await context.new_page()

            print("  Obteniendo lista de productos...")
            product_urls = await get_product_urls(page, base_url, limit)
            print(f"  Total a scrapear: {len(product_urls)}")

            for i, url in enumerate(product_urls, 1):
                print(f"  [{i}/{len(product_urls)}] {url}")
                product_data = await scrape_product_page(page, url)

                if product_data:
                    products_found += 1
                    try:
                        await upsert_product(merchant_id, product_data)
                        products_added += 1
                        print(f"    ✓ {product_data['name'][:50]} — ${product_data['price']:,.0f}")
                    except Exception as e:
                        print(f"    ✗ Error guardando: {e}")
                else:
                    print(f"    - Sin datos")

                await asyncio.sleep(0.3)

            await browser.close()

    except Exception as e:
        print(f"Error general: {e}")
        await update_scraping_job(job_id, {
            "status": "failed",
            "error_message": str(e),
            "completed_at": datetime.now().isoformat()
        })
        return

    await update_scraping_job(job_id, {
        "status": "completed",
        "products_found": products_found,
        "products_added": products_added,
        "completed_at": datetime.now().isoformat()
    })

    print(f"\n✅ Completado: {products_added}/{products_found} productos guardados")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--merchant", required=False, choices=ALL_MERCHANTS,
                        help="Slug del merchant a scrapear. Omitir para scrapear todos.")
    parser.add_argument("--all", action="store_true", help="Scrapear todos los merchants activos")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    if args.all:
        async def scrape_all():
            for slug in ALL_MERCHANTS:
                await scrape_merchant(slug, args.limit)
        asyncio.run(scrape_all())
    elif args.merchant:
        asyncio.run(scrape_merchant(args.merchant, args.limit))
    else:
        parser.error("Especificar --merchant SLUG o usar --all")
