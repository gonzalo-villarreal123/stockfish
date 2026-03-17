import asyncio
from graph import run_design_session

async def test():
    print("=" * 50)
    print("TEST: Buscando decoración minimalista")
    print("=" * 50)

    result = await run_design_session(
        session_id="test-123",
        raw_intent="quiero decorar mi living con estilo minimalista, algo moderno con cuadros o esculturas"
    )

    print(f"\nStatus: {result['status']}")
    print(f"Keywords: {result['style_keywords']}")
    print(f"Style tags: {result['style_tags']}")
    print(f"\nProductos encontrados: {len(result['products'])}")
    print("-" * 50)
    for p in result['products'][:5]:
        print(f"  [{p['rank']}] {p['name'][:50]} — ${p['price']:,.0f} ({p['merchant_slug']})")
        print(f"       Similitud: {p['similarity']:.3f} | Categoría: {p['category']}")

asyncio.run(test())
