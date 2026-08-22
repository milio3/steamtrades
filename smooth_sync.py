import time
import requests
from backend.price_service import db, BROWSER_HEADERS, extract_ggdeals_from_html, clean_game_slug
from backend.steam_service import fetch_steam_app_details

def sync_all_smooth():
    print(f"Sincronizando los {len(db.games)} juegos uno a uno con intervalo controlado...")
    total = len(db.games)
    
    session = requests.Session()
    session.headers.update(BROWSER_HEADERS)
    
    success_count = 0
    for idx, (gid, game) in enumerate(db.games.items(), start=1):
        # 1. Steam Store
        if game.steam_app_id:
            details = fetch_steam_app_details(game.steam_app_id)
            if details.get("is_delisted") or game.is_delisted_steam:
                game.is_delisted_steam = True
                if details.get("reason") and not game.delisted_reason:
                    game.delisted_reason = details.get("reason")
            if details.get("price") is not None:
                game.steam_store_price = details["price"]
            if details.get("header_image"):
                game.steam_header_image = details["header_image"]
            game.steam_is_free = details.get("is_free", False)

        # 2. GG.deals
        slug = clean_game_slug(game.name)
        url = f"https://gg.deals/game/{slug}/"
        try:
            r = session.get(url, timeout=6)
            if r.status_code == 200:
                extracted = extract_ggdeals_from_html(r.text)
                if extracted.get("current_official_price") is not None:
                    game.ggdeals_current_official = extracted["current_official_price"]
                if extracted.get("current_keyshop_price") is not None:
                    game.ggdeals_current_keyshop = extracted["current_keyshop_price"]
                    game.best_keyshop_price_eur = extracted["current_keyshop_price"]
                if extracted.get("current_keyshop_discount"):
                    game.ggdeals_current_keyshop_discount = extracted["current_keyshop_discount"]
                if extracted.get("current_best_deal"):
                    game.ggdeals_best_deal = extracted["current_best_deal"]
                if extracted.get("historical_official_low") is not None:
                    game.ggdeals_historical_official_low = extracted["historical_official_low"]
                if extracted.get("historical_official_time"):
                    game.ggdeals_historical_official_time = extracted["historical_official_time"]
                if extracted.get("historical_keyshop_low") is not None:
                    game.ggdeals_historical_keyshop_low = extracted["historical_keyshop_low"]
                if extracted.get("historical_keyshop_time"):
                    game.ggdeals_historical_keyshop_time = extracted["historical_keyshop_time"]
                if extracted.get("is_delisted"):
                    game.is_delisted_steam = True
                success_count += 1
        except Exception as e:
            pass

        # Fallback
        if not game.best_keyshop_price_eur and game.steam_store_price:
            game.best_keyshop_price_eur = round(max(1.0, game.steam_store_price * 0.40), 2)
            
        db.recalculate_game_offer(game)
        print(f"[{idx}/{total}] {game.name}: CurKeyshop={game.ggdeals_current_keyshop} | HistKeyshop={game.ggdeals_historical_keyshop_low}")
        time.sleep(0.08)

    db.save_to_disk()
    print(f"\nSincronización finalizada. {success_count}/{total} juegos actualizados con datos de GG.deals.")

if __name__ == "__main__":
    sync_all_smooth()
