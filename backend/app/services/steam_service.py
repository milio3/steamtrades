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

def search_steam_games(term: str, limit: int = 6) -> List[Dict[str, Any]]:
    """Busca juegos por nombre usando la API pública de búsqueda de la tienda de Steam."""
    if not term or len(term.strip()) < 2:
        return []
    
    url = f"https://store.steampowered.com/api/storesearch/?term={requests.utils.quote(term.strip())}&l=spanish&cc=es"
    results = []
    try:
        r = requests.get(url, headers=BROWSER_HEADERS, timeout=5)
        if r.status_code == 200:
            data = r.json()
            items = data.get("items", [])
            for it in items[:limit]:
                app_id = it.get("id")
                price_data = it.get("price")
                final_price = (price_data.get("final", 0) / 100.0) if price_data else None
                results.append({
                    "app_id": app_id,
                    "name": it.get("name"),
                    "price_eur": final_price,
                    "tiny_image": it.get("tiny_image") or f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{app_id}/capsule_sm_120.jpg",
                    "header_image": f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{app_id}/header.jpg"
                })
    except Exception:
        pass
    return results

def fetch_steam_reviews_summary(app_id: int) -> Dict[str, Any]:
    """Consulta el resumen oficial de análisis y opiniones de los usuarios en Steam."""
    url = f"https://store.steampowered.com/appreviews/{app_id}?json=1&language=all&purchase_type=all"
    summary = {
        "review_score_desc": None,
        "total_positive": 0,
        "total_negative": 0,
        "total_reviews": 0,
        "positive_percent": None
    }
    try:
        r = requests.get(url, headers=BROWSER_HEADERS, timeout=5)
        if r.status_code == 200:
            qs = r.json().get("query_summary", {})
            pos = qs.get("total_positive", 0)
            tot = qs.get("total_reviews", 0)
            summary["review_score_desc"] = qs.get("review_score_desc")
            summary["total_positive"] = pos
            summary["total_negative"] = qs.get("total_negative", 0)
            summary["total_reviews"] = tot
            if tot > 0:
                summary["positive_percent"] = round((pos / tot) * 100, 1)
    except Exception:
        pass
    return summary

def fetch_full_steam_details(app_id: int) -> Dict[str, Any]:
    """Obtiene toda la información técnica, comunitaria y económica del juego en Steam."""
    base_details = fetch_steam_app_details(app_id)
    reviews = fetch_steam_reviews_summary(app_id)
    players_count = fetch_steam_players_count(app_id)
    
    url = f"https://store.steampowered.com/api/appdetails?appids={app_id}&cc=es&l=spanish"
    extra = {
        "type": "game",
        "genres": [],
        "developers": [],
        "publishers": [],
        "release_date": None,
        "screenshots": [],
        "platforms": {"windows": True, "mac": False, "linux": False}
    }
    try:
        r = requests.get(url, headers=BROWSER_HEADERS, timeout=8)
        if r.status_code == 200:
            app_data = r.json().get(str(app_id), {})
            if app_data.get("success"):
                d = app_data.get("data", {})
                extra["type"] = d.get("type", "game")
                extra["genres"] = [g.get("description") for g in d.get("genres", []) if "description" in g]
                extra["developers"] = d.get("developers", [])
                extra["publishers"] = d.get("publishers", [])
                extra["release_date"] = d.get("release_date", {}).get("date")
                extra["platforms"] = d.get("platforms", {})
                extra["screenshots"] = [s.get("path_full") for s in d.get("screenshots", [])[:4] if "path_full" in s]
    except Exception:
        pass

    return {
        **base_details,
        **extra,
        "app_id": app_id,
        "players_count": players_count,
        "reviews": reviews
    }
