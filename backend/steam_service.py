import requests
import aiohttp
import asyncio
import re
import logging
from typing import Optional, Dict, Any, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

STEAM_MARKET_TF2_URL = "https://steamcommunity.com/market/priceoverview/?appid=440&currency=3&market_hash_name=Mann%20Co.%20Supply%20Crate%20Key"
STEAM_STORE_APP_URL = "https://store.steampowered.com/api/appdetails"

def parse_price_str(price_str: str) -> Optional[float]:
    if not price_str:
        return None
    clean = re.sub(r"[^\d,\.]", "", price_str).strip()
    if not clean:
        return None
    if "," in clean and "." not in clean:
        clean = clean.replace(",", ".")
    elif "," in clean and "." in clean:
        if clean.find(",") > clean.find("."):
            clean = clean.replace(".", "").replace(",", ".")
        else:
            clean = clean.replace(",", "")
    try:
        return float(clean)
    except ValueError:
        return None

def fetch_live_tf2_key_price() -> Tuple[float, Optional[str]]:
    """Obtiene el precio en vivo de la TF2 Key directamente de Steam Market"""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
        }
        res = requests.get(STEAM_MARKET_TF2_URL, headers=headers, timeout=10)
        if res.status_code == 200:
            data = res.json()
            if data.get("success"):
                lowest_price_str = data.get("lowest_price") or data.get("median_price")
                parsed = parse_price_str(lowest_price_str)
                if parsed and parsed > 0:
                    logger.info(f"Precio TF2 Key obtenido de Steam Market: {parsed}€ ({lowest_price_str})")
                    return parsed, lowest_price_str
    except Exception as e:
        logger.error(f"Error consultando TF2 Key: {e}")
    
    return 1.97, "1,97€ (Steam Market)"

async def fetch_steam_app_details_async(session: aiohttp.ClientSession, app_id: int) -> Dict[str, Any]:
    """Consulta asíncrona a la API de Steam Store"""
    url = f"{STEAM_STORE_APP_URL}?appids={app_id}&cc=es&l=spanish"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
    }
    try:
        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=6)) as resp:
            if resp.status == 200:
                data = await resp.json(content_type=None)
                app_data = data.get(str(app_id), {})
                if not app_data.get("success"):
                    return {
                        "is_delisted": True,
                        "reason": "Retirado de la tienda de Steam (Delisted)",
                        "price": None,
                        "header_image": f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg",
                        "is_free": False
                    }
                
                d = app_data.get("data", {})
                is_free = d.get("is_free", False)
                price_overview = d.get("price_overview")
                header_image = d.get("header_image") or f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg"
                
                is_delisted = False
                delisted_reason = None
                price = None
                
                if price_overview:
                    final_cents = price_overview.get("final", 0)
                    price = round(final_cents / 100.0, 2)
                elif not is_free:
                    is_delisted = True
                    delisted_reason = "No disponible para comprar en la tienda de Steam (Delisted)"
                
                return {
                    "is_delisted": is_delisted,
                    "reason": delisted_reason,
                    "price": price,
                    "header_image": header_image,
                    "is_free": is_free,
                    "name": d.get("name")
                }
    except Exception as e:
        logger.debug(f"Error async en Steam App {app_id}: {e}")
        
async def fetch_steam_players_async(session: aiohttp.ClientSession, app_id: int) -> Optional[int]:
    """Obtiene jugadores activos en Steam de forma asíncrona"""
    if not app_id:
        return None
    url = f"https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid={app_id}"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=4)) as resp:
            if resp.status == 200:
                data = await resp.json()
                res = data.get("response", {})
                if res.get("result") == 1:
                    return res.get("player_count")
    except Exception as e:
        logger.debug(f"Error consultando players para app {app_id}: {e}")
    return None

def fetch_steam_players_count(app_id: int) -> Optional[int]:
    """Obtiene jugadores activos en Steam de forma síncrona"""
    if not app_id:
        return None
    url = f"https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid={app_id}"
    try:
        r = requests.get(url, timeout=4)
        if r.status_code == 200:
            data = r.json()
            res = data.get("response", {})
            if res.get("result") == 1:
                return res.get("player_count")
    except Exception:
        pass
    return None

def extract_app_id_from_url(url: str) -> Optional[int]:
    if not url:
        return None
    match = re.search(r"app/(\d+)", url)
    if match:
        return int(match.group(1))
    return None

def fetch_steam_app_details(app_id: int) -> Dict[str, Any]:
    url = f"{STEAM_STORE_APP_URL}?appids={app_id}&cc=es&l=spanish"
    try:
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            app_data = data.get(str(app_id), {})
            if not app_data.get("success"):
                return {
                    "is_delisted": True,
                    "reason": "Delisted de Steam",
                    "price": None,
                    "header_image": f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg",
                    "players_24h": fetch_steam_players_count(app_id)
                }
            d = app_data.get("data", {})
            price_overview = d.get("price_overview")
            return {
                "name": d.get("name"),
                "is_delisted": not d.get("is_free") and not price_overview,
                "price": round(price_overview["final"] / 100.0, 2) if price_overview else None,
                "header_image": d.get("header_image") or f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg",
                "is_free": d.get("is_free", False),
                "players_24h": fetch_steam_players_count(app_id)
            }
    except Exception:
        pass
    return {
        "is_delisted": False,
        "price": None,
        "header_image": f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg" if app_id else None,
        "players_24h": fetch_steam_players_count(app_id) if app_id else None
    }
