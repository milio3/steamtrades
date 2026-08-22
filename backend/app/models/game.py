from sqlalchemy import Column, String, Float, Integer, Boolean, Text
from backend.app.db.session import Base

class Game(Base):
    __tablename__ = "games"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    tf2_keys_offered = Column(Float, nullable=False, default=1.0)
    steam_app_id = Column(Integer, nullable=True, index=True)
    steam_header_image = Column(String, nullable=True)
    is_delisted_steam = Column(Boolean, default=False)
    delisted_reason = Column(String, nullable=True)
    
    # Precios de Steam en vivo y jugadores
    steam_store_price = Column(Float, nullable=True)
    steam_is_free = Column(Boolean, default=False)
    steam_players_24h = Column(Integer, nullable=True)
    
    # Valoración de la oferta recibida
    offer_value_steam_eur = Column(Float, nullable=True)
    offer_value_cash_eur = Column(Float, nullable=True)
    
    # Datos completos de GG.deals
    ggdeals_current_official = Column(Float, nullable=True)
    ggdeals_current_keyshop = Column(Float, nullable=True)
    ggdeals_current_keyshop_discount = Column(String, nullable=True)
    ggdeals_best_deal = Column(String, nullable=True)
    ggdeals_historical_official_low = Column(Float, nullable=True)
    ggdeals_historical_official_time = Column(String, nullable=True)
    ggdeals_historical_keyshop_low = Column(Float, nullable=True)
    ggdeals_historical_keyshop_time = Column(String, nullable=True)
    
    # Resumen de mercado
    best_keyshop_price_eur = Column(Float, nullable=True)
    best_keyshop_name = Column(String, nullable=True)
    best_official_price_eur = Column(Float, nullable=True)
    best_official_shop = Column(String, nullable=True)
    last_discount_date = Column(String, nullable=True)
    
    # Métricas de arbitraje y suelo
    floor_price_eur = Column(Float, nullable=True)
    floor_price_source = Column(String, nullable=True)
    seller_loss_eur = Column(Float, nullable=True)
    seller_loss_percent = Column(Float, nullable=True)
    reseller_profit_eur = Column(Float, nullable=True)
    reseller_profit_percent = Column(Float, nullable=True)
    deal_rating = Column(String, default="Normal")
    
    # Negociación, revisión y ventas
    is_reviewed = Column(Boolean, default=False)
    counter_increase_tf2 = Column(Float, default=0.0)
    is_sold = Column(Boolean, default=False)
    sold_tf2_keys = Column(Float, nullable=True)
    sold_currency = Column(String, default="TF2")  # 'TF2' o 'EUR'
    sold_price = Column(Float, nullable=True)
    sold_note = Column(String, nullable=True)  # Ej: 'Pago Paypal'
    
    # Lote asignado
    lot_name = Column(String, default="xMjalino", index=True)
