import asyncio
from playwright.async_api import async_playwright

async def check(url):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=15000)
        content = await page.content()
        await browser.close()

        is_tiendanube = any(x in content for x in ["tiendanube", "nuvemshop", "mitiendanube", "js-product-name"])
        print(f"{url}: {'✓ Tienda Nube' if is_tiendanube else '✗ Otra plataforma'}")

async def main():
    await check("https://altorancho.com")
    await check("https://www.solpaloudeco.com.ar")

asyncio.run(main())
