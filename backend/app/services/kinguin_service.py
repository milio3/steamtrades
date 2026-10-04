import re
import urllib.parse
import requests
from typing import Dict, Any, Optional
from backend.app.core.config import BROWSER_HEADERS

def clean_game_name_for_match(title: str) -> str:
    """Limpia caracteres especiales y puntuación para comparar nombres."""
    if not title:
        return ""
    t = title.lower()
    t = re.sub(r'\(.*?\)', '', t)
    t = re.sub(r'\[.*?\]', '', t)
    t = t.replace(':', ' ').replace('-', ' ').replace("'", '').replace('&', 'and').replace('.', '')
    return ' '.join(t.split())

def generate_kinguin_search_url(game_name: str) -> str:
    """Genera la URL directa de búsqueda en Kinguin filtrada por claves de Steam globales/ROW en stock."""
    safe_phrase = urllib.parse.quote_plus(game_name.strip())
    return f"https://www.kinguin.net/listing?active=1&hide_out_of_stock=1&phrase={safe_phrase}&platform=Steam&region=Global"

def fetch_kinguin_row_price(game_name: str) -> Dict[str, Any]:
    """
    Consulta el precio y disponibilidad de referencia en Kinguin para una clave de Steam Global/ROW/EU.
    Utiliza el endpoint público de catálogo y búsqueda de Kinguin Library API.
    """
    search_url = generate_kinguin_search_url(game_name)
    result = {
        "kinguin_price_eur": None,
        "kinguin_url": search_url,
        "kinguin_in_stock": False
    }
    
    phrase = game_name.strip()
    if not phrase:
        return result

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
    }

    try:
        url = f"https://gateway.kinguin.net/library/api/v1/products/search?phrase={urllib.parse.quote(phrase)}"
        r = requests.get(url, headers=headers, timeout=6)
        
        if r.status_code == 200:
            data = r.json()
            products = data.get("_embedded", {}).get("products", []) if isinstance(data, dict) else []
            q_clean = clean_game_name_for_match(phrase)
            
            candidates = []
            for p in products:
                p_name = p.get("name", "")
                p_type = p.get("attributes", {}).get("marketingProductType", "")
                price_obj = p.get("price", {})
                lowest = price_obj.get("lowestOffer")
                
                # Descartar cuentas de Steam o ítems que no sean juegos / claves
                if "account" in p_name.lower() or p_type == "INGAME_ACCOUNT":
                    continue
                
                p_name_clean = clean_game_name_for_match(p_name)
                # Comprobar correspondencia de título
                if q_clean in p_name_clean or p_name_clean.startswith(q_clean):
                    is_in_stock = bool(lowest is not None and 0 < lowest < 100000)
                    price_eur = round(lowest / 100.0, 2) if is_in_stock else None
                    ext_id = p.get("externalId")
                    url_key = p.get("attributes", {}).get("urlKey")
                    
                    prod_url = f"https://www.kinguin.net/category/{ext_id}/{url_key}" if (ext_id and url_key) else search_url
                    
                    # Prioridad: claves de Steam (plataforma 2 o en título)
                    is_steam = (p.get("attributes", {}).get("platform") == 2 or "steam" in p_name.lower())
                    
                    candidates.append({
                        "name": p_name,
                        "price_eur": price_eur,
                        "in_stock": is_in_stock,
                        "url": prod_url,
                        "is_steam": is_steam
                    })
            
            # Priorizar candidatos con stock y clave de Steam
            steam_with_stock = [c for c in candidates if c["is_steam"] and c["in_stock"]]
            if steam_with_stock:
                best = steam_with_stock[0]
                result["kinguin_price_eur"] = best["price_eur"]
                result["kinguin_url"] = best["url"]
                result["kinguin_in_stock"] = True
                return result
            
            # Segunda opción: cualquier candidato con stock
            any_with_stock = [c for c in candidates if c["in_stock"]]
            if any_with_stock:
                best = any_with_stock[0]
                result["kinguin_price_eur"] = best["price_eur"]
                result["kinguin_url"] = best["url"]
                result["kinguin_in_stock"] = True
                return result

            # Tercera opción: candidato detectado sin stock
            if candidates:
                best = candidates[0]
                result["kinguin_price_eur"] = None
                result["kinguin_url"] = best["url"]
                result["kinguin_in_stock"] = False
                return result

    except Exception as e:
        pass

    return result
