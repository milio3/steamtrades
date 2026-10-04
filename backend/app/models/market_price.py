from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKeyConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.db.session import Base

class MarketPrice(Base):
    __tablename__ = "market_prices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    app_id = Column(Integer, nullable=False, index=True)
    bundle = Column(String(255), default="", nullable=False, index=True)

    # Kinguin (Específico Claves ROW / Global a título de referencia)
    kinguin_price_eur = Column(Float, nullable=True)
    kinguin_url = Column(String(500), nullable=True)
    kinguin_in_stock = Column(Boolean, default=True)

    # GG.deals & Keyshops Generales
    ggdeals_keyshop_current = Column(Float, nullable=True)
    best_keyshop_name = Column(String(100), nullable=True)
    ggdeals_keyshop_discount = Column(String(20), nullable=True)
    ggdeals_official_current = Column(Float, nullable=True)
    
    # Mínimos Históricos
    ggdeals_keyshop_hist_low = Column(Float, nullable=True)
    ggdeals_keyshop_hist_time = Column(String(100), nullable=True)
    ggdeals_official_hist_low = Column(Float, nullable=True)
    ggdeals_official_hist_time = Column(String(100), nullable=True)
    
    # Enlaces de Referencia
    ggdeals_url = Column(String(500), nullable=True)
    last_scraped_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        ForeignKeyConstraint(['app_id', 'bundle'], ['games.app_id', 'games.bundle'], ondelete='CASCADE'),
        UniqueConstraint('app_id', 'bundle', name='uq_market_prices_app_id_bundle'),
    )

    # Relación bidireccional con Game
    game = relationship("Game", back_populates="market_price")
