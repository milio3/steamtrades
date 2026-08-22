import time
import json
import re
import requests
from bs4 import BeautifulSoup
from backend.price_service import db, BROWSER_HEADERS, parse_price_value, clean_game_slug
from backend.steam_service import fetch_steam_app_details

def extract_ggdeals_data(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    res = {
        "current_official_price": None,
        "current_keyshop_price": None,
        "current_keyshop_discount": None,
        "current_best_deal": None,
        "historical_official_low": None,
        "historical_official_time": None,
        "historical_keyshop_low": None,
        "historical_keyshop_time": None,
        "is_delisted": False
    }
    
    delisted_tag = soup.find(string=lambda t: t and ("delisted" in t.lower() or "retirado" in t.lower() or "no longer available" in t.lower()))
    if delisted_tag:
        res["is_delisted"] = True

    cols = soup.select('.header-game-prices-wrapper .game-info-price-col')
    for col in cols:
        text = col.get_text(separator=' ', strip=True)
        price_elem = col.select_one('.price-inner, .numeric, .price')
        price_text = price_elem.get_text(strip=True) if price_elem else text
        
        disc_elem = col.select_one('.discount, .discount-badge')
        disc_val = disc_elem.get_text(strip=True) if disc_elem else None
        if disc_val and "Discount:" in disc_val:
            disc_val = disc_val.replace("Discount:", "").strip()
        
        time_match = re.search(r'(Ended\s+[^0-9]*[0-9]+\s+[a-zA-Z\s]+ago|hace\s+[0-9]+\s+[a-zA-Z]+)', text, re.IGNORECASE)
        time_str = time_match.group(0).strip() if time_match else None
        
        is_free_price = "free" in price_text.lower() or "gratis" in price_text.lower() or "free" in text.lower()
        price_val = 0.0 if is_free_price else parse_price_value(price_text)

        if 'Official Stores low:' in text or ('Official Stores' in text and 'low:' in text):
            res['historical_official_low'] = price_val
            res['historical_official_time'] = time_str or ("Free" if is_free_price else None)
        elif 'Keyshops low:' in text or ('Keyshops' in text and 'low:' in text):
            res['historical_keyshop_low'] = price_val
            res['historical_keyshop_time'] = time_str
        elif 'Official Stores:' in text or 'Official Stores' in text:
            res['current_official_price'] = price_val
        elif 'Keyshops:' in text or 'Keyshops' in text:
            res['current_keyshop_price'] = price_val
            res['current_keyshop_discount'] = disc_val
            if 'Best deal' in text or 'best-deal' in col.get('class', []):
                res['current_best_deal'] = 'Keyshops'

    return res

CUSTOM_SLUG_MAP = {
    "Warhammer 40,000: Dawn of War III": "warhammer-40000-dawn-of-war-iii",
    "Life is Strange Complete Season (Episodes 1-5)": "life-is-strange-complete-season-episodes-1-5",
    "Hitman 2: Silent Assassin": "hitman-2-silent-assassin",
    "Q.U.B.E. 2": "qube-2",
    "Darksiders II: Deathinitive Edition": "darksiders-ii-deathinitive-edition",
    "Resident Evil 5 Gold Edition": "resident-evil-5-gold-edition",
    "Resident Evil Revelations": "resident-evil-revelations",
    "Shadowrun: Hong Kong - Extended Edition": "shadowrun-hong-kong-extended-edition",
    "STRAFE: Millennium Edition": "strafe-millennium-edition",
    "Else Heart.Break()": "else-heartbreak",
    "Galactic Civilizations III": "galactic-civilizations-iii",
    "Dead Island Definitive Edition": "dead-island-definitive-edition",
    "Kane & Lynch 2: Dog Days": "kane-and-lynch-2-dog-days"
}

def fetch_game_html_safe(session, name):
    slug = CUSTOM_SLUG_MAP.get(name) or clean_game_slug(name)
    url = f"https://gg.deals/game/{slug}/"
    
    for attempt in range(3):
        try:
            r = session.get(url, timeout=8)
            if r.status_code == 200 and "header-game-prices-wrapper" in r.text:
                return r.text
            elif r.status_code == 429:
                time.sleep(3.0 * (attempt + 1))
            elif r.status_code == 404:
                # Probar con búsqueda
                search_q = re.sub(r"\(.*?\)", "", name).replace(":", " ").replace("-", " ").strip()
                r_s = session.get(f"https://gg.deals/games/?title={requests.utils.quote(search_q)}", timeout=8)
                if r_s.status_code == 200:
                    soup = BeautifulSoup(r_s.text, 'html.parser')
                    for a in soup.select('a.game-item-title, .game-item a[href*="/game/"], a[href*="/game/"]'):
                        href = a.get('href')
                        if href and href.startswith('/game/') and not href.startswith('/games/'):
                            time.sleep(0.5)
                            r_final = session.get(f"https://gg.deals{href}", timeout=8)
                            if r_final.status_code == 200:
                                return r_final.text
                break
        except Exception:
            time.sleep(1.0)
            
    return None

def main_sync():
    session = requests.Session()
    session.headers.update(BROWSER_HEADERS)
    total = len(db.games)
    
    print(f"=== SINCRONIZANDO 106 JUEGOS CON RATE LIMIT RESPETUOSO (1.1s) ===")
    
    for idx, (gid, game) in enumerate(db.games.items(), start=1):
        # 1. Steam API
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
        html = fetch_game_html_safe(session, game.name)
        if html:
            data = extract_ggdeals_data(html)
            if data.get("current_official_price") is not None:
                game.ggdeals_current_official = data["current_official_price"]
            if data.get("current_keyshop_price") is not None:
                game.ggdeals_current_keyshop = data["current_keyshop_price"]
                game.best_keyshop_price_eur = data["current_keyshop_price"]
            if data.get("current_keyshop_discount"):
                game.ggdeals_current_keyshop_discount = data["current_keyshop_discount"]
            if data.get("current_best_deal"):
                game.ggdeals_best_deal = data["current_best_deal"]
            if data.get("historical_official_low") is not None:
                game.ggdeals_historical_official_low = data["historical_official_low"]
            if data.get("historical_official_time"):
                game.ggdeals_historical_official_time = data["historical_official_time"]
            if data.get("historical_keyshop_low") is not None:
                game.ggdeals_historical_keyshop_low = data["historical_keyshop_low"]
            if data.get("historical_keyshop_time"):
                game.ggdeals_historical_keyshop_time = data["historical_keyshop_time"]
            if data.get("is_delisted"):
                game.is_delisted_steam = True

        # Especial Rocket League
        if game.name == "Rocket League":
            game.ggdeals_current_keyshop = 450.0
            game.best_keyshop_price_eur = 450.0
            game.ggdeals_historical_official_low = 9.99
            game.ggdeals_historical_official_time = "Ended in 2020 (Delisted)"

        # Recalcular margen estrictamente sobre Current Keyshops
        ref_keyshop = game.ggdeals_current_keyshop or game.best_keyshop_price_eur
        if ref_keyshop and ref_keyshop > 0 and game.offer_value_cash_eur is not None:
            profit = round(ref_keyshop - game.offer_value_cash_eur, 2)
            game.reseller_profit_eur = profit
            profit_pct = round((profit / ref_keyshop) * 100, 1)
            game.reseller_profit_percent = profit_pct
            
            if profit_pct >= 70:
                game.deal_rating = "Margen Masivo para Comprador (>70%)"
            elif profit_pct >= 40:
                game.deal_rating = "Favorable al Comprador (40-70%)"
            elif profit_pct >= 15:
                game.deal_rating = "Equilibrada (15-40%)"
            else:
                game.deal_rating = "Favorable al Vendedor"

        print(f"[{idx}/{total}] {game.name}: CurKeyshop={game.ggdeals_current_keyshop}€ | HistKeyshop={game.ggdeals_historical_keyshop_low}€")
        time.sleep(1.0)

    db.save_to_disk()
    print("Guardado en games_db.json con éxito.")

if __name__ == "__main__":
    main_sync()
