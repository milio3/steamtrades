"""
Herramienta CLI para sincronizar precios y datos de mercado de todos los juegos en SQLite.
Uso:
    python -m backend.app.tools.sync_market
"""

import sys
from backend.app.db.session import SessionLocal
from backend.app.models.game import Game
from backend.app.models.settings import MarketSettingsModel
from backend.app.services.steam_service import fetch_live_tf2_key_price
from backend.app.services.price_service import sync_single_game

def run_sync():
    db = SessionLocal()
    try:
        settings = db.query(MarketSettingsModel).filter(MarketSettingsModel.id == 1).first()
        live_key, _ = fetch_live_tf2_key_price()
        if live_key and settings:
            settings.tf2_key_steam_price = live_key
            settings.tf2_key_cash_price = round(live_key * 0.80, 2)
            db.commit()
            print(f"Cotización TF2 actualizada: Steam {live_key}€ | Cash {settings.tf2_key_cash_price}€")

        games = db.query(Game).all()
        print(f"Sincronizando {len(games)} juegos...")
        for i, g in enumerate(games, 1):
            sync_single_game(g, settings)
            print(f"[{i}/{len(games)}] {g.name} -> Suelo: {g.floor_price_eur}€")
            
        db.commit()
        print("Sincronización completada con éxito.")
    finally:
        db.close()

if __name__ == "__main__":
    run_sync()
