from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any

class GameBase(BaseModel):
    name: str
    tf2_keys_offered: float
    steam_app_id: Optional[int] = None
    lot_name: Optional[str] = "xMjalino"

class GameCreate(GameBase):
    steam_url: Optional[str] = None

class GameUpdatePayload(BaseModel):
    tf2_keys_offered: Optional[float] = None
    steam_app_id: Optional[int] = None
    best_keyshop_price_eur: Optional[float] = None
    ggdeals_current_official: Optional[float] = None
    ggdeals_current_keyshop: Optional[float] = None
    ggdeals_historical_keyshop_low: Optional[float] = None
    ggdeals_historical_official_low: Optional[float] = None
    is_reviewed: Optional[bool] = None
    counter_increase_tf2: Optional[float] = None
    is_sold: Optional[bool] = None
    sold_tf2_keys: Optional[float] = None
    sold_currency: Optional[str] = "TF2"
    sold_price: Optional[float] = None
    sold_note: Optional[str] = None
    lot_name: Optional[str] = None

class GameOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    tf2_keys_offered: float
    steam_app_id: Optional[int] = None
    steam_header_image: Optional[str] = None
    is_delisted_steam: bool = False
    delisted_reason: Optional[str] = None
    
    steam_store_price: Optional[float] = None
    steam_is_free: bool = False
    steam_players_24h: Optional[int] = None
    
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
    best_official_price_eur: Optional[float] = None
    best_official_shop: Optional[str] = None
    last_discount_date: Optional[str] = None
    
    floor_price_eur: Optional[float] = None
    floor_price_source: Optional[str] = None
    seller_loss_eur: Optional[float] = None
    seller_loss_percent: Optional[float] = None
    reseller_profit_eur: Optional[float] = None
    reseller_profit_percent: Optional[float] = None
    deal_rating: Optional[str] = "Normal"
    
    is_reviewed: bool = False
    counter_increase_tf2: float = 0.0
    is_sold: bool = False
    sold_tf2_keys: Optional[float] = None
    sold_currency: Optional[str] = "TF2"
    sold_price: Optional[float] = None
    sold_note: Optional[str] = None
    lot_name: str = "xMjalino"

class BulkStatePayload(BaseModel):
    increases: Dict[str, float] = {}
    reviewed: Dict[str, bool] = {}

class MarketSummary(BaseModel):
    total_games: int
    available_count: int
    sold_count: int
    total_keys: float
    total_offer_steam_eur: float
    total_offer_cash_eur: float
    total_market_value_eur: float
    total_reseller_profit_eur: float
    delisted_count: int
    massive_margin_count: int
    tf2_steam_price: float
    tf2_cash_price: float

class AddGamePayload(BaseModel):
    steam_url: str
    tf2_keys_offered: float = 1.0
    lot_name: Optional[str] = "xMjalino"
