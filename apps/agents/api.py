"""
API FastAPI de Stockfish.
Flujo: intake → clarificación → combo search → swap
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
from graph import (
    run_intake, run_combo_search, swap_product,
    CATEGORY_LABELS, run_design_session
)
from db import create_session, get_session, update_session, get_session_by_token

load_dotenv()

app = FastAPI(title="Stockfish API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ── Sesiones en memoria ────────────────────────────────────
# { session_id: { step, raw_intent, style_keywords, style_tags, budget_total, combo, selected_categories } }
_sessions: Dict[str, dict] = {}


# ── Schemas ────────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


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
    context: dict = {} # keywords/tags/budget para el cliente


class SwapResponse(BaseModel):
    product: Optional[dict]


# ── Helpers ────────────────────────────────────────────────

def build_clarification_question(intake_result: dict) -> str:
    style = ", ".join(intake_result.get("style_tags", [])) or "tu estilo"
    budget = intake_result.get("budget_total")

    categories_list = "\n".join(
        f"• {label} ({slug})" for slug, label in CATEGORY_LABELS.items()
    )

    budget_line = (
        f"Detecté un presupuesto de **${budget:,.0f} ARS**. ¿Es correcto?"
        if budget
        else "¿Tenés un presupuesto total en mente? (por ejemplo: *500.000 ARS* o *1 millón*)"
    )

    return (
        f"¡Perfecto! Capturo un estilo **{style}**.\n\n"
        f"Para armar tu combo personalizado, elegí las categorías que querés incluir:\n\n"
        f"{categories_list}\n\n"
        f"Podés escribir algo como: *«mueble, lámpara y textil»* o *«quiero todo»*.\n\n"
        f"{budget_line}"
    )


async def parse_clarification(message: str) -> dict:
    """Usa Claude para extraer categorías y presupuesto del mensaje de clarificación."""
    slugs = list(CATEGORY_LABELS.keys())
    prompt = f"""El usuario está eligiendo categorías de decoración y presupuesto.

Mensaje: "{message}"

Slugs disponibles: {', '.join(slugs)}

Respondé ÚNICAMENTE con JSON válido:
{{
  "categories": ["slugs elegidos de la lista"],
  "budget": null
}}

Reglas:
- Si dice "todo" o "todas", incluí todos los slugs disponibles
- budget: número en ARS si menciona presupuesto, null si no
- Solo devolvé el JSON, sin texto adicional"""

    try:
        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )
        return json.loads(response.content[0].text.strip())
    except Exception:
        # Fallback: keyword matching
        msg = message.lower()
        categories = []
        for slug in slugs:
            label = CATEGORY_LABELS[slug].lower()
            if slug in msg or label in msg:
                categories.append(slug)
        if not categories or "todo" in msg or "todas" in msg:
            categories = slugs
        return {"categories": categories, "budget": None}


def build_combo_reply(combo: dict, style_tags: list) -> str:
    style = ", ".join(style_tags) if style_tags else "tu estilo"
    found = [cat for cat, data in combo.items() if not data.get("no_stock")]
    no_stock = [cat for cat, data in combo.items() if data.get("no_stock")]

    parts = [f"Armé tu combo **{style}** con {len(found)} categoría(s):"]

    for cat in found:
        product = combo[cat]["best"]
        label = CATEGORY_LABELS.get(cat, cat)
        price = f"${product['price']:,.0f}" if product.get("price") else ""
        parts.append(f"• **{label}**: {product['name']} {price}")

    if no_stock:
        no_stock_labels = [CATEGORY_LABELS.get(c, c) for c in no_stock]
        parts.append(f"\n⚠️ Sin stock por ahora: {', '.join(no_stock_labels)}")

    parts.append("\n¿Querés cambiar algún producto? Podés pedir un *swap* en cualquier categoría.")
    return "\n".join(parts)


# ── Endpoints ──────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "stockfish-agents", "version": "2.0.0"}


@app.post("/chat", response_model=ChatResponse)
async def chat(body: ChatMessage):
    """
    Endpoint principal del chat. Maneja el flujo multi-paso:
    intake → clarificación → combo search
    """
    session_id = body.session_id or str(uuid.uuid4())
    session = _sessions.get(session_id, {})
    step = session.get("step", "intake")

    # ── Paso 1: Intake ─────────────────────────────────────
    if step == "intake":
        intake_result = await run_intake(session_id, body.message)

        _sessions[session_id] = {
            "step": "awaiting_clarification",
            "raw_intent": body.message,
            "style_keywords": intake_result.get("style_keywords", []),
            "style_tags": intake_result.get("style_tags", []),
            "budget_total": intake_result.get("budget_total"),
        }

        reply = build_clarification_question(intake_result)
        return ChatResponse(
            session_id=session_id,
            reply=reply,
            step="clarifying",
            status="clarifying",
            context={
                "style_keywords": intake_result.get("style_keywords", []),
                "style_tags": intake_result.get("style_tags", []),
                "budget_total": intake_result.get("budget_total"),
            }
        )

    # ── Paso 2: Clarificación → Combo Search ───────────────
    elif step == "awaiting_clarification":
        parsed = await parse_clarification(body.message)
        categories = parsed.get("categories") or list(CATEGORY_LABELS.keys())
        budget = parsed.get("budget") or session.get("budget_total")

        combo_result = await run_combo_search(
            session_id=session_id,
            raw_intent=session["raw_intent"],
            style_keywords=session["style_keywords"],
            style_tags=session["style_tags"],
            selected_categories=categories,
            budget_total=budget,
        )

        if combo_result.get("status") == "error":
            return ChatResponse(
                session_id=session_id,
                reply="Hubo un error buscando productos. Intentá de nuevo.",
                step="error",
                status="error",
            )

        combo = combo_result.get("combo", {})
        _sessions[session_id] = {
            **session,
            "step": "interactive",
            "selected_categories": categories,
            "budget_total": budget,
            "combo": combo,
        }

        reply = build_combo_reply(combo, session.get("style_tags", []))
        return ChatResponse(
            session_id=session_id,
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

    # ── Paso 3: Interactivo → nueva búsqueda si el usuario escribe ─
    else:
        # El usuario ya tiene su combo y escribe algo nuevo → reset
        _sessions[session_id] = {}
        new_intake = await run_intake(session_id, body.message)

        _sessions[session_id] = {
            "step": "awaiting_clarification",
            "raw_intent": body.message,
            "style_keywords": new_intake.get("style_keywords", []),
            "style_tags": new_intake.get("style_tags", []),
            "budget_total": new_intake.get("budget_total"),
        }

        reply = build_clarification_question(new_intake)
        return ChatResponse(
            session_id=session_id,
            reply=reply,
            step="clarifying",
            status="clarifying",
            context={
                "style_keywords": new_intake.get("style_keywords", []),
                "style_tags": new_intake.get("style_tags", []),
                "budget_total": new_intake.get("budget_total"),
            }
        )


@app.post("/swap", response_model=SwapResponse)
async def swap(body: SwapRequest):
    """
    Reemplaza el producto de una categoría por la siguiente mejor opción,
    excluyendo los IDs ya mostrados.
    """
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

    # Actualizar combo en sesión
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
