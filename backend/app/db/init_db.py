import json
from pathlib import Path
from sqlalchemy.orm import Session
from backend.app.core.config import DATA_DIR
from backend.app.db.session import engine, Base, SessionLocal
from backend.app.models.game import Game
from backend.app.models.offer import Offer
from backend.app.models.settings import MarketSettingsModel

def init_database():
    """Crea las tablas SQLite e inicializa los datos si la base de datos está vacía."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    
    try:
        # 1. Inicializar Settings si no existen
        settings = db.query(MarketSettingsModel).filter(MarketSettingsModel.id == 1).first()
        if not settings:
            settings_file = DATA_DIR / "settings.json"
            tf2_steam = 2.02
            tf2_cash = 1.62
            fee = 13.03
            
            if settings_file.exists():
                try:
                    with open(settings_file, "r", encoding="utf-8") as f:
                        s_data = json.load(f)
                        tf2_steam = s_data.get("tf2_key_steam_price", tf2_steam)
                        tf2_cash = s_data.get("tf2_key_cash_price", tf2_cash)
                        fee = s_data.get("steam_fee_percent", fee)
                except Exception:
                    pass
                    
            settings = MarketSettingsModel(
                id=1,
                tf2_key_steam_price=tf2_steam,
                tf2_key_cash_price=tf2_cash,
                steam_fee_percent=fee,
                auto_refresh_tf2_key=True
            )
            db.add(settings)
            db.commit()

        # 2. Inicializar Juegos y Ofertas si la tabla está vacía
        game_count = db.query(Game).count()
        if game_count == 0:
            json_file = DATA_DIR / "games_db.json"
            if json_file.exists():
                with open(json_file, "r", encoding="utf-8") as f:
                    games_raw = json.load(f)
                    
                game_list = games_raw if isinstance(games_raw, list) else list(games_raw.values())
                
                for g in game_list:
                    app_id = int(g.get("steam_app_id") or g.get("id"))
                    
                    # Comprobar si ya existe el juego en games
                    game_obj = db.query(Game).filter(Game.app_id == app_id).first()
                    if not game_obj:
                        game_obj = Game(
                            app_id=app_id,
                            name=g["name"],
                            header_image=g.get("steam_header_image"),
                            is_delisted=bool(g.get("is_delisted_steam", False)),
                            delisted_reason=g.get("delisted_reason"),
                            steam_price=g.get("steam_store_price"),
                            steam_players_24h=g.get("steam_players_24h"),
                            ggdeals_official_current=g.get("ggdeals_current_official"),
                            ggdeals_keyshop_current=g.get("ggdeals_current_keyshop") or g.get("best_keyshop_price_eur"),
                            ggdeals_keyshop_discount=g.get("ggdeals_current_keyshop_discount"),
                            ggdeals_official_hist_low=g.get("ggdeals_historical_official_low"),
                            ggdeals_official_hist_time=g.get("ggdeals_historical_official_time"),
                            ggdeals_keyshop_hist_low=g.get("ggdeals_historical_keyshop_low"),
                            ggdeals_keyshop_hist_time=g.get("ggdeals_historical_keyshop_time"),
                            best_keyshop_name=g.get("best_keyshop_name")
                        )
                        db.add(game_obj)
                    
                    status_val = g.get("status") or ("sold" if g.get("is_sold") else "pending")
                    offer_obj = Offer(
                        app_id=app_id,
                        buyer_name=g.get("buyer_name"),
                        status=status_val,
                        is_reviewed=bool(g.get("is_reviewed", False)),
                        offer_price=float(g.get("tf2_keys_offered", 1.0)),
                        offer_currency="TF2",
                        counter_price=float(g.get("counter_increase_tf2", 0.0) or 0.0),
                        counter_currency="TF2",
                        sold_currency=g.get("sold_currency", "TF2") or "TF2",
                        sold_price=g.get("sold_price") or g.get("sold_tf2_keys"),
                        sold_note=g.get("sold_note"),
                        issue_note=g.get("issue_note")
                    )
                    db.add(offer_obj)
                    
                db.commit()
                print(f"Base de datos SQLite inicializada y migrada con éxito: {len(game_list)} ofertas.")
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
