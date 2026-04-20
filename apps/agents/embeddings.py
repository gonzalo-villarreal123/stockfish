"""
Genera y actualiza embeddings de productos usando Voyage AI.
"""
import asyncio
import os
import httpx
import voyageai
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_REST_URL") or os.getenv("SUPABASE_URL") or os.getenv("SUPABASE_PROJECT_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
VOYAGE_API_KEY = os.getenv("VOYAGE_API_KEY")

HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

voyage = voyageai.Client(api_key=VOYAGE_API_KEY)

# voyage-3-lite: 512 dims, bajo costo — suficiente para búsqueda de decoración
# El schema usa vector(512) para coincidir
EMBED_MODEL = "voyage-3-lite"
BATCH_SIZE = 128


def build_product_text(product: dict) -> str:
    """Construye el texto que se va a embeddear para un producto."""
    parts = [product.get("name", "")]
    if product.get("description"):
        parts.append(product["description"][:300])
    if product.get("category"):
        parts.append(f"categoría: {product['category']}")
    return " | ".join(p for p in parts if p)


async def get_products_without_embeddings(merchant_id: str | None = None) -> list[dict]:
    params: dict = {
        "embedding": "is.null",
        "select":    "id,name,description,category",
        "limit":     "1000",
    }
    if merchant_id:
        params["merchant_id"] = f"eq.{merchant_id}"
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/products",
            headers=HEADERS,
            params=params,
        )
        r.raise_for_status()
        return r.json()


async def update_product_embedding(product_id: str, embedding: list[float]):
    # pgvector necesita el vector como string "[0.1, 0.2, ...]"
    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
    async with httpx.AsyncClient() as client:
        r = await client.patch(
            f"{SUPABASE_URL}/rest/v1/products",
            headers=HEADERS,
            params={"id": f"eq.{product_id}"},
            json={"embedding": embedding_str}
        )
        if r.status_code >= 400:
            print(f"    Supabase error {r.status_code}: {r.text}")
        r.raise_for_status()


async def generate_embeddings_for_merchant(merchant_id: str):
    """
    Genera embeddings solo para los productos de un merchant específico
    que aún no los tienen. Llamado automáticamente al final de un sync TN.
    """
    products = await get_products_without_embeddings(merchant_id=merchant_id)
    if not products:
        print(f"[embeddings] Todos los productos de {merchant_id} ya tienen embeddings.")
        return
    print(f"[embeddings] {len(products)} productos de {merchant_id} sin embeddings — generando...")
    await _embed_batch(products)


async def _embed_batch(products: list[dict]):
    """Generates and persists embeddings for the given product list."""
    total = 0
    for i in range(0, len(products), BATCH_SIZE):
        batch = products[i:i + BATCH_SIZE]
        texts = [build_product_text(p) for p in batch]

        print(f"  Generando embeddings batch {i // BATCH_SIZE + 1} ({len(batch)} productos)...")

        try:
            result = voyage.embed(texts, model=EMBED_MODEL, input_type="document")
            for product, embedding in zip(batch, result.embeddings):
                await update_product_embedding(product["id"], embedding)
                total += 1
            print(f"  ✓ {total}/{len(products)} completados")
        except Exception as e:
            print(f"  ✗ Error en batch: {e}")

        await asyncio.sleep(0.2)

    print(f"✅ Embeddings generados: {total}/{len(products)} productos")


async def generate_embeddings():
    print("🔍 Buscando productos sin embeddings...")
    products = await get_products_without_embeddings()

    if not products:
        print("✅ Todos los productos ya tienen embeddings.")
        return

    print(f"📦 {len(products)} productos para procesar")
    await _embed_batch(products)


if __name__ == "__main__":
    asyncio.run(generate_embeddings())
