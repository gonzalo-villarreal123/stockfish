"""
Grafo LangGraph principal de Stockfish.
Flujo MVP: intake → style_rag → resultados
"""
import os
import json
import voyageai
from typing import TypedDict, Optional, List
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
import anthropic
import httpx

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
VOYAGE_API_KEY = os.getenv("VOYAGE_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

print(f"[ENV] SUPABASE_URL={SUPABASE_URL}")
print(f"[ENV] VOYAGE_API_KEY={'SET' if VOYAGE_API_KEY else 'MISSING'}")
print(f"[ENV] ANTHROPIC_API_KEY={'SET' if ANTHROPIC_API_KEY else 'MISSING'}")

voyage_client = voyageai.Client(api_key=VOYAGE_API_KEY)
anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


# ── Estado del grafo ───────────────────────────────────────

class DesignState(TypedDict):
    session_id: str
    status: str
    raw_intent: str                    # Texto libre del usuario
    style_keywords: List[str]          # Keywords extraídas por Claude
    style_tags: List[str]              # Tags de estilo (minimalista, industrial, etc.)
    budget_max: Optional[float]        # Presupuesto máximo inferido
    products: List[dict]               # Productos encontrados
    error: Optional[str]


# ── Nodo 1: Intake ─────────────────────────────────────────

def intake_node(state: DesignState) -> DesignState:
    """
    Recibe el texto de intención del usuario y lo parsea con Claude.
    Extrae: keywords, estilo, presupuesto.
    """
    print(f"[IntakeAgent] Procesando intent: '{state['raw_intent']}'")

    prompt = f"""Analizá esta descripción de estilo de decoración y extraé información estructurada.

Descripción del usuario: "{state['raw_intent']}"

Respondé ÚNICAMENTE con un JSON válido con esta estructura:
{{
  "keywords": ["lista", "de", "palabras", "clave", "para", "buscar"],
  "style_tags": ["estilos", "identificados"],
  "budget_max": null
}}

- keywords: 3-8 términos específicos para buscar productos (ej: "cuadro abstracto", "escultura madera", "lámpara industrial")
- style_tags: estilos identificados (ej: "minimalista", "industrial", "bohemio", "escandinavo", "moderno")
- budget_max: presupuesto máximo en ARS si se menciona, null si no

Solo respondé con el JSON, sin texto adicional."""

    try:
        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        parsed = json.loads(response.content[0].text.strip())
        print(f"[IntakeAgent] Keywords: {parsed.get('keywords', [])}")
        print(f"[IntakeAgent] Style tags: {parsed.get('style_tags', [])}")

        return {
            **state,
            "status": "analyzing",
            "style_keywords": parsed.get("keywords", []),
            "style_tags": parsed.get("style_tags", []),
            "budget_max": parsed.get("budget_max"),
        }
    except Exception as e:
        print(f"[IntakeAgent] Error: {e}")
        # Fallback: usar el texto raw como keyword
        return {
            **state,
            "status": "analyzing",
            "style_keywords": [state["raw_intent"]],
            "style_tags": [],
            "budget_max": None,
        }


# ── Nodo 2: StyleRAG ───────────────────────────────────────

def style_rag_node(state: DesignState) -> DesignState:
    """
    Convierte el estilo en embeddings y busca productos relevantes en Supabase.
    """
    keywords = state.get("style_keywords", [])
    style_tags = state.get("style_tags", [])
    budget_max = state.get("budget_max")

    if not keywords:
        return {**state, "status": "error", "error": "No se pudieron extraer keywords del intent"}

    # Construir query de búsqueda combinando keywords y estilo
    query_text = " ".join(keywords)
    if style_tags:
        query_text += " " + " ".join(style_tags)

    print(f"[StyleRAGAgent] Query: '{query_text}'")

    try:
        # Generar embedding del query
        result = voyage_client.embed([query_text], model="voyage-3-lite", input_type="query")
        query_embedding = result.embeddings[0]
        embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

        # Buscar en Supabase via RPC
        import httpx as _httpx
        payload = {
            "query_embedding": embedding_str,
            "limit_n": 12,
            "min_similarity": 0.45,
        }
        if budget_max:
            payload["max_price"] = budget_max

        with _httpx.Client() as client:
            r = client.post(
                f"{SUPABASE_URL}/rest/v1/rpc/search_products",
                headers=HEADERS,
                json=payload,
                timeout=15.0
            )
            r.raise_for_status()
            products = r.json()

        print(f"[StyleRAGAgent] Encontrados: {len(products)} productos")

        # Enriquecer con rank
        for i, p in enumerate(products):
            p["rank"] = i + 1

        return {
            **state,
            "status": "interactive",
            "products": products,
            "error": None,
        }

    except Exception as e:
        print(f"[StyleRAGAgent] Error: {e}")
        return {**state, "status": "error", "error": str(e)}


# ── Construcción del grafo ─────────────────────────────────

def build_graph():
    graph = StateGraph(DesignState)

    graph.add_node("intake", intake_node)
    graph.add_node("style_rag", style_rag_node)

    graph.set_entry_point("intake")
    graph.add_edge("intake", "style_rag")
    graph.add_edge("style_rag", END)

    return graph.compile()


design_graph = build_graph()


# ── Función principal para usar el grafo ──────────────────

async def run_design_session(session_id: str, raw_intent: str) -> dict:
    initial_state: DesignState = {
        "session_id": session_id,
        "status": "intake",
        "raw_intent": raw_intent,
        "style_keywords": [],
        "style_tags": [],
        "budget_max": None,
        "products": [],
        "error": None,
    }

    result = design_graph.invoke(initial_state)
    return result
