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

async def get_product_categories(merchant_slug: Optional[str] = None) -> list:
    """Devuelve las categorías únicas con stock. Si se pasa merchant_slug, filtra por esa tienda."""
    async with httpx.AsyncClient() as client:
        if merchant_slug:
            params = {
                "select": "category,merchants!inner(slug)",
                "in_stock": "eq.true",
                "merchants.slug": f"eq.{merchant_slug}",
            }
        else:
            params = {"select": "category", "in_stock": "eq.true"}
        r = await client.get(rest("products"), headers=HEADERS, params=params)
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


async def upsert_session(session_data: dict) -> dict:
    """Inserts or updates a design session (merge on id conflict)."""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            rest("design_sessions"),
            headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"},
            json=session_data,
        )
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


async def persist_session_state(session_id: str, state: dict):
    """Guarda el estado completo de la sesión en Supabase para sobrevivir reinicios del servidor."""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            rest("design_sessions"),
            headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
            json={"id": session_id, "session_state": state},
        )
        if r.status_code not in (200, 201, 204):
            print(f"[persist_session_state] Error: {r.status_code}")


async def load_session_state(session_id: str) -> Optional[dict]:
    """Recupera el estado de sesión desde Supabase (usado al reiniciar el servidor)."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            rest("design_sessions"),
            headers=HEADERS,
            params={"id": f"eq.{session_id}", "select": "session_state", "limit": "1"},
        )
        r.raise_for_status()
        data = r.json()
        if data and data[0].get("session_state"):
            return data[0]["session_state"]
        return None


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

async def create_or_get_merchant(slug: str, name: str, base_url: str) -> dict:
    """Crea un merchant nuevo o devuelve el existente si el slug ya existe."""
    existing = await get_merchant_by_slug(slug)
    if existing:
        return existing
    async with httpx.AsyncClient() as client:
        r = await client.post(
            rest("merchants"),
            headers={**HEADERS, "Prefer": "return=representation"},
            json={"slug": slug, "name": name, "base_url": base_url, "active": True},
        )
        r.raise_for_status()
        data = r.json()
        return data[0] if data else {}


async def get_latest_scraping_job(merchant_id: str) -> Optional[dict]:
    """Devuelve el último scraping job de un merchant."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            rest("scraping_jobs"),
            headers=HEADERS,
            params={
                "merchant_id": f"eq.{merchant_id}",
                "order": "created_at.desc",
                "limit": "1",
            }
        )
        r.raise_for_status()
        data = r.json()
        return data[0] if data else None


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


async def save_feedback(feedback: dict):
    """Persiste feedback del usuario cuando no encuentra lo que busca."""
    async with httpx.AsyncClient() as client:
        r = await client.post(rest("search_feedback"), headers=HEADERS, json=feedback)
        if r.status_code not in (200, 201):
            print(f"[save_feedback] Error: {r.status_code} {r.text[:200]}")


async def save_search_event(event: dict):
    """Persiste una búsqueda procesada para el dashboard de insights."""
    async with httpx.AsyncClient() as client:
        r = await client.post(rest("search_events"), headers=HEADERS, json=event)
        if r.status_code not in (200, 201):
            print(f"[save_search_event] Error: {r.status_code} {r.text[:200]}")


async def get_search_events(merchant_slug: str, days: int = 30) -> list:
    """Devuelve los search_events de un merchant en los últimos N días."""
    from datetime import datetime, timezone, timedelta
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    async with httpx.AsyncClient() as client:
        r = await client.get(
            rest("search_events"),
            headers=HEADERS,
            params={
                "merchant_slug": f"eq.{merchant_slug}",
                "created_at": f"gte.{since}",
                "order": "created_at.desc",
                "limit": "1000",
            }
        )
        r.raise_for_status()
        return r.json()


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
