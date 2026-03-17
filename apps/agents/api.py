"""
API FastAPI de Stockfish.
Expone el agente LangGraph como endpoints HTTP.
"""
import os
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
from graph import run_design_session
from db import create_session, get_session, update_session, get_session_by_token

load_dotenv()

app = FastAPI(title="Stockfish API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ────────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


class ProductResult(BaseModel):
    id: str
    name: str
    price: float
    primary_image: str
    url: str
    category: str
    merchant_slug: str
    similarity: float
    rank: int


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    products: List[dict] = []
    status: str


# ── Endpoints ──────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "stockfish-agents"}


NON_SEARCH_TRIGGERS = [
    "imagen", "foto", "generar", "visualizar", "mostrar cómo queda",
    "cómo se vería", "render", "composición", "hola", "gracias",
    "quién sos", "qué sos", "qué podés", "ayuda", "help",
]

def is_search_intent(message: str) -> bool:
    msg = message.lower()
    for trigger in NON_SEARCH_TRIGGERS:
        if trigger in msg:
            return False
    return True

def non_search_reply(message: str) -> str:
    msg = message.lower()
    if any(w in msg for w in ["imagen", "foto", "generar", "visualizar", "render", "cómo se vería", "cómo queda"]):
        return "La visualización de productos en tu espacio es una función que estamos construyendo. Por ahora podés describirme el estilo que buscás y te muestro productos reales disponibles."
    if any(w in msg for w in ["hola", "buenas", "hey"]):
        return "¡Hola! Contame qué estilo de decoración estás buscando y te muestro productos reales."
    if any(w in msg for w in ["gracias", "gracie"]):
        return "De nada. Si querés explorar más estilos o productos, contame."
    if any(w in msg for w in ["qué sos", "quién sos", "qué podés", "ayuda", "help"]):
        return "Soy Stockfish, un asistente de decoración. Describime el estilo que buscás (por ejemplo: 'cuadros abstractos para un living moderno') y te muestro productos reales de tiendas argentinas."
    return "No entendí bien la consulta. Podés describirme el estilo de decoración que buscás y te muestro productos disponibles."


@app.post("/chat", response_model=ChatResponse)
async def chat(body: ChatMessage):
    """
    Endpoint principal del chat.
    Recibe un mensaje del usuario y devuelve productos relevantes.
    """
    session_id = body.session_id or str(uuid.uuid4())

    # Detectar si es una búsqueda o una pregunta conversacional
    if not is_search_intent(body.message):
        return ChatResponse(
            session_id=session_id,
            reply=non_search_reply(body.message),
            products=[],
            status="interactive"
        )

    # Ejecutar el grafo de agentes
    result = await run_design_session(
        session_id=session_id,
        raw_intent=body.message
    )

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result.get("error", "Error interno"))

    products = result.get("products", [])
    keywords = result.get("style_keywords", [])
    style_tags = result.get("style_tags", [])

    # Construir respuesta conversacional
    if products:
        tags_str = f" con estilo {', '.join(style_tags)}" if style_tags else ""
        reply = f"Encontré {len(products)} productos{tags_str} que pueden quedar bien. ¿Alguno te llama la atención?"
    else:
        reply = "No encontré productos que coincidan exactamente. Probá con otra descripción, por ejemplo: 'cuadro abstracto', 'escultura moderna' o 'espejo decorativo'."

    # Persistir sesión en Supabase
    try:
        await create_session({
            "id": session_id,
            "status": result["status"],
            "style_intent": {
                "raw_text": body.message,
                "keywords": keywords,
                "style_tags": style_tags,
            }
        })
    except Exception:
        pass  # No es bloqueante si falla el guardado

    return ChatResponse(
        session_id=session_id,
        reply=reply,
        products=products[:12],
        status=result["status"]
    )


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
