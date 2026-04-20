"""
API FastAPI de Stockfish.
Flujo: intake → clarificación visual (chips + slider) → combo search → swap
"""
import os
import re
import uuid
import json
import subprocess
import anthropic
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from dotenv import load_dotenv
from graph import run_intake, run_combo_search, swap_product, generic_search_by_category, analyze_image
from db import create_session, upsert_session, get_session, update_session, get_session_by_token, get_product_categories, get_merchant_by_slug, save_search_event, persist_session_state, load_session_state
from tn_router import router as tn_router
from scraper import ALL_MERCHANTS

load_dotenv()

app = FastAPI(title="Stockfish API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tn_router)

anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ── Agrupamiento de categorías ─────────────────────────────

CATEGORY_GROUPS = {
    "muebles":     {"label": "Muebles",     "emoji": "🛋️",  "slugs": ["mueble"]},
    "textiles":    {"label": "Textiles",    "emoji": "🧶",  "slugs": ["textil"]},
    "iluminacion": {"label": "Iluminación", "emoji": "💡",  "slugs": ["lampara"]},
    "arte":        {"label": "Arte",        "emoji": "🖼️",  "slugs": ["cuadro"]},
    "decoracion":  {"label": "Decoración",  "emoji": "🌿",  "slugs": ["florero", "escultura", "espejo", "planta"]},
}

# Cache de grupos disponibles (se refresca al inicio)
_available_groups_cache: Optional[List[str]] = None

# Cache de merchants slug → id
_merchant_id_cache: Dict[str, str] = {}

async def get_session_state(session_id: str) -> dict:
    """Devuelve el estado de sesión: primero desde memoria, luego desde Supabase."""
    if session_id in _sessions:
        return _sessions[session_id]
    state = await load_session_state(session_id)
    if state:
        _sessions[session_id] = state  # restaurar en memoria
        print(f"[Session] Restaurada desde Supabase: {session_id[:8]}")
    return state or {}


async def set_session_state(session_id: str, state: dict):
    """Guarda el estado en memoria y dispara la persistencia a Supabase en background."""
    import asyncio
    _sessions[session_id] = state
    asyncio.create_task(persist_session_state(session_id, state))


async def resolve_merchant_id(slug: str) -> Optional[str]:
    """Resuelve un merchant slug a su UUID. Cachea el resultado."""
    if slug in _merchant_id_cache:
        return _merchant_id_cache[slug]
    merchant = await get_merchant_by_slug(slug)
    if merchant:
        _merchant_id_cache[slug] = merchant["id"]
        return merchant["id"]
    return None


async def get_available_groups() -> List[str]:
    """Devuelve los group IDs que tienen al menos una categoría con stock."""
    global _available_groups_cache
    if _available_groups_cache is not None:
        return _available_groups_cache
    try:
        slugs_with_stock = set(await get_product_categories())
        available = []
        for group_id, group in CATEGORY_GROUPS.items():
            if any(slug in slugs_with_stock for slug in group["slugs"]):
                available.append(group_id)
        _available_groups_cache = available
    except Exception:
        # Fallback: todos los grupos
        _available_groups_cache = list(CATEGORY_GROUPS.keys())
    return _available_groups_cache


# ── Sesiones en memoria ────────────────────────────────────
_sessions: Dict[str, dict] = {}

# Keywords por grupo para detección rápida en Python
GROUP_KEYWORDS = {
    "muebles":     ["mueble", "sillón", "sillon", "sofa", "sofá", "mesa", "silla", "escritorio", "cama", "placard", "estante", "rack", "biblioteca"],
    "textiles":    ["textil", "alfombra", "almohadón", "almohada", "cortina", "manta", "frazada", "cubrecama"],
    "iluminacion": ["lámpara", "lampara", "iluminación", "iluminacion", "luz", "velador", "aplique", "araña"],
    "arte":        ["cuadro", "arte", "pintura", "ilustración", "ilustracion", "fotografía", "fotografia", "lámina", "lamina", "poster"],
    "decoracion":  ["florero", "jarrón", "jarron", "escultura", "figura", "espejo", "planta", "vela", "decoración", "decoracion", "accesorio"],
}

def detect_groups_from_text(text: str) -> List[str]:
    """Detecta grupos de categorías mencionados explícitamente en el texto.
    Usa word boundaries para evitar falsos positivos (ej: 'vela' en 'velador')."""
    text_lower = text.lower()
    found = []
    for group_id, keywords in GROUP_KEYWORDS.items():
        if any(re.search(r'\b' + re.escape(kw) + r'\b', text_lower) for kw in keywords):
            found.append(group_id)
    return found


# ── Schemas ────────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    merchant_slug: Optional[str] = None
    image_base64: Optional[str] = None
    image_media_type: Optional[str] = "image/jpeg"


class ClarifyRequest(BaseModel):
    session_id: str
    selected_groups: List[str]
    budget_total: Optional[float] = None
    merchant_slug: Optional[str] = None


class SwapRequest(BaseModel):
    session_id: str
    category: str
    excluded_ids: List[str]
    budget_max: Optional[float] = None
    merchant_slug: Optional[str] = None
    swap_mode: Optional[str] = "product"
    current_product_name: Optional[str] = None


class FeedbackRequest(BaseModel):
    session_id: Optional[str] = None
    category: str
    text: str


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    combo: Dict[str, dict] = {}
    step: str          # "clarifying" | "interactive" | "error"
    status: str
    context: dict = {}
    share_token: Optional[str] = None


class SwapResponse(BaseModel):
    product: Optional[dict]


# ── Helpers ────────────────────────────────────────────────

def expand_groups_to_slugs(group_ids: List[str]) -> List[str]:
    slugs = []
    for gid in group_ids:
        group = CATEGORY_GROUPS.get(gid)
        if group:
            slugs.extend(group["slugs"])
    return slugs


def build_combo_reply(combo: dict, style_tags: list) -> str:
    style = ", ".join(style_tags) if style_tags else "lo que buscás"
    found = [cat for cat, data in combo.items() if not data.get("no_stock")]
    no_stock = [cat for cat, data in combo.items() if data.get("no_stock")]

    parts = [f"Armé tu combo **{style}** con {len(found)} categoría(s):"]

    from graph import CATEGORY_LABELS
    for cat in found:
        product = combo[cat]["best"]
        label = CATEGORY_LABELS.get(cat, cat)
        price = f"${product['price']:,.0f}" if product.get("price") else ""
        parts.append(f"• **{label}**: {product['name']} {price}")

    if no_stock:
        from graph import CATEGORY_LABELS
        no_stock_labels = [CATEGORY_LABELS.get(c, c) for c in no_stock]
        parts.append(f"\n⚠️ Sin stock por ahora: {', '.join(no_stock_labels)}")

    parts.append("\n¿Querés cambiar algún producto? Usá el botón **Cambiar** en cualquier card.")
    return "\n".join(parts)


# ── Endpoints ──────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "stockfish-agents", "version": "3.0.0"}


@app.get("/categories")
async def categories():
    """Devuelve los grupos de categorías disponibles con stock."""
    available = await get_available_groups()
    return [
        {"id": gid, **{k: v for k, v in CATEGORY_GROUPS[gid].items() if k != "slugs"}}
        for gid in available
    ]


@app.post("/chat", response_model=ChatResponse)
async def chat(body: ChatMessage):
    """
    Paso 1: intake. Extrae estilo y devuelve los grupos disponibles para que
    el frontend muestre los chips de selección.
    Acepta texto, imagen (base64) o ambos.
    """
    session_id = body.session_id or str(uuid.uuid4())
    session = await get_session_state(session_id)
    step = session.get("step", "intake")

    # Resolver merchant_slug → id
    merchant_id = None
    if body.merchant_slug:
        merchant_id = await resolve_merchant_id(body.merchant_slug)

    # Si hay imagen, analizarla con Claude Vision y usarla como mensaje
    user_message = body.message
    if body.image_base64:
        image_description = analyze_image(body.image_base64, body.image_media_type or "image/jpeg")
        if user_message.strip():
            user_message = f"{image_description}. Además: {user_message}"
        else:
            user_message = image_description

    # Si ya tiene sesión activa y escribe algo nuevo → resetear
    if step == "interactive":
        session = {}
        step = "intake"

    if step == "intake" or step == "awaiting_clarification":
        intake_result = await run_intake(session_id, user_message)
        available_groups = await get_available_groups()
        claude_groups = intake_result.get("category_groups", [])
        keyword_groups = detect_groups_from_text(user_message)
        raw_detected = list(set(claude_groups) | set(keyword_groups))
        detected_groups = [
            g for g in raw_detected
            if g in CATEGORY_GROUPS and g in available_groups
        ]

        await set_session_state(session_id, {
            "step": "awaiting_clarification",
            "raw_intent": user_message,
            "style_keywords": intake_result.get("style_keywords", []),
            "style_tags": intake_result.get("style_tags", []),
            "budget_total": intake_result.get("budget_total"),
            "pre_selected_groups": detected_groups,
            "merchant_id": merchant_id,
            "merchant_slug": body.merchant_slug,
        })

        style_tags = intake_result.get("style_tags", [])
        style_keywords = intake_result.get("style_keywords", [])
        style = ", ".join(style_tags) if style_tags else (", ".join(style_keywords[:2]) if style_keywords else None)

        if detected_groups:
            group_labels = " y ".join(CATEGORY_GROUPS[g]["label"] for g in detected_groups)
            if style:
                reply = f"¡Perfecto! Busco **{group_labels}** con el estilo que describiste.\n\n¿Tenés un presupuesto en mente?"
            else:
                reply = f"¡Perfecto! Busco **{group_labels}** para vos.\n\n¿Tenés un presupuesto en mente?"
            return ChatResponse(
                session_id=session_id,
                reply=reply,
                step="budget_only",
                status="clarifying",
                context={
                    "style_keywords": intake_result.get("style_keywords", []),
                    "style_tags": intake_result.get("style_tags", []),
                    "budget_total": intake_result.get("budget_total"),
                    "pre_selected_groups": detected_groups,
                }
            )

        reply = f"¡Perfecto! Capturo un estilo **{style}**.\n\nElegí qué categorías querés incluir en tu combo:"
        return ChatResponse(
            session_id=session_id,
            reply=reply,
            step="clarifying",
            status="clarifying",
            context={
                "style_keywords": intake_result.get("style_keywords", []),
                "style_tags": intake_result.get("style_tags", []),
                "budget_total": intake_result.get("budget_total"),
                "available_groups": available_groups,
            }
        )

    return ChatResponse(
        session_id=session_id,
        reply="Contame qué estilo de decoración estás buscando.",
        step="clarifying",
        status="clarifying",
        context={}
    )


@app.post("/clarify", response_model=ChatResponse)
async def clarify(body: ClarifyRequest):
    """
    Paso 2: recibe categorías seleccionadas + presupuesto (desde los widgets)
    y ejecuta el combo search.
    """
    session = await get_session_state(body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada. Iniciá una nueva búsqueda.")

    categories = expand_groups_to_slugs(body.selected_groups)
    if not categories:
        raise HTTPException(status_code=400, detail="Seleccioná al menos una categoría.")

    budget = body.budget_total or session.get("budget_total")

    merchant_id = session.get("merchant_id")
    if not merchant_id and body.merchant_slug:
        merchant_id = await resolve_merchant_id(body.merchant_slug)

    combo_result = await run_combo_search(
        session_id=body.session_id,
        raw_intent=session["raw_intent"],
        style_keywords=session["style_keywords"],
        style_tags=session["style_tags"],
        selected_categories=categories,
        budget_total=budget,
        merchant_id=merchant_id,
    )

    if combo_result.get("status") == "error":
        error_detail = combo_result.get("error", "Error desconocido")
        print(f"[Clarify] Error en combo search: {error_detail}")
        return ChatResponse(
            session_id=body.session_id,
            reply=f"Error interno: {error_detail}",
            step="error",
            status="error",
        )

    combo = combo_result.get("combo", {})

    await set_session_state(body.session_id, {
        **session,
        "step": "interactive",
        "selected_categories": categories,
        "budget_total": budget,
        "combo": combo,
    })

    # Guardar search event para insights
    try:
        no_stock_cats = [cat for cat, data in combo.items() if data.get("no_stock")]
        results_count = len([cat for cat, data in combo.items() if not data.get("no_stock")])
        await save_search_event({
            "merchant_slug": body.merchant_slug or session.get("merchant_slug"),
            "merchant_id": str(merchant_id) if merchant_id else None,
            "session_id": body.session_id,
            "query": session.get("raw_intent", ""),
            "categories": categories,
            "category_groups": body.selected_groups,
            "budget_total": budget,
            "results_count": results_count,
            "no_stock_categories": no_stock_cats,
        })
    except Exception as e:
        print(f"[clarify] No se pudo guardar search_event: {e}")

    # Persist combo to Supabase so it can be shared via share_token
    share_token = None
    try:
        db_session = await upsert_session({
            "id": body.session_id,
            "status": "interactive",
            "style_intent": {
                "style_keywords": session.get("style_keywords", []),
                "style_tags": session.get("style_tags", []),
                "budget_total": budget,
            },
            "current_render": combo,
        })
        share_token = db_session.get("share_token")
    except Exception as e:
        print(f"[Clarify] No se pudo persistir sesión: {e}")

    reply = build_combo_reply(combo, session.get("style_tags", []))
    return ChatResponse(
        session_id=body.session_id,
        reply=reply,
        combo=combo,
        step="interactive",
        status="interactive",
        context={
            "style_keywords": session.get("style_keywords", []),
            "style_tags": session.get("style_tags", []),
            "budget_total": budget,
        },
        share_token=share_token,
    )


@app.post("/swap", response_model=SwapResponse)
async def swap(body: SwapRequest):
    """Reemplaza el producto de una categoría por la siguiente mejor opción."""
    session = await get_session_state(body.session_id)
    style_keywords = session.get("style_keywords", [])
    style_tags = session.get("style_tags", [])

    merchant_id = session.get("merchant_id")
    if not merchant_id and body.merchant_slug:
        merchant_id = await resolve_merchant_id(body.merchant_slug)

    product = await swap_product(
        style_keywords=style_keywords,
        style_tags=style_tags,
        category=body.category,
        excluded_ids=body.excluded_ids,
        budget_max=body.budget_max,
        merchant_id=merchant_id,
        swap_mode=body.swap_mode or "product",
        current_product_name=body.current_product_name,
    )

    # Fallback genérico solo para modo "product" (no para "color": sin variantes = None)
    if not product and (body.swap_mode or "product") == "product":
        product = await generic_search_by_category(
            category=body.category,
            excluded_ids=body.excluded_ids,
            budget_max=body.budget_max,
            merchant_id=merchant_id,
        )

    if product and "combo" in session:
        session["combo"][body.category] = {
            "best": product,
            "alternative": None,
            "no_stock": False,
        }
        await set_session_state(body.session_id, session)

    return SwapResponse(product=product)


class TrackEvent(BaseModel):
    event: str
    session_id: Optional[str] = None
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    product_url: Optional[str] = None
    price: Optional[float] = None
    merchant_slug: Optional[str] = None


@app.post("/track")
async def track(body: TrackEvent):
    """Registra eventos de conversión (add_to_cart, view, etc.) para reportes de atribución."""
    print(f"[Track] {body.event} | merchant={body.merchant_slug} | product={body.product_name} | ${body.price} | session={body.session_id}")
    # TODO: persistir en Supabase (tabla conversion_events)
    return {"ok": True}


@app.post("/feedback")
async def feedback(body: FeedbackRequest):
    """Recibe feedback del usuario cuando no encuentra lo que busca en una categoría."""
    from graph import CATEGORY_LABELS
    label = CATEGORY_LABELS.get(body.category, body.category)
    print(f"[Feedback] Categoría: {label} | Texto: {body.text} | Sesión: {body.session_id}")
    # TODO: persistir en Supabase (tabla search_feedback)
    return {"ok": True}


@app.get("/session/{session_id}")
async def get_session_endpoint(session_id: str):
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return session


@app.post("/scrape/{merchant_slug}")
async def trigger_scrape(merchant_slug: str, background_tasks: BackgroundTasks, limit: Optional[int] = None):
    """
    Lanza el scraper HTML (playwright) para un merchant en segundo plano.
    Requiere que el entorno tenga playwright instalado con los browsers.
    Útil para workers Render separados o entornos locales.
    """
    if merchant_slug not in ALL_MERCHANTS:
        raise HTTPException(status_code=404, detail=f"Merchant '{merchant_slug}' no registrado. Opciones: {ALL_MERCHANTS}")

    # Verificar que el merchant exista en la DB
    m = await get_merchant_by_slug(merchant_slug)
    if not m:
        raise HTTPException(status_code=404, detail=f"Merchant '{merchant_slug}' no encontrado en la base de datos")

    def _run_scraper():
        cmd = ["python", "scraper.py", "--merchant", merchant_slug]
        if limit:
            cmd += ["--limit", str(limit)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"[scrape] Error en {merchant_slug}: {result.stderr[:500]}")
        else:
            print(f"[scrape] Completado {merchant_slug}: {result.stdout[-200:]}")

    background_tasks.add_task(_run_scraper)
    return {"ok": True, "merchant": merchant_slug, "message": "Scraping iniciado en segundo plano"}


@app.post("/scrape")
async def trigger_scrape_all(background_tasks: BackgroundTasks, limit: Optional[int] = None):
    """Lanza el scraper para TODOS los merchants registrados en secuencia."""
    def _run_all():
        for slug in ALL_MERCHANTS:
            cmd = ["python", "scraper.py", "--merchant", slug]
            if limit:
                cmd += ["--limit", str(limit)]
            result = subprocess.run(cmd, capture_output=True, text=True)
            status = "OK" if result.returncode == 0 else "ERR"
            print(f"[scrape-all] {slug}: {status}")

    background_tasks.add_task(_run_all)
    return {"ok": True, "merchants": ALL_MERCHANTS, "message": f"Scraping de {len(ALL_MERCHANTS)} tiendas iniciado en segundo plano"}


@app.get("/merchants")
async def list_merchants():
    """Lista todos los merchants registrados con conteo de productos."""
    import httpx
    SUPABASE_URL = os.getenv("SUPABASE_REST_URL") or os.getenv("SUPABASE_PROJECT_URL") or os.getenv("SUPABASE_URL", "")
    KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{SUPABASE_URL}/rest/v1/merchants", headers=H,
                        params={"select": "slug,name,base_url,active", "order": "created_at.asc"})
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Error consultando merchants")
        merchants = r.json()
        r2 = await c.get(f"{SUPABASE_URL}/rest/v1/products", headers=H,
                         params={"select": "merchants!inner(slug),in_stock", "limit": "5000"})
        from collections import Counter
        all_products = r2.json()
        counts = Counter(p["merchants"]["slug"] for p in all_products)
        stock_counts = Counter(p["merchants"]["slug"] for p in all_products if p["in_stock"])
    return [
        {**m, "product_count": counts.get(m["slug"], 0), "in_stock_count": stock_counts.get(m["slug"], 0)}
        for m in merchants
    ]


@app.get("/share/{share_token}")
async def get_shared_session(share_token: str):
    session = await get_session_by_token(share_token)
    if not session:
        raise HTTPException(status_code=404, detail="Diseño no encontrado")
    return session
