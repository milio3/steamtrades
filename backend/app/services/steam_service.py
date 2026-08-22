import re
import requests
from typing import Optional, Dict, Any, Tuple
from bs4 import BeautifulSoup
from backend.app.core.config import BROWSER_HEADERS

def extract_app_id_from_url(url: str) -> Optional[int]:
    """Extrae el Steam AppID de una URL o cadena numérica."""
    if not url:
        return None
    match = re.search(r'/app/(\d+)', url)
    if match:
        return int(match.group(1))
    match_num = re.search(r'^\d+$', url.strip())
    if match_num:
        return int(match_num.group(0))
    return None

def fetch_live_tf2_key_price() -> Tuple[Optional[float], Optional[float]]:
    """Consulta la cotización en vivo de la Mann Co. Supply Crate Key en el Mercado de la Comunidad de Steam."""
    url = "https://steamcommunity.com/market/priceoverview/?appid=440&currency=3&market_hash_name=Mann%20Co.%20Supply%20Crate%20Key"
    try:
        r = requests.get(url, headers=BROWSER_HEADERS, timeout=6)
        if r.status_code == 200:
            data = r.json()
            if data.get("success"):
                price_str = data.get("lowest_price") or data.get("median_price")
                if price_str:
                    clean = price_str.replace("€", "").replace(",", ".").replace(" ", "").replace("-", "0").strip()
                    steam_price = float(clean)
                    cash_price = round(steam_price * 0.80, 2)
                    return steam_price, cash_price
    except Exception:
        pass
    return None, None

def fetch_steam_app_details(app_id: int) -> Dict[str, Any]:
    """Consulta la API pública oficial de la tienda de Steam para obtener datos oficiales del juego."""
    url = f"https://store.steampowered.com/api/appdetails?appids={app_id}&cc=es&l=spanish"
    result = {
        "is_delisted": False,
        "price": None,
        "is_free": False,
        "name": None,
        "header_image": None,
        "reason": None,
        "players_24h": None
    }
    
    try:
        r = requests.get(url, headers=BROWSER_HEADERS, timeout=8)
        if r.status_code == 200:
            data = r.json()
            app_data = data.get(str(app_id), {})
            if not app_data.get("success", False):
                result["is_delisted"] = True
                result["reason"] = "Retirado de la tienda de Steam"
                result["header_image"] = f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg"
                return result
            
            d = app_data.get("data", {})
            result["name"] = d.get("name")
            result["header_image"] = d.get("header_image")
            result["is_free"] = d.get("is_free", False)
            
            if result["is_free"]:
                result["price"] = 0.0
            elif "price_overview" in d:
                final_cents = d["price_overview"].get("final", 0)
                result["price"] = final_cents / 100.0
            else:
                result["is_delisted"] = True
                result["reason"] = "Sin opción de compra directa en Steam"
                
    except Exception as e:
        result["reason"] = f"Error al consultar Steam Store: {str(e)}"
        
    return result

def fetch_steam_players_count(app_id: int) -> Optional[int]:
    """Consulta los jugadores concurrentes en SteamDB / Steam API."""
    url = f"https://steamdb.info/app/{app_id}/graphs/"
    try:
        r = requests.get(url, headers=BROWSER_HEADERS, timeout=6)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "html.parser")
            # Buscar el bloque de 24h peak en SteamDB
            stat_blocks = soup.find_all("div", class_="app-chart")
            for block in stat_blocks:
                num = block.find("strong")
                if num and num.text:
                    clean_text = num.text.replace(",", "").replace(".", "").strip()
                    if clean_text.isdigit():
                        return int(clean_text)
    except Exception:
        pass
    
    # Fallback con Steam Community Hub oficial
    try:
        hub_url = f"https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid={app_id}"
        r2 = requests.get(hub_url, headers=BROWSER_HEADERS, timeout=5)
        if r2.status_code == 200:
            data = r2.json()
            if data.get("response", {}).get("result") == 1:
                return data["response"].get("player_count")
    except Exception:
        pass

    return None
