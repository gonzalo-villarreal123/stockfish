"""
Verifica qué tiendas están en la plataforma Tienda Nube.
Ejecutar antes de agregar un merchant nuevo al scraper.

Uso:
    python check_platform.py               # verifica todos
    python check_platform.py https://url   # verifica URL puntual
"""
import asyncio
import sys
from playwright.async_api import async_playwright

# URLs de todos los merchants registrados en schema.sql
MERCHANT_URLS = [
    # Batch 1 (MVP)
    ("diderot",      "https://diderot.com.ar"),
    ("garbo",        "https://garbo.com.ar"),
    ("holyhaus",     "https://holyhaus.com.ar"),
    ("pacify",       "https://pacify.com.ar"),
    # Batch 2 (STO-2)
    ("altorancho",   "https://altorancho.com"),
    ("solpalou",     "https://www.solpaloudeco.com.ar"),
    ("lufe",         "https://lufe.com.ar"),
    ("nordika",      "https://nordika.com.ar"),
    ("boden",        "https://boden.com.ar"),
    ("blest",        "https://blest.com.ar"),
    ("cosasminimas", "https://cosasminimas.com.ar"),
    ("folia",        "https://folia.com.ar"),
    ("mink",         "https://mink.com.ar"),
    ("ruda",         "https://ruda.com.ar"),
    ("sienna",       "https://siennaarg.com.ar"),
    ("petite",       "https://petite.com.ar"),
    ("bazarokidoki", "https://bazarokidoki.com.ar"),
    ("tukee",        "https://tukee.com.ar"),
    ("laforma",      "https://laforma.com.ar"),
    ("plataforma5",  "https://plataforma5.com.ar"),
    ("decolovers",   "https://decolovers.com.ar"),
    ("almacenlobos", "https://almacendelobos.com.ar"),
]

TIENDANUBE_MARKERS = ["tiendanube", "nuvemshop", "mitiendanube", "js-product-name"]


async def check(slug: str, url: str, page) -> bool:
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=15000)
        content = await page.content()
        is_tn = any(marker in content for marker in TIENDANUBE_MARKERS)
        status = "✓ Tienda Nube" if is_tn else "✗ Otra plataforma"
        print(f"  {slug:<16} {status}  {url}")
        return is_tn
    except Exception as e:
        print(f"  {slug:<16} ✗ Error: {e}")
        return False


async def main(urls=None):
    targets = urls or MERCHANT_URLS
    ok = 0
    fail = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = await context.new_page()

        print(f"\nVerificando {len(targets)} tiendas...\n")
        for slug, url in targets:
            if await check(slug, url, page):
                ok += 1
            else:
                fail += 1

        await browser.close()

    print(f"\n{'─'*50}")
    print(f"Tienda Nube: {ok}/{ok+fail}  |  No verificadas: {fail}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Modo puntual: python check_platform.py https://tienda.com.ar
        url = sys.argv[1]
        slug = url.replace("https://", "").replace("http://", "").rstrip("/")
        asyncio.run(main([(slug, url)]))
    else:
        asyncio.run(main())
