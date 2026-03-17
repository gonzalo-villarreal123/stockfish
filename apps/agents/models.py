from pydantic import BaseModel, UUID4
from typing import Optional, List, Literal
from datetime import datetime
from decimal import Decimal


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class RoomDimensions(BaseModel):
    width_m: Optional[float] = None
    height_m: Optional[float] = None
    depth_m: Optional[float] = None


class SpaceContext(BaseModel):
    original_image_url: str
    room_type: Optional[str] = None
    dominant_colors: List[str] = []
    empty_zones: List[BoundingBox] = []
    perspective_matrix: Optional[dict] = None
    lighting_conditions: Optional[str] = None


class StyleIntent(BaseModel):
    raw_text: str
    keywords: List[str] = []
    color_palette: List[str] = []
    style_tags: List[str] = []       # "minimalista", "industrial", "bohemio"
    budget_max: Optional[float] = None


class ProductDimensions(BaseModel):
    width_cm: Optional[float] = None
    height_cm: Optional[float] = None
    depth_cm: Optional[float] = None
    weight_kg: Optional[float] = None


class RankedProduct(BaseModel):
    id: str
    name: str
    price: float
    primary_image: str
    url: str
    category: str
    merchant_slug: str
    attributes: dict = {}
    dimensions: Optional[ProductDimensions] = None
    similarity: float = 0.0


class ProductSlot(BaseModel):
    slot_id: str
    category: str
    bounding_box: BoundingBox
    scale_meters: Optional[float] = None
    candidates: List[RankedProduct] = []
    selected_product: Optional[RankedProduct] = None
    user_confirmed: bool = False
    locked: bool = False


class RenderResult(BaseModel):
    image_url: str
    slots: List[ProductSlot] = []
    created_at: datetime = datetime.now()


class DesignSession(BaseModel):
    session_id: str
    status: Literal["intake", "analyzing", "generating", "interactive", "checkout", "completed", "archived"] = "intake"
    space_context: Optional[SpaceContext] = None
    style_intent: Optional[StyleIntent] = None
    current_render: Optional[RenderResult] = None
    render_history: List[RenderResult] = []
    product_slots: List[ProductSlot] = []
    share_token: Optional[str] = None
    created_at: datetime = datetime.now()
    last_activity: datetime = datetime.now()


class ScrapedProduct(BaseModel):
    external_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    price: float
    currency: str = "ARS"
    primary_image: str
    images: List[str] = []
    url: str
    category: str
    subcategory: Optional[str] = None
    attributes: dict = {}
    dimensions: Optional[ProductDimensions] = None
    in_stock: bool = True
