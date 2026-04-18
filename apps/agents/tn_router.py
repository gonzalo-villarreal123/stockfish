"""
Tienda Nube OAuth + sync endpoints — STO-14

Routes (mounted at /tn in api.py):
  GET  /tn/install?merchant=garbo
       → redirects merchant browser to TN OAuth consent screen

  GET  /tn/callback?code=XXX&state=garbo
       → exchanges code for token, saves credentials, triggers initial sync
       → used as the "redirect_uri" registered in TN Partner Dashboard

  POST /tn/sync/{merchant_slug}
       → pulls all products via TN API and upserts them (idempotent)
       → run manually or from a cron job

  GET  /tn/status/{merchant_slug}
       → returns OAuth status + last sync info for a merchant
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import RedirectResponse
from typing import Optional

from tn_api import build_install_url, exchange_code, get_all_products, normalize_product
from db import (
    get_merchant_by_slug,
    save_tn_credentials,
    get_tn_credentials,
    upsert_product,
    create_scraping_job,
    update_scraping_job,
)
from datetime import datetime

router = APIRouter(prefix="/tn", tags=["tiendanube"])


# ── Install ────────────────────────────────────────────────

@router.get("/install")
async def install(merchant: str):
    """
    Start the TN OAuth flow for a merchant.
    The `merchant` param is the Stockfish slug (e.g. 'garbo').
    We use it as the OAuth state so the callback knows which merchant to update.
    """
    m = await get_merchant_by_slug(merchant)
    if not m:
        raise HTTPException(status_code=404, detail=f"Merchant '{merchant}' no encontrado")

    url = build_install_url(state=merchant)
    return RedirectResponse(url=url)


# ── Callback ───────────────────────────────────────────────

@router.get("/callback")
async def callback(
    code: str,
    state: Optional[str] = None,   # merchant slug we passed as state
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """
    TN redirects here after the merchant approves the app.
    We exchange the code for a token and kick off the first product sync.
    """
    merchant_slug = state
    if not merchant_slug:
        raise HTTPException(status_code=400, detail="OAuth state (merchant slug) faltante")

    m = await get_merchant_by_slug(merchant_slug)
    if not m:
        raise HTTPException(status_code=404, detail=f"Merchant '{merchant_slug}' no encontrado")

    # Exchange authorization code → access token
    try:
        token_data = await exchange_code(code)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al intercambiar código TN: {e}")

    access_token = token_data.get("access_token")
    store_id     = str(token_data.get("user_id", ""))
    scope        = token_data.get("scope", "")

    if not access_token or not store_id:
        raise HTTPException(status_code=502, detail="Respuesta de token TN incompleta")

    # Persist credentials
    await save_tn_credentials(
        merchant_id=m["id"],
        store_id=store_id,
        access_token=access_token,
        scope=scope,
    )

    # Kick off first sync in the background so we can respond immediately
    background_tasks.add_task(_run_sync, merchant_slug=merchant_slug)

    return {
        "ok": True,
        "merchant": merchant_slug,
        "tn_store_id": store_id,
        "scope": scope,
        "message": "Credenciales guardadas. Sincronización de productos iniciada en segundo plano.",
    }


# ── Sync ───────────────────────────────────────────────────

@router.post("/sync/{merchant_slug}")
async def sync(merchant_slug: str, background_tasks: BackgroundTasks):
    """
    Manually trigger a full product sync for a TN-authorized merchant.
    Idempotent — safe to call multiple times.
    """
    creds = await get_tn_credentials(merchant_slug)
    if not creds:
        raise HTTPException(
            status_code=409,
            detail=f"'{merchant_slug}' no tiene credenciales TN. Completar OAuth primero (/tn/install?merchant={merchant_slug})"
        )

    background_tasks.add_task(_run_sync, merchant_slug=merchant_slug)
    return {"ok": True, "merchant": merchant_slug, "message": "Sincronización iniciada en segundo plano"}


async def _run_sync(merchant_slug: str):
    """
    Core sync logic: pull all TN products → normalize → upsert into Supabase.
    Runs inside a background task.
    """
    creds = await get_tn_credentials(merchant_slug)
    if not creds:
        print(f"[TN sync] No hay credenciales para '{merchant_slug}'")
        return

    merchant_id   = creds["merchant_id"]
    store_id      = creds["tn_store_id"]
    access_token  = creds["tn_access_token"]
    base_url      = creds["base_url"]

    job = await create_scraping_job(merchant_id)
    job_id = job.get("id")
    await update_scraping_job(job_id, {"status": "running", "started_at": datetime.now().isoformat()})

    print(f"\n[TN sync] Iniciando para '{merchant_slug}' (store_id={store_id})")

    found = 0
    added = 0

    try:
        raw_products = await get_all_products(store_id, access_token)
        found = len(raw_products)
        print(f"[TN sync] {found} productos obtenidos de la API")

        for raw in raw_products:
            normalized = normalize_product(raw, merchant_id, base_url)
            if normalized:
                try:
                    await upsert_product(merchant_id, normalized)
                    added += 1
                except Exception as e:
                    print(f"  [TN sync] Error upsert producto {raw.get('id')}: {e}")
            else:
                print(f"  [TN sync] Producto {raw.get('id')} omitido (sin nombre/precio/imagen)")

    except Exception as e:
        print(f"[TN sync] Error fatal: {e}")
        await update_scraping_job(job_id, {
            "status": "failed",
            "error_message": str(e),
            "completed_at": datetime.now().isoformat(),
        })
        return

    await update_scraping_job(job_id, {
        "status": "completed",
        "products_found": found,
        "products_added": added,
        "completed_at": datetime.now().isoformat(),
    })
    print(f"[TN sync] ✅ '{merchant_slug}': {added}/{found} productos guardados")


# ── Status ─────────────────────────────────────────────────

@router.get("/status/{merchant_slug}")
async def status(merchant_slug: str):
    """Returns OAuth + last sync status for a merchant."""
    m = await get_merchant_by_slug(merchant_slug)
    if not m:
        raise HTTPException(status_code=404, detail=f"Merchant '{merchant_slug}' no encontrado")

    creds = await get_tn_credentials(merchant_slug)
    authorized = creds is not None
    return {
        "merchant": merchant_slug,
        "authorized": authorized,
        "tn_store_id": creds["tn_store_id"] if authorized else None,
        "scope": creds["tn_scope"] if authorized else None,
    }
