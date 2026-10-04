from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime
from sqlalchemy.orm import relationship
from backend.app.db.session import Base

class Game(Base):
    __tablename__ = "games"

    # Steam AppID y Bundle como clave primaria compuesta
    app_id = Column(Integer, primary_key=True, index=True)
    bundle = Column(String(255), primary_key=True, default="", index=True)
    name = Column(String, nullable=False, index=True)
    header_image = Column(String, nullable=True)
    is_delisted = Column(Boolean, default=False)
    delisted_reason = Column(String, nullable=True)
    platform = Column(String(50), default="STEAM", nullable=False, index=True)
    hb_status = Column(String(100), nullable=True)
    key_url = Column(String(500), nullable=True)
    
    # Precios de Steam y jugadores activos
    steam_price = Column(Float, nullable=True)
    steam_players_24h = Column(Integer, nullable=True)
    
    # Precios y Mínimos de GG.deals
    ggdeals_official_current = Column(Float, nullable=True)
    ggdeals_keyshop_current = Column(Float, nullable=True)
    ggdeals_keyshop_discount = Column(String, nullable=True)
    ggdeals_official_hist_low = Column(Float, nullable=True)
    ggdeals_official_hist_time = Column(String, nullable=True)
    ggdeals_keyshop_hist_low = Column(Float, nullable=True)
    ggdeals_keyshop_hist_time = Column(String, nullable=True)
    best_keyshop_name = Column(String, nullable=True)
    last_synced_at = Column(DateTime, nullable=True)

    # Relaciones
    offers = relationship("Offer", back_populates="game", cascade="all, delete-orphan")
    market_price = relationship("MarketPrice", back_populates="game", uselist=False, cascade="all, delete-orphan")

    # Alias / Propiedades para facilitar compatibilidad
    @property
    def kinguin_price_eur(self):
        return self.market_price.kinguin_price_eur if self.market_price else None

    @property
    def kinguin_url(self):
        return self.market_price.kinguin_url if self.market_price else None

    @property
    def kinguin_in_stock(self):
        return self.market_price.kinguin_in_stock if self.market_price else True

    @property
    def id(self):
        return self.app_id

    @property
    def steam_app_id(self):
        return self.app_id

    @property
    def is_delisted_steam(self):
        return bool(self.is_delisted)

    @property
    def steam_header_image(self):
        return self.header_image

    @property
    def steam_store_price(self):
        return self.steam_price

    @property
    def ggdeals_current_official(self):
        return self.ggdeals_official_current

    @property
    def ggdeals_current_keyshop(self):
        return self.ggdeals_keyshop_current

    @property
    def ggdeals_current_keyshop_discount(self):
        return self.ggdeals_keyshop_discount

    @property
    def ggdeals_historical_official_low(self):
        return self.ggdeals_official_hist_low

    @property
    def ggdeals_historical_official_time(self):
        return self.ggdeals_official_hist_time

    @property
    def ggdeals_historical_keyshop_low(self):
        return self.ggdeals_keyshop_hist_low

    @property
    def ggdeals_historical_keyshop_time(self):
        return self.ggdeals_keyshop_hist_time

    @property
    def best_keyshop_price_eur(self):
        return self.ggdeals_keyshop_current
