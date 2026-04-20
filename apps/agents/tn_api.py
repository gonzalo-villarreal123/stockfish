"""
Tienda Nube (Nuvemshop) API client — STO-14

Covers:
  1. OAuth 2.0 token exchange (authorization_code flow)
  2. Paginated product listing via the official REST API
  3. Normalization of TN product format → Stockfish schema

Environment variables required:
  TN_APP_ID      — numeric app ID from TN Partner Dashboard
  TN_CLIENT_ID   — same as TN_APP_ID (TN uses them interchangeably)
  TN_CLIENT_SECRET
  AGENTS_BASE_URL — public URL of this FastAPI service (for OAuth callback)
"""
import os
import re
import json
import asyncio
import httpx
from typing import Optional

TN_APP_ID      = os.getenv("TN_APP_ID") or os.getenv("TN_CLIENT_ID", "")
TN_CLIENT_ID   = TN_APP_ID
TN_CLIENT_SECRET = os.getenv("TN_CLIENT_SECRET", "")
AGENTS_BASE_URL  = os.getenv("AGENTS_BASE_URL", "https://stockfish-agents.onrender.com")

TN_OAUTH_URL   = "https://www.tiendanube.com/apps/authorize/token"
TN_API_BASE    = "https://api.tiendanube.com/v1"
TN_USER_AGENT  = "Stockfish (hola@stockfish.ar)"

# TN paginates at max 200 products per page
TN_PAGE_SIZE = 200


# ── OAuth ──────────────────────────────────────────────────

def build_install_url(state: str) -> str:
    """
    Returns the TN OAuth authorization URL.
    state = merchant_slug (round-tripped through the callback).
    """
    return (
        f"https://www.tiendanube.com/apps/{TN_APP_ID}/authorize"
        f"?state={state}"
    )


async def exchange_code(code: str) -> dict:
    """
    Exchanges an authorization code for an access token.
    Returns the full token response dict:
      { access_token, token_type, scope, user_id }
    where user_id is the TN numeric store ID.
    Raises httpx.HTTPStatusError on failure.
    """
    payload = {
        "client_id":     TN_CLIENT_ID,
        "client_secret": TN_CLIENT_SECRET,
        "grant_type":    "authorization_code",
        "code":          code,
    }
    async with httpx.AsyncClient() as client:
        r = await client.post(TN_OAUTH_URL, data=payload, timeout=15)
        r.raise_for_status()
        return r.json()


# ── Product fetching ────────────────────────────────────────

def _tn_headers(access_token: str) -> dict:
    return {
        "Authentication": f"bearer {access_token}",
        "User-Agent": TN_USER_AGENT,
        "Content-Type": "application/json",
    }


async def get_all_products(store_id: str, access_token: str) -> list[dict]:
    """
    Fetches all products from a TN store via the official API.
    Handles pagination automatically.
    """
    products = []
    page = 1
    headers = _tn_headers(access_token)
    base = f"{TN_API_BASE}/{store_id}/products"

    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            params = {"per_page": TN_PAGE_SIZE, "page": page}
            r = await client.get(base, headers=headers, params=params)
            r.raise_for_status()
            batch = r.json()
            if not batch:
                break
            products.extend(batch)
            print(f"  [TN API] página {page}: {len(batch)} productos (total: {len(products)})")
            if len(batch) < TN_PAGE_SIZE:
                break
            page += 1
            await asyncio.sleep(0.3)   # be polite

    return products


# ── Normalization ───────────────────────────────────────────

def _es(field) -> str:
    """Extract Spanish value from a TN multilingual field (dict or str)."""
    if isinstance(field, dict):
        return field.get("es") or field.get("pt") or next(iter(field.values()), "") or ""
    return str(field) if field else ""


def _parse_price(price_str) -> float:
    try:
        return float(str(price_str).replace(",", "."))
    except (ValueError, TypeError):
        return 0.0


_DIM_PATTERNS = [
    (r"(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*(?:x\s*(\d+(?:[.,]\d+)?))?\s*cm", "wxh"),
    (r"alto[:\s]+(\d+(?:[.,]\d+)?)\s*cm", "h"),
    (r"ancho[:\s]+(\d+(?:[.,]\d+)?)\s*cm", "w"),
    (r"profundidad[:\s]+(\d+(?:[.,]\d+)?)\s*cm", "d"),
    (r"diámetro[:\s]+(\d+(?:[.,]\d+)?)\s*cm", "w"),
]

_CATEGORY_KEYWORDS = {
    "cuadro":    ["cuadro", "print", "poster", "lámina", "litografía", "fotografía", "arte"],
    "escultura": ["escultura", "figura", "estatua", "objeto decorativo", "pieza"],
    "lampara":   ["lámpara", "luz", "iluminación", "velador", "aplique"],
    "espejo":    ["espejo", "mirror"],
    "florero":   ["florero", "jarrón", "vaso decorativo"],
    "textil":    ["almohadón", "cojín", "manta", "tapiz", "alfombra"],
    "planta":    ["planta", "maceta", "suculenta"],
    "mueble":    ["mesa", "silla", "sillón", "sofá", "estante", "repisa", "cómoda"],
}


def _detect_category(text: str) -> str:
    low = text.lower()
    for cat, kws in _CATEGORY_KEYWORDS.items():
        if any(kw in low for kw in kws):
            return cat
    return "otro"


def _extract_dims(text: str) -> Optional[dict]:
    dims: dict = {}
    for pattern, dim_type in _DIM_PATTERNS:
        m = re.search(pattern, text.lower())
        if m:
            if dim_type == "wxh":
                dims["width_cm"]  = float(m.group(1).replace(",", "."))
                dims["height_cm"] = float(m.group(2).replace(",", "."))
                if m.group(3):
                    dims["depth_cm"] = float(m.group(3).replace(",", "."))
            elif dim_type == "h":
                dims["height_cm"] = float(m.group(1).replace(",", "."))
            elif dim_type == "w":
                dims["width_cm"]  = float(m.group(1).replace(",", "."))
            elif dim_type == "d":
                dims["depth_cm"]  = float(m.group(1).replace(",", "."))
    return dims if dims else None


def normalize_product(raw: dict, merchant_id: str, store_base_url: str) -> Optional[dict]:
    """
    Converts a raw TN API product dict → Stockfish upsert payload.
    Returns None if the product is missing required fields (name, price, image).
    """
    name = _es(raw.get("name", "")).strip()
    if not name:
        return None

    # Price — use first variant's price (TN stores prices in variants)
    price = 0.0
    variants = raw.get("variants") or []
    in_stock = False
    for v in variants:
        p = _parse_price(v.get("price", 0))
        if p > 0 and price == 0:
            price = p
        stock = v.get("stock")
        if stock is None or (isinstance(stock, (int, float)) and stock > 0):
            in_stock = True

    if price == 0:
        return None

    # Images
    images_raw = raw.get("images") or []
    images = [img["src"] for img in images_raw if img.get("src")]
    primary_image = images[0] if images else ""
    if not primary_image:
        return None

    # Description
    desc_raw = _es(raw.get("description", ""))
    # Strip HTML tags from TN description
    description = re.sub(r"<[^>]+>", " ", desc_raw).strip()[:1000]

    # External ID
    external_id = str(raw.get("id", ""))

    # Product URL — prefer canonical_url (TN's authoritative source, handles
    # /productos vs /tienda path variation); fall back to constructing from handle.
    url = raw.get("canonical_url", "").strip()
    if not url:
        handle = _es(raw.get("handle", ""))
        if handle:
            url = f"{store_base_url.rstrip('/')}/productos/{handle}"

    # Category + dimensions
    full_text = f"{name} {description}"
    category = _detect_category(full_text)
    dims = _extract_dims(full_text)

    return {
        "external_id":   external_id,
        "name":          name,
        "description":   description or None,
        "price":         price,
        "primary_image": primary_image,
        "images":        json.dumps(images[:10]),
        "url":           url,
        "category":      category,
        "in_stock":      in_stock,
        "attributes":    json.dumps({}),
        "dimensions":    json.dumps(dims) if dims else None,
    }
