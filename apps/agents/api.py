"""
API FastAPI de Stockfish.
Flujo: intake → clarificación visual (chips + slider) → combo search → swap
"""
import os
import uuid
import json
import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from dotenv import load_dotenv
from graph import run_intake, run_combo_search, swap_product, generic_search_by_category
from db import create_session, get_session, update_session, get_session_by_token, get_product_categories

load_dotenv()

app = FastAPI(title="Stockfish API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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


# ── Schemas ────────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


class ClarifyRequest(BaseModel):
    session_id: str
    selected_groups: List[str]
    budget_total: Optional[float] = None


class SwapRequest(BaseModel):
    session_id: str
    category: str
    excluded_ids: List[str]
    budget_max: Optional[float] = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    combo: Dict[str, dict] = {}
    step: str          # "clarifying" | "interactive" | "error"
    status: str
    context: dict = {}


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
    style = ", ".join(style_tags) if style_tags else "tu estilo"
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
    return {"status": "ok", "service": "stockfish-agents", "version": "2.1.0"}


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
    """
    session_id = body.session_id or str(uuid.uuid4())
    session = _sessions.get(session_id, {})
    step = session.get("step", "intake")

    # Si ya tiene sesión activa y escribe algo nuevo → resetear
    if step == "interactive":
        session = {}
        step = "intake"

    if step == "intake" or step == "awaiting_clarification":
        intake_result = await run_intake(session_id, body.message)
        available_groups = await get_available_groups()

        _sessions[session_id] = {
            "step": "awaiting_clarification",
            "raw_intent": body.message,
            "style_keywords": intake_result.get("style_keywords", []),
            "style_tags": intake_result.get("style_tags", []),
            "budget_total": intake_result.get("budget_total"),
        }

        style = ", ".join(intake_result.get("style_tags", [])) or "tu estilo"
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
    session = _sessions.get(body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada. Iniciá una nueva búsqueda.")

    categories = expand_groups_to_slugs(body.selected_groups)
    if not categories:
        raise HTTPException(status_code=400, detail="Seleccioná al menos una categoría.")

    budget = body.budget_total or session.get("budget_total")

    combo_result = await run_combo_search(
        session_id=body.session_id,
        raw_intent=session["raw_intent"],
        style_keywords=session["style_keywords"],
        style_tags=session["style_tags"],
        selected_categories=categories,
        budget_total=budget,
    )

    if combo_result.get("status") == "error":
        return ChatResponse(
            session_id=body.session_id,
            reply="Hubo un error buscando productos. Intentá de nuevo.",
            step="error",
            status="error",
        )

    combo = combo_result.get("combo", {})

    _sessions[body.session_id] = {
        **session,
        "step": "interactive",
        "selected_categories": categories,
        "budget_total": budget,
        "combo": combo,
    }

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
        }
    )


@app.post("/swap", response_model=SwapResponse)
async def swap(body: SwapRequest):
    """Reemplaza el producto de una categoría por la siguiente mejor opción."""
    session = _sessions.get(body.session_id, {})
    style_keywords = session.get("style_keywords", [])
    style_tags = session.get("style_tags", [])

    product = await swap_product(
        style_keywords=style_keywords,
        style_tags=style_tags,
        category=body.category,
        excluded_ids=body.excluded_ids,
        budget_max=body.budget_max,
    )

    # Fallback genérico si no hay resultado con el estilo
    if not product:
        product = await generic_search_by_category(
            category=body.category,
            excluded_ids=body.excluded_ids,
            budget_max=body.budget_max,
        )

    if product and "combo" in session:
        session["combo"][body.category] = {
            "best": product,
            "alternative": None,
            "no_stock": False,
        }
        _sessions[body.session_id] = session

    return SwapResponse(product=product)


@app.get("/session/{session_id}")
async def get_session_endpoint(session_id: str):
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return session


@app.get("/share/{share_token}")
async def get_shared_session(share_token: str):
    session = await get_session_by_token(share_token)
    if not session:
        raise HTTPException(status_code=404, detail="Diseño no encontrado")
    return session
