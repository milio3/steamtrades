import time
import requests
from bs4 import BeautifulSoup
from backend.price_service import db, BROWSER_HEADERS, extract_ggdeals_from_html, clean_game_slug
from backend.steam_service import fetch_steam_app_details

def find_game_url(session, name):
    # 1. Probar slug directo
    slug = clean_game_slug(name)
    direct_url = f"https://gg.deals/game/{slug}/"
    try:
        r = session.get(direct_url, timeout=6)
        if r.status_code == 200:
            return r.text
    except:
        pass
    
    # 2. Búsqueda por título
    search_url = f"https://gg.deals/games/?title={requests.utils.quote(name)}"
    try:
        r = session.get(search_url, timeout=6)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            first_game_link = None
            for a in soup.select('a[href*="/game/"]'):
                href = a.get('href')
                if href and href.startswith('/game/'):
                    first_game_link = href
                    break
            if first_game_link:
                game_url = f"https://gg.deals{first_game_link}"
                r_game = session.get(game_url, timeout=6)
                if r_game.status_code == 200:
                    return r_game.text
    except Exception as e:
        pass
    
    return None

def sync_all_perfect():
    print(f"Sincronizando los {len(db.games)} juegos con GG.deals y Steam Store...")
    session = requests.Session()
    session.headers.update(BROWSER_HEADERS)
    total = len(db.games)
    success_count = 0
    
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

        # 2. GG.deals con fallback inteligente
        html_content = find_game_url(session, game.name)
        if html_content:
            extracted = extract_ggdeals_from_html(html_content)
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

        db.recalculate_game_offer(game)
        print(f"[{idx}/{total}] {game.name}: CurKeyshop={game.ggdeals_current_keyshop}€ | HistKeyshop={game.ggdeals_historical_keyshop_low}€")
        time.sleep(0.08)

    db.save_to_disk()
    print(f"\nSincronización completada: {success_count}/{total} juegos sincronizados con GG.deals.")

if __name__ == "__main__":
    sync_all_perfect()
