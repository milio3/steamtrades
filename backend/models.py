from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class PriceInfo(BaseModel):
    source: str
    price: Optional[float] = None
    currency: str = "EUR"
    url: Optional[str] = None
    is_global: bool = True
    shop_name: Optional[str] = None

class HistoricalLow(BaseModel):
    price: Optional[float] = None
    currency: str = "EUR"
    date: Optional[str] = None
    shop: Optional[str] = None
    days_since: Optional[int] = None

class GameItem(BaseModel):
    id: str
    name: str
    tf2_keys_offered: float
    steam_app_id: Optional[int] = None
    steam_header_image: Optional[str] = None
    is_delisted_steam: bool = False
    delisted_reason: Optional[str] = None
    
    # Precios de Steam en vivo
    steam_store_price: Optional[float] = None
    steam_is_free: bool = False
    steam_players_24h: Optional[int] = None
    
    # Valor de la oferta según TF2
    offer_value_steam_eur: Optional[float] = None
    offer_value_cash_eur: Optional[float] = None
    
    # Datos completos de GG.deals (Current Prices & Historical Low)
    ggdeals_current_official: Optional[float] = None
    ggdeals_current_keyshop: Optional[float] = None
    ggdeals_current_keyshop_discount: Optional[str] = None
    ggdeals_best_deal: Optional[str] = None
    ggdeals_historical_official_low: Optional[float] = None
    ggdeals_historical_official_time: Optional[str] = None
    ggdeals_historical_keyshop_low: Optional[float] = None
    ggdeals_historical_keyshop_time: Optional[str] = None
    
    # Precios de mercado de claves resumidos
    best_keyshop_price_eur: Optional[float] = None
    best_keyshop_name: Optional[str] = None
    best_official_price_eur: Optional[float] = None
    best_official_shop: Optional[str] = None
    
    # Histórico
    historical_low: Optional[HistoricalLow] = None
    last_discount_date: Optional[str] = None
    
    # Análisis de rentabilidad y pérdida de valor para el vendedor
    floor_price_eur: Optional[float] = None
    floor_price_source: Optional[str] = None
    seller_loss_eur: Optional[float] = None
    seller_loss_percent: Optional[float] = None
    reseller_profit_eur: Optional[float] = None
    reseller_profit_percent: Optional[float] = None
    deal_rating: Optional[str] = "Normal"
    
    # Progreso de negociación y estado de venta persistidos
    is_reviewed: bool = False
    counter_increase_tf2: float = 0.0
    is_sold: bool = False
    sold_tf2_keys: Optional[float] = None
    
    # Identificador de Lote de compra/venta
    lot_name: str = "xMjalino"
    
    # Enlaces directos a tiendas (filtrados por Global)
    links: Dict[str, str] = Field(default_factory=dict)

class GameUpdatePayload(BaseModel):
    tf2_keys_offered: Optional[float] = None
    steam_app_id: Optional[int] = None
    best_keyshop_price_eur: Optional[float] = None
    ggdeals_current_official: Optional[float] = None
    ggdeals_historical_keyshop_low: Optional[float] = None
    ggdeals_historical_official_low: Optional[float] = None
    is_reviewed: Optional[bool] = None
    counter_increase_tf2: Optional[float] = None
    is_sold: Optional[bool] = None
    sold_tf2_keys: Optional[float] = None
    lot_name: Optional[str] = None

class MarketSettings(BaseModel):
    tf2_key_steam_price: float = 1.97
    tf2_key_cash_price: float = 1.58
    steam_fee_percent: float = 13.03
    auto_refresh_tf2_key: bool = True
