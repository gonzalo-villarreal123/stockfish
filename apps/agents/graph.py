"""
Grafo LangGraph principal de Stockfish.
Flujo v2: intake → clarificación → combo por categoría → swap
"""
import os
import json
import voyageai
from typing import TypedDict, Optional, List, Dict
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
import anthropic
import httpx

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_REST_URL") or os.getenv("SUPABASE_PROJECT_URL", "https://malbjvnmqhdalttcvroi.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
VOYAGE_API_KEY = os.getenv("VOYAGE_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

voyage_client = voyageai.Client(api_key=VOYAGE_API_KEY)
anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# ── Categorías disponibles ──────────────────────────────────

CATEGORY_LABELS = {
    "mueble":    "Muebles",
    "textil":    "Textiles",
    "lampara":   "Iluminación",
    "cuadro":    "Arte y cuadros",
    "florero":   "Decoración",
    "escultura": "Esculturas",
    "espejo":    "Espejos",
    "planta":    "Plantas",
}

# Peso relativo de cada categoría para distribuir el presupuesto
BUDGET_WEIGHTS = {
    "mueble":    0.40,
    "textil":    0.15,
    "lampara":   0.20,
    "cuadro":    0.12,
    "florero":   0.08,
    "escultura": 0.10,
    "espejo":    0.15,
    "planta":    0.05,
}

# ── Estado del grafo ───────────────────────────────────────

class DesignState(TypedDict):
    session_id: str
    status: str
    raw_intent: str
    style_keywords: List[str]
    style_tags: List[str]
    budget_total: Optional[float]
    selected_categories: List[str]
    combo: Dict[str, dict]          # {categoria: {"best": product, "alternative": product|None}}
    error: Optional[str]


# ── Helpers ────────────────────────────────────────────────

def get_embedding(text: str) -> list:
    result = voyage_client.embed([text], model="voyage-3-lite", input_type="query")
    return result.embeddings[0]

def embedding_to_str(embedding: list) -> str:
    return "[" + ",".join(str(x) for x in embedding) + "]"

def search_by_category(embedding_str: str, category: str, max_price: Optional[float] = None,
                        limit: int = 3, exclude_ids: List[str] = None) -> list:
    """Busca productos en Supabase para una categoría específica."""
    # Pedimos más resultados para tener margen al filtrar por precio y excluir IDs
    fetch_limit = (limit + (len(exclude_ids) if exclude_ids else 0)) * 3

    payload = {
        "query_embedding": embedding_str,
        "category_filter": category,
        "limit_n": fetch_limit,
    }

    with httpx.Client() as client:
        r = client.post(
            f"{SUPABASE_URL}/rest/v1/rpc/search_products",
            headers=HEADERS,
            json=payload,
            timeout=15.0
        )
        r.raise_for_status()
        products = r.json()

    # Filtrar por precio en Python (evita depender del RPC para esto)
    if max_price:
        products = [p for p in products if p.get("price", 0) <= max_price]

    # Excluir IDs ya mostrados
    if exclude_ids:
        products = [p for p in products if str(p.get("id")) not in exclude_ids]

    return products[:limit]

def allocate_budget(budget_total: float, categories: List[str]) -> Dict[str, float]:
    """Distribuye el presupuesto total entre las categorías seleccionadas."""
    weights = {c: BUDGET_WEIGHTS.get(c, 0.10) for c in categories}
    total_weight = sum(weights.values())
    return {c: (w / total_weight) * budget_total for c, w in weights.items()}


# ── Nodo 1: Intake ─────────────────────────────────────────

def intake_node(state: DesignState) -> DesignState:
    """Parsea el intent del usuario con Claude. Extrae keywords, estilo y presupuesto."""
    print(f"[IntakeAgent] Procesando: '{state['raw_intent']}'")

    prompt = f"""Analizá esta descripción de decoración y extraé información estructurada.

Descripción: "{state['raw_intent']}"

Respondé ÚNICAMENTE con JSON válido:
{{
  "keywords": ["3 a 8 términos específicos para buscar productos"],
  "style_tags": ["estilos identificados"],
  "budget_total": null,
  "category_groups": []
}}

- keywords: términos para buscar (ej: "madera natural", "lámpara colgante", "textil beige")
- style_tags: estilos (ej: "nórdico", "minimalista", "industrial", "bohemio")
- budget_total: presupuesto total en ARS si se menciona, null si no
- category_groups: grupos mencionados EXPLÍCITAMENTE por el usuario. Solo incluir si el usuario nombra categorías concretas.
  Valores posibles: "muebles", "textiles", "iluminacion", "arte", "decoracion"
  Ejemplos:
    "quiero cuadros de arte para mi living" → ["arte"]
    "busco iluminación y textiles" → ["iluminacion", "textiles"]
    "quiero un living nórdico moderno" → []  (estilo general, sin categorías explícitas)

Solo el JSON, sin texto adicional."""

    try:
        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        parsed = json.loads(response.content[0].text.strip())
        print(f"[IntakeAgent] Keywords: {parsed.get('keywords', [])}")
        return {
            **state,
            "status": "clarifying",
            "style_keywords": parsed.get("keywords", []),
            "style_tags": parsed.get("style_tags", []),
            "budget_total": parsed.get("budget_total"),
            "category_groups": parsed.get("category_groups", []),
        }
    except Exception as e:
        print(f"[IntakeAgent] Error (usando fallback): {e}")
        return {
            **state,
            "status": "clarifying",
            "style_keywords": [state["raw_intent"]],
            "style_tags": [],
            "budget_total": None,
            "category_groups": [],
        }


# ── Nodo 2: Combo Search ────────────────────────────────────

def combo_search_node(state: DesignState) -> DesignState:
    """Busca el mejor producto + alternativa para cada categoría seleccionada."""
    keywords = state.get("style_keywords", [])
    style_tags = state.get("style_tags", [])
    categories = state.get("selected_categories", [])
    budget_total = state.get("budget_total")

    if not categories:
        return {**state, "status": "error", "error": "No se seleccionaron categorías"}

    query_text = " ".join(keywords)
    if style_tags:
        query_text += " " + " ".join(style_tags)

    print(f"[ComboSearch] Query: '{query_text}' | Categorías: {categories}")

    try:
        embedding = get_embedding(query_text)
        embedding_str = embedding_to_str(embedding)

        budget_per_category = allocate_budget(budget_total, categories) if budget_total else {}

        combo = {}
        for category in categories:
            max_price = budget_per_category.get(category)
            products = search_by_category(embedding_str, category, max_price=max_price, limit=2)

            if products:
                combo[category] = {
                    "best": products[0],
                    "alternative": products[1] if len(products) > 1 else None,
                    "no_stock": False,
                }
                print(f"[ComboSearch] {category}: encontrado '{products[0]['name']}'")
            else:
                combo[category] = {
                    "best": None,
                    "alternative": None,
                    "no_stock": True,
                }
                print(f"[ComboSearch] {category}: sin stock")

        return {
            **state,
            "status": "interactive",
            "combo": combo,
            "error": None,
        }

    except Exception as e:
        print(f"[ComboSearch] Error: {e}")
        return {**state, "status": "error", "error": str(e)}


# ── Construcción del grafo ─────────────────────────────────

def build_graph():
    graph = StateGraph(DesignState)
    graph.add_node("intake", intake_node)
    graph.add_node("combo_search", combo_search_node)
    graph.set_entry_point("intake")
    graph.add_edge("intake", "combo_search")
    graph.add_edge("combo_search", END)
    return graph.compile()


design_graph = build_graph()


# ── Funciones públicas ─────────────────────────────────────

async def run_intake(session_id: str, raw_intent: str) -> dict:
    """Solo ejecuta el intake para extraer estilo. No busca productos."""
    initial_state: DesignState = {
        "session_id": session_id,
        "status": "intake",
        "raw_intent": raw_intent,
        "style_keywords": [],
        "style_tags": [],
        "budget_total": None,
        "selected_categories": [],
        "combo": {},
        "error": None,
    }
    result = await _run_intake_only(initial_state)
    return result

async def _run_intake_only(state: DesignState) -> dict:
    from concurrent.futures import ThreadPoolExecutor
    import asyncio
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        result = await loop.run_in_executor(pool, intake_node, state)
    return result

async def run_combo_search(session_id: str, raw_intent: str, style_keywords: List[str],
                            style_tags: List[str], selected_categories: List[str],
                            budget_total: Optional[float]) -> dict:
    """Ejecuta la búsqueda de combo con categorías y presupuesto ya definidos."""
    state: DesignState = {
        "session_id": session_id,
        "status": "searching",
        "raw_intent": raw_intent,
        "style_keywords": style_keywords,
        "style_tags": style_tags,
        "budget_total": budget_total,
        "selected_categories": selected_categories,
        "combo": {},
        "error": None,
    }
    from concurrent.futures import ThreadPoolExecutor
    import asyncio
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        result = await loop.run_in_executor(pool, combo_search_node, state)
    return result

async def run_design_session(session_id: str, raw_intent: str) -> dict:
    """Mantiene compatibilidad con el flujo anterior (usado como fallback)."""
    state: DesignState = {
        "session_id": session_id,
        "status": "intake",
        "raw_intent": raw_intent,
        "style_keywords": [],
        "style_tags": [],
        "budget_total": None,
        "selected_categories": list(CATEGORY_LABELS.keys()),
        "combo": {},
        "error": None,
    }
    from concurrent.futures import ThreadPoolExecutor
    import asyncio
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        result = await loop.run_in_executor(pool, design_graph.invoke, state)
    return result

async def generic_search_by_category(category: str, excluded_ids: List[str] = None,
                                      budget_max: Optional[float] = None) -> Optional[dict]:
    """Búsqueda de fallback: devuelve cualquier producto disponible de la categoría,
    sin filtro de estilo. Útil cuando no hay más opciones que coincidan con el estilo."""
    query_text = CATEGORY_LABELS.get(category, category)
    try:
        embedding = get_embedding(query_text)
        embedding_str = embedding_to_str(embedding)
        products = search_by_category(
            embedding_str, category,
            max_price=budget_max,
            limit=1,
            exclude_ids=excluded_ids or []
        )
        return products[0] if products else None
    except Exception as e:
        print(f"[GenericSearch] Error: {e}")
        return None


async def swap_product(style_keywords: List[str], style_tags: List[str],
                        category: str, excluded_ids: List[str],
                        budget_max: Optional[float] = None) -> Optional[dict]:
    """Busca la siguiente mejor opción para una categoría, excluyendo productos ya mostrados."""
    query_text = " ".join(style_keywords)
    if style_tags:
        query_text += " " + " ".join(style_tags)

    print(f"[Swap] Buscando alternativa para '{category}' excluyendo {excluded_ids}")

    try:
        embedding = get_embedding(query_text)
        embedding_str = embedding_to_str(embedding)
        products = search_by_category(
            embedding_str, category,
            max_price=budget_max,
            limit=1,
            exclude_ids=excluded_ids
        )
        return products[0] if products else None
    except Exception as e:
        print(f"[Swap] Error: {e}")
        return None
