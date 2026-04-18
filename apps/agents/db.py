import os
import httpx
from dotenv import load_dotenv
from typing import Optional, List

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_REST_URL") or os.getenv("SUPABASE_PROJECT_URL", "https://malbjvnmqhdalttcvroi.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


def rest(path: str) -> str:
    return f"{SUPABASE_URL}/rest/v1/{path}"


def rpc(fn: str) -> str:
    return f"{SUPABASE_URL}/rest/v1/rpc/{fn}"


# ── Merchants ──────────────────────────────────────────────

async def get_product_categories() -> list:
    """Devuelve las categorías únicas que tienen al menos un producto en stock."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            rest("products"),
            headers=HEADERS,
            params={"select": "category", "in_stock": "eq.true"}
        )
        r.raise_for_status()
        data = r.json()
    categories = list({p["category"] for p in data if p.get("category")})
    return categories


async def get_merchants():
    async with httpx.AsyncClient() as client:
        r = await client.get(rest("merchants"), headers=HEADERS, params={"active": "eq.true"})
        r.raise_for_status()
        return r.json()


async def get_merchant_by_slug(slug: str):
    async with httpx.AsyncClient() as client:
        r = await client.get(rest("merchants"), headers=HEADERS, params={"slug": f"eq.{slug}", "limit": "1"})
        r.raise_for_status()
        data = r.json()
        return data[0] if data else None


# ── Products ───────────────────────────────────────────────

async def upsert_product(merchant_id: str, product: dict):
    payload = {"merchant_id": merchant_id, **product}
    async with httpx.AsyncClient() as client:
        r = await client.post(
            rest("products"),
            headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"},
            json=payload
        )
        r.raise_for_status()
        return r.json()


async def search_products_by_embedding(
    embedding: List[float],
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: int = 10
):
    payload = {
        "query_embedding": embedding,
        "category_filter": category,
        "min_price": min_price,
        "max_price": max_price,
        "limit_n": limit,
    }
    async with httpx.AsyncClient() as client:
        r = await client.post(rpc("search_products"), headers=HEADERS, json=payload)
        r.raise_for_status()
        return r.json()


async def get_products(merchant_slug: Optional[str] = None, limit: int = 100):
    params = {"limit": str(limit), "in_stock": "eq.true"}
    async with httpx.AsyncClient() as client:
        if merchant_slug:
            # Join via merchant slug
            params["select"] = "*, merchants!inner(slug)"
            params["merchants.slug"] = f"eq.{merchant_slug}"
        r = await client.get(rest("products"), headers=HEADERS, params=params)
        r.raise_for_status()
        return r.json()


# ── Design Sessions ────────────────────────────────────────

async def create_session(session_data: dict) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(rest("design_sessions"), headers=HEADERS, json=session_data)
        r.raise_for_status()
        data = r.json()
        return data[0] if data else {}


async def get_session(session_id: str) -> Optional[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            rest("design_sessions"),
            headers=HEADERS,
            params={"id": f"eq.{session_id}", "limit": "1"}
        )
        r.raise_for_status()
        data = r.json()
        return data[0] if data else None


async def update_session(session_id: str, updates: dict) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.patch(
            rest("design_sessions"),
            headers=HEADERS,
            params={"id": f"eq.{session_id}"},
            json=updates
        )
        r.raise_for_status()
        data = r.json()
        return data[0] if data else {}


async def get_session_by_token(share_token: str) -> Optional[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            rest("design_sessions"),
            headers=HEADERS,
            params={"share_token": f"eq.{share_token}", "limit": "1"}
        )
        r.raise_for_status()
        data = r.json()
        return data[0] if data else None


# ── Scraping Jobs ──────────────────────────────────────────

async def create_scraping_job(merchant_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            rest("scraping_jobs"),
            headers=HEADERS,
            json={"merchant_id": merchant_id, "status": "pending"}
        )
        r.raise_for_status()
        data = r.json()
        return data[0] if data else {}


async def update_scraping_job(job_id: str, updates: dict):
    async with httpx.AsyncClient() as client:
        r = await client.patch(
            rest("scraping_jobs"),
            headers=HEADERS,
            params={"id": f"eq.{job_id}"},
            json=updates
        )
        r.raise_for_status()


# ── Tienda Nube OAuth credentials ──────────────────────────

async def save_tn_credentials(merchant_id: str, store_id: str, access_token: str, scope: str = ""):
    """Persists TN OAuth credentials on the merchant row."""
    from datetime import datetime, timezone
    updates = {
        "tn_store_id":     store_id,
        "tn_access_token": access_token,
        "tn_scope":        scope,
        "tn_token_at":     datetime.now(timezone.utc).isoformat(),
    }
    async with httpx.AsyncClient() as client:
        r = await client.patch(
            rest("merchants"),
            headers=HEADERS,
            params={"id": f"eq.{merchant_id}"},
            json=updates
        )
        r.raise_for_status()


async def get_tn_credentials(merchant_slug: str) -> Optional[dict]:
    """
    Returns the TN credentials for a merchant slug, or None if not yet authorized.
    Result: { merchant_id, base_url, tn_store_id, tn_access_token, tn_scope }
    """
    async with httpx.AsyncClient() as client:
        r = await client.get(
            rest("merchants"),
            headers=HEADERS,
            params={
                "slug":          f"eq.{merchant_slug}",
                "select":        "id,base_url,tn_store_id,tn_access_token,tn_scope",
                "limit":         "1",
            }
        )
        r.raise_for_status()
        data = r.json()
    if not data or not data[0].get("tn_access_token"):
        return None
    row = data[0]
    return {
        "merchant_id":    row["id"],
        "base_url":       row["base_url"],
        "tn_store_id":    row["tn_store_id"],
        "tn_access_token": row["tn_access_token"],
        "tn_scope":       row.get("tn_scope", ""),
    }
