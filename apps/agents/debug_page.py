import asyncio
from playwright.async_api import async_playwright

async def debug():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("https://holyhaus.com.ar/productos/mesita-auxiliar-matera/", wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)
        content = await page.content()
        await browser.close()

        # Guardar HTML para inspeccionarlo
        with open("debug_product.html", "w", encoding="utf-8") as f:
            f.write(content)
        print("HTML guardado en debug_product.html")
        print(f"Tamaño: {len(content)} chars")

asyncio.run(debug())
