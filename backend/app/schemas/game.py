from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any

class AddGamePayload(BaseModel):
    steam_url: Optional[str] = None
    query: Optional[str] = None  # Soporta nombre, link o AppID
    offer_price: Optional[float] = None
    offer_currency: Optional[str] = "TF2"
    tf2_keys_offered: Optional[float] = 1.0
    buyer_name: Optional[str] = None

class GameSearchResult(BaseModel):
    app_id: int
    name: str
    price_eur: Optional[float] = None
    tiny_image: Optional[str] = None
    header_image: Optional[str] = None

class GameInspectOut(BaseModel):
    app_id: int
    name: str
    header_image: Optional[str] = None
    steam_price: Optional[float] = None
    is_delisted: bool = False
    delisted_reason: Optional[str] = None
    is_free: bool = False
    genres: List[str] = []
    developers: List[str] = []
    publishers: List[str] = []
    release_date: Optional[str] = None
    players_count: Optional[int] = None
    reviews: Dict[str, Any] = {}
    
    # Mercado / Kinguin
    kinguin_price_eur: Optional[float] = None
    kinguin_url: Optional[str] = None
    kinguin_in_stock: bool = True
    ggdeals_keyshop_current: Optional[float] = None
    best_keyshop_name: Optional[str] = None
    ggdeals_official_current: Optional[float] = None
    ggdeals_official_hist_low: Optional[float] = None
    ggdeals_keyshop_hist_low: Optional[float] = None
    
    # Valoración y Enlaces
    floor_price_eur: Optional[float] = None
    floor_price_source: Optional[str] = None
    links: Dict[str, str] = {}


class GameUpdatePayload(BaseModel):
    offer_price: Optional[float] = None
    offer_currency: Optional[str] = None
    counter_price: Optional[float] = None
    counter_currency: Optional[str] = None
    tf2_keys_offered: Optional[float] = None
    counter_increase_tf2: Optional[float] = None
    
    steam_app_id: Optional[int] = None
    best_keyshop_price_eur: Optional[float] = None
    ggdeals_current_official: Optional[float] = None
    ggdeals_current_keyshop: Optional[float] = None
    ggdeals_historical_keyshop_low: Optional[float] = None
    ggdeals_historical_official_low: Optional[float] = None
    
    status: Optional[str] = None  # 'listed', 'pending', 'sold', 'issue'
    is_reviewed: Optional[bool] = None
    is_sold: Optional[bool] = None
    sold_tf2_keys: Optional[float] = None
    sold_currency: Optional[str] = None
    sold_price: Optional[float] = None
    sold_note: Optional[str] = None
    issue_note: Optional[str] = None
    buyer_name: Optional[str] = None

class OfferOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int  # ID de la oferta
    app_id: int  # Steam AppID
    name: str
    buyer_name: Optional[str] = None
    
    # Oferta
    offer_price: float = 1.0
    offer_currency: str = "TF2"
    tf2_keys_offered: float = 1.0
    
    # Contraoferta
    counter_price: float = 0.0
    counter_currency: str = "TF2"
    counter_increase_tf2: float = 0.0
    
    # Metadatos del Juego y Humble Bundle
    bundle: Optional[str] = None
    platform: Optional[str] = "STEAM"
    hb_status: Optional[str] = None
    key_url: Optional[str] = None
    steam_app_id: Optional[int] = None
    steam_header_image: Optional[str] = None
    is_delisted_steam: bool = False
    delisted_reason: Optional[str] = None
    steam_store_price: Optional[float] = None
    steam_players_24h: Optional[int] = None
    
    # Valores de Mercado y Métricas al Vuelo
    offer_value_steam_eur: Optional[float] = None
    offer_value_cash_eur: Optional[float] = None
    
    ggdeals_current_official: Optional[float] = None
    ggdeals_current_keyshop: Optional[float] = None
    ggdeals_current_keyshop_discount: Optional[str] = None
    ggdeals_best_deal: Optional[str] = None
    ggdeals_historical_official_low: Optional[float] = None
    ggdeals_historical_official_time: Optional[str] = None
    ggdeals_historical_keyshop_low: Optional[float] = None
    ggdeals_historical_keyshop_time: Optional[str] = None
    
    best_keyshop_price_eur: Optional[float] = None
    best_keyshop_name: Optional[str] = None
    
    # Kinguin (Referencia ROW)
    kinguin_price_eur: Optional[float] = None
    kinguin_url: Optional[str] = None
    kinguin_in_stock: Optional[bool] = True
    
    floor_price_eur: Optional[float] = None

    floor_price_source: Optional[str] = None
    seller_loss_eur: Optional[float] = None
    seller_loss_percent: Optional[float] = None
    reseller_profit_eur: Optional[float] = None
    reseller_profit_percent: Optional[float] = None
    deal_rating: Optional[str] = "Normal"
    
    # Estado, Revisión, Venta e Incidencias
    status: str = "pending"  # 'listed', 'pending', 'sold', 'issue'
    is_reviewed: bool = False
    is_sold: bool = False
    sold_currency: Optional[str] = "TF2"
    sold_price: Optional[float] = None
    sold_note: Optional[str] = None
    issue_note: Optional[str] = None

# Alias para compatibilidad total con código existente
GameOut = OfferOut

class CsvImportRow(BaseModel):
    game_id: int
    game_name: Optional[str] = None
    buyer: Optional[str] = None
    offer: Optional[float] = None
    counter_offer: Optional[float] = None
    increment: Optional[float] = None
    revised: Optional[bool] = None
    accepted: Optional[bool] = None
    sold_currency: Optional[str] = None
    sold_price: Optional[float] = None

class CsvImportPayload(BaseModel):
    rows: List[CsvImportRow]

class BulkStatePayload(BaseModel):
    increases: Dict[str, float] = {}
    reviewed: Dict[str, bool] = {}

class MarketSummary(BaseModel):
    total_games: int
    available_count: int
    sold_count: int
    listed_count: int = 0
    pending_count: int = 0
    issue_count: int = 0
    
    # Nuevas métricas enfocadas en gestión activa y ventas
    active_keys_tf2: float = 0.0
    active_offer_cash_eur: float = 0.0
    realized_sales_eur: float = 0.0
    potential_profit_eur: float = 0.0
    
    # Métricas heredadas para compatibilidad
    total_keys: float = 0.0
    total_offer_steam_eur: float = 0.0
    total_offer_cash_eur: float = 0.0
    total_market_value_eur: float = 0.0
    total_reseller_profit_eur: float = 0.0
    
    delisted_count: int
    tf2_steam_price: float
    tf2_cash_price: float
    last_tf2_update: Optional[str] = None
