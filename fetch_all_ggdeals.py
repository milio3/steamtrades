import time
import json
import re
import requests
from bs4 import BeautifulSoup
from backend.price_service import db, BROWSER_HEADERS, parse_price_value, clean_game_slug
from backend.steam_service import fetch_steam_app_details

def extract_complete_ggdeals(html_content):
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

    # Analizar widget superior
    cols = soup.select('.header-game-prices-wrapper .game-info-price-col')
    for col in cols:
        text = col.get_text(separator=' ', strip=True)
        price_elem = col.select_one('.price-inner, .numeric, .price')
        price_text = price_elem.get_text(strip=True) if price_elem else text
        
        # Descuento
        disc_elem = col.select_one('.discount, .discount-badge')
        disc_val = disc_elem.get_text(strip=True) if disc_elem else None
        if disc_val and "Discount:" in disc_val:
            disc_val = disc_val.replace("Discount:", "").strip()
        
        # Tiempo
        time_match = re.search(r'(Ended\s+[^0-9]*[0-9]+\s+[a-zA-Z\s]+ago|hace\s+[0-9]+\s+[a-zA-Z]+)', text, re.IGNORECASE)
        time_str = time_match.group(0).strip() if time_match else None
        
        # Si dice "Free"
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

    # Fallback: Si no encontró en el header widget, buscar en la lista de ofertas
    if res['current_keyshop_price'] is None:
        keyshop_offer = soup.select_one('#game-keyshops .game-deal-item .price-inner, .keyshops-deals-list .price-inner')
        if keyshop_offer:
            res['current_keyshop_price'] = parse_price_value(keyshop_offer.get_text())
            
    if res['current_official_price'] is None:
        official_offer = soup.select_one('#game-deals .game-deal-item .price-inner, .official-deals-list .price-inner')
        if official_offer:
            res['current_official_price'] = parse_price_value(official_offer.get_text())

    return res

def fetch_game_page(session, name, app_id=None):
    slug = clean_game_slug(name)
    # Intento 1: Slug directo
    url1 = f"https://gg.deals/game/{slug}/"
    try:
        r = session.get(url1, timeout=8)
        if r.status_code == 200 and "header-game-prices-wrapper" in r.text:
            return r.text
    except:
        pass
    
    # Intento 2: Buscar con nombre limpio
    clean_name = re.sub(r"\(.*?\)", "", name).replace(":", " ").replace("-", " ").strip()
    search_url = f"https://gg.deals/games/?title={requests.utils.quote(clean_name)}"
    try:
        r = session.get(search_url, timeout=8)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            # Buscar el primer enlace a /game/
            for a in soup.select('a.game-item-title, .game-item a[href*="/game/"], a[href*="/game/"]'):
                href = a.get('href')
                if href and href.startswith('/game/') and not href.startswith('/games/'):
                    r_game = session.get(f"https://gg.deals{href}", timeout=8)
                    if r_game.status_code == 200:
                        return r_game.text
    except Exception as e:
        pass
        
    return None

def run_full_sync():
    session = requests.Session()
    session.headers.update(BROWSER_HEADERS)
    total = len(db.games)
    
    missing_report = []
    
    print(f"=== INICIANDO SINCRONIZACIÓN DE LOS {total} JUEGOS CON GG.DEALS ===")
    
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
        html = fetch_game_page(session, game.name, game.steam_app_id)
        if html:
            data = extract_complete_ggdeals(html)
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

        # Recalcular margen estrictamente sobre Current Keyshops (o fallback Historical Keyshop)
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
        else:
            game.reseller_profit_eur = None
            game.reseller_profit_percent = None

        # Revisar campos que falten para el reporte
        missing_fields = []
        if game.ggdeals_current_official is None and not game.is_delisted_steam:
            missing_fields.append("Current Official Stores")
        if game.ggdeals_current_keyshop is None:
            missing_fields.append("Current Keyshops")
        if game.ggdeals_historical_official_low is None:
            missing_fields.append("Historical Low Official")
        if game.ggdeals_historical_keyshop_low is None:
            missing_fields.append("Historical Low Keyshops")

        if missing_fields:
            missing_report.append({
                "game": game.name,
                "delisted": game.is_delisted_steam,
                "missing": missing_fields,
                "cur_official": game.ggdeals_current_official,
                "cur_keyshop": game.ggdeals_current_keyshop,
                "hist_official": game.ggdeals_historical_official_low,
                "hist_keyshop": game.ggdeals_historical_keyshop_low
            })

        print(f"[{idx}/{total}] {game.name}: CurKeyshop={game.ggdeals_current_keyshop}€ | HistKeyshop={game.ggdeals_historical_keyshop_low}€")
        time.sleep(0.1)

    db.save_to_disk()
    
    with open("data/missing_report.json", "w", encoding="utf-8") as f:
        json.dump(missing_report, f, indent=2, ensure_ascii=False)
        
    print(f"\nSincronización finalizada. {total - len(missing_report)} juegos con 100% de datos completos.")
    print(f"Juegos con algún dato faltante (ej. sin stock o deslistados): {len(missing_report)}")

if __name__ == "__main__":
    run_full_sync()
