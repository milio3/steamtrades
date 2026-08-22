import time
import requests
import json
import re
from bs4 import BeautifulSoup
from backend.price_service import db, BROWSER_HEADERS, parse_price_value, clean_game_slug

s = requests.Session()
s.headers.update(BROWSER_HEADERS)

def extract_prices_direct(html):
    soup = BeautifulSoup(html, 'html.parser')
    res = {}
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
            res['hist_official'] = price_val
            res['hist_official_time'] = time_str or ("Free" if is_free_price else None)
        elif 'Keyshops low:' in text or ('Keyshops' in text and 'low:' in text):
            res['hist_keyshop'] = price_val
            res['hist_keyshop_time'] = time_str
        elif 'Official Stores:' in text or 'Official Stores' in text:
            res['cur_official'] = price_val
        elif 'Keyshops:' in text or 'Keyshops' in text:
            res['cur_keyshop'] = price_val
            res['cur_keyshop_discount'] = disc_val
            
    return res

# Probar los 37 juegos faltantes
with open('data/final_audit.json', 'r', encoding='utf-8') as f:
    audit = json.load(f)

print("Intentando rescatar los 37 juegos restantes con búsqueda y slug...")
for item in audit['missing']:
    name = item['name']
    game = next((g for g in db.games.values() if g.name == name), None)
    if not game:
        continue
        
    slug = clean_game_slug(name)
    url = f"https://gg.deals/game/{slug}/"
    r = s.get(url, timeout=8)
    
    if r.status_code != 200:
        clean_name = re.sub(r"\(.*?\)", "", name).replace(":", " ").replace("-", " ").strip()
        sr = s.get(f"https://gg.deals/games/?title={requests.utils.quote(clean_name)}", timeout=8)
        if sr.status_code == 200:
            soup = BeautifulSoup(sr.text, 'html.parser')
            for a in soup.select('a.game-item-title, .game-item a[href*="/game/"]'):
                href = a.get('href')
                if href and href.startswith('/game/') and not href.startswith('/games/'):
                    time.sleep(0.5)
                    r = s.get(f"https://gg.deals{href}", timeout=8)
                    break
                    
    if r.status_code == 200:
        data = extract_prices_direct(r.text)
        if 'cur_official' in data: game.ggdeals_current_official = data['cur_official']
        if 'cur_keyshop' in data:
            game.ggdeals_current_keyshop = data['cur_keyshop']
            game.best_keyshop_price_eur = data['cur_keyshop']
        if 'cur_keyshop_discount' in data: game.ggdeals_current_keyshop_discount = data['cur_keyshop_discount']
        if 'hist_official' in data: game.ggdeals_historical_official_low = data['hist_official']
        if 'hist_official_time' in data: game.ggdeals_historical_official_time = data['hist_official_time']
        if 'hist_keyshop' in data: game.ggdeals_historical_keyshop_low = data['hist_keyshop']
        if 'hist_keyshop_time' in data: game.ggdeals_historical_keyshop_time = data['hist_keyshop_time']
        
        db.recalculate_game_offer(game)
        print(f"Rescatado: {name} -> CurOfficial={game.ggdeals_current_official} | CurKeyshop={game.ggdeals_current_keyshop} | HistKeyshop={game.ggdeals_historical_keyshop_low}")
    else:
        print(f"No se pudo obtener para: {name} (Status: {r.status_code})")
        
    time.sleep(1.0)

db.save_to_disk()
print("Guardado final.")
