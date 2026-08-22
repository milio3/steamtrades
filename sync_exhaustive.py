import time
import requests
import re
from bs4 import BeautifulSoup
from backend.price_service import db, BROWSER_HEADERS, extract_ggdeals_from_html, clean_game_slug
from backend.steam_service import fetch_steam_app_details

def fetch_with_retry(session, url, max_retries=3):
    for attempt in range(max_retries):
        try:
            r = session.get(url, timeout=8)
            if r.status_code == 200:
                return r.text
            elif r.status_code in [429, 403]:
                time.sleep(1.5 * (attempt + 1))
        except Exception:
            time.sleep(1.0)
    return None

def fetch_game_html(session, name):
    slug = clean_game_slug(name)
    # 1. Probar slug directo
    html = fetch_with_retry(session, f"https://gg.deals/game/{slug}/")
    if html and "header-game-prices-wrapper" in html:
        return html
    
    # 2. Búsqueda por título en GG.deals
    search_html = fetch_with_retry(session, f"https://gg.deals/games/?title={requests.utils.quote(name)}")
    if search_html:
        soup = BeautifulSoup(search_html, 'html.parser')
        first_link = None
        for a in soup.select('a[href*="/game/"]'):
            href = a.get('href')
            if href and href.startswith('/game/'):
                first_link = href
                break
        if first_link:
            return fetch_with_retry(session, f"https://gg.deals{first_link}")
            
    return None

def sync_entire_database():
    session = requests.Session()
    session.headers.update(BROWSER_HEADERS)
    total = len(db.games)
    
    print(f"Iniciando actualización exhaustiva de los {total} juegos...")
    updated_gg = 0
    
    for idx, (gid, game) in enumerate(db.games.items(), start=1):
        # 1. Steam Store
        if game.steam_app_id:
            try:
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
            except:
                pass

        # 2. GG.deals
        html = fetch_game_html(session, game.name)
        if html:
            extracted = extract_ggdeals_from_html(html)
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
            updated_gg += 1
            print(f"[{idx}/{total}] OK: {game.name} -> Official={game.ggdeals_current_official}€ | Keyshop={game.ggdeals_current_keyshop}€ | HistKeyshop={game.ggdeals_historical_keyshop_low}€")
        else:
            print(f"[{idx}/{total}] FAIL: {game.name}")
            
        db.recalculate_game_offer(game)
        time.sleep(0.12)

    db.save_to_disk()
    print(f"\nFinalizado con éxito. {updated_gg}/{total} juegos actualizados con datos de GG.deals.")

if __name__ == "__main__":
    sync_entire_database()
