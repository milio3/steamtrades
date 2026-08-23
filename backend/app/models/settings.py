from sqlalchemy import Column, Integer, Float, Boolean, String
from backend.app.db.session import Base

class MarketSettingsModel(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, default=1)
    tf2_key_steam_price = Column(Float, default=2.02)
    tf2_key_cash_price = Column(Float, default=1.62)
    steam_fee_percent = Column(Float, default=13.03)
    auto_refresh_tf2_key = Column(Boolean, default=True)
    last_tf2_update = Column(String, nullable=True)
