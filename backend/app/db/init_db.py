import json
from pathlib import Path
from sqlalchemy.orm import Session
from backend.app.core.config import DATA_DIR
from backend.app.db.session import engine, Base, SessionLocal
from backend.app.models.game import Game
from backend.app.models.offer import Offer
from backend.app.models.settings import MarketSettingsModel
from backend.app.models.market_price import MarketPrice
from backend.app.services.kinguin_service import generate_kinguin_search_url

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
            if not json_file.exists():
                json_file = DATA_DIR / "games_db.json.example"
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
                        
                    # Comprobar o crear registro en market_prices
                    mp_obj = db.query(MarketPrice).filter(MarketPrice.app_id == app_id).first()
                    if not mp_obj:
                        k_url = g.get("links", {}).get("kinguin") if isinstance(g.get("links"), dict) else None
                        if not k_url:
                            k_url = generate_kinguin_search_url(g["name"])
                        mp_obj = MarketPrice(
                            app_id=app_id,
                            kinguin_price_eur=None,
                            kinguin_url=k_url,
                            kinguin_in_stock=True,
                            ggdeals_official_current=g.get("ggdeals_current_official"),
                            ggdeals_keyshop_current=g.get("ggdeals_current_keyshop") or g.get("best_keyshop_price_eur"),
                            best_keyshop_name=g.get("best_keyshop_name"),
                            ggdeals_keyshop_discount=g.get("ggdeals_current_keyshop_discount"),
                            ggdeals_official_hist_low=g.get("ggdeals_historical_official_low"),
                            ggdeals_official_hist_time=g.get("ggdeals_historical_official_time"),
                            ggdeals_keyshop_hist_low=g.get("ggdeals_historical_keyshop_low"),
                            ggdeals_keyshop_hist_time=g.get("ggdeals_historical_keyshop_time"),
                            ggdeals_url=g.get("links", {}).get("ggdeals") if isinstance(g.get("links"), dict) else None
                        )
                        db.add(mp_obj)
                    
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
                
        # 3. Asegurar que todos los juegos existentes tengan su registro en market_prices
        all_games = db.query(Game).all()
        created_mps = 0
        for g in all_games:
            if not g.market_price:
                mp = MarketPrice(
                    app_id=g.app_id,
                    kinguin_price_eur=None,
                    kinguin_url=generate_kinguin_search_url(g.name),
                    kinguin_in_stock=True,
                    ggdeals_official_current=g.ggdeals_official_current,
                    ggdeals_keyshop_current=g.ggdeals_keyshop_current,
                    best_keyshop_name=g.best_keyshop_name,
                    ggdeals_keyshop_discount=g.ggdeals_keyshop_discount,
                    ggdeals_official_hist_low=g.ggdeals_official_hist_low,
                    ggdeals_official_hist_time=g.ggdeals_official_hist_time,
                    ggdeals_keyshop_hist_low=g.ggdeals_keyshop_hist_low,
                    ggdeals_keyshop_hist_time=g.ggdeals_keyshop_hist_time
                )
                db.add(mp)
                created_mps += 1
        if created_mps > 0:
            db.commit()
            print(f"Migrados {created_mps} registros a market_prices.")
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
