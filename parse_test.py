from bs4 import BeautifulSoup
import re

def parse_price_value(val_str):
    if not val_str:
        return None
    c = re.sub(r"[^\d,\.]", "", val_str).strip()
    if not c:
        return None
    if "," in c and "." not in c:
        c = c.replace(",", ".")
    elif "," in c and "." in c:
        if c.find(",") > c.find("."):
            c = c.replace(".", "").replace(",", ".")
        else:
            c = c.replace(",", "")
    try:
        return float(c)
    except:
        return None

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
    }
    
    # 1. Analizar cajas de precios del header
    cols = soup.select('.header-game-prices-wrapper .game-info-price-col')
    for col in cols:
        text = col.get_text(separator=' ', strip=True)
        # Buscar precio
        price_elem = col.select_one('.price-inner, .numeric, .price')
        price_val = parse_price_value(price_elem.get_text() if price_elem else text)
        
        # Descuento
        disc_elem = col.select_one('.discount, .discount-badge')
        disc_val = disc_elem.get_text(strip=True) if disc_elem else None
        
        # Tiempo finalizado
        time_match = re.search(r'(Ended\s+[^0-9]*[0-9]+\s+[a-zA-Z\s]+ago|hace\s+[0-9]+\s+[a-zA-Z]+)', text, re.IGNORECASE)
        time_str = time_match.group(0).strip() if time_match else None
        
        if 'Official Stores low:' in text or 'Official Stores' in text and 'low:' in text:
            res['historical_official_low'] = price_val
            res['historical_official_time'] = time_str
        elif 'Keyshops low:' in text or 'Keyshops' in text and 'low:' in text:
            res['historical_keyshop_low'] = price_val
            res['historical_keyshop_time'] = time_str
        elif 'Official Stores:' in text or 'Official Stores' in text:
            res['current_official_price'] = price_val
        elif 'Keyshops:' in text or 'Keyshops' in text:
            res['current_keyshop_price'] = price_val
            res['current_keyshop_discount'] = disc_val
            if 'Best deal' in text:
                res['current_best_deal'] = 'Keyshops'

    return res

with open('data/sample_ggdeals.html', 'r', encoding='utf-8') as f:
    data = extract_ggdeals_data(f.read())

print("Parsed data:", data)
